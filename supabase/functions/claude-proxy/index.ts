import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// CORS: em produção restringir a origens conhecidas (ver [M1]).
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Allowlist de modelos aceitos (mantém-se em sincronia com app.js:14724-14726).
// Cliente envia o id; servidor valida e cai em DEFAULT se não bater.
const MODEL_ALLOWLIST = new Set([
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'claude-opus-4-7',
]);
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

// Cap de tokens por request — protege bill abuse + DoS.
// Cliente atualmente pede 2048 (app.js:16581). Cap em 4096 dá folga 2x sem
// permitir um request gigante derrubar custo.
const MAX_TOKENS_CAP = 4096;
const DEFAULT_MAX_TOKENS = 1024;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    // ── [U3] Auth gate: exige JWT válido do caller ─────────────────
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) {
      return jsonErr(401, 'unauthorized', 'Authorization header ausente');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('ANON_KEY');
    const apiKey       = Deno.env.get('ANTHROPIC_API_KEY');
    if (!SUPABASE_URL || !ANON_KEY) {
      return jsonErr(500, 'config', 'env Supabase ausente');
    }
    if (!apiKey) {
      return jsonErr(500, 'config', 'ANTHROPIC_API_KEY não configurada');
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonErr(401, 'unauthorized', 'JWT inválido ou expirado');
    }
    const callerId = userData.user.id;

    // ── Parse + validação de input ─────────────────────────────────
    const payload = await req.json().catch(() => ({}));
    const { model, messages, system, max_tokens, tools, tool_choice } = payload;

    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonErr(400, 'invalid_input', 'messages obrigatório');
    }

    // Allowlist de modelo
    const requestedModel = typeof model === 'string' ? model : DEFAULT_MODEL;
    const usedModel = MODEL_ALLOWLIST.has(requestedModel) ? requestedModel : DEFAULT_MODEL;

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

    let parsed: unknown;
    try { parsed = JSON.parse(rawText); } catch { parsed = { error: { type: 'non_json_response', message: rawText.slice(0, 1000) } }; }

    return new Response(JSON.stringify(parsed), {
      status: res.status,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('[claude-proxy] exception:', e);
    return jsonErr(500, 'proxy_exception', (e as Error).message);
  }
});

function jsonErr(status: number, type: string, message: string) {
  return new Response(JSON.stringify({ error: { type, message } }), {
    status, headers: { ...CORS, 'content-type': 'application/json' },
  });
}
