// ═══════════════════════════════════════════════════════════════════
// Shared email layout — Haile
//
// Helper único para renderizar o HTML dos emails transacionais
// (waitlist-launch, onboarding-reminder, family-invite via Auth template,
// e os 4 templates do Supabase Auth). Mantém branding, voz e markup
// consistentes entre todas as funções.
//
// Princípios:
//   - DM Sans inline (Gmail/Outlook precisam de family inline)
//   - Sem emojis (regra Haile absoluta) — usa SVG inline quando precisa
//   - Cores marca: indigo #4338CA, teal #0F766E, ink #111827,
//     mist #6B7280, bg #F9FAFB, branco #FFFFFF
//   - Layout claro (bg #F9FAFB), card branco, sem gradientes berrantes
//   - Outlook-safe: usa table-based no CTA + VML p/ botão
// ═══════════════════════════════════════════════════════════════════

export interface RenderEmailArgs {
  /** Texto curto que aparece como preview no inbox (preheader, oculto). */
  preheader: string;
  /** Corpo do email (HTML interno do card). Pode conter <p>, <h1>, etc. */
  bodyHtml: string;
  /** Label do botão CTA (opcional). Se omitido, não renderiza CTA. */
  ctaLabel?: string;
  /** URL do botão CTA (obrigatório se ctaLabel estiver presente). */
  ctaUrl?: string;
  /** Texto opcional logo acima do CTA (ex: "Convite pessoal"). */
  eyebrow?: string;
  /** Cor do CTA — padrão indigo. Use 'teal' para acento. */
  ctaTone?: 'indigo' | 'teal';
  /** Mostra link de fallback embaixo do CTA. Default true se ctaUrl existir. */
  showLinkFallback?: boolean;
  /** Linha extra no footer (acima do "haile.com.br · Privacidade"). */
  footerNote?: string;
}

const COLORS = {
  indigo: '#4338CA',
  indigoDark: '#3730A3',
  teal: '#0F766E',
  tealDark: '#0D5F58',
  ink: '#111827',
  mist: '#6B7280',
  bg: '#F9FAFB',
  border: '#E5E7EB',
  cardBg: '#FFFFFF',
} as const;

const FONT_STACK = `'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`;

/**
 * Renderiza o HTML completo do email, com header (wordmark Haile), card
 * branco com o conteúdo, CTA opcional e footer com links institucionais.
 */
export function renderEmail(args: RenderEmailArgs): string {
  const tone = args.ctaTone ?? 'indigo';
  const ctaBg = tone === 'teal' ? COLORS.teal : COLORS.indigo;
  const ctaBgDark = tone === 'teal' ? COLORS.tealDark : COLORS.indigoDark;
  const showLink = args.showLinkFallback ?? Boolean(args.ctaUrl);

  const ctaBlock = args.ctaLabel && args.ctaUrl ? renderCta({
    label: args.ctaLabel,
    url: args.ctaUrl,
    bg: ctaBg,
    bgDark: ctaBgDark,
    eyebrow: args.eyebrow,
  }) : '';

  const linkFallback = showLink && args.ctaUrl ? `
    <p style="font-size:12px;line-height:1.6;color:${COLORS.mist};margin:0 0 24px;text-align:center;font-family:${FONT_STACK}">
      Se o botão não funcionar, copie e cole este link no navegador:<br>
      <a href="${args.ctaUrl}" style="color:${COLORS.indigo};word-break:break-all;text-decoration:none">${args.ctaUrl}</a>
    </p>` : '';

  const footerNote = args.footerNote ? `
    <p style="font-size:12px;line-height:1.65;color:${COLORS.mist};margin:0 0 12px;font-family:${FONT_STACK}">${args.footerNote}</p>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Haile</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
*{box-sizing:border-box}
body,table,td,p,h1,h2,h3{margin:0;padding:0}
body{background-color:${COLORS.bg};font-family:${FONT_STACK};color:${COLORS.ink};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
img{border:0;display:block;max-width:100%;height:auto}
a{color:${COLORS.indigo};text-decoration:none}
.preheader{display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;font-size:1px;line-height:1px;mso-hide:all;overflow:hidden}
.wrapper{background-color:${COLORS.bg};padding:32px 16px}
.container{max-width:560px;margin:0 auto}
.header{padding:8px 0 24px;text-align:left}
.card{background-color:${COLORS.cardBg};border:1px solid ${COLORS.border};border-radius:16px;padding:40px 40px 32px}
.card h1{font-family:${FONT_STACK};font-size:24px;line-height:1.3;font-weight:700;color:${COLORS.ink};margin:0 0 16px}
.card h2{font-family:${FONT_STACK};font-size:18px;line-height:1.35;font-weight:600;color:${COLORS.ink};margin:24px 0 12px}
.card p{font-family:${FONT_STACK};font-size:15px;line-height:1.65;color:${COLORS.ink};margin:0 0 16px}
.card p.muted{color:${COLORS.mist};font-size:14px}
.card strong{font-weight:600;color:${COLORS.ink}}
.card a{color:${COLORS.indigo};text-decoration:underline}
.divider{border:0;border-top:1px solid ${COLORS.border};margin:24px 0}
.footer{padding:24px 24px 8px;text-align:center}
.footer p{font-family:${FONT_STACK};font-size:12px;line-height:1.65;color:${COLORS.mist};margin:0 0 8px}
.footer a{color:${COLORS.mist};text-decoration:underline}
@media only screen and (max-width:600px){
  .wrapper{padding:16px 12px}
  .card{padding:28px 24px 24px;border-radius:12px}
  .card h1{font-size:22px}
}
</style>
</head>
<body>
<span class="preheader">${escapeHtml(args.preheader)}</span>
<div class="wrapper">
  <div class="container">
    <div class="header">
      <span style="font-family:${FONT_STACK};font-size:20px;font-weight:700;letter-spacing:-0.01em;color:${COLORS.ink}">Haile</span>
    </div>
    <div class="card">
${args.bodyHtml}
${ctaBlock}
${linkFallback}
    </div>
    <div class="footer">
${footerNote}
      <p>
        <a href="https://haile.com.br">haile.com.br</a>
        &nbsp;&middot;&nbsp;
        <a href="https://haile.com.br/privacidade">Privacidade</a>
        &nbsp;&middot;&nbsp;
        <a href="https://haile.com.br/termos">Termos</a>
      </p>
      <p>Averse Tecnologia &middot; Sao Paulo, Brasil</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

interface CtaArgs {
  label: string;
  url: string;
  bg: string;
  bgDark: string;
  eyebrow?: string;
}

function renderCta(args: CtaArgs): string {
  const eyebrow = args.eyebrow ? `
        <p style="font-family:${FONT_STACK};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.mist};margin:0 0 12px;text-align:center">${escapeHtml(args.eyebrow)}</p>` : '';
  return `
    <div style="text-align:center;margin:8px 0 24px">
${eyebrow}
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${args.url}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="20%" stroke="f" fillcolor="${args.bg}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:600;">${escapeHtml(args.label)}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${args.url}" style="display:inline-block;background-color:${args.bg};color:#ffffff;font-family:${FONT_STACK};font-size:15px;font-weight:600;line-height:1;padding:16px 32px;border-radius:10px;text-decoration:none;border-bottom:2px solid ${args.bgDark}">${escapeHtml(args.label)}</a>
      <!--<![endif]-->
    </div>`;
}

/** Sanitiza para uso em texto HTML. */
export function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Sanitiza para uso em atributo (href/src). */
export function encodeAttr(s: string): string {
  return String(s ?? '').replace(/"/g, '&quot;');
}
