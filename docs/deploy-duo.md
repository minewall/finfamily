# Deploy DUO — beta privado em `/duo/`

Decisão de arquitetura (2026-06-04): DUO publicado em **`haile.com.br/duo/`** durante o beta privado. Mantém Dino em `/app/` como fallback. Migração eventual pra subdomínio dedicado quando estabilizar.

## Estado atual

- **Vite base path**: `/duo/` (em `web/vite.config.ts`)
- **Build output**: `web/dist/` (Vite default)
- **Deploy target**: `/duo/` na raiz do site
- **SPA fallback**: regra em `_redirects` na raiz (`/duo/* /duo/index.html 200`)
- **Auth backend**: mesmo Supabase do Dino (sem mudança)

## Fluxo de deploy

### Manual (até CI/CD estar pronto)

```bash
npm run deploy:duo
# 1. roda `npm run build -w web` (TSC + Vite, ~500ms)
# 2. limpa /duo/
# 3. copia web/dist/* pra /duo/
```

Depois:

```bash
git add duo _redirects
git commit -m "deploy(duo): build YYYY-MM-DD"
git push
```

Cloudflare Pages serve `/duo/` automaticamente após push (settings: Production branch = main, Build command = vazio, Output dir = `/`).

### Via Cloudflare Pages com build automático (TODO setup)

Configurar no Cloudflare Pages → Settings → Build & deployments:

- **Build command**: `npm install && npm run deploy:duo`
- **Output directory**: `/` (deploy a raiz, inclui /duo/ + landing + /app/)
- **Root directory**: `/`
- **Node version**: 22.x ou superior

Com isso, push em main faz Cloudflare Pages buildar e publicar automaticamente. Build output (`/duo/`) **NÃO** precisa estar versionado.

## Smoke test local

```bash
npm run deploy:duo
cd web && npx vite preview --port 4180
```

Testes mínimos via curl:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:4180/duo/         # → 200
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:4180/duo/contas   # → 200 (SPA fallback)
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:4180/duo/assets/  # → 200
```

## URLs em produção (esperado)

| URL | Conteúdo |
|---|---|
| `haile.com.br/` | Landing (`index.html`) |
| `haile.com.br/precos` | Página de preços |
| `haile.com.br/como-funciona` | Página de funcionalidades |
| `haile.com.br/app/` | Dino (vanilla, congelado) |
| `haile.com.br/duo/` | **DUO (React, beta privado)** |
| `haile.com.br/login.html` | Login do Dino |
| `haile.com.br/duo/` (sem trailing slash + redirect interno) | DUO entry — redirect interno do React Router resolve rotas como `/duo/contas`, `/duo/lancamentos`, etc |

## Pendências de setup

1. **Cloudflare Pages build automático** — configurar build command + output. Opcional enquanto deploy manual funciona.
2. **Auth redirect** — Supabase Auth → URL Configuration: adicionar `https://haile.com.br/duo/` à lista de Redirect URLs permitidas. Sem isso, OAuth Google/Apple e Magic Link redirecionam pra URL errada após login.
3. **Link do DUO em algum lugar visível** — landing/precos podem ter botão "Tentar versão beta" → `/duo/`. Pra beta privado, manter oculto e compartilhar URL direto.

## Migração futura

Quando o DUO estiver estável e pronto pra GA:

- **Opção 1**: substituir Dino em `/app/` → mover DUO pra `/app/`, mudar base, atualizar todos os emails/templates.
- **Opção 2**: subdomínio dedicado `app.haile.com.br` → requer Cloudflare Pages projeto separado + DNS CNAME. Recomendado se ficar Pro do Supabase (custom auth domain `auth.haile.com.br`).

Decisão fica pra quando tiver dados de uso real do beta.
