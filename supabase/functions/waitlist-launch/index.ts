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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TEMPLATE_EXPIRES_DAYS = 30;
const DEFAULT_BATCH = 100;
const MAX_BATCH = 500;
const APP_BASE_URL = 'https://haile.com.br';

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
    return new Response(null, { headers: CORS });
  }
  if (req.method !== 'POST') {
    return json(405, { error: { type: 'method', message: 'use POST' } });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    // Nome sem prefixo SUPABASE_ porque o CLI rejeita esse prefixo nos secrets.
    const SERVICE_KEY  = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const RESEND_KEY   = Deno.env.get('RESEND_API_KEY');

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json(500, { error: { type: 'config', message: 'SUPABASE_URL ou SERVICE_ROLE_KEY ausente' } });
    }
    if (!RESEND_KEY) {
      return json(500, { error: { type: 'config', message: 'RESEND_API_KEY ausente' } });
    }

    // ── Autenticação: exige bearer token igual ao service role ──
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';
    if (!token || token !== SERVICE_KEY) {
      return json(401, { error: { type: 'unauthorized', message: 'service role bearer token obrigatório' } });
    }

    // ── Parse do body (opcional) ──
    let body: LaunchBody = {};
    try {
      const raw = await req.text();
      if (raw) body = JSON.parse(raw) as LaunchBody;
    } catch (_) {
      return json(400, { error: { type: 'invalid_input', message: 'body JSON inválido' } });
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

    // ── Busca leads pendentes ──
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
      return json(500, { error: { type: 'fetch', message: fetchErr.message } });
    }

    const rows = (leads ?? []) as WaitlistRow[];
    if (rows.length === 0) {
      return json(200, { sent: 0, failed: 0, errors: [], message: 'nada a enviar' });
    }

    // ── Loop de disparo ──
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
          // E-mail saiu, mas DB não atualizou — registra como falha p/ retry manual.
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

    return json(200, { sent, failed, errors });
  } catch (e) {
    console.error('[waitlist-launch] fatal exception:', e);
    return json(500, { error: { type: 'exception', message: (e as Error).message } });
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
  const subject = `${args.name || 'Olá'}, o Haile está pronto`;
  const html = renderTemplate(args.name, args.link, args.expiresDays);

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

// Substitui as variáveis do template waitlist-lancamento.html.
// O template fica versionado em /docs/emails/ — aqui replicamos uma versão
// inline para evitar I/O na cold start. Manter sincronizado manualmente.
function renderTemplate(nome: string, link: string, expiresDays: number): string {
  return TEMPLATE_HTML
    .replaceAll('{{ nome }}', escapeHtml(nome))
    .replaceAll('{{ link }}', encodeAttr(link))
    .replaceAll('{{ expires_days }}', String(expiresDays));
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

// Espelho do /docs/emails/waitlist-lancamento.html.
// Mantenha sincronizado quando o template oficial mudar.
const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta http-equiv="X-UA-Compatible" content="IE=edge" /><title>{{ nome }}, o Haile está pronto</title>
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
.hero-strip{background:linear-gradient(135deg,#10B981 0%,#06B6D4 50%,#7367F0 100%);padding:36px 40px 32px;text-align:center}
.body{padding:32px 40px}
.body-text{font-size:15px;line-height:1.65;color:#94A3B8;margin-bottom:24px}
.body-text strong{color:#F8FAFC;font-weight:600}
.highlight-box{background:rgba(115,103,240,0.1);border:1px solid rgba(115,103,240,0.25);border-radius:12px;padding:20px 24px;margin-bottom:28px}
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
<!--[if mso]><table width="100%"><tr><td align="center"><![endif]-->
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse">
<tr><td align="center">
<p style="font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.78);margin-bottom:10px;font-family:'DM Sans',Arial,sans-serif">Sua vez chegou</p>
<p style="font-size:26px;font-weight:700;color:#ffffff;line-height:1.25;font-family:'DM Sans',Arial,sans-serif"><strong>{{ nome }}</strong>,<br><span style="color:rgba(255,255,255,0.9);font-weight:400;font-size:20px">o Haile está pronto pra você</span></p>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</div>
<div class="body">
<p class="body-text">Oi, <strong>{{ nome }}</strong>!</p>
<p class="body-text">Abrimos uma nova rodada de acesso ao <strong>Haile</strong> e você está no lote. Em poucos minutos dá pra criar a conta, configurar o grupo familiar e começar a organizar as finanças junto com quem importa.</p>
<div class="highlight-box">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse">
<tr><td style="padding:4px 0"><table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr><td style="width:8px;padding-right:12px;vertical-align:middle"><div style="width:8px;height:8px;border-radius:4px;background:#7367F0"></div></td><td style="font-size:14px;color:#94A3B8;font-family:'DM Sans',Arial,sans-serif;vertical-align:middle">Convite <strong style="color:#F8FAFC">pessoal e único</strong> — não compartilhe</td></tr></table></td></tr>
<tr><td style="padding:4px 0"><table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr><td style="width:8px;padding-right:12px;vertical-align:middle"><div style="width:8px;height:8px;border-radius:4px;background:#06B6D4"></div></td><td style="font-size:14px;color:#94A3B8;font-family:'DM Sans',Arial,sans-serif;vertical-align:middle">Expira em <strong style="color:#F8FAFC">{{ expires_days }} dias</strong></td></tr></table></td></tr>
<tr><td style="padding:4px 0"><table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr><td style="width:8px;padding-right:12px;vertical-align:middle"><div style="width:8px;height:8px;border-radius:4px;background:#10B981"></div></td><td style="font-size:14px;color:#94A3B8;font-family:'DM Sans',Arial,sans-serif;vertical-align:middle"><strong style="color:#F8FAFC">Setup guiado</strong> em menos de 5 minutos</td></tr></table></td></tr>
</table>
</div>
<div class="cta-wrap">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{ link }}" style="height:50px;v-text-anchor:middle;width:240px" arcsize="24%" stroke="f" fillcolor="#7367F0"><w:anchorlock/><center style="color:#ffffff;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600">Criar minha conta</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="{{ link }}" class="cta-btn">Criar minha conta &rarr;</a><!--<![endif]-->
</div>
<p class="link-fallback">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="{{ link }}">{{ link }}</a></p>
<hr class="divider" />
<p class="body-text" style="font-size:13px;color:#64748B;margin-bottom:0">Obrigado por ter esperado. A gente sabe que dinheiro em família é assunto sensível — e construímos o Haile pra que isso vire conversa, não tensão.</p>
</div>
<div class="footer">
<hr class="footer-divider" />
<img src="https://haile.com.br/assets/svg/haile-mark-white.svg" alt="Haile" height="20" class="footer-logo" />
<p class="footer-text">Este convite é pessoal e expira em <strong style="color:#94A3B8">{{ expires_days }} dias</strong>.<br>Se você não esperava este e-mail, pode ignorá-lo com segurança.</p>
<p class="footer-text" style="margin-top:12px"><a href="https://haile.com.br">haile.com.br</a> &middot; <a href="https://haile.com.br/privacidade">Privacidade</a></p>
</div>
</div>
<p style="text-align:center;font-size:11px;color:#1E293B;margin-top:24px;font-family:'DM Sans',Arial,sans-serif">&copy; 2026 Haile &middot; Averse Tecnologia</p>
</div></div></body></html>`;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}