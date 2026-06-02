// ═══════════════════════════════════════════════════════════════════
// Edge Function — onboarding-reminder
//
// Envia e-mail de lembrete para usuários com onboarding pausado há 24h+.
// Idealmente disparada via Supabase Cron 1x ao dia (ex: 11h BRT / 14h UTC).
//
// Acesso: apenas service role (bearer token igual ao SERVICE_ROLE_KEY).
//
// POST /functions/v1/onboarding-reminder
//   Body opcional: { dryRun?: boolean = false, batchSize?: number = 200 }
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

const APP_BASE_URL = 'https://haile.com.br';
const DEFAULT_BATCH = 200;
const MAX_BATCH = 1000;
const PAUSED_THRESHOLD_HOURS = 24;
const COOLDOWN_DAYS = 7;
const FROM = 'Haile <oi@haile.com.br>';
const REPLY_TO = 'oi@haile.com.br';

const STEP_LABELS: Record<string, string> = {
  apresentacao:  'Apresentacao do Haile',
  personalidade: 'Como o Haile fala com voce',
  nome:          'Seu nome e avatar',
  familia:       'Sua estrutura familiar',
  situacao:      'Sua situacao financeira',
  objetivo:      'Seu objetivo principal',
  primeira_acao: 'Por onde comecamos',
};
const STEP_KEYS = Object.keys(STEP_LABELS);

interface Candidate {
  user_id: string;
  email: string;
  name: string;
  paused_at_step: number;
  started_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST')    return json(405, { error: 'use POST' }, req);

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY  = Deno.env.get('SERVICE_ROLE_KEY');
    const RESEND_KEY   = Deno.env.get('RESEND_API_KEY');

    if (!SUPABASE_URL || !SERVICE_KEY) return json(500, { error: 'SUPABASE_URL ou SERVICE_ROLE_KEY ausente' }, req);
    if (!RESEND_KEY)                   return json(500, { error: 'RESEND_API_KEY ausente' }, req);

    const auth = req.headers.get('authorization') ?? '';
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    if (!token || token !== SERVICE_KEY) {
      return json(401, { error: 'service role bearer obrigatório' }, req);
    }

    let body: { dryRun?: boolean; batchSize?: number } = {};
    try {
      const raw = await req.text();
      if (raw) body = JSON.parse(raw);
    } catch (_) {
      return json(400, { error: 'body JSON inválido' }, req);
    }
    const dryRun = !!body.dryRun;
    const batchSize = clamp(
      Number.isFinite(body.batchSize) ? Number(body.batchSize) : DEFAULT_BATCH,
      1, MAX_BATCH,
    );

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const { data: candidates, error: fetchErr } = await admin.rpc('list_onboarding_reminders', {
      paused_hours: PAUSED_THRESHOLD_HOURS,
      cooldown_days: COOLDOWN_DAYS,
      max_rows: batchSize,
    });

    if (fetchErr) {
      console.error('[onboarding-reminder] fetch error:', fetchErr);
      return json(500, { error: fetchErr.message }, req);
    }

    const rows = (candidates ?? []) as Candidate[];
    if (rows.length === 0) {
      return json(200, { sent: 0, failed: 0, skipped: 0, errors: [], message: 'nada a enviar' }, req);
    }

    if (dryRun) {
      return json(200, {
        dryRun: true,
        wouldSend: rows.length,
        emails: rows.map(r => ({ email: r.email, step: STEP_LABELS[STEP_KEYS[r.paused_at_step]] ?? '?' })),
      }, req);
    }

    let sent = 0, failed = 0, skipped = 0;
    const errors: Array<{ email: string; type: string; message: string }> = [];
    const now = new Date();

    for (const c of rows) {
      try {
        if (!c.email) { skipped++; continue; }

        const stepKey = STEP_KEYS[c.paused_at_step] ?? STEP_KEYS[0];
        const stepLabel = STEP_LABELS[stepKey] ?? 'Sua configuracao';
        const fn = firstNameOf(c.name);
        const link = `${APP_BASE_URL}/app/app.html`;

        const emailRes = await sendEmail({
          apiKey: RESEND_KEY,
          to: c.email,
          name: fn,
          step: stepLabel,
          link,
        });

        if (!emailRes.ok) {
          failed++;
          errors.push({ email: c.email, type: 'resend', message: emailRes.error ?? 'erro' });
          console.error('[onboarding-reminder] resend fail:', c.email, emailRes.error);
          continue;
        }

        const { error: rpcErr } = await admin.rpc('mark_onboarding_reminder_sent', {
          target_user_id: c.user_id,
          reminded_at: now.toISOString(),
        });
        if (rpcErr) {
          failed++;
          errors.push({ email: c.email, type: 'db_update', message: rpcErr.message });
          console.error('[onboarding-reminder] db update fail:', c.email, rpcErr);
          continue;
        }

        sent++;
        console.log(`[onboarding-reminder] sent to ${c.email} (step="${stepLabel}")`);
      } catch (e) {
        failed++;
        errors.push({ email: c.email, type: 'exception', message: (e as Error).message });
        console.error('[onboarding-reminder] exception:', c.email, e);
      }
    }

    return json(200, { sent, failed, skipped, errors }, req);
  } catch (e) {
    console.error('[onboarding-reminder] fatal:', e);
    return json(500, { error: (e as Error).message }, req);
  }
});

// ── helpers ───────────────────────────────────────────────────────

function firstNameOf(full: string): string {
  if (!full) return '';
  const parts = full.trim().split(/\s+/);
  return parts[0] ?? '';
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

interface SendArgs {
  apiKey: string;
  to: string;
  name: string;
  step: string;
  link: string;
}

async function sendEmail(args: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const subject = args.name
    ? `${args.name}, continuar de onde paramos?`
    : 'Continuar de onde paramos?';
  const html = renderTemplate(args.name, args.step, args.link);
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

function renderTemplate(nome: string, step: string, link: string): string {
  const greeting = nome
    ? `Oi, <strong>${escapeHtml(nome)}</strong>.`
    : `Oi.`;

  const stepBlock = `
      <div style="border:1px solid #E5E7EB;border-radius:10px;padding:16px 20px;margin:8px 0 20px;background:#F9FAFB">
        <p style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6B7280;margin:0 0 6px">Voce parou em</p>
        <p style="font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#111827;margin:0;line-height:1.4">${escapeHtml(step)}</p>
      </div>`;

  const bodyHtml = `
      <h1>Continuar de onde paramos?</h1>
      <p>${greeting} Sua conta no <strong>Haile</strong> esta esperando voce terminar a configuracao. Faltam poucos minutos pra ter o painel pronto e o Haile comecar a entender seus habitos.</p>
${stepBlock}
      <p class="muted">Seus dados estao salvos. Quando voltar, retomamos exatamente do mesmo ponto.</p>`;

  return renderEmail({
    preheader: `Faltam poucos minutos pra terminar de configurar o Haile.`,
    bodyHtml,
    ctaLabel: 'Continuar configuracao',
    ctaUrl: encodeAttr(link),
    ctaTone: 'indigo',
    footerNote: `Voce recebeu este e-mail porque iniciou a configuracao da sua conta no Haile. Se preferir, e so ignorar.`,
  });
}

function json(status: number, body: unknown, req?: Request): Response {
  const cors = req ? corsHeaders(req) : { 'Access-Control-Allow-Origin': 'https://haile.com.br' };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}
