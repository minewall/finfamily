// Builder do "system" prompt do Haile (versão enxuta DUO).
// Porta o essencial do Dino buildContext: KPIs do mês + breakdown por
// categoria + top despesas + metas. Suficiente pra Coach útil sem tool use.
// Quando tools entrarem, expandir com lista detalhada + sub-categorias.
import type { UserData } from './types'
import {
  sumReceitas, sumDespesas, currencyBRL,
  breakdownPorCategoria, topDespesas,
  calcPoderDeEscolha,
} from './finance'
import { getCategoryLabel } from './categories'
import { calcMetaProgresso, metaTipoLabel } from './metas'

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export function buildCoachSystemPrompt(data: UserData, month: number, year: number): string {
  const rec = sumReceitas(data, month, year)
  const desp = sumDespesas(data, month, year)
  const saldo = rec - desp
  const pde = calcPoderDeEscolha(data, month, year)
  const breakdown = breakdownPorCategoria(data, month, year).slice(0, 8)
  const top = topDespesas(data, month, year, 8)
  const metas = (data.metas ?? []).filter((m) => m.active !== false)
  const contas = data.contas ?? []
  const pessoas = (data.pessoas as string[] | undefined) ?? []

  const breakdownStr = breakdown.length === 0
    ? '  (sem despesas neste mês)'
    : breakdown.map((c) =>
        `  - ${getCategoryLabel(c.category)}: ${currencyBRL(c.total)} (${Math.round(c.pct * 100)}% · ${c.count} ${c.count === 1 ? 'lançamento' : 'lançamentos'})`,
      ).join('\n')

  const topStr = top.length === 0
    ? '  (sem despesas)'
    : top.map((t) =>
        `  - ${t.desc}: ${currencyBRL(t.amount)} (${getCategoryLabel(t.category)}${t.person ? ', ' + t.person : ''}, ${t.date})`,
      ).join('\n')

  const metasStr = metas.length === 0
    ? '  (sem metas ativas)'
    : metas.map((m) => {
        const p = calcMetaProgresso(m, data, month, year)
        return `  - ${m.label} [${metaTipoLabel(m.type)}]: ${currencyBRL(p.atual)} de ${currencyBRL(p.alvo)} (${Math.round(p.pct * 100)}%${p.estourou ? ' · ESTOUROU' : ''})`
      }).join('\n')

  const contasStr = contas.length === 0
    ? '  (sem contas cadastradas)'
    : contas.map((c) => `  - ${c.nome}${c.banco ? ' (' + c.banco + ')' : ''}: ${currencyBRL(c.saldo)}`).join('\n')

  return [
    `Você é o Haile — uma inteligência financeira para famílias modernas.`,
    `Tom: orientador, não punitivo. Foco em escolha e conquista, nunca em culpa. Responda em pt-BR, conciso, com bullets quando útil.`,
    `Você está conversando com o usuário no app autenticado, sobre os dados financeiros reais dele abaixo. NUNCA invente números — use só o que está aqui.`,
    `Quando o usuário pedir uma ação que envolva criar/editar/excluir lançamentos, AINDA não tem ferramentas pra isso nesta versão; oriente o usuário a usar os botões da tela ou diga que essa funcionalidade chega em breve.`,
    ``,
    `CONTEXTO FINANCEIRO — ${MESES_PT[month - 1]}/${year}`,
    ``,
    `Família: ${pessoas.length > 0 ? pessoas.join(', ') : '(não cadastrada)'}`,
    ``,
    `KPIs do mês:`,
    `  Receitas: ${currencyBRL(rec)}`,
    `  Despesas: ${currencyBRL(desp)}`,
    `  Saldo: ${currencyBRL(saldo)}`,
    `  Poder de Escolha (livre): ${currencyBRL(pde.poderDeEscolha)} (${Math.round(pde.pct * 100)}% da receita)`,
    `  Essenciais (piso): ${currencyBRL(pde.pisoSobrevivencia)}`,
    ``,
    `Onde foi o dinheiro (top categorias):`,
    breakdownStr,
    ``,
    `Maiores despesas individuais:`,
    topStr,
    ``,
    `Metas ativas:`,
    metasStr,
    ``,
    `Contas (saldos cadastrados):`,
    contasStr,
  ].join('\n')
}
