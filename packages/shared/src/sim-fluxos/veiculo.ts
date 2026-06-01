// Fluxo Guiado: "Vale mais comprar ou alugar o carro?"
// Compara TCO líquido no horizonte N anos:
//   COMPRA: preço inicial − valor residual estimado + IPVA + seguro + manutenção
//           - depreciação ~15% a.a. nos 1ºs 5 anos, depois 8% a.a. (modelo simples)
//   ALUGAR: total pago no aluguel (já inclui seguro/manutenção em assinatura).
//
// Saída: qual cenário sai mais barato no horizonte + diferença + análise.
// Não modelamos custo de oportunidade do capital parado no carro porque
// distrai sem mover muito o resultado em prazos curtos.
import type { FluxoSpec, ResultBlock } from '../sim-fluxo'
import { asNum } from '../sim-fluxo'
import { currencyBRL } from '../finance'

/** Valor residual do veículo após N anos, modelo de depreciação simples. */
function valorResidual(preco: number, anos: number): number {
  let v = preco
  const a = Math.max(0, anos)
  for (let i = 0; i < Math.min(5, a); i++) v *= 0.85       // -15% a.a. nos 5 primeiros
  for (let i = 0; i < Math.max(0, a - 5); i++) v *= 0.92  // -8% a.a. depois
  return v
}

export const FLUXO_VEICULO: FluxoSpec = {
  id: 'veiculo',
  bucket: 'objetivos',
  title: 'Veículo: comprar × alugar',
  question: 'Vale mais comprar ou alugar o carro?',
  description: 'Compara o custo total de comprar (com depreciação + IPVA + seguro + manutenção) vs alugar/assinatura no horizonte que você definir.',
  icon: 'car',
  steps: [
    {
      id: 'compra',
      question: 'Cenário COMPRA: quanto custa o carro?',
      hint: 'Preço à vista. Se for financiar, considere o valor total pago (já inclui juros).',
      fields: [
        {
          id: 'precoCarro',
          label: 'Preço do carro',
          kind: 'currency',
          defaultValue: () => 90000,
          validate: (v) => (asNum(v) <= 0 ? 'Informe um valor > 0' : null),
        },
      ],
    },
    {
      id: 'custosFixos',
      question: 'Custos fixos anuais (IPVA + seguro + manutenção):',
      hint: 'Sugestão: ~6% do valor do carro/ano (5-8% é a faixa típica).',
      fields: [
        {
          id: 'custoAnualCompra',
          label: 'Custo anual (IPVA + seguro + manutenção)',
          kind: 'currency',
          defaultValue: (v) => Math.round(asNum(v.precoCarro) * 0.06),
          validate: (v) => (asNum(v) < 0 ? 'Não pode ser negativo' : null),
        },
      ],
    },
    {
      id: 'aluguel',
      question: 'Cenário ALUGAR: mensalidade da assinatura/aluguel?',
      hint: 'Inclui seguro e manutenção (típico de carro por assinatura).',
      fields: [
        {
          id: 'mensalidadeAluguel',
          label: 'Mensalidade do aluguel/assinatura',
          kind: 'currency',
          defaultValue: () => 2500,
          validate: (v) => (asNum(v) <= 0 ? 'Informe um valor > 0' : null),
        },
      ],
    },
    {
      id: 'prazo',
      question: 'Em quantos anos você compara?',
      hint: 'Horizonte da decisão. Pra carros, 3-5 anos é o típico.',
      fields: [
        {
          id: 'anos',
          label: 'Horizonte (anos)',
          kind: 'years',
          defaultValue: () => 4,
          validate: (v) => {
            const n = asNum(v)
            if (n <= 0) return 'Informe um prazo > 0'
            if (n > 30) return 'Prazo muito longo (>30 anos)'
            return null
          },
        },
      ],
    },
  ],
  compute(values): ResultBlock {
    const preco = asNum(values.precoCarro)
    const custoAno = asNum(values.custoAnualCompra)
    const aluguelMes = asNum(values.mensalidadeAluguel)
    const anos = Math.max(1, Math.round(asNum(values.anos)))
    const meses = anos * 12

    const residual = valorResidual(preco, anos)
    const tcoCompra = preco - residual + custoAno * anos
    const tcoAlugar = aluguelMes * meses
    const diff = tcoCompra - tcoAlugar
    const compraVence = diff < 0

    // Break-even: em quantos anos a compra empata com o aluguel?
    // tcoCompra(n) = tcoAlugar(n)  →  preço − VR(n) + custoAno·n = aluguelMes·12·n
    let breakEven: number | null = null
    for (let n = 1; n <= 30; n++) {
      const c = preco - valorResidual(preco, n) + custoAno * n
      const a = aluguelMes * 12 * n
      if (c <= a) { breakEven = n; break }
    }

    const headline = compraVence
      ? `Em ${anos} anos, comprar sai ${currencyBRL(Math.abs(diff))} mais barato.`
      : `Em ${anos} anos, alugar sai ${currencyBRL(Math.abs(diff))} mais barato.`

    const details: string[] = [
      `COMPRAR: gasto líquido ${currencyBRL(tcoCompra)} em ${anos} anos (${currencyBRL(preco)} pago − ${currencyBRL(residual)} de valor residual + ${currencyBRL(custoAno * anos)} de custos fixos).`,
      `ALUGAR: ${currencyBRL(tcoAlugar)} em ${anos} anos (${currencyBRL(aluguelMes)}/mês × ${meses} meses).`,
      breakEven
        ? `Break-even: comprar começa a compensar a partir de ${breakEven} ano${breakEven > 1 ? 's' : ''}.`
        : `Nos próximos 30 anos, alugar continua mais barato com esses números.`,
      compraVence
        ? 'Comprar funciona melhor se você pretende ficar com o carro pelo menos pelo horizonte simulado.'
        : 'Alugar pode ser melhor se você troca de carro com frequência ou não quer lidar com manutenção/revenda.',
    ]

    return {
      headline,
      details,
      metrics: [
        { label: 'TCO Comprar', value: currencyBRL(tcoCompra), tone: compraVence ? 'pos' : 'neg' },
        { label: 'TCO Alugar', value: currencyBRL(tcoAlugar), tone: !compraVence ? 'pos' : 'neg' },
        { label: 'Diferença', value: currencyBRL(Math.abs(diff)), tone: 'neutral' },
      ],
      ctas: [
        { label: 'Pedir análise ao Haile', action: 'ask-haile', payload: { prompt: `No meu caso, ${compraVence ? 'comprar' : 'alugar'} um carro de ${currencyBRL(preco)} em ${anos} anos vale a pena? Considere meu Poder de Escolha e metas atuais.` } },
        { label: 'Ajustar premissas', action: 'adjust' },
      ],
    }
  },
}
