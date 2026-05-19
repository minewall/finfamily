# Templates de Email — Haile

Design system: fundo `#0B1020` (Haile Night), card `#131929`, tipografia DM Sans.  
Cada template usa gradiente diferente no hero para distinguir visualmente o tipo de email.

---

## Templates disponíveis

| Arquivo | Trigger | Gradiente hero |
|---|---|---|
| `convite-familiar.html` | Convite para grupo familiar | Violeta → Teal |
| `confirmacao-cadastro.html` | Supabase: confirm signup | Verde → Teal |
| `recuperacao-senha.html` | Supabase: reset password | Violeta → Rosa |
| `magic-link.html` | Supabase: magic link login | Teal → Violeta |

---

## Variáveis de template

Os templates usam `{{ variavel }}` — compatível com Supabase e Resend.

### `convite-familiar.html`
| Variável | Descrição |
|---|---|
| `{{ inviter_name }}` | Nome de quem convidou |
| `{{ inviter_initial }}` | Inicial do nome (para o avatar circular) |
| `{{ recipient_name }}` | Nome de quem recebe |
| `{{ family_name }}` | Nome do grupo familiar |
| `{{ confirmation_url }}` | URL do convite (gerada pelo Supabase) |

### `confirmacao-cadastro.html`
| Variável | Descrição |
|---|---|
| `{{ user_name }}` | Nome do usuário |
| `{{ confirmation_url }}` | URL de confirmação (Supabase: `{{ .ConfirmationURL }}`) |

### `recuperacao-senha.html`
| Variável | Descrição |
|---|---|
| `{{ user_name }}` | Nome do usuário |
| `{{ confirmation_url }}` | URL de redefinição (Supabase: `{{ .ConfirmationURL }}`) |

### `magic-link.html`
| Variável | Descrição |
|---|---|
| `{{ user_name }}` | Nome do usuário |
| `{{ confirmation_url }}` | URL do magic link (Supabase: `{{ .ConfirmationURL }}`) |

---

## Como aplicar no Supabase

1. Acesse **Authentication → Email Templates** no painel Supabase
2. Selecione o template (Confirm signup, Reset password, Magic Link, Invite user)
3. Cole o HTML correspondente no campo "Body"
4. Substitua as variáveis `{{ variavel }}` pelas variáveis nativas do Supabase:
   - `{{ confirmation_url }}` → `{{ .ConfirmationURL }}`
   - `{{ user_name }}` → `{{ .Email }}` (ou use user_metadata se disponível)
5. Salve e envie um email de teste

---

## Como aplicar no Resend (quando migrar)

1. Crie um template em **resend.com → Templates**
2. Cole o HTML e mapeie as variáveis via API:
```js
await resend.emails.send({
  from: 'Haile <oi@haile.com.br>',
  to: email,
  subject: 'Você foi convidado para o Haile',
  html: compiledTemplate, // renderize o template com os dados
});
```

---

## Notas de compatibilidade

- **Outlook:** VML fallback incluído nos botões CTA para garantir renderização correta
- **Gmail:** inline styles em tudo — sem classes externas nos elementos críticos
- **Dark mode:** os templates já são dark por design — sem inversão necessária
- **Mobile:** media queries incluídas para ajuste de padding em telas < 600px
- **Fontes:** DM Sans via Google Fonts com fallback para Arial
- **Imagens:** logos referenciadas via URL absoluta (`haile.com.br/assets/...`) — substituir por CDN dedicado quando disponível
