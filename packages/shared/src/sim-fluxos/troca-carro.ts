// Fluxo Guiado: "Vale a pena trocar de carro?"
// Compara o custo da troca (entrada + parcelas, se financiar) com o que o usuário
// "perderia" deixando o carro atual continuar depreciando.
//
// Modelo simples:
//   - diferença = preço novo − valor atual (sai do caixa ou vai pra financiamento)
//   - Se financiamento: parcela Price = PV·i/(1−(1+i)^-n), custo total = parcela·n
//   - Depreciação esperada (linear): 5% a.a. sobre o valor do carro novo
//   - "Vale se" o usuário fica com o carro por X anos — quanto mais tempo, mais dilui
import type { FluxoSpec, ResultBlock } from '../sim-fluxo'
import { asNum } from '../sim-fluxo'
import { currencyBRL } from '../finance'

const DEPRECIACAO_AA = 0.05 // 5% a.a. linear simplificado

function parcelaPrice(pv: number, iMes: number, n: number): number {
  if (n <= 0) return 0
  if (iMes <= 0) return pv / n
  return pv * iMes / (1 - Math.pow(1 + iMes, -n))
}

export const FLUXO_TROCA_CARRO: FluxoSpec = {
  id: 'troca-carro',
  bucket: 'objetivos',
  title: 'Trocar de carro',
  question: 'Vale a pena trocar de carro?',
  description: 'Calcula o custo da troca (entrada + parcelas se financiar) e mostra em quanto tempo a decisão "se paga" no uso.',
  icon: 'car',
  steps: [
    {
      id: 'atual',
      question: 'Carro atual:',
      hint: 'Valor que você consegue na revenda hoje. Se já tem veículo cadastrado, sugerimos o valor atual.',
      fields: [
        {
          id: 'valorAtualCarro',
          label: 'Valor do carro atual',
          kind: 'currency',
          defaultValue: (_, ctx) => {
            const veiculos = (ctx?.data.veiculos ?? []) as Array<{ valorAtual?: number }>
            const v0 = veiculos[0]
            if (v0 && typeof v0.valorAtual === 'number' && v0.valorAtual > 0) return Math.round(v0.valorAtual)
            return 30000
          },
          validate: (v) => (asNum(v) < 0 ? 'Não pode ser negativo' : null),
        },
        {
          id: 'idadeAnos',
          label: 'Idade do carro (anos)',
          kind: 'years',
          defaultValue: () => 5,
          validate: (v) => {
            const n = asNum(v)
            if (n < 0) return 'Não pode ser negativa'
            if (n > 40) return 'Idade exagerada (>40 anos)'
            return null
          },
        },
      ],
    },
    {
      id: 'novo',
      question: 'Carro novo:',
      hint: 'Preço de mercado do que você quer comprar.',
      fields: [
        {
          id: 'valorNovo',
          label: 'Preço do carro novo',
          kind: 'currency',
          defaultValue: () => 60000,
          validate: (v) => (asNum(v) <= 0 ? 'Informe > 0' : null),
        },
        {
          id: 'tipoNovo',
          label: 'Tipo',
          kind: 'select',
          options: [
            { value: 'zero', label: 'Zero km' },
            { value: 'seminovo', label: 'Seminovo (até 3 anos)' },
            { value: 'usado', label: 'Usado' },
          ],
          defaultValue: () => 'seminovo',
        },
      ],
    },
    {
      id: 'pagamento',
      question: 'Como você vai pagar?',
      hint: 'À vista usa a diferença do caixa. Financiamento dilui em parcelas (mas custa juros).',
      fields: [
        {
          id: 'formaPagar',
          label: 'Forma de pagamento',
          kind: 'select',
          options: [
            { value: 'avista', label: 'À vista' },
            { value: 'financiamento', label: 'Financiamento' },
          ],
          defaultValue: () => 'avista',
        },
      ],
    },
    {
      id: 'financiamento',
      question: 'Condições do financiamento:',
      hint: 'Taxa de CDC de veículo típica: 1.2-2.0% a.m.',
      fields: [
        {
          id: 'prazoMesesFin',
          label: 'Prazo (meses)',
          kind: 'months',
          defaultValue: () => 60,
          visibleIf: (v) => v.formaPagar === 'financiamento',
          validate: (v, all) => {
            if (all.formaPagar !== 'financiamento') return null
            const n = asNum(v)
            if (n <= 0) return 'Informe > 0'
            if (n > 240) return 'Prazo muito longo (>20 anos)'
            return null
          },
        },
        {
          id: 'taxaMesFinPct',
          label: 'Taxa (% ao mês)',
          kind: 'percent',
          defaultValue: () => 1.5,
          visibleIf: (v) => v.formaPagar === 'financiamento',
          validate: (v, all) => {
            if (all.formaPagar !== 'financiamento') return null
            const n = asNum(v)
            if (n < 0) return 'Não pode ser negativa'
            if (n > 20) return 'Taxa exagerada (>20% a.m.)'
            return null
          },
        },
      ],
    },
    {
      id: 'horizonte',
      question: 'Por quantos anos você pretende ficar com o carro novo?',
      hint: 'Quanto mais tempo, mais dilui a depreciação e a troca compensa.',
      fields: [
        {
          id: 'anosUso',
          label: 'Anos de uso planejado',
          kind: 'years',
          defaultValue: () => 5,
          validate: (v) => {
            const n = asNum(v)
            if (n <= 0) return 'Informe > 0'
            if (n > 30) return 'Horizonte muito longo (>30 anos)'
            return null
          },
        },
      ],
    },
  ],
  compute(values): ResultBlock {
    const atual = asNum(values.valorAtualCarro)
    const novo = asNum(values.valorNovo)
    const forma = String(values.formaPagar ?? 'avista')
    const anosUso = Math.max(1, Math.round(asNum(values.anosUso)))
    const tipoNovo = String(values.tipoNovo ?? 'seminovo')

    const diff = novo - atual

    // Depreciação esperada no horizonte planejado (linear sobre valor do novo)
    const depreciacao = novo * DEPRECIACAO_AA * anosUso
    const valorResidualEsperado = Math.max(0, novo - depreciacao)

    let parcela = 0
    let totalFinanciado = 0
    let jurosFinanciamento = 0
    let prazoFin = 0
    let taxaMes = 0

    if (forma === 'financiamento' && diff > 0) {
      prazoFin = Math.max(1, Math.round(asNum(values.prazoMesesFin)))
      taxaMes = asNum(values.taxaMesFinPct) / 100
      parcela = parcelaPrice(diff, taxaMes, prazoFin)
      totalFinanciado = parcela * prazoFin
      jurosFinanciamento = totalFinanciado - diff
    }

    const custoTotalTroca = forma === 'financiamento' ? totalFinanciado : Math.max(0, diff)
    const custoTotalNoHorizonte = custoTotalTroca + depreciacao

    const custoMensalEfetivo = custoTotalNoHorizonte / (anosUso * 12)

    const tipoLabel: Record<string, string> = { zero: 'zero km', seminovo: 'seminovo', usado: 'usado' }

    let headline: string
    if (diff <= 0) {
      headline = `Troca sem desembolso — seu carro atual já cobre o novo (${currencyBRL(Math.abs(diff))} de troco).`
    } else if (forma === 'avista') {
      headline = `Pra trocar à vista, você desembolsa ${currencyBRL(diff)} de diferença.`
    } else {
      headline = `Parcela de ${currencyBRL(parcela)}/mês por ${prazoFin} meses pra cobrir a troca.`
    }

    const details: string[] = [
      `Carro atual: ${currencyBRL(atual)}. Carro novo (${tipoLabel[tipoNovo] ?? tipoNovo}): ${currencyBRL(novo)}.`,
      `Diferença líquida: ${currencyBRL(diff)}.`,
    ]
    if (forma === 'financiamento' && diff > 0) {
      details.push(
        `Financiamento Price: ${prazoFin} meses a ${asNum(values.taxaMesFinPct).toFixed(2)}% a.m. — parcela ${currencyBRL(parcela)}.`,
        `Total pago no financiamento: ${currencyBRL(totalFinanciado)} (juros ${currencyBRL(jurosFinanciamento)}).`,
      )
    }
    details.push(
      `Depreciação esperada em ${anosUso} ano${anosUso > 1 ? 's' : ''} (~5% a.a.): ${currencyBRL(depreciacao)}. Valor residual estimado: ${currencyBRL(valorResidualEsperado)}.`,
      `Custo total no horizonte (desembolso + depreciação): ${currencyBRL(custoTotalNoHorizonte)} — equivale a ${currencyBRL(custoMensalEfetivo)}/mês.`,
      anosUso >= 5
        ? 'Horizonte longo dilui o custo — a troca tende a compensar se você ficar com o carro o tempo todo.'
        : 'Horizonte curto concentra o custo — vale conferir se trocar agora é mesmo necessário.',
    )

    return {
      headline,
      details,
      metrics: [
        { label: 'Diferença', value: currencyBRL(Math.max(0, diff)) },
        forma === 'financiamento' && diff > 0
          ? { label: 'Parcela', value: currencyBRL(parcela) }
          : { label: 'À vista', value: currencyBRL(Math.max(0, diff)) },
        { label: 'Custo/mês efetivo', value: currencyBRL(custoMensalEfetivo) },
      ],
      ctas: [
        { label: 'Pedir análise ao Haile', action: 'ask-haile', payload: { prompt: `Quero trocar meu carro de ${currencyBRL(atual)} por um de ${currencyBRL(novo)} ${forma === 'financiamento' ? `(financiado em ${prazoFin}× ${currencyBRL(parcela)})` : '(à vista)'}, planejo usar por ${anosUso} anos. Cabe no meu orçamento?` } },
        { label: 'Ajustar premissas', action: 'adjust' },
      ],
    }
  },
}
