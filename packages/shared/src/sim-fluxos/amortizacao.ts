// Fluxo Guiado: "Como antecipar parcelas de financiamento?"
// Usa o engine de financiamentos do shared (financiamentoAntecipar /
// financiamentoAnteciparRecorrente) pra calcular o impacto de aportes extras
// num financiamento existente.
//
// Pré-condição: o usuário precisa ter pelo menos 1 financiamento cadastrado.
// Se não tiver, o ResultBlock vira um CTA pra abrir /financiamentos.
import type { FluxoSpec, ResultBlock } from '../sim-fluxo'
import { asNum, fmtMeses } from '../sim-fluxo'
import { currencyBRL } from '../finance'
import {
  financiamentoAnteciparRecorrente,
  financiamentoSaldoDevedor,
  financiamentoTotalRestante,
  financiamentoParcelaInicial,
  type Financiamento,
} from '../financiamentos'
import { calcPoderDeEscolhaV2 } from '../tipos'

function listFinanciamentos(ctx?: { data: { financiamentos?: unknown[] } }): Financiamento[] {
  return ((ctx?.data?.financiamentos as Financiamento[] | undefined) ?? []).filter((f) => f && f.id)
}

export const FLUXO_AMORTIZACAO: FluxoSpec = {
  id: 'amortizacao',
  bucket: 'dividas',
  title: 'Antecipar financiamento',
  question: 'Como antecipar parcelas de financiamento?',
  description: 'Simula o impacto de um aporte extra mensal no seu financiamento — quanto economiza em juros e em quantos meses encurta.',
  icon: 'banknote',
  steps: [
    {
      id: 'qual',
      question: 'Qual financiamento você quer simular?',
      hint: 'Selecione um dos seus financiamentos cadastrados.',
      fields: [
        {
          id: 'financiamentoId',
          label: 'Financiamento',
          kind: 'select',
          optionsFn: (ctx) => {
            const lista = listFinanciamentos(ctx)
            return lista.map((f) => ({
              value: f.id,
              label: `${f.label || 'Financiamento'} — saldo ${currencyBRL(financiamentoSaldoDevedor(f))}`,
            }))
          },
          defaultValue: (_, ctx) => {
            const lista = listFinanciamentos(ctx)
            return lista[0]?.id
          },
          validate: (v) => (!v ? 'Selecione um financiamento' : null),
        },
      ],
    },
    {
      id: 'extra',
      question: 'Quanto você consegue aportar por mês?',
      hint: 'Sugestão: 30% do seu Poder de Escolha — sobra confortável pra direcionar à amortização sem comprometer outras metas.',
      fields: [
        {
          id: 'valorExtra',
          label: 'Aporte extra mensal',
          kind: 'currency',
          defaultValue: (_, ctx) => {
            if (!ctx) return 500
            const pde = calcPoderDeEscolhaV2(ctx.data, ctx.month, ctx.year)
            const sug = pde.poderDeEscolha > 0 ? Math.round(pde.poderDeEscolha * 0.3) : 500
            return Math.max(100, sug)
          },
          validate: (v) => (asNum(v) <= 0 ? 'Informe > 0' : null),
        },
      ],
    },
    {
      id: 'estrategia',
      question: 'Qual estratégia você prefere?',
      hint: 'Encurtar PRAZO economiza mais juros. Reduzir PARCELA libera caixa mensal.',
      fields: [
        {
          id: 'estrategia',
          label: 'Estratégia de antecipação',
          kind: 'select',
          options: [
            { value: 'prazo', label: 'Encurtar prazo (mais economia)' },
            { value: 'parcela', label: 'Reduzir parcela (mais caixa/mês)' },
          ],
          defaultValue: () => 'prazo',
        },
      ],
    },
  ],
  compute(values, ctx): ResultBlock {
    const lista = listFinanciamentos(ctx)

    // Pré-condição: sem financiamento cadastrado, oferece navegar pra cadastrar.
    if (lista.length === 0) {
      return {
        headline: 'Você ainda não tem financiamentos cadastrados.',
        details: [
          'Pra simular antecipação, primeiro cadastre o financiamento (valor, taxa, prazo, parcelas pagas).',
          'Depois você volta aqui e o Haile mostra quanto antecipar economiza em juros.',
        ],
        ctas: [
          { label: 'Cadastrar financiamento', action: 'navigate', payload: '/financiamentos' },
        ],
      }
    }

    const f = lista.find((x) => x.id === String(values.financiamentoId)) ?? lista[0]
    const valorExtra = asNum(values.valorExtra)
    const estrategia = String(values.estrategia ?? 'prazo')

    const saldo = financiamentoSaldoDevedor(f)
    const totalRestanteSemAntecipar = financiamentoTotalRestante(f)
    const jurosSemAntecipar = totalRestanteSemAntecipar - saldo
    const parcelaAtual = financiamentoParcelaInicial(f)

    // Cenário aporte recorrente (independente da estratégia — sempre encurta prazo)
    const recorrente = financiamentoAnteciparRecorrente(f, valorExtra)

    const headlineBase = estrategia === 'prazo'
      ? `Aportando ${currencyBRL(valorExtra)}/mês a mais, você encurta o financiamento em ${fmtMeses(recorrente.mesesEconomizados)}.`
      : `Aportando ${currencyBRL(valorExtra)}/mês, você economiza ${currencyBRL(recorrente.jurosEconomizados)} em juros.`

    const details: string[] = [
      `Financiamento: ${f.label || 'Sem nome'} — saldo devedor ${currencyBRL(saldo)}.`,
      `Sem antecipar: total a pagar restante ${currencyBRL(totalRestanteSemAntecipar)} (juros ${currencyBRL(jurosSemAntecipar)}). Parcela atual ${currencyBRL(parcelaAtual)}.`,
      `Com aporte extra de ${currencyBRL(valorExtra)}/mês (estratégia ${estrategia === 'prazo' ? 'PRAZO' : 'PARCELA'}):`,
      `  - Meses economizados: ${fmtMeses(recorrente.mesesEconomizados)}.`,
      `  - Juros economizados: ${currencyBRL(recorrente.jurosEconomizados)}.`,
      `  - Total aportado extra ao longo do contrato: ${currencyBRL(recorrente.totalAportado)}.`,
      estrategia === 'prazo'
        ? 'Estratégia PRAZO mantém a parcela e usa o extra pra abater capital antes — a maior economia de juros.'
        : 'Estratégia PARCELA recalcula a parcela pra baixo a cada amortização — alivia o orçamento mensal, mas economiza menos juros.',
    ]

    return {
      headline: headlineBase,
      details,
      metrics: [
        { label: 'Juros economizados', value: currencyBRL(recorrente.jurosEconomizados), tone: 'pos' },
        { label: 'Meses encurtados', value: fmtMeses(recorrente.mesesEconomizados), tone: 'pos' },
        { label: 'Total aportado', value: currencyBRL(recorrente.totalAportado) },
      ],
      ctas: [
        { label: 'Pedir análise ao Haile', action: 'ask-haile', payload: { prompt: `Quero antecipar meu financiamento "${f.label}" com ${currencyBRL(valorExtra)}/mês extra (estratégia ${estrategia}). Faz sentido dentro do meu Poder de Escolha?` } },
        { label: 'Ver financiamentos', action: 'navigate', payload: '/financiamentos' },
        { label: 'Ajustar premissas', action: 'adjust' },
      ],
    }
  },
}
