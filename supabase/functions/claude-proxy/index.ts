import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const { model, messages, system, max_tokens, tools, tool_choice } = await req.json();

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada' }), {
        status: 500, headers: { ...CORS, 'content-type': 'application/json' },
      });
    }

    const usedModel = model || 'claude-haiku-4-5-20251001';
    const msgCount = Array.isArray(messages) ? messages.length : 0;
    const sysLen = typeof system === 'string' ? system.length : 0;
    const hasTools = Array.isArray(tools) && tools.length > 0;
    console.log(`[claude-proxy] → model=${usedModel} msgs=${msgCount} sysChars=${sysLen} maxTokens=${max_tokens || 1024} tools=${hasTools ? tools.length : 0}`);

    const body: Record<string, unknown> = {
      model: usedModel,
      max_tokens: max_tokens || 1024,
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
    return new Response(JSON.stringify({ error: { type: 'proxy_exception', message: (e as Error).message } }), {
      status: 500, headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
