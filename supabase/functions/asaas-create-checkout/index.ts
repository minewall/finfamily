// asaas-create-checkout
// Cria (ou reaproveita) customer + subscription no Asaas para o user logado
// e devolve checkoutUrl/QR de pagamento da primeira fatura.
//
// Idempotência:
//  - customer: 1 por user (subscriptions.asaas_customer_id). Não recria.
//  - subscription Asaas: se subscriptions.asaas_subscription_id != null,
//    retorna o que já existe sem chamar Asaas de novo.
//  - billingType 'UNDEFINED' deixa o checkout do Asaas oferecer todos os
//    métodos (PIX, cartão, boleto) — evita travar antes de cobrança real.

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

interface PlanRow {
  id: string;
  tier: 'base' | 'premium';
  billing_interval: 'monthly' | 'annual';
  amount_cents: number;
  currency: string;
  is_active: boolean;
  name: string;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  family_id: string | null;
  plan_id: string | null;
  tier: string;
  status: string;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  billing_cycle: string | null;
  trial_end_at: string | null;
}

interface AsaasCustomer {
  id: string;
  name?: string;
  email?: string;
}

interface AsaasSubscription {
  id: string;
  status?: string;
  nextDueDate?: string;
  value?: number;
  cycle?: string;
}

interface AsaasPayment {
  id: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  status?: string;
  dueDate?: string;
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
      'User-Agent': 'haile-checkout/1.0',
      ...(init.headers || {}),
    },
  });
  let body: unknown = null;
  try { body = await resp.json(); } catch { /* sem corpo */ }
  return { ok: resp.ok, status: resp.status, body };
}

// O Asaas devolve a 1a fatura via /subscriptions/{id}/payments — buscar
// pra retornar checkoutUrl/PIX já no response da função.
async function fetchFirstPayment(
  baseUrl: string,
  apiKey: string,
  subscriptionId: string,
): Promise<AsaasPayment | null> {
  const { ok, body } = await asaasFetch(
    baseUrl, apiKey,
    `/subscriptions/${subscriptionId}/payments?limit=1`,
  );
  if (!ok) return null;
  const list = (body as { data?: AsaasPayment[] })?.data || [];
  return list[0] || null;
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

    const user = userData.user;
    const userId = user.id;
    const userEmail = user.email || '';
    const userName = (user.user_metadata?.name as string | undefined)
      || (user.user_metadata?.full_name as string | undefined)
      || userEmail.split('@')[0]
      || 'Usuário Haile';

    // ── Input ──
    const payload = await req.json().catch(() => ({}));
    const planId = typeof payload?.planId === 'string' ? payload.planId : '';
    if (!planId) return json(400, { error: 'planId obrigatório' }, req);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // ── Plano ──
    const { data: plan, error: planErr } = await admin
      .from('plans')
      .select('id, tier, billing_interval, amount_cents, currency, is_active, name')
      .eq('id', planId)
      .maybeSingle<PlanRow>();
    if (planErr || !plan) return json(404, { error: 'plano não encontrado' }, req);
    if (!plan.is_active) return json(400, { error: 'plano inativo' }, req);
    if (plan.amount_cents <= 0) return json(400, { error: 'plano sem preço configurado' }, req);

    // ── Subscription local: pega a do user (uq) ou cria placeholder ──
    let { data: sub } = await admin
      .from('subscriptions')
      .select('id, user_id, family_id, plan_id, tier, status, asaas_customer_id, asaas_subscription_id, billing_cycle, trial_end_at')
      .eq('user_id', userId)
      .maybeSingle<SubscriptionRow>();

    if (!sub) {
      const { data: created, error: createErr } = await admin
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: plan.id,
          tier: plan.tier,
          status: 'trial',
          billing_cycle: plan.billing_interval,
        })
        .select('id, user_id, family_id, plan_id, tier, status, asaas_customer_id, asaas_subscription_id, billing_cycle, trial_end_at')
        .single<SubscriptionRow>();
      if (createErr || !created) {
        console.error('[asaas-create-checkout] insert subscription:', createErr);
        return json(500, { error: 'falha ao criar subscription local' }, req);
      }
      sub = created;
    }

    // Curto-circuita: subscription Asaas já existe pra esse user → retorna o que tem.
    if (sub.asaas_subscription_id) {
      const first = await fetchFirstPayment(ASAAS_BASE, ASAAS_KEY, sub.asaas_subscription_id);
      return json(200, {
        alreadyExists: true,
        asaasSubscriptionId: sub.asaas_subscription_id,
        asaasCustomerId: sub.asaas_customer_id,
        checkoutUrl: first?.invoiceUrl || null,
        bankSlipUrl: first?.bankSlipUrl || null,
        firstPaymentId: first?.id || null,
        status: sub.status,
      }, req);
    }

    // ── Customer no Asaas (idempotente via externalReference=user.id) ──
    let asaasCustomerId = sub.asaas_customer_id;
    if (!asaasCustomerId) {
      const lookup = await asaasFetch(
        ASAAS_BASE, ASAAS_KEY,
        `/customers?externalReference=${encodeURIComponent(userId)}&limit=1`,
      );
      const found = (lookup.body as { data?: AsaasCustomer[] })?.data?.[0];
      if (lookup.ok && found?.id) {
        asaasCustomerId = found.id;
      } else {
        const customerPayload: Record<string, unknown> = {
          name: userName,
          email: userEmail,
          externalReference: userId,
          notificationDisabled: false,
        };
        const createCust = await asaasFetch(ASAAS_BASE, ASAAS_KEY, '/customers', {
          method: 'POST',
          body: JSON.stringify(customerPayload),
        });
        if (!createCust.ok) {
          console.error('[asaas-create-checkout] create customer:', createCust);
          return json(502, { error: 'asaas: falha ao criar customer', detail: createCust.body }, req);
        }
        asaasCustomerId = (createCust.body as AsaasCustomer)?.id || null;
        if (!asaasCustomerId) {
          return json(502, { error: 'asaas: resposta sem customer id' }, req);
        }
      }

      await admin
        .from('subscriptions')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', sub.id);
    }

    // ── Subscription no Asaas ──
    // nextDueDate: amanhã, formato YYYY-MM-DD (Asaas usa data SP-naive).
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const yyyy = tomorrow.getUTCFullYear();
    const mm = String(tomorrow.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getUTCDate()).padStart(2, '0');
    const nextDueDate = `${yyyy}-${mm}-${dd}`;
    const cycle = plan.billing_interval === 'annual' ? 'YEARLY' : 'MONTHLY';
    const value = Math.round(plan.amount_cents) / 100;

    const subBody: Record<string, unknown> = {
      customer: asaasCustomerId,
      billingType: 'UNDEFINED',
      value,
      nextDueDate,
      cycle,
      description: `Haile · ${plan.name} (${plan.billing_interval})`,
      externalReference: sub.id,
    };

    const subCreate = await asaasFetch(ASAAS_BASE, ASAAS_KEY, '/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subBody),
    });
    if (!subCreate.ok) {
      console.error('[asaas-create-checkout] create subscription:', subCreate);
      return json(502, { error: 'asaas: falha ao criar subscription', detail: subCreate.body }, req);
    }
    const asaasSub = subCreate.body as AsaasSubscription;
    if (!asaasSub?.id) {
      return json(502, { error: 'asaas: resposta sem subscription id' }, req);
    }

    await admin
      .from('subscriptions')
      .update({
        asaas_subscription_id: asaasSub.id,
        billing_cycle: plan.billing_interval,
        plan_id: plan.id,
        tier: plan.tier,
        next_due_date: nextDueDate,
      })
      .eq('id', sub.id);

    // Primeira fatura (criada async pelo Asaas) — pequena espera + fetch.
    let first: AsaasPayment | null = null;
    for (let i = 0; i < 3; i++) {
      first = await fetchFirstPayment(ASAAS_BASE, ASAAS_KEY, asaasSub.id);
      if (first) break;
      await new Promise((r) => setTimeout(r, 500));
    }

    return json(200, {
      alreadyExists: false,
      asaasSubscriptionId: asaasSub.id,
      asaasCustomerId,
      checkoutUrl: first?.invoiceUrl || null,
      bankSlipUrl: first?.bankSlipUrl || null,
      firstPaymentId: first?.id || null,
      status: 'pending',
    }, req);
  } catch (e) {
    console.error('[asaas-create-checkout] exception:', e);
    return json(500, { error: 'exception', message: (e as Error).message }, req);
  }
});
