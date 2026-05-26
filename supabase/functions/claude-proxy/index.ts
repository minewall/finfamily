import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// [M1] CORS restritivo: allowlist de origens permitidas. Em prod, apenas
// haile.com.br pode chamar; em dev, localhost comum. Origin não-allowlist
// recebe haile.com.br (browser bloqueia se origin real não bater).
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

// Allowlist de modelos aceitos (mantém-se em sincronia com app.js:14724-14726).
// Cliente envia o id; servidor valida e cai em DEFAULT se não bater.
const MODEL_ALLOWLIST = new Set([
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'claude-opus-4-7',
]);
// [M9] DEFAULT_MODEL configurável via env (hot-swap sem redeploy quando
// Anthropic lançar nova versão). Fallback p/ snapshot hardcoded caso a
// env não esteja setada.
const DEFAULT_MODEL = Deno.env.get('DEFAULT_MODEL') || 'claude-haiku-4-5-20251001';

// Cap de tokens por request — protege bill abuse + DoS.
// Cliente atualmente pede 2048 (app.js:16581). Cap em 4096 dá folga 2x sem
// permitir um request gigante derrubar custo.
const MAX_TOKENS_CAP = 4096;
const DEFAULT_MAX_TOKENS = 1024;

// Custo estimado em micro-USD (USD × 1e6) por 1k tokens.
// Fonte: pricing Anthropic (~Mai/2026, snapshot — atualizar se mudar).
const PRICING_PER_1K_MICRO_USD: Record<string, { in: number; out: number }> = {
  'claude-haiku-4-5-20251001':   { in:   800,  out:   4000 },  // $0.0008 in, $0.004 out
  'claude-sonnet-4-6':           { in:  3000,  out:  15000 },  // $0.003 in, $0.015 out
  'claude-opus-4-7':             { in: 15000,  out:  75000 },  // $0.015 in, $0.075 out
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    // ── [U3] Auth gate: exige JWT válido do caller ─────────────────
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) {
      return jsonErr(401, 'unauthorized', 'Authorization header ausente', req);
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('ANON_KEY');
    const apiKey       = Deno.env.get('ANTHROPIC_API_KEY');
    if (!SUPABASE_URL || !ANON_KEY) {
      return jsonErr(500, 'config', 'env Supabase ausente', req);
    }
    if (!apiKey) {
      return jsonErr(500, 'config', 'ANTHROPIC_API_KEY não configurada', req);
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonErr(401, 'unauthorized', 'JWT inválido ou expirado', req);
    }
    const callerId = userData.user.id;

    // ── Service role client (pra ler tier + caps + logar usage) ────
    const SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY');
    const adminClient = SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    }) : null;

    // ── Preflight: cap mensal do tier ──────────────────────────────
    // Se não tem service role configurada, pula o check (modo dev).
    let userTier = 'free';
    let monthlyCap = 50000; // default conservador
    let usedThisMonth = 0;
    if (adminClient) {
      try {
        // Tier do user
        const { data: profile } = await adminClient
          .from('profiles')
          .select('tier, role')
          .eq('id', callerId)
          .single();
        // Admin não tem cap operacional (só o cap "admin")
        userTier = profile?.role === 'admin' ? 'admin' : (profile?.tier || 'free');

        // Cap configurado pro tier
        const { data: capRow } = await adminClient
          .from('ai_usage_caps')
          .select('cap_tokens_month')
          .eq('tier', userTier)
          .single();
        if (capRow?.cap_tokens_month) monthlyCap = capRow.cap_tokens_month;

        // Consumo do mês corrente
        const { data: usageRow } = await adminClient
          .rpc('ai_usage_current_month', { target_user_id: callerId });
        const row = Array.isArray(usageRow) ? usageRow[0] : usageRow;
        if (row) usedThisMonth = (row.total_input_tokens || 0) + (row.total_output_tokens || 0);

        if (usedThisMonth >= monthlyCap) {
          return new Response(JSON.stringify({
            error: {
              type: 'quota_exceeded',
              message: 'Você atingiu o limite mensal de uso do Haile no seu plano.',
              tier: userTier,
              used: usedThisMonth,
              cap: monthlyCap,
            }
          }), {
            status: 429,
            headers: { ...corsHeaders(req), 'content-type': 'application/json' },
          });
        }
      } catch (e) {
        console.warn(`[claude-proxy] preflight check falhou (continuando sem cap): ${(e as Error).message}`);
        // Não bloqueia — preflight é best-effort. Logar fail vs negar serviço.
      }
    }

    // ── Parse + validação de input ─────────────────────────────────
    const payload = await req.json().catch(() => ({}));
    const { model, messages, system, max_tokens, tools, tool_choice } = payload;

    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonErr(400, 'invalid_input', 'messages obrigatório', req);
    }

    // Global override do admin: se app_settings.force_global_model = true,
    // ignora o pedido do cliente e força o default_model configurado.
    let globalDefaultModel = DEFAULT_MODEL;
    let forceGlobalModel = false;
    if (adminClient) {
      try {
        const { data: settings } = await adminClient
          .from('app_settings')
          .select('key, value')
          .in('key', ['default_model', 'force_global_model']);
        for (const s of (settings || [])) {
          if (s.key === 'default_model' && typeof s.value === 'string') {
            globalDefaultModel = s.value;
          } else if (s.key === 'force_global_model' && s.value === true) {
            forceGlobalModel = true;
          }
        }
      } catch (e) {
        console.warn(`[claude-proxy] app_settings read falhou: ${(e as Error).message}`);
      }
    }

    // Allowlist de modelo
    const requestedModel = forceGlobalModel
      ? globalDefaultModel
      : (typeof model === 'string' ? model : globalDefaultModel);
    const usedModel = MODEL_ALLOWLIST.has(requestedModel) ? requestedModel : globalDefaultModel;

    // Cap max_tokens
    let safeMaxTokens = typeof max_tokens === 'number' && max_tokens > 0
      ? Math.floor(max_tokens) : DEFAULT_MAX_TOKENS;
    if (safeMaxTokens > MAX_TOKENS_CAP) safeMaxTokens = MAX_TOKENS_CAP;

    const sysLen = typeof system === 'string' ? system.length : 0;
    const hasTools = Array.isArray(tools) && tools.length > 0;
    console.log(`[claude-proxy] user=${callerId} model=${usedModel} msgs=${messages.length} sysChars=${sysLen} maxTokens=${safeMaxTokens} tools=${hasTools ? tools.length : 0}`);

    const body: Record<string, unknown> = {
      model: usedModel,
      max_tokens: safeMaxTokens,
      system,
      messages,
    };
    if (hasTools) {
      body.tools = tools;
      if (tool_choice) body.tool_choice = tool_choice;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const rawText = await res.text();
    if (!res.ok) {
      console.error(`[claude-proxy] ← Anthropic ${res.status}: ${rawText.slice(0, 2000)}`);
    } else {
      console.log(`[claude-proxy] ← Anthropic ${res.status} OK (${rawText.length} bytes)`);
    }

    let parsed: any;
    try { parsed = JSON.parse(rawText); } catch { parsed = { error: { type: 'non_json_response', message: rawText.slice(0, 1000) } }; }

    // ── Post-call logging: persiste consumo em ai_usage ────────────
    // Best-effort: se falhar, não bloqueia a resposta do Coach.
    if (res.ok && adminClient && parsed?.usage) {
      const inTok  = parsed.usage.input_tokens  || 0;
      const outTok = parsed.usage.output_tokens || 0;
      const pricing = PRICING_PER_1K_MICRO_USD[usedModel];
      const costMicroUsd = pricing
        ? Math.round((inTok / 1000) * pricing.in + (outTok / 1000) * pricing.out)
        : 0;
      const requestId = parsed?.id || null;
      adminClient.from('ai_usage').insert({
        user_id:        callerId,
        model:          usedModel,
        input_tokens:   inTok,
        output_tokens:  outTok,
        cost_micro_usd: costMicroUsd,
        request_id:     requestId,
      }).then(({ error }) => {
        if (error) console.warn(`[claude-proxy] log ai_usage falhou: ${error.message}`);
      }).catch((e) => console.warn(`[claude-proxy] log ai_usage exception: ${e?.message}`));
    }

    return new Response(JSON.stringify(parsed), {
      status: res.status,
      headers: { ...corsHeaders(req), 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('[claude-proxy] exception:', e);
    return jsonErr(500, 'proxy_exception', (e as Error).message, req);
  }
});

function jsonErr(status: number, type: string, message: string, req?: Request) {
  const cors = req ? corsHeaders(req) : { 'Access-Control-Allow-Origin': 'https://haile.com.br' };
  return new Response(JSON.stringify({ error: { type, message } }), {
    status, headers: { ...cors, 'content-type': 'application/json' },
  });
}
