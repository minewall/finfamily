# Templates de Email — Supabase Auth (Dashboard)

Esses templates ficam em **Authentication → Email Templates** no Dashboard do Supabase. Não são deployados via código — precisam ser **colados manualmente** uma vez (e re-colados quando mudam).

Compartilham o mesmo layout claro do helper `supabase/functions/_shared/email-layout.ts` (DM Sans, card branco em fundo `#F9FAFB`, indigo `#4338CA`, sem emojis, voz orientadora).

---

## Como aplicar

1. Acesse o Dashboard do Supabase → **Authentication → Email Templates**.
2. Selecione o template (`Confirm signup`, `Invite user`, `Magic Link`, `Reset Password`).
3. Atualize **Subject** com a sugestão abaixo.
4. Cole o HTML correspondente no campo **Body**.
5. As variáveis nativas do Supabase (`{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .Data.* }}`) já estão no markup — não precisa substituir.
6. Salve e envie um email de teste pra um inbox real (Gmail e Outlook web são os principais).

> **From / Reply-to**: configure em **Project Settings → Authentication → SMTP Settings**.
> Remetente: `Haile <oi@haile.com.br>` — Reply-to: `oi@haile.com.br`.

---

## 1) Confirm signup

**Subject sugerido:** `Confirme seu e-mail no Haile`

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Confirme seu e-mail no Haile</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
*{box-sizing:border-box}
body,table,td,p,h1{margin:0;padding:0}
body{background:#F9FAFB;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827}
a{color:#4338CA;text-decoration:none}
.preheader{display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;font-size:1px;line-height:1px;mso-hide:all;overflow:hidden}
.wrapper{background:#F9FAFB;padding:32px 16px}
.container{max-width:560px;margin:0 auto}
.header{padding:8px 0 24px}
.card{background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:40px}
.card h1{font-size:24px;line-height:1.3;font-weight:700;color:#111827;margin:0 0 16px}
.card p{font-size:15px;line-height:1.65;color:#111827;margin:0 0 16px}
.card p.muted{color:#6B7280;font-size:14px}
.footer{padding:24px;text-align:center}
.footer p{font-size:12px;line-height:1.65;color:#6B7280;margin:0 0 8px}
.footer a{color:#6B7280;text-decoration:underline}
@media only screen and (max-width:600px){.wrapper{padding:16px 12px}.card{padding:28px 24px;border-radius:12px}.card h1{font-size:22px}}
</style>
</head>
<body>
<span class="preheader">Falta so confirmar seu e-mail pra acessar o Haile.</span>
<div class="wrapper"><div class="container">
  <div class="header"><span style="font-size:20px;font-weight:700;letter-spacing:-0.01em;color:#111827">Haile</span></div>
  <div class="card">
    <h1>Confirme seu e-mail</h1>
    <p>Oi. Tudo certo na criacao da sua conta no <strong>Haile</strong>. Falta so confirmar que este e-mail e seu mesmo.</p>
    <div style="text-align:center;margin:24px 0">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{ .ConfirmationURL }}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="20%" stroke="f" fillcolor="#4338CA"><w:anchorlock/><center style="color:#fff;font-family:Arial,sans-serif;font-size:15px;font-weight:600">Confirmar e-mail</center></v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#4338CA;color:#fff;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;line-height:1;padding:16px 32px;border-radius:10px;text-decoration:none;border-bottom:2px solid #3730A3">Confirmar e-mail</a>
      <!--<![endif]-->
    </div>
    <p class="muted" style="text-align:center;font-size:12px">Se o botao nao funcionar, copie e cole este link:<br><a href="{{ .ConfirmationURL }}" style="color:#4338CA;word-break:break-all">{{ .ConfirmationURL }}</a></p>
    <hr style="border:0;border-top:1px solid #E5E7EB;margin:24px 0" />
    <p class="muted">Se voce nao criou conta no Haile, e so ignorar este e-mail. Nada vai acontecer.</p>
  </div>
  <div class="footer">
    <p><a href="https://haile.com.br">haile.com.br</a> &middot; <a href="https://haile.com.br/privacidade">Privacidade</a> &middot; <a href="https://haile.com.br/termos">Termos</a></p>
    <p>Averse Tecnologia &middot; Sao Paulo, Brasil</p>
  </div>
</div></div>
</body></html>
```

---

## 2) Invite user

> Usado tanto pelo fluxo de **convite de familia** (`family-invite`) quanto pelo **convite de admin**. O Supabase passa `{{ .Data.* }}` com o metadata vindo de `inviteUserByEmail({ data: {...} })`.

**Subject sugerido:** `Voce foi convidado pro Haile`

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Convite pro Haile</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
*{box-sizing:border-box}
body,table,td,p,h1{margin:0;padding:0}
body{background:#F9FAFB;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827}
a{color:#4338CA;text-decoration:none}
.preheader{display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;font-size:1px;line-height:1px;mso-hide:all;overflow:hidden}
.wrapper{background:#F9FAFB;padding:32px 16px}
.container{max-width:560px;margin:0 auto}
.header{padding:8px 0 24px}
.card{background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:40px}
.card h1{font-size:24px;line-height:1.3;font-weight:700;color:#111827;margin:0 0 16px}
.card p{font-size:15px;line-height:1.65;color:#111827;margin:0 0 16px}
.card p.muted{color:#6B7280;font-size:14px}
.footer{padding:24px;text-align:center}
.footer p{font-size:12px;line-height:1.65;color:#6B7280;margin:0 0 8px}
.footer a{color:#6B7280;text-decoration:underline}
@media only screen and (max-width:600px){.wrapper{padding:16px 12px}.card{padding:28px 24px;border-radius:12px}.card h1{font-size:22px}}
</style>
</head>
<body>
<span class="preheader">{{ .Data.invited_by }} convidou voce pra organizar as financas juntos no Haile.</span>
<div class="wrapper"><div class="container">
  <div class="header"><span style="font-size:20px;font-weight:700;letter-spacing:-0.01em;color:#111827">Haile</span></div>
  <div class="card">
    {{ if .Data.admin_invite }}
      <h1>Seu acesso ao Haile chegou</h1>
      <p>Oi. Voce foi adicionado como membro do <strong>Haile</strong> pelo nosso time. Eh so aceitar o convite, criar uma senha e voce ja entra direto no painel.</p>
      <p class="muted">Plano inicial: <strong>{{ .Data.initial_tier }}</strong>.</p>
    {{ else }}
      <h1>{{ .Data.invited_by }} convidou voce</h1>
      <p>Oi. <strong>{{ .Data.invited_by }}</strong> quer organizar as financas da familia <strong>{{ .Data.family_name }}</strong> junto com voce no Haile. Vamos junto?</p>
      <p class="muted">Aceitar o convite leva menos de 1 minuto. Voce define sua senha e ja entra direto na familia.</p>
    {{ end }}
    <div style="text-align:center;margin:24px 0">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{ .ConfirmationURL }}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="20%" stroke="f" fillcolor="#4338CA"><w:anchorlock/><center style="color:#fff;font-family:Arial,sans-serif;font-size:15px;font-weight:600">Aceitar convite</center></v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#4338CA;color:#fff;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;line-height:1;padding:16px 32px;border-radius:10px;text-decoration:none;border-bottom:2px solid #3730A3">Aceitar convite</a>
      <!--<![endif]-->
    </div>
    <p class="muted" style="text-align:center;font-size:12px">Se o botao nao funcionar, copie e cole este link:<br><a href="{{ .ConfirmationURL }}" style="color:#4338CA;word-break:break-all">{{ .ConfirmationURL }}</a></p>
    <hr style="border:0;border-top:1px solid #E5E7EB;margin:24px 0" />
    <p class="muted">Se voce nao reconhece este convite, e so ignorar. Nenhuma conta sera criada sem voce confirmar.</p>
  </div>
  <div class="footer">
    <p><a href="https://haile.com.br">haile.com.br</a> &middot; <a href="https://haile.com.br/privacidade">Privacidade</a> &middot; <a href="https://haile.com.br/termos">Termos</a></p>
    <p>Averse Tecnologia &middot; Sao Paulo, Brasil</p>
  </div>
</div></div>
</body></html>
```

---

## 3) Magic Link

**Subject sugerido:** `Seu link de acesso ao Haile`

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Seu link de acesso ao Haile</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
*{box-sizing:border-box}body,table,td,p,h1{margin:0;padding:0}
body{background:#F9FAFB;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827}
a{color:#4338CA;text-decoration:none}
.preheader{display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;font-size:1px;line-height:1px;mso-hide:all;overflow:hidden}
.wrapper{background:#F9FAFB;padding:32px 16px}
.container{max-width:560px;margin:0 auto}
.header{padding:8px 0 24px}
.card{background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:40px}
.card h1{font-size:24px;line-height:1.3;font-weight:700;color:#111827;margin:0 0 16px}
.card p{font-size:15px;line-height:1.65;color:#111827;margin:0 0 16px}
.card p.muted{color:#6B7280;font-size:14px}
.footer{padding:24px;text-align:center}
.footer p{font-size:12px;line-height:1.65;color:#6B7280;margin:0 0 8px}
.footer a{color:#6B7280;text-decoration:underline}
@media only screen and (max-width:600px){.wrapper{padding:16px 12px}.card{padding:28px 24px;border-radius:12px}.card h1{font-size:22px}}
</style>
</head>
<body>
<span class="preheader">Seu link de acesso ao Haile. Vale por 1 hora.</span>
<div class="wrapper"><div class="container">
  <div class="header"><span style="font-size:20px;font-weight:700;letter-spacing:-0.01em;color:#111827">Haile</span></div>
  <div class="card">
    <h1>Seu link de acesso</h1>
    <p>Oi. Voce pediu pra entrar no <strong>Haile</strong> sem senha. Clica no botao abaixo e voce ja entra direto.</p>
    <div style="text-align:center;margin:24px 0">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{ .ConfirmationURL }}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="20%" stroke="f" fillcolor="#4338CA"><w:anchorlock/><center style="color:#fff;font-family:Arial,sans-serif;font-size:15px;font-weight:600">Entrar no Haile</center></v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#4338CA;color:#fff;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;line-height:1;padding:16px 32px;border-radius:10px;text-decoration:none;border-bottom:2px solid #3730A3">Entrar no Haile</a>
      <!--<![endif]-->
    </div>
    <p class="muted" style="text-align:center;font-size:12px">Se o botao nao funcionar, copie e cole este link:<br><a href="{{ .ConfirmationURL }}" style="color:#4338CA;word-break:break-all">{{ .ConfirmationURL }}</a></p>
    <hr style="border:0;border-top:1px solid #E5E7EB;margin:24px 0" />
    <p class="muted">O link expira em 1 hora e so funciona uma vez. Se voce nao pediu, ignore este e-mail.</p>
  </div>
  <div class="footer">
    <p><a href="https://haile.com.br">haile.com.br</a> &middot; <a href="https://haile.com.br/privacidade">Privacidade</a> &middot; <a href="https://haile.com.br/termos">Termos</a></p>
    <p>Averse Tecnologia &middot; Sao Paulo, Brasil</p>
  </div>
</div></div>
</body></html>
```

---

## 4) Reset Password

**Subject sugerido:** `Redefinir sua senha do Haile`

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Redefinir senha do Haile</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
*{box-sizing:border-box}body,table,td,p,h1{margin:0;padding:0}
body{background:#F9FAFB;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827}
a{color:#4338CA;text-decoration:none}
.preheader{display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;font-size:1px;line-height:1px;mso-hide:all;overflow:hidden}
.wrapper{background:#F9FAFB;padding:32px 16px}
.container{max-width:560px;margin:0 auto}
.header{padding:8px 0 24px}
.card{background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;padding:40px}
.card h1{font-size:24px;line-height:1.3;font-weight:700;color:#111827;margin:0 0 16px}
.card p{font-size:15px;line-height:1.65;color:#111827;margin:0 0 16px}
.card p.muted{color:#6B7280;font-size:14px}
.footer{padding:24px;text-align:center}
.footer p{font-size:12px;line-height:1.65;color:#6B7280;margin:0 0 8px}
.footer a{color:#6B7280;text-decoration:underline}
@media only screen and (max-width:600px){.wrapper{padding:16px 12px}.card{padding:28px 24px;border-radius:12px}.card h1{font-size:22px}}
</style>
</head>
<body>
<span class="preheader">Redefina sua senha do Haile em poucos cliques.</span>
<div class="wrapper"><div class="container">
  <div class="header"><span style="font-size:20px;font-weight:700;letter-spacing:-0.01em;color:#111827">Haile</span></div>
  <div class="card">
    <h1>Redefinir sua senha</h1>
    <p>Oi. Recebemos um pedido pra redefinir a senha da sua conta no <strong>Haile</strong>. Se foi voce, clica no botao abaixo pra escolher uma nova.</p>
    <div style="text-align:center;margin:24px 0">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{ .ConfirmationURL }}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="20%" stroke="f" fillcolor="#4338CA"><w:anchorlock/><center style="color:#fff;font-family:Arial,sans-serif;font-size:15px;font-weight:600">Redefinir senha</center></v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#4338CA;color:#fff;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;line-height:1;padding:16px 32px;border-radius:10px;text-decoration:none;border-bottom:2px solid #3730A3">Redefinir senha</a>
      <!--<![endif]-->
    </div>
    <p class="muted" style="text-align:center;font-size:12px">Se o botao nao funcionar, copie e cole este link:<br><a href="{{ .ConfirmationURL }}" style="color:#4338CA;word-break:break-all">{{ .ConfirmationURL }}</a></p>
    <hr style="border:0;border-top:1px solid #E5E7EB;margin:24px 0" />
    <p class="muted">O link expira em 1 hora. Se nao foi voce que pediu, e so ignorar este e-mail. Sua senha atual continua valendo.</p>
  </div>
  <div class="footer">
    <p><a href="https://haile.com.br">haile.com.br</a> &middot; <a href="https://haile.com.br/privacidade">Privacidade</a> &middot; <a href="https://haile.com.br/termos">Termos</a></p>
    <p>Averse Tecnologia &middot; Sao Paulo, Brasil</p>
  </div>
</div></div>
</body></html>
```

---

## Checklist pos-paste

- [ ] Subjects atualizados nos 4 templates
- [ ] Body HTML colado e salvo
- [ ] **From** configurado em SMTP Settings: `Haile <oi@haile.com.br>`
- [ ] **Reply-to** = `oi@haile.com.br`
- [ ] Teste enviado para inbox Gmail (render + link)
- [ ] Teste enviado para inbox Outlook web (render + VML do botao)
- [ ] Teste em mobile (Gmail iOS/Android)

## Voz e branding

- Sem emojis em nenhum lugar.
- "Haile" sempre — nunca "Coach".
- Voz orientadora, calorosa, sem culpa.
- Indigo `#4338CA` no CTA principal, teal `#0F766E` reservado para acentos.
- Caracteres especiais (acentos) sao evitados nos templates Auth porque o Supabase as vezes faz double-encode em copy estatica. As variaveis dinamicas (`{{ .Data.* }}`) podem ter acento normalmente.
