# FinFamily — Dev Log

---

## Sessão 2026-05-12

### O que foi feito

#### 1. Filtros dinâmicos em Lançamentos
- Adicionado filtro de **subcategoria** (select dinâmico que se popula quando uma categoria é selecionada)
- Botão **Data ↑ / ↓** para ordenar ascendente/descendente em tempo real
- Rodapé da tabela mostra contagem de lançamentos filtrados
- Badge de desconto visível na linha da tabela
- Mensagem amigável quando filtro retorna vazio

#### 2. Limpeza de categorias inválidas (patrimônio)
- Adicionado `Store.cleanDespesasByCategory(cats)` com comparação case-insensitive + normalização unicode
- `init()` detecta automaticamente qualquer categoria inexistente no CATEGORIES e remove as despesas correspondentes
- Roda automaticamente a cada boot, sem ação manual

#### 3. Fix: confirm múltiplo na exclusão de lançamentos
- `attachDeleteHandlers()` era chamado duas vezes (uma dentro de `refilter()` e outra explicitamente)
- Cada botão ficava com 2 listeners → 2 confirmações por clique
- Corrigido removendo a chamada duplicada

#### 4. Merge Reserva + Patrimônio
- Criada `renderReservaPatrimonio()` unificando os dois módulos
- **Bug crítico corrigido:** `totalAtivos()` lia `_data.reserva` (singular, sempre vazio) em vez de `_data.reservas` → investimentos nunca somavam ao total
- Prioridade visual: KPIs → gráficos → gestão de investimentos → outros ativos → recebimentos futuros
- Cards de investimento mostram ganho real (valorAtual − valorInvestido)
- Botão "+ Ativo" inline para crypto/FIAT
- Sidebar: item "Reserva" removido, "Patrimônio" renomeado para "Reserva & Patrimônio"
- Rotas `#reserva` e `#patrimonio` ambas funcionam

#### 5. Período reposicionado no sidebar
- Seletor Ano/Mês saiu do rodapé e virou seção própria entre "Financeiro" e "Patrimônio"
- Footer simplificado: só botão de tema + label da versão

#### 6. Mobile-friendly completo
- **Overlay escuro** (blur) ao abrir o sidebar — clique fora fecha
- **Auto-close** do sidebar ao clicar em qualquer item de navegação
- `body.sidebar-open` trava scroll da página por baixo
- Tablet (≤ 900px): filter-bar quebra linha, selects flexíveis, tabelas com scroll horizontal
- Mobile (≤ 600px): KPIs em 1 coluna, modal vira **bottom-sheet**, botão "+ Lançamento" compacto (só ícone)

#### 7. Ajustes finos nos gráficos
- Bar: default 220 → 175px; instâncias 200 → 165, 240 → 170
- Line: default 220 → 160px; instâncias 180 → 150, 200 → 165
- HBar: barH 28–32 → 22–24; gap reduzido
- **Donut layout** em todas as páginas: flex-direction column, centralizado, legenda em grid 2 colunas abaixo do canvas

---

### Commits do dia

| Hash | Descrição |
|---|---|
| `cd8ced3` | Fix receitas: date DD/MM+weekday, filter by selected month |
| `eaefaf0` | Filtros dinâmicos Lançamentos + limpeza patrimônio + KPI colors |
| `138dbe9` | Fix confirm múltiplo + limpeza robusta de categorias inválidas |
| `e9b420c` | Merge Reserva + Patrimônio (bug totalAtivos corrigido) |
| `5db0a86` | Mobile-friendly + reposicionar Período no sidebar |
| `cafe0a5` | Ajustes finos nos gráficos (alturas + donuts centralizados) |

---

### Onde paramos — próxima sessão: Redesign completo de Metas

#### Problema atual
O sistema de metas é básico e não serve o propósito:
- Meta mensal mostra só o mês do seletor, sem histórico por período
- Meta anual não projeta nem mostra média mensal
- Meta receita mínima está em `settings` (hardcoded), não no sistema de metas
- Reserva não auto-atualiza nem detecta retiradas
- Tipos inconsistentes no store (`tipo` vs `type`, seeds antigas misturadas)

#### Novo modelo a implementar

**5 tipos de meta:**
```
limite_desp   mensal / anual   → negativo: ultrapassar = vermelho
min_receita   mensal / anual   → positivo: ultrapassar = verde
reserva       mensal / anual   → positivo: queda = vermelho, não atingido = neutro
objetivo      único (com prazo) → manual, barra de progresso
```

**Lógica de cores por tipo:**
- `limite_desp`: verde < 80%, âmbar 80–99%, vermelho ≥ 100%
- `min_receita`: vermelho < 80%, âmbar 80–99%, verde ≥ 100%
- `reserva`: neutro se abaixo da meta, verde se atingido, vermelho se valor caiu vs mês anterior

**Estrutura do card (novo):**
- Valor atual (calculado automaticamente dos lançamentos, não manual)
- Threshold / target
- Barra de progresso com cor contextual
- Para anuais: média mensal real + projeção de fim de ano vs meta
- Para reserva: comparação com mês anterior para detectar retiradas

**Tabela de períodos (principal novidade):**
```
                Jan    Fev    Mar    Abr    Total/Proj
Limite Desp   ✅12k  ✅14k  🟡14.8k  ❌16k  56k / proj 168k vs 170k
Min Receita   ✅30k  ❌5k   ✅31k   ✅25k  91k / proj 273k vs 180k
Reserva        🟡     ✅     ✅     ⬇️    auto-updated
```

**Auto-update reserva:**
- Calcula `Store.totalAtivos()` automaticamente (sem input manual)
- Compara com mês anterior para detectar retiradas (badge vermelho)

#### Arquivos a modificar
- `js/store.js` — normalizar estrutura das metas, adicionar helper `getMetaPerformance(meta, year)`
- `js/app.js` — reescrever `renderMetas()` e `openMetaModal()`
- Possivelmente ajustar dashboard para usar novas metas em vez de `settings.metaReceita`

#### Metas existentes no seed a migrar
```js
{ id: 'm1', label: 'Reserva de Emergência', target: 50000, type: 'reserva' }
{ id: 'm2', label: 'Viagem Europa', target: 15000, type: 'objetivo' }
{ id: 'm3', label: 'Reserva de Emergência', target: 50000, type: 'reserva' } // duplicada
```
→ Limpar duplicatas e migrar para novo schema no `init()`

#### Ponto de partida na próxima sessão
1. Abrir `js/store.js` e adicionar `getMetaPerformance(metaId, year)`
2. Reescrever `renderMetas()` em `js/app.js` com novo layout
3. Reescrever `openMetaModal()` com os 5 tipos + subtipos
4. Adicionar tabela de períodos no final da página de metas
5. Ajustar `renderDashboard()` para usar metas do array em vez de `settings.metaReceita`

---

*Gerado automaticamente ao final da sessão de desenvolvimento.*

---

## Sessão 2026-05-13 — Contratos + Metas v2

### ✅ Contratos (nova aba)
- Schema em `Store.contratos`: id, label, kind (receita|despesa), category, sub, responsavel, dataInicio, dataFim, valorParcela, parcelas, entrada, diaVencimento, pay, active, notes.
- `addContrato/updateContrato/deleteContrato` gera/regenera/remove lançamentos vinculados via `contratoId` + `parcelaNum`.
- `getContratoPerformance(id)` retorna: valorTotal, valorCumprido/restante, parcelasRestantes, pctValor/pctParcelas/pctTempo, próxima parcela, impactoMensal.
- UI: cards com 3 thresholds (% valor, parcelas X/N, % tempo), KPIs agregados de impacto no mês.
- Modal CRUD com tipo (rec/desp), categoria condicional, subcategoria, entrada, dia de vencimento.

### ✅ Metas v2 (redesign)
- Migração automática (`_migrateMetas`) do schema antigo (`tipo`/`type` legados) para 4 tipos: `limite_desp`, `min_receita`, `reserva`, `objetivo` + `period: mensal|anual|unico`.
- `getMetaPerformance(id, year, month)` calcula: byMonth[12], current, mediaMensal, projecaoAnual, status (ok/warn/over/neutral), delta (p/ reserva).
- Reserva: snapshot manual via botão 📸 para detectar quedas (`m.lastSnapshot`).
- UI nova:
  - Cards de Indicadores agrupados por tipo, com cor por status, média e projeção anual quando aplicável.
  - Cards de Objetivos separados.
  - Tabela mensal performance (Jan→Dez + Total/Projeção + Alvo) com cores OK/Crítico por célula.

### Próximos
- Coluna "contrato" em Lançamentos para indicar origem.
- Toggle manual `paid` em parcelas de contrato.
- Dashboard usar metas do array (em vez de `settings.metaReceita` hardcoded).
