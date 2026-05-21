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
//
// Critério de envio:
//   - onboarding.completed != true
//   - onboarding.startedAt < now() - 24h
//   - onboarding.lastReminderAt IS NULL OR < now() - 7 days  (não spamma)
//
// Retorna: { sent: number, failed: number, skipped: number, errors: [...] }
// ═══════════════════════════════════════════════════════════════════
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const APP_BASE_URL = 'https://haile.com.br';
const DEFAULT_BATCH = 200;
const MAX_BATCH = 1000;
const PAUSED_THRESHOLD_HOURS = 24;   // só lembra quem está parado há ≥24h
const COOLDOWN_DAYS = 7;             // não reenvia antes de 7 dias

// Mapeia step key (Store.ONBOARDING_STEPS) → label amigável no e-mail
const STEP_LABELS: Record<string, string> = {
  apresentacao:  'Apresentação do Haile',
  personalidade: 'Como o Haile fala com você',
  nome:          'Seu nome e avatar',
  familia:       'Sua estrutura familiar',
  situacao:      'Sua situação financeira',
  objetivo:      'Seu objetivo principal',
  primeira_acao: 'Por onde começamos',
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
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST')    return json(405, { error: 'use POST' });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY  = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const RESEND_KEY   = Deno.env.get('RESEND_API_KEY');

    if (!SUPABASE_URL || !SERVICE_KEY) return json(500, { error: 'SUPABASE_URL ou SERVICE_ROLE_KEY ausente' });
    if (!RESEND_KEY)                   return json(500, { error: 'RESEND_API_KEY ausente' });

    // ── Auth: bearer == service role ──
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    if (!token || token !== SERVICE_KEY) {
      return json(401, { error: 'service role bearer obrigatório' });
    }

    // ── Parse body ──
    let body: { dryRun?: boolean; batchSize?: number } = {};
    try {
      const raw = await req.text();
      if (raw) body = JSON.parse(raw);
    } catch (_) {
      return json(400, { error: 'body JSON inválido' });
    }
    const dryRun = !!body.dryRun;
    const batchSize = clamp(
      Number.isFinite(body.batchSize) ? Number(body.batchSize) : DEFAULT_BATCH,
      1, MAX_BATCH,
    );

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // ── Busca candidatos via RPC (definida na migration 008) ──
    const { data: candidates, error: fetchErr } = await admin.rpc('list_onboarding_reminders', {
      paused_hours: PAUSED_THRESHOLD_HOURS,
      cooldown_days: COOLDOWN_DAYS,
      max_rows: batchSize,
    });

    if (fetchErr) {
      console.error('[onboarding-reminder] fetch error:', fetchErr);
      return json(500, { error: fetchErr.message });
    }

    const rows = (candidates ?? []) as Candidate[];
    if (rows.length === 0) {
      return json(200, { sent: 0, failed: 0, skipped: 0, errors: [], message: 'nada a enviar' });
    }

    if (dryRun) {
      return json(200, {
        dryRun: true,
        wouldSend: rows.length,
        emails: rows.map(r => ({ email: r.email, step: STEP_LABELS[STEP_KEYS[r.paused_at_step]] ?? '?' })),
      });
    }

    // ── Loop de envio ──
    let sent = 0, failed = 0, skipped = 0;
    const errors: Array<{ email: string; type: string; message: string }> = [];
    const now = new Date();

    for (const c of rows) {
      try {
        if (!c.email) { skipped++; continue; }

        const stepKey = STEP_KEYS[c.paused_at_step] ?? STEP_KEYS[0];
        const stepLabel = STEP_LABELS[stepKey] ?? 'Sua configuração';
        const firstName = firstNameOf(c.name);
        const link = `${APP_BASE_URL}/app/app.html`;

        const emailRes = await sendEmail({
          apiKey: RESEND_KEY,
          to: c.email,
          name: firstName,
          step: stepLabel,
          link,
        });

        if (!emailRes.ok) {
          failed++;
          errors.push({ email: c.email, type: 'resend', message: emailRes.error ?? 'erro' });
          console.error('[onboarding-reminder] resend fail:', c.email, emailRes.error);
          continue;
        }

        // Marca lastReminderAt no jsonb do user_data via RPC dedicada
        // (jsonb_set não é atualizável via PATCH REST padrão)
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

    return json(200, { sent, failed, skipped, errors });
  } catch (e) {
    console.error('[onboarding-reminder] fatal:', e);
    return json(500, { error: (e as Error).message });
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
  const subject = `${args.name || 'Olá'}, vamos terminar de configurar?`;
  const html = renderTemplate(args.name, args.step, args.link);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${args.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Haile <oi@haile.com.br>',
      to: args.to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, error: `HTTP ${res.status} — ${text.slice(0, 240)}` };
  }
  return { ok: true };
}

function renderTemplate(nome: string, step: string, link: string): string {
  return TEMPLATE_HTML
    .replaceAll('{{ nome }}', escapeHtml(nome))
    .replaceAll('{{ step }}', escapeHtml(step))
    .replaceAll('{{ link }}', encodeAttr(link));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function encodeAttr(s: string): string {
  return s.replace(/"/g, '&quot;');
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

// Espelho compacto de /docs/emails/lembrete-onboarding.html
// Manter sincronizado quando o template oficial mudar.
const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta http-equiv="X-UA-Compatible" content="IE=edge" /><title>{{ nome }}, vamos terminar de configurar?</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background-color:#0B1020;font-family:'DM Sans',Arial,sans-serif;-webkit-text-size-adjust:100%}
a{color:inherit;text-decoration:none}
img{border:0;display:block;max-width:100%}
.email-wrapper{background-color:#0B1020;padding:40px 16px}
.email-container{max-width:560px;margin:0 auto}
.header{padding:32px 0 24px;text-align:center}
.header img{margin:0 auto;height:28px;width:auto}
.card{background-color:#131929;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden}
.hero-strip{background:linear-gradient(135deg,#7367F0 0%,#F472B6 100%);padding:36px 40px 32px;text-align:center}
.body{padding:32px 40px}
.body-text{font-size:15px;line-height:1.65;color:#94A3B8;margin-bottom:24px}
.body-text strong{color:#F8FAFC;font-weight:600}
.step-box{background:rgba(115,103,240,0.08);border:1px solid rgba(115,103,240,0.22);border-radius:12px;padding:18px 22px;margin-bottom:28px}
.cta-wrap{text-align:center;margin-bottom:28px}
.cta-btn{display:inline-block;background:linear-gradient(135deg,#7367F0,#5B4FCE);color:#ffffff !important;font-size:15px;font-weight:600;padding:14px 36px;border-radius:12px;letter-spacing:0.01em;text-decoration:none;box-shadow:0 4px 16px rgba(115,103,240,0.4)}
.link-fallback{font-size:12px;color:#334155;line-height:1.6;margin-bottom:28px;text-align:center}
.link-fallback a{color:#7367F0 !important;word-break:break-all}
.divider{border:0;border-top:1px solid rgba(255,255,255,0.06);margin:4px 0 24px}
.footer{padding:24px 40px 32px;text-align:center}
.footer-logo{margin:0 auto 16px}
.footer-text{font-size:12px;color:#334155;line-height:1.7}
.footer-text a{color:#7367F0 !important}
.footer-divider{border:0;border-top:1px solid rgba(255,255,255,0.04);margin:20px 0 16px}
@media only screen and (max-width:600px){.email-wrapper{padding:20px 12px}.hero-strip{padding:28px 24px 24px}.body{padding:24px 24px}.footer{padding:20px 24px 28px}.cta-btn{display:block !important;text-align:center}}
</style></head>
<body><div class="email-wrapper"><div class="email-container">
<div class="header"><img src="https://haile.com.br/assets/svg/haile-wordmark-white.svg" alt="Haile" height="24" /></div>
<div class="card">
<div class="hero-strip">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse">
<tr><td align="center">
<p style="font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.82);margin-bottom:10px;font-family:'DM Sans',Arial,sans-serif">Sem pressão</p>
<p style="font-size:26px;font-weight:700;color:#ffffff;line-height:1.25;font-family:'DM Sans',Arial,sans-serif"><strong>{{ nome }}</strong>,<br><span style="color:rgba(255,255,255,0.88);font-weight:400;font-size:19px">que tal continuar de onde parou?</span></p>
</td></tr></table>
</div>
<div class="body">
<p class="body-text">Oi, <strong>{{ nome }}</strong>! Sem pressão &mdash; só passei pra avisar que sua conta no <strong>Haile</strong> está esperando você terminar a configuração.</p>
<p class="body-text">Faltam poucos minutos pra você ter o painel pronto e o Coach começar a entender seus hábitos.</p>
<div class="step-box">
<p style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#7367F0;margin-bottom:6px;font-family:'DM Sans',Arial,sans-serif">Você parou em</p>
<p style="font-size:16px;font-weight:600;color:#F8FAFC;line-height:1.4;font-family:'DM Sans',Arial,sans-serif;margin:0">{{ step }}</p>
</div>
<div class="cta-wrap">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{ link }}" style="height:50px;v-text-anchor:middle;width:260px" arcsize="24%" stroke="f" fillcolor="#7367F0"><w:anchorlock/><center style="color:#ffffff;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600">Continuar configuração</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="{{ link }}" class="cta-btn">Continuar configuração &rarr;</a><!--<![endif]-->
</div>
<p class="link-fallback">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="{{ link }}">{{ link }}</a></p>
<hr class="divider" />
<p class="body-text" style="font-size:13px;color:#64748B;margin-bottom:0">Seus dados continuam salvos. Quando voltar, retomamos exatamente de onde parou &mdash; nada pra refazer.</p>
</div>
<div class="footer">
<hr class="footer-divider" />
<img src="https://haile.com.br/assets/svg/haile-mark-white.svg" alt="Haile" height="20" class="footer-logo" />
<p class="footer-text">Você recebeu este e-mail porque iniciou a configuração da sua conta no Haile.<br>Se preferir, é só ignorar &mdash; a gente não cobra nem reenvia.</p>
<p class="footer-text" style="margin-top:12px"><a href="https://haile.com.br">haile.com.br</a> &middot; <a href="https://haile.com.br/privacidade">Privacidade</a></p>
</div>
</div>
<p style="text-align:center;font-size:11px;color:#1E293B;margin-top:24px;font-family:'DM Sans',Arial,sans-serif">&copy; 2026 Haile &middot; Averse Tecnologia</p>
</div></div></body></html>`;
