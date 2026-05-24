import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// [M1] CORS restritivo: allowlist de origens permitidas.
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

// Sanitiza strings interpoladas em user_metadata do convite (vão pro e-mail).
// Permite letras, números, espaço, hífen, acento, apóstrofo, ponto. Trunca em 80 chars.
// Bloqueia HTML/markdown/URLs que poderiam virar phishing no template Resend.
function sanitizeDisplayName(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const cleaned = s.replace(/[<>{}[\]\\|`$]/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 80);
}

function sanitizeRole(s: unknown): string {
  const allowed = new Set(['owner', 'admin', 'editor', 'member']);
  if (typeof s !== 'string') return 'member';
  return allowed.has(s) ? s : 'member';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    // ── [U2] Auth gate: exige JWT válido do caller ─────────────────
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) {
      return json(401, { error: { type: 'unauthorized', message: 'Authorization header ausente' } }, req);
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('ANON_KEY');
    const SERVICE_KEY  = Deno.env.get('SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
      return json(500, { error: { type: 'config', message: 'env vars ausentes (SUPABASE_URL / SERVICE_ROLE_KEY / SUPABASE_ANON_KEY)' } }, req);
    }

    // Client com o JWT do user para validar identidade
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json(401, { error: { type: 'unauthorized', message: 'JWT inválido ou expirado' } }, req);
    }
    const callerId    = userData.user.id;
    const callerEmail = userData.user.email || '';

    // ── Input parsing + validação ──────────────────────────────────
    const payload = await req.json().catch(() => ({}));
    const { email, inviterName, role, pessoaName, familyName, familyId, redirectTo } = payload;

    if (!email || typeof email !== 'string') {
      return json(400, { error: { type: 'invalid_input', message: 'email obrigatório' } }, req);
    }
    // Email simples: rejeita strings óbvias de injection / >320 chars (RFC)
    const emailNorm = email.trim().toLowerCase();
    if (emailNorm.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return json(400, { error: { type: 'invalid_input', message: 'email inválido' } }, req);
    }
    if (emailNorm === callerEmail.toLowerCase()) {
      return json(400, { error: { type: 'invalid_input', message: 'não é possível convidar a si mesmo' } }, req);
    }

    // ── [U2] Ownership check: caller deve ser owner de familyId ────
    // Se familyId não vier no payload, infere a partir de family_groups onde owner=caller.
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    let resolvedFamilyId: string | null = null;
    if (familyId && typeof familyId === 'string') {
      const { data: fg, error: fgErr } = await admin
        .from('family_groups')
        .select('id, owner_id')
        .eq('id', familyId)
        .maybeSingle();
      if (fgErr || !fg) {
        return json(404, { error: { type: 'not_found', message: 'family_id inválido' } }, req);
      }
      if (fg.owner_id !== callerId) {
        return json(403, { error: { type: 'forbidden', message: 'apenas o owner da família pode convidar' } }, req);
      }
      resolvedFamilyId = fg.id;
    } else {
      // Sem familyId: aceita só se caller for owner de exatamente uma família.
      const { data: fams, error: famsErr } = await admin
        .from('family_groups')
        .select('id')
        .eq('owner_id', callerId);
      if (famsErr) return json(500, { error: { type: 'db', message: 'falha ao buscar família' } }, req);
      if (!fams || fams.length === 0) {
        return json(403, { error: { type: 'forbidden', message: 'caller não é owner de nenhuma família' } }, req);
      }
      if (fams.length > 1) {
        return json(400, { error: { type: 'invalid_input', message: 'familyId obrigatório (caller possui múltiplas famílias)' } }, req);
      }
      resolvedFamilyId = fams[0].id;
    }

    // ── Sanitização dos campos que vão pro e-mail (anti-phishing) ──
    const safeInviterName = sanitizeDisplayName(inviterName);
    const safeFamilyName  = sanitizeDisplayName(familyName);
    const safePessoaName  = sanitizeDisplayName(pessoaName);
    const safeRole        = sanitizeRole(role);

    const inviteOpts: Record<string, unknown> = {
      data: {
        invited_by:    safeInviterName,
        family_name:   safeFamilyName,
        role:          safeRole,
        pessoa_name:   safePessoaName,
        family_id:     resolvedFamilyId,
        // Trilha de quem disparou (auditoria server-side):
        _inviter_user: callerId,
      },
    };
    if (redirectTo && typeof redirectTo === 'string') {
      // Restringir redirect a domínios conhecidos para mitigar open redirect.
      try {
        const u = new URL(redirectTo);
        const allowedHosts = new Set(['haile.com.br', 'www.haile.com.br', 'localhost']);
        if (allowedHosts.has(u.hostname)) inviteOpts.redirectTo = redirectTo;
      } catch { /* ignora redirect inválido */ }
    }

    const { data, error } = await admin.auth.admin.inviteUserByEmail(emailNorm, inviteOpts);

    if (error) {
      const alreadyExists =
        error.message?.toLowerCase().includes('already') ||
        error.message?.toLowerCase().includes('registered') ||
        (error as { status?: number }).status === 422;

      console.error('[family-invite] Supabase error:', error);
      return json(alreadyExists ? 200 : 500, {
        sent: false,
        alreadyExists,
        error: { type: 'supabase_invite', message: error.message },
      }, req);
    }

    console.log(`[family-invite] sent to ${emailNorm} by ${callerEmail} (family=${resolvedFamilyId})`);
    return json(200, { sent: true, alreadyExists: false, userId: data?.user?.id || null }, req);
  } catch (e) {
    console.error('[family-invite] exception:', e);
    return json(500, { error: { type: 'exception', message: (e as Error).message } }, req);
  }
});

function json(status: number, body: unknown, req?: Request) {
  const cors = req ? corsHeaders(req) : { 'Access-Control-Allow-Origin': 'https://haile.com.br' };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}
