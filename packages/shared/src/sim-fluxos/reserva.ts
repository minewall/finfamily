// Fluxo Guiado: "Criar uma reserva de R$ X"
// Pergunta-âncora: "Quanto preciso guardar por mês pra chegar lá?"
// Inputs: alvo, saldo inicial, prazo, rendimento estimado. Saída:
// aporte mensal + projeção + recomendação na voz do Haile.
import type { FluxoSpec, ResultBlock } from '../sim-fluxo'
import { aporteMensal, mesesNecessarios, aaToAmDecimal, asNum, fmtMeses, sumContas } from '../sim-fluxo'
import { currencyBRL } from '../finance'
import { calcPoderDeEscolhaV2 } from '../tipos'

const SELIC_HINT_PCT = 12.25 // Selic atual aproximada (hardcoded — atualizar quando integrar cotações)

export const FLUXO_RESERVA: FluxoSpec = {
  id: 'reserva',
  bucket: 'objetivos',
  title: 'Criar uma reserva',
  question: 'Quanto preciso guardar por mês pra chegar lá?',
  description: 'Define um alvo, um prazo, e o Haile calcula o aporte mensal necessário (e quanto tempo demora se você ajustar).',
  icon: 'piggy-bank',
  steps: [
    {
      id: 'alvo',
      question: 'Qual o seu alvo?',
      hint: 'O valor total que você quer ter guardado.',
      fields: [
        {
          id: 'alvo',
          label: 'Valor-alvo',
          kind: 'currency',
          hint: 'Sugerimos 6× seus essenciais mensais (reserva de emergência clássica). Ajuste se preferir outro objetivo (entrada de imóvel, viagem, etc).',
          defaultValue: (_, ctx) => {
            if (!ctx) return 30000
            const pde = calcPoderDeEscolhaV2(ctx.data, ctx.month, ctx.year)
            const essenciais = pde.byTipo?.essencial ?? 0
            if (essenciais > 0) return Math.round(essenciais * 6)
            return 30000
          },
          validate: (v) => (asNum(v) <= 0 ? 'Informe um valor > 0' : null),
        },
      ],
    },
    {
      id: 'inicio',
      question: 'Você já tem alguma quantia guardada pra isso?',
      hint: 'Pode ser zero. Conta como ponto de partida.',
      fields: [
        {
          id: 'inicial',
          label: 'Valor já guardado',
          kind: 'currency',
          hint: 'Sugerimos a soma dos saldos das suas contas — ajuste pra refletir só o que você considera reserva.',
          defaultValue: (_, ctx) => Math.round(sumContas(ctx)),
          validate: (v) => (asNum(v) < 0 ? 'Não pode ser negativo' : null),
        },
      ],
    },
    {
      id: 'prazo',
      question: 'Em quanto tempo você quer chegar?',
      hint: 'Defina um prazo realista — quanto menor, maior o aporte.',
      fields: [
        {
          id: 'meses',
          label: 'Prazo (meses)',
          kind: 'months',
          defaultValue: () => 24,
          validate: (v) => {
            const n = asNum(v)
            if (n <= 0) return 'Informe um prazo > 0'
            if (n > 600) return 'Prazo muito longo (máx 50 anos)'
            return null
          },
        },
      ],
    },
    {
      id: 'rendimento',
      question: 'Qual rendimento você estima?',
      hint: `Sugestão: ${SELIC_HINT_PCT}% ao ano (Selic atual). Para Tesouro Selic/CDB líquido, use ~85% disso após IR.`,
      fields: [
        {
          id: 'taxaAnualPct',
          label: 'Taxa anual (% ao ano)',
          kind: 'percent',
          defaultValue: () => SELIC_HINT_PCT,
          validate: (v) => {
            const n = asNum(v)
            if (n < 0) return 'Taxa não pode ser negativa'
            if (n > 50) return 'Taxa exagerada (>50% a.a.)'
            return null
          },
        },
      ],
    },
  ],
  compute(values): ResultBlock {
    const alvo = asNum(values.alvo)
    const inicial = asNum(values.inicial)
    const meses = Math.max(1, Math.round(asNum(values.meses)))
    const taxaAnual = asNum(values.taxaAnualPct)
    const iMensal = aaToAmDecimal(taxaAnual)

    if (inicial >= alvo) {
      return {
        headline: 'Você já chegou!',
        details: [
          `Seu valor inicial (${currencyBRL(inicial)}) já cobre o alvo (${currencyBRL(alvo)}).`,
          `Se quiser, redefine o alvo pra mais.`,
        ],
        metrics: [
          { label: 'Excedente', value: currencyBRL(inicial - alvo), tone: 'pos' },
        ],
        ctas: [
          { label: 'Ajustar valor-alvo', action: 'adjust' },
        ],
      }
    }

    const pmt = aporteMensal(alvo, inicial, meses, iMensal)
    const totalAportado = pmt * meses
    const jurosGanhos = alvo - inicial - totalAportado

    // Cenário alternativo: se o user aportar 80% disso, em quanto tempo chega?
    const pmtAlt = pmt * 0.8
    const mesesAlt = mesesNecessarios(alvo, inicial, pmtAlt, iMensal)

    const aaLabel = `${taxaAnual.toFixed(1)}% a.a.`
    const amLabel = `${(iMensal * 100).toFixed(2)}% a.m.`

    return {
      headline: `Aportando ${currencyBRL(pmt)} por mês, você chega em ${fmtMeses(meses)}.`,
      details: [
        `Premissa de rendimento: ${aaLabel} (≈ ${amLabel}).`,
        `Total aportado por você: ${currencyBRL(totalAportado)}.`,
        jurosGanhos > 0
          ? `Juros sobre o aplicado: ${currencyBRL(jurosGanhos)}.`
          : `Sem juros relevantes — o ganho vem só do seu aporte.`,
        `Se o aporte ficar apertado: pagando ${currencyBRL(pmtAlt)}/mês, você chega em ${fmtMeses(mesesAlt)}.`,
      ],
      metrics: [
        { label: 'Aporte mensal', value: currencyBRL(pmt), tone: pmt > 0 ? 'neutral' : 'pos' },
        { label: 'Em', value: fmtMeses(meses), tone: 'neutral' },
        { label: 'Total aportado', value: currencyBRL(totalAportado), tone: 'neutral' },
      ],
      ctas: [
        { label: 'Criar como meta', action: 'create-meta', payload: { label: 'Reserva', target: alvo, type: 'reserva' } },
        { label: 'Pedir análise ao Haile', action: 'ask-haile', payload: { prompt: `Analise se ${currencyBRL(pmt)}/mês pra chegar em ${currencyBRL(alvo)} em ${fmtMeses(meses)} é viável dentro do meu Poder de Escolha atual.` } },
        { label: 'Ajustar premissas', action: 'adjust' },
      ],
    }
  },
}
