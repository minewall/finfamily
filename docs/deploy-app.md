# Deploy DUO em `/app/` (produção)

Decisão de arquitetura (2026-06-04, tarde): DUO substitui o Dino em **`haile.com.br/app/`**. Dino vai pra `app-dino-backup/` (mantido versionado pra rollback rápido se necessário). URLs antigas redirecionam via `_redirects`.

## Estado atual

- **Vite base path**: `/app/` (em `web/vite.config.ts`)
- **Build output**: `web/dist/` (Vite default)
- **Deploy target**: `/app/` na raiz do site
- **SPA fallback**: regra em `_redirects` (`/app/* /app/index.html 200`)
- **Auth backend**: mesmo Supabase do Dino (sem mudança)
- **Cloudflare**: Worker `haile` serve estaticamente via `wrangler.toml` + `.assetsignore`

## Redirects ativos

```
/login.html       → /app/         301 (legacy Dino login)
/login            → /app/         301
/duo/*            → /app/:splat   301 (subpath temporário anterior)
/app/*            → /app/index.html 200 (SPA fallback)
```

## Fluxo de deploy

### Manual

```bash
npm run deploy:app
# 1. roda `npm run build -w web` (TSC + Vite, ~500ms)
# 2. limpa /app/
# 3. copia web/dist/* pra /app/
```

Depois:

```bash
git add app _redirects
git commit -m "deploy(app): build YYYY-MM-DD"
git push
```

Cloudflare Worker serve `/app/` automaticamente após push (Wrangler deploy via `wrangler.toml`).

### Via CI automático (TODO)

Configurar build no Cloudflare:

- **Deploy command**: `npx wrangler deploy` (padrão, lê wrangler.toml)
- **Pre-deploy build**: `npm install && npm run deploy:app`
- **Wrangler config**: `wrangler.toml` na raiz (existe)

## Smoke test local

```bash
npm run deploy:app
cd web && npx vite preview --port 4180
```

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:4180/app/         # → 200
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:4180/app/contas   # → 200 (SPA fallback)
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:4180/app/assets/  # → 200
```

## URLs em produção

| URL | Conteúdo |
|---|---|
| `haile.com.br/` | Landing (`index.html`) |
| `haile.com.br/precos` | Página de preços |
| `haile.com.br/como-funciona` | Página de funcionalidades |
| **`haile.com.br/app/`** | **DUO (React) — produção** |
| `haile.com.br/login.html` | Redirect 301 → `/app/` (legacy Dino) |
| `haile.com.br/duo/*` | Redirect 301 → `/app/*` (legacy subpath) |
| `haile.com.br/app-dino-backup/` | Dino arquivado (rollback de emergência) |
| `haile.com.br/login-dino-backup.html` | Login Dino arquivado |
| `haile.com.br/admin/` | Painel admin Dino |

## Rollback de emergência

Se algo der MUITO errado em produção:

```bash
git mv app app-broken
git mv app-dino-backup app
# editar _redirects: comentar SPA fallback do /app/
git commit -m "revert: rollback DUO → Dino"
git push
```

Cloudflare propaga em ~1min. Dino volta a servir em `/app/`. Login old via `/login.html` precisa ser restaurado também (`git mv login-dino-backup.html login.html`).

## Pendências de setup

1. **Supabase Auth Redirect URLs** — adicionar 3 valores em Authentication → URL Configuration → Redirect URLs:
   - `https://haile.com.br/app/`
   - `https://haile.com.br/app`
   - `https://haile.com.br/app/**`
2. **Cloudflare Custom domain confirma `haile.com.br`** já está bindado no Worker.
3. **Verificar redirects funcionam** após deploy — `curl -I https://haile.com.br/login.html` deve retornar `301 → /app/`.

## Migração de URLs em e-mails (follow-up)

- Edge functions `family-invite`, `waitlist-launch`, `onboarding-reminder` podem ter URLs hardcoded `/app/app.html` ou `/login.html`. **Validar**: como `/login.html` redireciona e DUO funciona em `/app/` direto, e-mails antigos seguem funcionando. Mas atualizar pra `/app/` direto fica mais limpo.
- Cron de lembrete idem.
