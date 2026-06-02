// Fluxo Guiado: "Devo quitar dívida ou investir o sobra?"
// Compara duas estratégias para o mesmo dinheiro mensal disponível:
//   QUITAR: usa a sobra inteira pra amortizar a dívida — calcula em quantos meses
//           ela acaba (e quanto se paga em juros no caminho).
//   INVESTIR: deixa a dívida rolar com a parcela mínima (juros da dívida sobre
//             saldo) e investe a sobra inteira no mesmo prazo.
//
// Regra de bolso: se a taxa da dívida (a.a.) > rendimento líquido do investimento,
// quitar tende a vencer matematicamente. O fluxo mostra os números pros 2 cenários
// no MESMO horizonte (tempo até quitar a dívida) pra comparação justa.
import type { FluxoSpec, ResultBlock } from '../sim-fluxo'
import { asNum, aaToAmDecimal, fmtMeses } from '../sim-fluxo'
import { currencyBRL } from '../finance'
import { calcPoderDeEscolhaV2 } from '../tipos'

export const FLUXO_DIVIDA_VS_INVESTIR: FluxoSpec = {
  id: 'divida-vs-investir',
  bucket: 'dividas',
  title: 'Quitar dívida × investir',
  question: 'Devo quitar dívida ou investir o sobra?',
  description: 'Compara dois cenários no mesmo horizonte: usar a sobra mensal pra quitar a dívida vs investir paralelamente enquanto paga só o mínimo.',
  icon: 'scale',
  steps: [
    {
      id: 'sobra',
      question: 'Quanto sobra por mês depois das contas?',
      hint: 'Sugerimos seu Poder de Escolha atual — ajuste pra refletir só o que você considera disponível pra dívida/investimento.',
      fields: [
        {
          id: 'sobraMensal',
          label: 'Sobra mensal',
          kind: 'currency',
          defaultValue: (_, ctx) => {
            if (!ctx) return 1000
            const pde = calcPoderDeEscolhaV2(ctx.data, ctx.month, ctx.year)
            return pde.poderDeEscolha > 0 ? Math.round(pde.poderDeEscolha) : 1000
          },
          validate: (v) => (asNum(v) <= 0 ? 'Informe um valor > 0' : null),
        },
      ],
    },
    {
      id: 'divida',
      question: 'Sua dívida hoje:',
      hint: 'Saldo total que falta pagar + a taxa de juros mensal. Cartão rotativo costuma cobrar 10-15% a.m., cheque especial 6-12%, empréstimo pessoal 3-8%.',
      fields: [
        {
          id: 'saldoDivida',
          label: 'Saldo da dívida',
          kind: 'currency',
          defaultValue: () => 10000,
          validate: (v) => (asNum(v) <= 0 ? 'Informe um valor > 0' : null),
        },
        {
          id: 'taxaDividaMesPct',
          label: 'Taxa da dívida (% ao mês)',
          kind: 'percent',
          defaultValue: () => 2,
          validate: (v) => {
            const n = asNum(v)
            if (n < 0) return 'Não pode ser negativa'
            if (n > 50) return 'Taxa exagerada (>50% a.m.)'
            return null
          },
        },
      ],
    },
    {
      id: 'investimento',
      question: 'Rendimento esperado do investimento:',
      hint: 'Sugestão: 12% a.a. (próximo da Selic). Para algo mais arrojado, considere 15-18%.',
      fields: [
        {
          id: 'rendInvestAnoPct',
          label: 'Rendimento (% ao ano)',
          kind: 'percent',
          defaultValue: () => 12,
          validate: (v) => {
            const n = asNum(v)
            if (n < 0) return 'Não pode ser negativa'
            if (n > 50) return 'Taxa exagerada (>50% a.a.)'
            return null
          },
        },
      ],
    },
  ],
  compute(values): ResultBlock {
    const sobra = asNum(values.sobraMensal)
    const saldo = asNum(values.saldoDivida)
    const iDividaMes = asNum(values.taxaDividaMesPct) / 100
    const taxaDividaAno = (Math.pow(1 + iDividaMes, 12) - 1) * 100
    const taxaInvestAno = asNum(values.rendInvestAnoPct)
    const iInvestMes = aaToAmDecimal(taxaInvestAno)

    // ── Cenário QUITAR: sobra mensal vai inteira pra dívida ──
    // saldo_{k+1} = saldo_k · (1 + i) − sobra
    // Fórmula fechada (anuidade): n = log(sobra / (sobra − saldo·i)) / log(1+i)
    let mesesQuitar: number
    let totalPagoQuitar: number
    let jurosPagosQuitar: number
    let viavel = true
    if (iDividaMes <= 0) {
      mesesQuitar = saldo / sobra
      totalPagoQuitar = saldo
      jurosPagosQuitar = 0
    } else if (sobra <= saldo * iDividaMes) {
      // Sobra não cobre nem os juros — dívida cresce
      viavel = false
      mesesQuitar = Infinity
      totalPagoQuitar = Infinity
      jurosPagosQuitar = Infinity
    } else {
      mesesQuitar = Math.log(sobra / (sobra - saldo * iDividaMes)) / Math.log(1 + iDividaMes)
      totalPagoQuitar = sobra * mesesQuitar
      jurosPagosQuitar = totalPagoQuitar - saldo
    }

    if (!viavel) {
      return {
        headline: 'Sua sobra não cobre nem os juros da dívida.',
        details: [
          `Juros mensais da dívida: ${currencyBRL(saldo * iDividaMes)} — maior que sua sobra de ${currencyBRL(sobra)}.`,
          'Antes de comparar, ajuste o orçamento ou renegocie a dívida (consignado, portabilidade) pra trazer a taxa pra baixo.',
        ],
        metrics: [
          { label: 'Juros/mês', value: currencyBRL(saldo * iDividaMes), tone: 'neg' },
          { label: 'Sobra', value: currencyBRL(sobra), tone: 'neutral' },
        ],
        ctas: [
          { label: 'Pedir orientação ao Haile', action: 'ask-haile', payload: { prompt: `Minha sobra (${currencyBRL(sobra)}/mês) não cobre os juros de uma dívida de ${currencyBRL(saldo)} a ${asNum(values.taxaDividaMesPct).toFixed(2)}% a.m. Como sair disso?` } },
          { label: 'Ajustar premissas', action: 'adjust' },
        ],
      }
    }

    // ── Cenário INVESTIR (paralelo, mesmo horizonte) ──
    // Premissa: paga só o juros da dívida (mantém saldo) e investe a sobra integral
    // (mesma quantia, no mesmo horizonte) — pra comparar oportunidade.
    // Juros pagos no horizonte: saldo · i_divida · n   (rolando o saldo)
    // Valor acumulado: FV de anuidade postcipada: sobra · ((1+i_inv)^n − 1) / i_inv
    const n = mesesQuitar
    const jurosPagosInvestir = saldo * iDividaMes * n
    let fvInvestimento: number
    if (iInvestMes <= 0) fvInvestimento = sobra * n
    else fvInvestimento = sobra * (Math.pow(1 + iInvestMes, n) - 1) / iInvestMes
    // Δ patrimônio no INVESTIR = ativo gerado − caixa que saiu (aporte + juros pagos).
    // Δ patrimônio no QUITAR = saldo abatido − caixa que saiu (sobra · n).
    const caixaSaidaInvestir = sobra * n + jurosPagosInvestir
    const liquidoInvestir = fvInvestimento - caixaSaidaInvestir
    const liquidoQuitar = saldo - sobra * n // = −jurosPagosQuitar (já está livre da dívida)

    const quitarVence = liquidoQuitar >= liquidoInvestir
    const diff = Math.abs(liquidoQuitar - liquidoInvestir)

    const aaDividaLabel = `${taxaDividaAno.toFixed(1)}% a.a. equivalente`
    const headline = quitarVence
      ? `Quitar primeiro sai ${currencyBRL(diff)} melhor que investir em paralelo.`
      : `Investir em paralelo sai ${currencyBRL(diff)} melhor que quitar primeiro.`

    return {
      headline,
      details: [
        `Taxa da dívida: ${asNum(values.taxaDividaMesPct).toFixed(2)}% a.m. (${aaDividaLabel}).`,
        `Rendimento do investimento: ${taxaInvestAno.toFixed(1)}% a.a.`,
        `Horizonte de comparação: ${fmtMeses(n)} (tempo pra quitar usando ${currencyBRL(sobra)}/mês).`,
        `QUITAR: pagos ${currencyBRL(totalPagoQuitar)}, dos quais ${currencyBRL(jurosPagosQuitar)} são juros. Dívida zerada ao final.`,
        `INVESTIR em paralelo: dívida continua em ${currencyBRL(saldo)} (com ${currencyBRL(jurosPagosInvestir)} pagos em juros nesse tempo); investimento acumula ${currencyBRL(fvInvestimento)}. Líquido (Δ patrimônio): ${currencyBRL(liquidoInvestir)}.`,
        quitarVence
          ? 'Quitar libera a sobra pra investir DEPOIS — e mata um custo fixo que come o orçamento todo mês.'
          : 'Mas atenção: investir só compensa se você for disciplinado pra não usar a sobra em outra coisa.',
      ],
      metrics: [
        { label: 'QUITAR (líquido)', value: currencyBRL(liquidoQuitar), tone: quitarVence ? 'pos' : 'neg' },
        { label: 'INVESTIR (líquido)', value: currencyBRL(liquidoInvestir), tone: !quitarVence ? 'pos' : 'neg' },
        { label: 'Em', value: fmtMeses(n) },
      ],
      ctas: [
        { label: 'Pedir análise ao Haile', action: 'ask-haile', payload: { prompt: `Comparei quitar uma dívida de ${currencyBRL(saldo)} a ${asNum(values.taxaDividaMesPct).toFixed(2)}% a.m. com investir ${currencyBRL(sobra)}/mês a ${taxaInvestAno}% a.a. — ${quitarVence ? 'quitar' : 'investir'} venceu. Faz sentido pro meu caso?` } },
        { label: 'Ajustar premissas', action: 'adjust' },
      ],
    }
  },
}
