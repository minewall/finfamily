# FinFamily

App de gestão financeira familiar — receitas, despesas, metas, contratos recorrentes e patrimônio. Roda 100% no navegador, sem backend: os dados ficam em `localStorage`.

## Stack

- HTML/CSS/JS puro (sem build, sem dependências externas em runtime)
- Persistência via `localStorage` (chave `finfamily_v1`)
- Gráficos custom em canvas ([js/charts.js](js/charts.js))

## Como rodar localmente

```bash
# basta servir os arquivos estáticos
python3 -m http.server 8000
# ou
npx serve .
```

Depois abra `http://localhost:8000`.

> A página `login.html` é o ponto de entrada. A "senha" hoje é simbólica — vive em `sessionStorage`. Para uso pessoal/local é suficiente; para colocar no ar para terceiros, troque por algo mais sólido.

## Funcionalidades

- **Dashboard**: KPIs do mês, gráficos anuais, top categorias, evolução acumulada.
- **Lançamentos**: tabela unificada de receitas e despesas com filtros + coluna de contrato.
- **Receitas / Despesas**: visões dedicadas com KPIs anuais.
- **Metas v2**: 4 tipos (`limite_desp`, `min_receita`, `reserva`, `objetivo`) × mensal/anual, com performance automática e tabela Jan→Dez.
- **Contratos**: cadastra contrato (entrada + N parcelas) e cada parcela vira lançamento vinculado em receitas/despesas. Cards mostram % valor cumprido, X/N parcelas, % tempo, próxima parcela e timeline visual.
- **Contas & Cartões**: contas bancárias e cartões com parcelamentos ativos.
- **Reserva & Patrimônio**: ativos (cripto, FIAT BR/USD/EUR, tokens) + reservas, com conversão para BRL.
- **Comparativo**: receitas vs despesas mês a mês.
- **Backup**: botões ⬇ / ⬆ no rodapé do sidebar para exportar/importar JSON.
- **Tema claro/escuro** (botão sol/lua).

## Backup e segurança dos dados

Como tudo vive em `localStorage`, **limpar dados do navegador apaga tudo**. Faça backup periódico via botão ⬇ no rodapé do sidebar. O arquivo gerado (`finfamily-backup-YYYY-MM-DD.json`) pode ser reimportado pelo botão ⬆.

## Estrutura

```
index.html              # app principal
login.html              # entrada
css/main.css            # estilos
js/store.js             # camada de dados (localStorage + CRUD + agregações)
js/app.js               # router, páginas, modais
js/charts.js            # gráficos canvas
DEV_LOG.md              # histórico de sessões de desenvolvimento
```

## Versões

Os arquivos JS/CSS usam query string `?v=N` para invalidar cache do navegador. Ao publicar mudanças, incremente N em [index.html](index.html).

## Próximos passos (roadmap)

- Histórico de snapshots da reserva
- Cadastro de recebimentos futuros (UI)
- KPI de "próximas parcelas a vencer" no Dashboard
- Senha real (hash) para login
- README com screenshots
