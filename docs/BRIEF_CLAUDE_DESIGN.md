# Brief — Haile (Coach Financeiro com IA)

> Brief para gerar artefatos visuais (HTML/CSS, fluxos, mockups) do produto
> Haile. Cada item aqui foi descoberto após retrabalho real no código de
> integração — seguir à risca economiza horas.
>
> Atualize este brief quando descobrir novas regras ou refinar decisões.
> Última atualização: 2026-05-19

## 1. POSICIONAMENTO (lê primeiro, é a alma)

- **Haile NÃO é um app de lançar despesas.** É um Coach.
- Tom: propositivo, não punitivo. Foco em escolha e conquista, nunca em culpa.
- Diferenciação central: a IA **orienta antes**, não relata depois.
- O sistema é uma conversa contínua com o Coach — o app é a interface,
  o protagonista é a relação com o Haile.
- A meta familiar (ex: "Itália em família") é um fio narrativo recorrente —
  use sempre que possível como personagem do exemplo.

## 2. TOM DE VOZ E IDIOMA

- **Português brasileiro 100%.** NUNCA mistura com inglês.
  - Errado: "AI Financial Coach Familiar"
  - Certo:  "Coach Financeiro Familiar com IA"
- "Wealth" → "Patrimônio". "Family Office" pode ficar (termo técnico estabelecido).
- Evitar claims sem evidência. NUNCA usar números fictícios como prova social
  (ex: "847 famílias aguardam acesso" — claim arriscado, foi removido).
  Use formulações neutras: "Acesso por convite enquanto finalizamos os ajustes."

## 3. DESIGN TOKENS (cor e tipografia — NÃO desviar)

```css
/* Brand */
--violet:        #7367F0;   /* indigo Haile, marca principal */
--violet-deep:   #5048CC;
--violet-soft:   #F0EFFE;
--teal:          #06B6D4;
--green:         #10B981;   /* prosperity */
--alert:         #C92764;
--ink:           #0F1020;   /* Haile Night — fundo dark */
--cream:         #FAF9F6;   /* fundo light */
--slate:         #5b5e73;   /* texto secundário */
--line:          #e6e4f4;
```

- **Tipografia app:** DM Sans (400, 500, 600, 700, 800)
- **Tipografia landing editorial:** DM Sans + **DM Serif Display** (só para
  headlines — h1, h2 com itálico violeta nas palavras-chave)
- **Importação:** sempre via Google Fonts com `&display=swap`

## 4. REGRAS HARD (quebra se não seguir)

### 4.1 SEM EMOJIS

Não usar emojis em nada — landing, app, e-mails, microcopy, badges, labels.
Substituir por SVG inline (na landing) ou ícones do Lucide (no app).
Exceção: emojis em conteúdo de USUÁRIO (transações, metas customizadas).

### 4.2 SEM INLINE STYLES DIVERGENTES

Evitar `style="background:rgb(...)"` com valores diferentes dos tokens CSS.
Se precisar de cor nova, ADICIONA o token primeiro.

- Errado: `<body style="background-color:rgb(250,246,249)">` (não bate com `--cream`)
- Certo:  `<body>` + CSS controlando background via `--cream`.

### 4.3 NOMES DE ARQUIVO

Sempre kebab-case ASCII, sem espaços.

- Errado: "Haile Como Funciona.html"
- Certo:  "como-funciona.html"

### 4.4 EMAILS — COMPATIBILIDADE

Templates de email devem ter:

- VML fallback para botões CTA (Outlook)
- Inline styles em TODOS os elementos críticos (Gmail)
- Media query mobile com breakpoint 600px
- Variáveis no formato `{{ variavel }}` (compatível Supabase + Resend)
- Logos via URL absoluta (`haile.com.br/assets/svg/...`)

### 4.5 EMAIL OFUSCATION

NUNCA usar Cloudflare email-protection (`__cf_email__` / `data-cfemail`).
Email no template tem que ser texto puro: `<a href="mailto:oi@haile.com.br">oi@haile.com.br</a>`

### 4.6 ANO ATUAL

© 2026 (estamos em 2026, não 2025).

## 5. AS 3 PERSONALIDADES DO COACH (existem no código — usar referência)

| Key | Nome | Tom | Quando |
|---|---|---|---|
| `mentor` | **Mentor** (default) | Acolhedor, paciente, encorajador | Apoio diário |
| `educador` | **Educador** | Didático, explica os porquês | Iniciante |
| `profissional` | **Profissional** | CFO direto, técnico | Quem quer dados |

Samples reais (não inventar outros):

- **Mentor:** "Que bom ver que você economizou R$ 450 este mês! Que tal direcionar
  uma parte para a viagem da família? Vocês merecem esse descanso."
- **Educador:** "Aporte de R$ 500/mês no CDB 100% CDI rende mais que poupança
  porque o CDI hoje está em 14,40% a.a. Em 12 meses, a diferença gira em
  torno de R$ 240."
- **Profissional:** "Seu Poder de Escolha este mês é R$ 4.850. Considerando seu
  comprometimento de 65%, há espaço para aporte adicional de R$ 800 sem risco."

## 6. OS 4 TONS SITUACIONAIS (modulações automáticas — diferentes de personalidade)

Cada personalidade USA esses 4 tons dependendo do contexto:

- **Orientador** (dia-a-dia): explica situação + sugere próximo passo
- **Preventivo** (antes de gasto grande): avalia impacto + devolve escolha
- **Celebrativo** (meta atingida): reconhece + aponta próxima conquista
- **Analítico** (revisões mensais): mostra padrões + tendências

## 7. ESTRUTURA DE ARQUIVOS (depois do reorg de 2026-05-19)

```
/                          ← landing (root)
  index.html               ← Landing v5
  como-funciona.html
  precos.html
  contato.html
  login.html               ← dark/light split + Supabase auth
/app/
  app.html                 ← app autenticado
  css/main.css
  js/{app.js,store.js,charts.js,supabase-client.js}
/assets/
  svg/                     ← logos Haile (mark + wordmark, white/indigo/black)
  photos/                  ← imagens familiares
  screens/                 ← screenshots reais do app
  favicon/
```

## 8. ASSETS DE MARCA (use sempre os existentes)

- `assets/svg/haile-wordmark-white.svg` — wordmark sobre fundo dark
- `assets/svg/haile-wordmark-indigo-deep.svg` — wordmark sobre fundo light
- `assets/svg/haile-mark-white.svg` / `haile-mark-indigo.svg` — só o "H"
- `assets/svg/haile-symbol-flow-mark.svg` — símbolo decorativo (uso restrito)

NÃO criar variações do logo do zero. Use sempre os SVGs existentes.

## 9. PADRÕES DE LAYOUT

- **Hero editorial dark:** fundo `--ink`, h1 em DM Serif Display com palavras
  em itálico violeta, lead em texto branco translúcido (`rgba(255,255,255,0.62)`).
- **Cards:** `bg-card`, `border 1px solid var(--line)`, `border-radius: 16px`
  (landing) ou `12px` (app).
- **Botões:**
  - Primary: `background var(--violet)`, white, radius pill (999px), padding `14px 24px`
  - Outline: `border 1px solid rgba(255,255,255,.25)`, transparent, white
  - Ghost: `background rgba(255,255,255,.72)`, dark
- **Breakpoint mobile:** `@media (max-width: 820px)` é o padrão.

## 10. NAVEGAÇÃO PADRÃO (landing)

Header: `Produto | Como funciona | Planos | Contato | [Solicitar acesso]`
Footer: `Planos · Privacidade · Termos · Contato`
NÃO usar "Coach IA" como label do menu (era inconsistente). Use "Produto".

## 11. DISCLAIMER OBRIGATÓRIO

Toda landing principal deve ter, no rodapé, o disclaimer legal estabelecido:
"O Haile é uma plataforma de organização e coaching financeiro... [bloco
completo já no `index.html` da v5]". Em outras páginas, é opcional.

## 12. PREÇOS (estado atual)

Cards de plano mostram "Em breve" no lugar do valor — toggle Mensal/Anual
oculto. CTAs de assinatura removidos. CTA final é waitlist
("Quer ser avisado quando lançarmos?"). NÃO inventar pricing.

## 13. ANTES DE ENTREGAR — CHECKLIST

- [ ] Não tem emoji em lugar nenhum?
- [ ] Tokens CSS usados consistentemente, sem hex hardcoded?
- [ ] Nomes de arquivo em kebab-case?
- [ ] © 2026 (não 2025)?
- [ ] Português 100%, sem mistura PT/EN?
- [ ] Logo via SVG existente em `/assets/svg/`?
- [ ] DM Sans + DM Serif Display importados?
- [ ] Breakpoint mobile 820px?
- [ ] Email tem VML + inline styles + media query?
- [ ] Não tem CF email-protection?
- [ ] Coach com 3 personalidades (Mentor/Educador/Profissional, nessa ordem)?
- [ ] Sem claims numéricos sem evidência?

## 14. AO INTEGRAR COM O REPO

Se você for entregar arquivos pra integração, gere já no formato final
(kebab-case, sem espaços) e indique no manifesto onde cada arquivo entra.
Não use pastas tipo "/dev/" — gere já na localização canônica.
