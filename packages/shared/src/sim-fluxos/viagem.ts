// Fluxo Guiado: "Quanto preciso pra viajar?"
// Modelo simples: alvo = nPessoas × nDias × custoMédioPorPessoaPorDia.
// Aporte mensal = aporteMensal(alvo, 0, mesesAteViagem, taxa).
// Defaults de custo médio por tipo de viagem ajustam expectativa sem perguntar
// detalhe demais (passagem, hospedagem, alimentação, passeio — tudo embutido).
import type { FluxoSpec, ResultBlock } from '../sim-fluxo'
import { asNum, aporteMensal, aaToAmDecimal, fmtMeses } from '../sim-fluxo'
import { currencyBRL } from '../finance'

// Custo médio R$/pessoa/dia (tudo incluso: passagem rateada + hospedagem + alimentação + passeios)
const CUSTO_POR_TIPO: Record<string, number> = {
  nacional: 300,
  internacional: 600,
  mochilao: 200,
  cruzeiro: 800,
}

const RENDIMENTO_PADRAO_AA = 10 // % a.a. — algo conservador (renda fixa líquida)

export const FLUXO_VIAGEM: FluxoSpec = {
  id: 'viagem',
  bucket: 'objetivos',
  title: 'Viagem',
  question: 'Quanto preciso pra viajar?',
  description: 'Define destino, pessoas, dias e prazo. O Haile calcula o alvo e o aporte mensal pra você chegar lá sem comprometer o resto.',
  icon: 'plane',
  steps: [
    {
      id: 'tipo',
      question: 'Que tipo de viagem você está planejando?',
      hint: 'A escolha define um custo médio padrão por pessoa/dia — ajuste depois se quiser refinar.',
      fields: [
        {
          id: 'tipoViagem',
          label: 'Tipo',
          kind: 'select',
          options: [
            { value: 'nacional', label: 'Nacional (R$ 300/pessoa/dia)' },
            { value: 'internacional', label: 'Internacional (R$ 600/pessoa/dia)' },
            { value: 'mochilao', label: 'Mochilão (R$ 200/pessoa/dia)' },
            { value: 'cruzeiro', label: 'Cruzeiro (R$ 800/pessoa/dia)' },
          ],
          defaultValue: () => 'nacional',
        },
      ],
    },
    {
      id: 'pessoasDias',
      question: 'Quantas pessoas e quantos dias?',
      hint: 'Conta todo mundo que vai (você inclusive).',
      fields: [
        {
          id: 'pessoas',
          label: 'Nº de pessoas',
          kind: 'years', // usado pra mostrar input numérico sem máscara monetária
          defaultValue: () => 2,
          validate: (v) => (asNum(v) <= 0 ? 'Informe > 0' : null),
        },
        {
          id: 'dias',
          label: 'Nº de dias',
          kind: 'years',
          defaultValue: () => 7,
          validate: (v) => (asNum(v) <= 0 ? 'Informe > 0' : null),
        },
      ],
    },
    {
      id: 'custo',
      question: 'Custo médio estimado por pessoa por dia:',
      hint: 'Já vem preenchido conforme o tipo escolhido — ajuste se você sabe que vai gastar mais (ou menos).',
      fields: [
        {
          id: 'custoPessoaDia',
          label: 'Custo (R$/pessoa/dia)',
          kind: 'currency',
          defaultValue: (v) => CUSTO_POR_TIPO[String(v.tipoViagem ?? 'nacional')] ?? 300,
          validate: (v) => (asNum(v) <= 0 ? 'Informe > 0' : null),
        },
      ],
    },
    {
      id: 'quando',
      question: 'Quando você quer viajar?',
      hint: 'Quanto mais longe a data, menor o aporte mensal — mas também menos urgente.',
      fields: [
        {
          id: 'mesesAteViagem',
          label: 'Meses até a viagem',
          kind: 'months',
          defaultValue: () => 12,
          validate: (v) => {
            const n = asNum(v)
            if (n <= 0) return 'Informe > 0'
            if (n > 240) return 'Prazo muito longo (>20 anos)'
            return null
          },
        },
      ],
    },
    {
      id: 'rendimento',
      question: 'Qual rendimento você estima guardando?',
      hint: `Sugestão: ${RENDIMENTO_PADRAO_AA}% a.a. (renda fixa líquida conservadora). Pra prazos curtos, Tesouro Selic ou CDB líquido é o típico.`,
      fields: [
        {
          id: 'taxaAnualPct',
          label: 'Rendimento (% ao ano)',
          kind: 'percent',
          defaultValue: () => RENDIMENTO_PADRAO_AA,
          validate: (v) => {
            const n = asNum(v)
            if (n < 0) return 'Não pode ser negativa'
            if (n > 50) return 'Taxa exagerada'
            return null
          },
        },
      ],
    },
  ],
  compute(values): ResultBlock {
    const tipo = String(values.tipoViagem ?? 'nacional')
    const pessoas = Math.max(1, Math.round(asNum(values.pessoas)))
    const dias = Math.max(1, Math.round(asNum(values.dias)))
    const custoPorDia = asNum(values.custoPessoaDia)
    const meses = Math.max(1, Math.round(asNum(values.mesesAteViagem)))
    const taxaAnual = asNum(values.taxaAnualPct)
    const iMensal = aaToAmDecimal(taxaAnual)

    const alvo = pessoas * dias * custoPorDia
    const pmt = aporteMensal(alvo, 0, meses, iMensal)
    const totalAportado = pmt * meses
    const jurosGanhos = alvo - totalAportado

    const tipoLabel: Record<string, string> = {
      nacional: 'nacional',
      internacional: 'internacional',
      mochilao: 'mochilão',
      cruzeiro: 'cruzeiro',
    }

    return {
      headline: `Aportando ${currencyBRL(pmt)} por mês, você viaja em ${fmtMeses(meses)}.`,
      details: [
        `Alvo: ${currencyBRL(alvo)} (${pessoas} pessoa${pessoas > 1 ? 's' : ''} × ${dias} dias × ${currencyBRL(custoPorDia)}/dia, viagem ${tipoLabel[tipo] ?? tipo}).`,
        `Premissa de rendimento: ${taxaAnual.toFixed(1)}% a.a. (≈ ${(iMensal * 100).toFixed(2)}% a.m.).`,
        `Total que você aporta: ${currencyBRL(totalAportado)}.`,
        jurosGanhos > 0
          ? `Juros ganhos no caminho: ${currencyBRL(jurosGanhos)}.`
          : `Pouco juros nesse prazo — o dinheiro vem quase todo do seu aporte.`,
        'Dica: guarde em conta separada (Tesouro Selic ou CDB líquido) pra não confundir com a reserva geral.',
      ],
      metrics: [
        { label: 'Alvo', value: currencyBRL(alvo) },
        { label: 'Aporte mensal', value: currencyBRL(pmt) },
        { label: 'Em', value: fmtMeses(meses) },
      ],
      ctas: [
        { label: 'Criar como meta', action: 'create-meta', payload: { label: `Viagem ${tipoLabel[tipo] ?? tipo}`, target: alvo, type: 'reserva' } },
        { label: 'Pedir análise ao Haile', action: 'ask-haile', payload: { prompt: `Quero viajar em ${fmtMeses(meses)} (${currencyBRL(alvo)}). Posso aportar ${currencyBRL(pmt)}/mês sem comprometer outras metas?` } },
        { label: 'Ajustar premissas', action: 'adjust' },
      ],
    }
  },
}
