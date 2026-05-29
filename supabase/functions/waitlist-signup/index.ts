// ═══════════════════════════════════════════════════════════════════
// Edge Function — waitlist-signup
//
// Cadastro público na lista de espera. Substitui o INSERT direto via anon
// key (que tinha policy WITH CHECK(true) — vetor de spam). Valida os
// campos, aplica rate-limit por IP e insere via service role.
//
// POST /functions/v1/waitlist-signup
//   Body: { name, email, profile?, source? }
//   Respostas:
//     200 { ok: true }                      cadastro criado
//     200 { ok: false, code: 'duplicate' }  e-mail já cadastrado
//     400 { ok: false, code: 'invalid', message }
//     429 { ok: false, code: 'rate_limited' }
//     500 { ok: false, code: 'error' }
// ═══════════════════════════════════════════════════════════════════
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
    'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PROFILES = new Set(['individual', 'casal', 'familia', 'outro']);
const RATE_LIMIT_MAX = 5;        // cadastros por IP
const RATE_LIMIT_WINDOW_MIN = 60; // por hora

// HMAC-SHA256 do IP com salt do ambiente — guardamos pseudônimo, não o IP cru.
async function hashIp(ip: string): Promise<string> {
  const salt = Deno.env.get('WAITLIST_IP_SALT') || 'haile-waitlist-fallback-salt';
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(salt),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || '';
  const first = xff.split(',')[0].trim();
  return first || req.headers.get('cf-connecting-ip') || 'unknown';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(405, { ok: false, code: 'method' }, req);

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return json(400, { ok: false, code: 'invalid', message: 'JSON inválido.' }, req); }

  // ── Validação ────────────────────────────────────────────────
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const profileRaw = body.profile == null ? null : String(body.profile);
  const sourceRaw = body.source == null ? 'home' : String(body.source);

  if (!name || name.length > 200) {
    return json(400, { ok: false, code: 'invalid', message: 'Nome inválido.' }, req);
  }
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json(400, { ok: false, code: 'invalid', message: 'E-mail inválido.' }, req);
  }
  const profile = profileRaw && VALID_PROFILES.has(profileRaw) ? profileRaw : null;
  const source = sourceRaw.slice(0, 60);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_KEY = Deno.env.get('SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json(500, { ok: false, code: 'error', message: 'Configuração ausente.' }, req);
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // ── Rate-limit por IP (mesmo ip_hash na última hora) ──────────
  const ipHash = await hashIp(clientIp(req));
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60_000).toISOString();
  try {
    const { count, error: countErr } = await admin
      .from('waitlist')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since);
    if (!countErr && (count ?? 0) >= RATE_LIMIT_MAX) {
      return json(429, { ok: false, code: 'rate_limited' }, req);
    }
  } catch (_) { /* se a contagem falhar, não bloqueia o cadastro legítimo */ }

  // ── Insert ────────────────────────────────────────────────────
  const { error } = await admin.from('waitlist').insert({
    name, email, profile, source, ip_hash: ipHash,
  });

  if (error) {
    // 23505 = unique violation (e-mail já cadastrado)
    if ((error as { code?: string }).code === '23505') {
      return json(200, { ok: false, code: 'duplicate' }, req);
    }
    return json(500, { ok: false, code: 'error' }, req);
  }

  return json(200, { ok: true }, req);
});
