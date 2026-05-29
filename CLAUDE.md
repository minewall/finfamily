# Instruções do projeto Haile

Regras permanentes que devem ser seguidas em todas as sessões.

## Design / UI

- **Sem emojis no app e na landing.** Não usar emojis em nenhum lugar do produto (interface, microcopy, e-mails, landing, mensagens do Coach, badges, labels, etc.). Substituir por ícones vetoriais (Lucide já está carregado no app; SVG inline na landing).
- Tipografia: DM Sans para o app, DM Sans + DM Serif Display para a landing.
- Tokens de marca em `project_brand_haile_design_system.md`.
- Tom de voz do Coach: orientador, não punitivo. Foco em escolha e conquista, nunca em culpa.
- **Landing e telas seguem a skill de design `claude design` (haile-design).** Ao mexer em arquivos da landing (`/` root) ou criar/ajustar telas, respeitar o design system da marca (tokens, tipografia, sem emojis/símbolos → SVG inline). Não há agente externo revisando em paralelo.

## Estrutura de pastas

- `/` → landing (Haile.com.br), index.html é a Landing principal
- `/app/` → o app autenticado (gestão financeira)
- `/landing/dev/` → drafts de design (não usado em produção; depois de aprovado, move pra root)
- `/admin/` → painel admin
- `/onboarding/` → fluxo de onboarding

## Commits

- Sempre criar commits novos (nunca `--amend` em commits anteriores)
- Co-autoria: `Co-Authored-By: Averse Tecnologia / Claude <noreply@anthropic.com>`
