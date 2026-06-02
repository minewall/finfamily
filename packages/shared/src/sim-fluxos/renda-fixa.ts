// Fluxo Guiado: "Que renda fixa rende mais no meu caso?"
// Compara 3 produtos comuns no BR considerando IR regressivo:
//   CDB pós-fixado (% do CDI) — IR regressivo
//   LCI/LCA            (% do CDI) — ISENTO de IR pra PF
//   Tesouro Selic                  — segue ~100% Selic, IR regressivo
// Tabela IR regressivo (renda fixa, Brasil):
//   até 180 dias:    22.5%
//   181-360:         20%
//   361-720:         17.5%
//   acima de 720:    15%
import type { FluxoSpec, ResultBlock } from '../sim-fluxo'
import { asNum, fmtMeses, getRiskProfile } from '../sim-fluxo'
import { currencyBRL } from '../finance'

// TODO: cotação viva (fase futura) — hoje hardcoded como sugestão.
const CDI_HINT_PCT = 12.0 // CDI ~ Selic - 0.1pp

function aliquotaIR(prazoDias: number): number {
  if (prazoDias <= 180) return 0.225
  if (prazoDias <= 360) return 0.20
  if (prazoDias <= 720) return 0.175
  return 0.15
}

export const FLUXO_RENDA_FIXA: FluxoSpec = {
  id: 'renda-fixa',
  bucket: 'investir',
  title: 'Renda fixa: qual rende mais?',
  question: 'Que renda fixa rende mais no meu caso?',
  description: 'Compara CDB (com IR), LCI/LCA (isento) e Tesouro Selic considerando o prazo e o % do CDI de cada produto.',
  icon: 'piggy-bank',
  steps: [
    {
      id: 'valor',
      question: 'Quanto você vai aplicar?',
      hint: 'Aplicação única (não considera novos aportes nesta v1).',
      fields: [
        {
          id: 'valorAplicado',
          label: 'Valor aplicado',
          kind: 'currency',
          defaultValue: () => 10000,
          validate: (v) => (asNum(v) <= 0 ? 'Informe um valor > 0' : null),
        },
      ],
    },
    {
      id: 'prazo',
      question: 'Por quanto tempo o dinheiro fica aplicado?',
      hint: 'O IR cai conforme o prazo aumenta. >2 anos vira 15% (mais baixa).',
      fields: [
        {
          id: 'meses',
          label: 'Prazo (meses)',
          kind: 'months',
          // Conservador: 12m (liquidez/IR alto); Moderado: 24m; Agressivo: 36m+ (alíquota mínima).
          defaultValue: (_, ctx) => {
            const perfil = getRiskProfile(ctx)
            if (perfil === 'conservador') return 12
            if (perfil === 'agressivo') return 36
            return 24
          },
          validate: (v) => {
            const n = asNum(v)
            if (n <= 0) return 'Informe um prazo > 0'
            if (n > 600) return 'Máx 50 anos'
            return null
          },
        },
      ],
    },
    {
      id: 'cdi',
      question: 'Qual o CDI atual? (sugestão pré-preenchida)',
      hint: `CDI fica ligeiramente abaixo da Selic. Hoje ~${CDI_HINT_PCT}% a.a.`,
      fields: [
        {
          id: 'cdiAnualPct',
          label: 'CDI anual (% a.a.)',
          kind: 'percent',
          defaultValue: () => CDI_HINT_PCT,
          validate: (v) => {
            const n = asNum(v)
            if (n <= 0) return 'Informe um valor > 0'
            if (n > 50) return 'Exagerado (>50%)'
            return null
          },
        },
      ],
    },
    {
      id: 'percentuais',
      question: 'Qual % do CDI cada produto paga?',
      hint: 'CDB ~100-110% (bancos grandes 95-100, médios 105-115). LCI/LCA ~85-95% (compensa pelo isento). Tesouro Selic é ~100% sempre.',
      fields: [
        {
          id: 'cdbPctCdi',
          label: '% do CDI do CDB',
          kind: 'percent',
          defaultValue: () => 105,
          validate: (v) => (asNum(v) <= 0 ? 'Informe > 0' : null),
        },
        {
          id: 'lciPctCdi',
          label: '% do CDI da LCI/LCA',
          kind: 'percent',
          defaultValue: () => 90,
          validate: (v) => (asNum(v) <= 0 ? 'Informe > 0' : null),
        },
      ],
    },
  ],
  compute(values): ResultBlock {
    const pv = asNum(values.valorAplicado)
    const meses = Math.max(1, Math.round(asNum(values.meses)))
    const dias = Math.round(meses * 30.4375) // média de dias/mês considerando bissextos
    const cdi = asNum(values.cdiAnualPct) / 100
    const pctCdb = asNum(values.cdbPctCdi) / 100
    const pctLci = asNum(values.lciPctCdi) / 100

    const ir = aliquotaIR(dias)

    // taxa equivalente mensal: i_m = (1 + i_a)^(1/12) - 1
    function fvLiquido(pctCdiProduto: number, isento: boolean): { bruto: number; liquido: number; ir: number } {
      const taxaAnualProduto = cdi * pctCdiProduto
      const iMensal = Math.pow(1 + taxaAnualProduto, 1 / 12) - 1
      const fv = pv * Math.pow(1 + iMensal, meses)
      const ganho = fv - pv
      const irPago = isento ? 0 : ganho * ir
      return { bruto: fv, liquido: fv - irPago, ir: irPago }
    }

    const cdb = fvLiquido(pctCdb, false)
    const lci = fvLiquido(pctLci, true)
    // Tesouro Selic ~100% CDI (na verdade ~Selic, mas a diferença é trivial)
    const tesouro = fvLiquido(1.0, false)

    const opcoes = [
      { nome: 'CDB',            ...cdb,     pctCdi: pctCdb, isento: false },
      { nome: 'LCI/LCA',        ...lci,     pctCdi: pctLci, isento: true },
      { nome: 'Tesouro Selic',  ...tesouro, pctCdi: 1.0,    isento: false },
    ].sort((a, b) => b.liquido - a.liquido)

    const vencedor = opcoes[0]
    const segundo = opcoes[1]
    const diff = vencedor.liquido - segundo.liquido

    return {
      headline: `${vencedor.nome} sai à frente: ${currencyBRL(vencedor.liquido)} líquidos em ${fmtMeses(meses)}.`,
      details: [
        `Aplicando ${currencyBRL(pv)} por ${fmtMeses(meses)} a CDI ${(cdi * 100).toFixed(2)}% a.a.`,
        `Alíquota de IR no prazo: ${(ir * 100).toFixed(1)}% (incide nos produtos com IR — CDB e Tesouro).`,
        `Ranking:`,
        ...opcoes.map((o, i) =>
          `  ${i + 1}. ${o.nome} (${(o.pctCdi * 100).toFixed(0)}% CDI${o.isento ? ', isento' : ''}): ${currencyBRL(o.liquido)} líquido (bruto ${currencyBRL(o.bruto)}${o.isento ? '' : `, IR ${currencyBRL(o.ir)}`}).`,
        ),
        `Diferença pro 2º lugar: ${currencyBRL(diff)}.`,
        vencedor.isento
          ? 'A isenção da LCI/LCA é poderosa em prazos curtos (IR alto); em prazos longos a vantagem cai.'
          : 'O % do CDI maior compensou o IR. Em prazos mais longos a alíquota de IR cai, ampliando essa vantagem.',
      ],
      metrics: [
        { label: '1º lugar', value: vencedor.nome, tone: 'pos' },
        { label: 'Líquido', value: currencyBRL(vencedor.liquido), tone: 'pos' },
        { label: 'Ganho', value: currencyBRL(vencedor.liquido - pv), tone: 'neutral' },
      ],
      ctas: [
        { label: 'Pedir análise ao Haile', action: 'ask-haile', payload: { prompt: `Comparei ${currencyBRL(pv)} em CDB/LCI/Tesouro por ${fmtMeses(meses)}, ${vencedor.nome} ganhou. Faz sentido pro meu perfil de liquidez/risco?` } },
        { label: 'Ajustar premissas', action: 'adjust' },
      ],
    }
  },
}
