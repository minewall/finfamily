// asaas-cancel
// Cancela (ou agenda cancelamento) da assinatura do user logado.
//
// Modos:
//   - immediate=false (padrão): seta cancel_at_period_end=true + cancel_reason.
//     NÃO chama Asaas — acesso mantido até o fim do ciclo. O cron diário
//     `advance_subscription_lifecycle` converte em 'cancelled' quando
//     current_period_end passa.
//   - immediate=true: chama POST /subscriptions/{id}/cancel no Asaas e seta
//     status='cancelled' + cancelled_at=now() imediatamente.
//
// Estratégia de erro do Asaas (immediate=true):
//   Cancelar é uma operação de "exit". Se o Asaas falhar, o pior caminho é
//   travar o user no plano por causa de uma indisponibilidade externa. Por
//   isso, em vez de devolver erro, fazemos best-effort:
//     - marca cancel_at_period_end=true localmente
//     - retorna ok:true + asaasError com a mensagem (UX informa "agendado;
//       provedor sincronizará depois")
//   Esse estado é convergente: webhook de SUBSCRIPTION_DELETED ou o próprio
//   cron limpam depois.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const ALLOWED_ORIGINS = new Set([
  'https://haile.com.br',
  'https://www.haile.com.br',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://haile.com.br';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(status: number, body: unknown, req: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'content-type': 'application/json' },
  });
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  status: string;
  asaas_subscription_id: string | null;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
}

async function asaasFetch(
  baseUrl: string,
  apiKey: string,
  path: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const resp = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'access_token': apiKey,
      'content-type': 'application/json',
      'User-Agent': 'haile-cancel/1.0',
      ...(init.headers || {}),
    },
  });
  let body: unknown = null;
  try { body = await resp.json(); } catch { /* sem corpo */ }
  return { ok: resp.ok, status: resp.status, body };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' }, req);
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('ANON_KEY');
    const SERVICE_KEY  = Deno.env.get('SERVICE_ROLE_KEY');
    const ASAAS_BASE   = Deno.env.get('ASAAS_BASE_URL') || 'https://sandbox.asaas.com/api/v3';
    const ASAAS_KEY    = Deno.env.get('ASAAS_API_KEY');

    if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
      return json(500, { error: 'config: supabase env ausente' }, req);
    }
    if (!ASAAS_KEY) {
      return json(500, { error: 'config: ASAAS_API_KEY ausente' }, req);
    }

    // ── Auth: resolve user via JWT ──
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return json(401, { error: 'unauthorized' }, req);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json(401, { error: 'jwt inválido' }, req);

    const userId = userData.user.id;

    // ── Input ──
    const payload = await req.json().catch(() => ({}));
    const reason = typeof payload?.reason === 'string' && payload.reason.trim()
      ? payload.reason.trim().slice(0, 500)
      : null;
    const immediate = payload?.immediate === true;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // ── Busca a assinatura do user ──
    const { data: sub, error: subErr } = await admin
      .from('subscriptions')
      .select('id, user_id, status, asaas_subscription_id, cancel_at_period_end, current_period_end')
      .eq('user_id', userId)
      .maybeSingle<SubscriptionRow>();

    if (subErr) {
      console.error('[asaas-cancel] load subscription:', subErr);
      return json(500, { error: 'falha ao carregar subscription' }, req);
    }
    if (!sub) {
      return json(404, { error: 'subscription não encontrada' }, req);
    }

    // Já cancelada/expirada → idempotente
    if (sub.status === 'cancelled' || sub.status === 'expired') {
      return json(200, {
        ok: true,
        alreadyCancelled: true,
        status: sub.status,
      }, req);
    }

    // Sem vínculo com Asaas (ex.: ainda em trial sem cobrar) ─ pode tratar
    // como cancelamento direto. Se for immediate → cancelled local; senão
    // marca cancel_at_period_end.
    if (!sub.asaas_subscription_id) {
      const update: Record<string, unknown> = { cancel_reason: reason };
      if (immediate) {
        update.status = 'cancelled';
        update.cancelled_at = new Date().toISOString();
      } else {
        update.cancel_at_period_end = true;
      }
      const { data: updated, error: updErr } = await admin
        .from('subscriptions')
        .update(update)
        .eq('id', sub.id)
        .select('id, user_id, status, asaas_subscription_id, cancel_at_period_end, current_period_end, cancelled_at, cancel_reason')
        .single();
      if (updErr) {
        console.error('[asaas-cancel] update local (no asaas):', updErr);
        return json(500, { error: 'falha ao atualizar subscription' }, req);
      }
      return json(200, {
        ok: true,
        status: immediate ? 'cancelled' : 'pending_period_end',
        subscription: updated,
      }, req);
    }

    // ── immediate=false: agenda no fim do ciclo (não chama Asaas) ──
    if (!immediate) {
      const { data: updated, error: updErr } = await admin
        .from('subscriptions')
        .update({
          cancel_at_period_end: true,
          cancel_reason: reason,
        })
        .eq('id', sub.id)
        .select('id, user_id, status, asaas_subscription_id, cancel_at_period_end, current_period_end, cancelled_at, cancel_reason')
        .single();
      if (updErr) {
        console.error('[asaas-cancel] update local (period_end):', updErr);
        return json(500, { error: 'falha ao agendar cancelamento' }, req);
      }
      return json(200, {
        ok: true,
        status: 'pending_period_end',
        subscription: updated,
      }, req);
    }

    // ── immediate=true: cancela direto no Asaas + atualiza local ──
    const asaasResp = await asaasFetch(
      ASAAS_BASE, ASAAS_KEY,
      `/subscriptions/${sub.asaas_subscription_id}/cancel`,
      { method: 'POST' },
    );

    if (!asaasResp.ok) {
      // Best-effort: marca cancel_at_period_end local pra UX não travar.
      console.error('[asaas-cancel] asaas cancel falhou:', asaasResp);
      const { data: updated } = await admin
        .from('subscriptions')
        .update({
          cancel_at_period_end: true,
          cancel_reason: reason,
        })
        .eq('id', sub.id)
        .select('id, user_id, status, asaas_subscription_id, cancel_at_period_end, current_period_end, cancelled_at, cancel_reason')
        .single();
      const detail = (asaasResp.body as { errors?: Array<{ description?: string }> } | null);
      const message = detail?.errors?.[0]?.description || `HTTP ${asaasResp.status}`;
      return json(200, {
        ok: true,
        status: 'pending_period_end',
        asaasError: message,
        subscription: updated,
      }, req);
    }

    // Asaas OK → cancela local imediatamente.
    const { data: updated, error: updErr } = await admin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason,
        cancel_at_period_end: true,
      })
      .eq('id', sub.id)
      .select('id, user_id, status, asaas_subscription_id, cancel_at_period_end, current_period_end, cancelled_at, cancel_reason')
      .single();
    if (updErr) {
      console.error('[asaas-cancel] update local (post-asaas):', updErr);
      return json(500, { error: 'asaas cancelou mas falha ao atualizar local', detail: updErr.message }, req);
    }

    return json(200, {
      ok: true,
      status: 'cancelled',
      subscription: updated,
    }, req);
  } catch (e) {
    console.error('[asaas-cancel] exception:', e);
    return json(500, { error: 'exception', message: (e as Error).message }, req);
  }
});
