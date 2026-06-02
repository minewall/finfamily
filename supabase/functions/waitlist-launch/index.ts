// ═══════════════════════════════════════════════════════════════════
// Edge Function — waitlist-launch
//
// Dispara a campanha de convite de lançamento para leads da waitlist.
// Acesso: apenas service role (admin). Não exposta ao anon key.
//
// POST /functions/v1/waitlist-launch
//   Body opcional: { batchSize?: number = 100, source?: string }
//
// Retorna: { sent: number, failed: number, errors: [...] }
// ═══════════════════════════════════════════════════════════════════
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { renderEmail, escapeHtml, encodeAttr } from '../_shared/email-layout.ts';

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

const TEMPLATE_EXPIRES_DAYS = 30;
const DEFAULT_BATCH = 100;
const MAX_BATCH = 500;
const APP_BASE_URL = 'https://haile.com.br';
const FROM = 'Haile <oi@haile.com.br>';
const REPLY_TO = 'oi@haile.com.br';

interface WaitlistRow {
  id: string;
  name: string;
  email: string;
  source: string | null;
}

interface LaunchBody {
  batchSize?: number;
  source?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }
  if (req.method !== 'POST') {
    return json(405, { error: { type: 'method', message: 'use POST' } }, req);
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY  = Deno.env.get('SERVICE_ROLE_KEY');
    const RESEND_KEY   = Deno.env.get('RESEND_API_KEY');

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json(500, { error: { type: 'config', message: 'SUPABASE_URL ou SERVICE_ROLE_KEY ausente' } }, req);
    }
    if (!RESEND_KEY) {
      return json(500, { error: { type: 'config', message: 'RESEND_API_KEY ausente' } }, req);
    }

    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';
    if (!token || token !== SERVICE_KEY) {
      return json(401, { error: { type: 'unauthorized', message: 'service role bearer token obrigatório' } }, req);
    }

    let body: LaunchBody = {};
    try {
      const raw = await req.text();
      if (raw) body = JSON.parse(raw) as LaunchBody;
    } catch (_) {
      return json(400, { error: { type: 'invalid_input', message: 'body JSON inválido' } }, req);
    }

    const batchSize = clamp(
      Number.isFinite(body.batchSize) ? Number(body.batchSize) : DEFAULT_BATCH,
      1,
      MAX_BATCH,
    );
    const sourceFilter = typeof body.source === 'string' && body.source.trim()
      ? body.source.trim()
      : null;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    let query = admin
      .from('waitlist')
      .select('id, name, email, source')
      .is('invited_at', null)
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (sourceFilter) {
      query = query.eq('source', sourceFilter);
    }

    const { data: leads, error: fetchErr } = await query;
    if (fetchErr) {
      console.error('[waitlist-launch] fetch error:', fetchErr);
      return json(500, { error: { type: 'fetch', message: fetchErr.message } }, req);
    }

    const rows = (leads ?? []) as WaitlistRow[];
    if (rows.length === 0) {
      return json(200, { sent: 0, failed: 0, errors: [], message: 'nada a enviar' }, req);
    }

    let sent = 0;
    let failed = 0;
    const errors: Array<{ email: string; type: string; message: string }> = [];

    for (const lead of rows) {
      try {
        const inviteToken = crypto.randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + TEMPLATE_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
        const link = buildLink(inviteToken, lead.source);

        const emailRes = await sendEmail({
          apiKey: RESEND_KEY,
          to: lead.email,
          name: firstName(lead.name),
          link,
          expiresDays: TEMPLATE_EXPIRES_DAYS,
        });

        if (!emailRes.ok) {
          failed++;
          errors.push({ email: lead.email, type: 'resend', message: emailRes.error ?? 'erro desconhecido' });
          console.error('[waitlist-launch] resend fail:', lead.email, emailRes.error);
          continue;
        }

        const { error: updErr } = await admin
          .from('waitlist')
          .update({
            invited_at: now.toISOString(),
            invite_token: inviteToken,
            invite_expires_at: expiresAt.toISOString(),
          })
          .eq('id', lead.id);

        if (updErr) {
          failed++;
          errors.push({ email: lead.email, type: 'db_update', message: updErr.message });
          console.error('[waitlist-launch] update fail (email sent):', lead.email, updErr);
          continue;
        }

        sent++;
        console.log(`[waitlist-launch] sent to ${lead.email} (source=${lead.source ?? 'n/a'})`);
      } catch (e) {
        failed++;
        const msg = (e as Error).message;
        errors.push({ email: lead.email, type: 'exception', message: msg });
        console.error('[waitlist-launch] exception:', lead.email, msg);
      }
    }

    return json(200, { sent, failed, errors }, req);
  } catch (e) {
    console.error('[waitlist-launch] fatal exception:', e);
    return json(500, { error: { type: 'exception', message: (e as Error).message } }, req);
  }
});

// ── helpers ──────────────────────────────────────────────────────

function buildLink(token: string, source: string | null): string {
  const params = new URLSearchParams({ invite_token: token });
  params.set('source', source ?? 'waitlist');
  return `${APP_BASE_URL}/login.html?${params.toString()}`;
}

function firstName(full: string): string {
  if (!full) return '';
  return full.trim().split(/\s+/)[0] ?? '';
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

interface SendArgs {
  apiKey: string;
  to: string;
  name: string;
  link: string;
  expiresDays: number;
}

async function sendEmail(args: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const subject = args.name
    ? `${args.name}, o Haile esta pronto pra voce`
    : 'O Haile esta pronto pra voce';
  const html = renderTemplate(args.name, args.link, args.expiresDays);
  const body = JSON.stringify({
    from: FROM,
    to: args.to,
    reply_to: REPLY_TO,
    subject,
    html,
  });

  const MAX_ATTEMPTS = 3;
  let lastErr = '';
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const delay = 500 * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, delay));
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${args.apiKey}`,
        'content-type': 'application/json',
      },
      body,
    });
    if (res.ok) return { ok: true };
    const text = await res.text().catch(() => '');
    lastErr = `HTTP ${res.status} — ${text.slice(0, 240)}`;
    if (res.status !== 429 && res.status < 500) break;
  }
  return { ok: false, error: lastErr };
}

function renderTemplate(nome: string, link: string, expiresDays: number): string {
  const safeName = escapeHtml(nome || 'tudo bem');
  const greeting = nome
    ? `Oi, <strong>${escapeHtml(nome)}</strong>.`
    : `Oi, que bom te ver por aqui.`;

  const bodyHtml = `
      <h1>${nome ? safeName + ', sua vez chegou' : 'Sua vez chegou'}</h1>
      <p>${greeting} Abrimos uma nova rodada de acesso ao <strong>Haile</strong> e voce esta no lote. Em poucos minutos da pra criar a conta, configurar a familia e organizar as financas junto com quem importa.</p>
      <p class="muted">Convite pessoal e unico. Vale por <strong>${expiresDays} dias</strong>. Setup guiado em menos de 5 minutos.</p>`;

  return renderEmail({
    preheader: `O Haile esta pronto pra voce. Seu convite expira em ${expiresDays} dias.`,
    bodyHtml,
    ctaLabel: 'Criar minha conta',
    ctaUrl: encodeAttr(link),
    eyebrow: 'Convite de lancamento',
    ctaTone: 'indigo',
    footerNote: `Obrigado por ter esperado. Se voce nao esperava este e-mail, pode ignorar com seguranca.`,
  });
}

function json(status: number, body: unknown, req?: Request): Response {
  const cors = req ? corsHeaders(req) : { 'Access-Control-Allow-Origin': 'https://haile.com.br' };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}
