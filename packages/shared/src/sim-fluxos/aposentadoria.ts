// Fluxo Guiado: "Quanto preciso pra me aposentar?"
// Modelo simplificado de Independência Financeira (FIRE):
//   1) Patrimônio-alvo = renda mensal desejada / taxa REAL ao mês (perpetuidade).
//      Usa taxa REAL (acima da inflação) pra renda manter poder de compra.
//   2) Aporte mensal = aporteMensal(alvo, patrimônio atual, meses até a idade-alvo,
//      i_mensal real).
// Cenário alternativo: se aportar 80% disso, em quanto tempo chega.
import type { FluxoSpec, ResultBlock } from '../sim-fluxo'
import { aporteMensal, mesesNecessarios, aaToAmDecimal, asNum, fmtMeses } from '../sim-fluxo'
import { currencyBRL } from '../finance'

const TAXA_REAL_SUGERIDA = 4.5 // % a.a. acima da inflação (renda fixa BR de longo prazo)

export const FLUXO_APOSENTADORIA: FluxoSpec = {
  id: 'aposentadoria',
  bucket: 'objetivos',
  title: 'Aposentadoria',
  question: 'Quanto preciso pra me aposentar?',
  description: 'Define a idade-alvo e a renda mensal que você quer ter, o Haile calcula o patrimônio-alvo e o aporte mensal necessário.',
  icon: 'sunset',
  steps: [
    {
      id: 'idade',
      question: 'Qual sua idade atual?',
      fields: [
        {
          id: 'idadeAtual',
          label: 'Idade atual',
          kind: 'years',
          defaultValue: () => 35,
          validate: (v) => {
            const n = asNum(v)
            if (n <= 0 || n > 100) return 'Informe uma idade entre 1 e 100'
            return null
          },
        },
      ],
    },
    {
      id: 'idadeAlvo',
      question: 'Aos quantos anos quer se aposentar?',
      hint: 'Não precisa ser 65 — o objetivo é o seu, não o do INSS.',
      fields: [
        {
          id: 'idadeAlvoVal',
          label: 'Idade-alvo',
          kind: 'years',
          defaultValue: (v) => Math.max(asNum(v.idadeAtual) + 10, 60),
          validate: (v, all) => {
            const n = asNum(v)
            const ia = asNum(all.idadeAtual)
            if (n <= ia) return `Tem que ser maior que sua idade atual (${ia})`
            if (n > 100) return 'Máx 100'
            return null
          },
        },
      ],
    },
    {
      id: 'renda',
      question: 'Quanto quer receber por mês na aposentadoria?',
      hint: 'Em valor de HOJE — o cálculo usa taxa REAL pra manter o poder de compra ao longo do tempo.',
      fields: [
        {
          id: 'rendaMensal',
          label: 'Renda mensal desejada',
          kind: 'currency',
          defaultValue: () => 10000,
          validate: (v) => (asNum(v) <= 0 ? 'Informe um valor > 0' : null),
        },
      ],
    },
    {
      id: 'patrimonio',
      question: 'Quanto você já tem acumulado para isso?',
      hint: 'Reservas + investimentos + previdência que você considera "pra aposentadoria". Pode ser zero.',
      fields: [
        {
          id: 'patrimonioAtual',
          label: 'Patrimônio já acumulado',
          kind: 'currency',
          defaultValue: () => 0,
          validate: (v) => (asNum(v) < 0 ? 'Não pode ser negativo' : null),
        },
      ],
    },
    {
      id: 'taxaReal',
      question: 'Que retorno REAL você espera (acima da inflação)?',
      hint: `Sugestão: ${TAXA_REAL_SUGERIDA}% a.a. (renda fixa BR de longo prazo descontada a inflação). Para portfólio mais arrojado, considere 6-7%.`,
      fields: [
        {
          id: 'taxaRealAnualPct',
          label: 'Taxa real anual (% a.a.)',
          kind: 'percent',
          defaultValue: () => TAXA_REAL_SUGERIDA,
          validate: (v) => {
            const n = asNum(v)
            if (n < 0) return 'Taxa não pode ser negativa'
            if (n > 20) return 'Taxa exagerada (>20% real a.a.)'
            return null
          },
        },
      ],
    },
  ],
  compute(values): ResultBlock {
    const idadeAtual = Math.round(asNum(values.idadeAtual))
    const idadeAlvo = Math.round(asNum(values.idadeAlvoVal))
    const rendaMensal = asNum(values.rendaMensal)
    const patrimonioAtual = asNum(values.patrimonioAtual)
    const taxaRealAnual = asNum(values.taxaRealAnualPct)
    const iMensalReal = aaToAmDecimal(taxaRealAnual)
    const anosAteAposentar = idadeAlvo - idadeAtual
    const mesesAteAposentar = anosAteAposentar * 12

    if (iMensalReal <= 0) {
      return {
        headline: 'Com taxa real zero, o patrimônio precisa ser muito grande.',
        details: [
          'Sem rendimento real positivo, o patrimônio teria que cobrir 30+ anos de despesas direto.',
          'Considere uma taxa real maior — Selic costuma render bem acima da inflação no Brasil.',
        ],
        ctas: [{ label: 'Ajustar premissas', action: 'adjust' }],
      }
    }

    // Patrimônio-alvo via perpetuidade: PV = renda / i_mensal
    const patrimonioAlvo = rendaMensal / iMensalReal
    const pmt = aporteMensal(patrimonioAlvo, patrimonioAtual, mesesAteAposentar, iMensalReal)
    const totalAportado = pmt * mesesAteAposentar
    const jurosGanhos = patrimonioAlvo - patrimonioAtual - totalAportado

    // Cenário: aportar 80% — em quantos meses chego?
    const pmtAlt = pmt * 0.8
    const mesesAlt = mesesNecessarios(patrimonioAlvo, patrimonioAtual, pmtAlt, iMensalReal)
    const idadeAlt = idadeAtual + mesesAlt / 12

    // Headline depende se aporte é viável (positivo)
    let headline: string
    if (pmt <= 0) {
      headline = `Você já está pronto — com ${currencyBRL(patrimonioAtual)} acumulados, já dá pra ${currencyBRL(rendaMensal)}/mês.`
    } else {
      headline = `Aportando ${currencyBRL(pmt)} por mês, você se aposenta aos ${idadeAlvo} com ${currencyBRL(rendaMensal)}/mês de renda.`
    }

    return {
      headline,
      details: [
        `Patrimônio-alvo (perpetuidade): ${currencyBRL(patrimonioAlvo)} — esse valor rende ${currencyBRL(rendaMensal)}/mês a ${taxaRealAnual}% real a.a.`,
        `Prazo: ${anosAteAposentar} anos (${mesesAteAposentar} meses).`,
        pmt > 0
          ? `Total que VOCÊ aporta: ${currencyBRL(totalAportado)}. Juros reais ganhos: ${currencyBRL(Math.max(0, jurosGanhos))}.`
          : 'Você não precisa aportar mais nada — o patrimônio atual já cobre o alvo.',
        Number.isFinite(mesesAlt) && pmt > 0
          ? `Se aportar 80% disso (${currencyBRL(pmtAlt)}/mês), você se aposenta aos ${idadeAlt.toFixed(1)} (em ${fmtMeses(mesesAlt)}).`
          : '',
      ].filter(Boolean),
      metrics: [
        { label: 'Patrimônio-alvo', value: currencyBRL(patrimonioAlvo) },
        { label: 'Aporte mensal', value: pmt > 0 ? currencyBRL(pmt) : '—' },
        { label: 'Prazo', value: `${anosAteAposentar} anos` },
      ],
      ctas: [
        ...(pmt > 0
          ? [{ label: 'Criar meta de aposentadoria', action: 'create-meta' as const, payload: { label: `Aposentadoria aos ${idadeAlvo}`, target: patrimonioAlvo, type: 'reserva' } }]
          : []),
        { label: 'Pedir análise ao Haile', action: 'ask-haile' as const, payload: { prompt: `Analise se ${currencyBRL(pmt)}/mês até os ${idadeAlvo} anos é viável dentro do meu Poder de Escolha atual.` } },
        { label: 'Ajustar premissas', action: 'adjust' as const },
      ],
    }
  },
}
