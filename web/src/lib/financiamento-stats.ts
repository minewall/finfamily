// Estatísticas agregadas dos financiamentos pra UI da tela Financiamentos.
// Reutiliza as fórmulas SAC/Price em packages/shared/src/financiamentos.ts.
//
// Convenções:
// - taxa em % a.m. (ex.: 1.0 = 1%). Média de juros publicada como % a.m.
// - "mês corrente" = mês solicitado (default: agora no fuso local).

import {
  type Financiamento,
  type UserData,
  financiamentoSaldoDevedor,
  financiamentoTotalPago,
  financiamentoParcelaNa,
  getFinanciamentoResumo,
} from '@haile/shared'

export interface FinanciamentoKpis {
  saldoDevedor: number
  parcelaMensal: number
  valorPago: number
  /** Média ponderada das taxas mensais (em %) pelo saldo devedor. */
  mediaJuros: number
}

const MES_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function listFinanciamentos(data: UserData | null | undefined): Financiamento[] {
  return ((data?.financiamentos as Financiamento[] | undefined) ?? [])
}

function isAtivo(f: Financiamento): boolean {
  const n = f.prazo || 0
  const k = f.parcelasPagas || 0
  return n > 0 && k < n && (f.valorFinanciado || 0) > 0
}

/** Diferença de meses entre `dataInicio` (YYYY-MM-DD) e (year, month0). */
function mesesDesdeInicio(f: Financiamento, year: number, month0: number): number {
  const ini = f.dataInicio
  if (!ini) return 0
  const [yStr, mStr] = ini.split('-')
  const y = Number(yStr)
  const m0 = Number(mStr) - 1
  if (!Number.isFinite(y) || !Number.isFinite(m0)) return 0
  return (year - y) * 12 + (month0 - m0)
}

export function financiamentoKpis(data: UserData | null | undefined): FinanciamentoKpis {
  const fins = listFinanciamentos(data)
  if (fins.length === 0) {
    return { saldoDevedor: 0, parcelaMensal: 0, valorPago: 0, mediaJuros: 0 }
  }

  let saldoDevedor = 0
  let parcelaMensal = 0
  let valorPago = 0
  let pesoTotal = 0
  let jurosPonderado = 0

  for (const f of fins) {
    const ativo = isAtivo(f)
    const saldo = financiamentoSaldoDevedor(f)
    saldoDevedor += saldo
    valorPago += financiamentoTotalPago(f)

    if (ativo) {
      const k = f.parcelasPagas || 0
      parcelaMensal += financiamentoParcelaNa(f, k + 1)
      const peso = saldo > 0 ? saldo : (f.valorFinanciado || 0)
      pesoTotal += peso
      jurosPonderado += peso * (f.taxaMensal || 0)
    }
  }

  const mediaJuros = pesoTotal > 0 ? jurosPonderado / pesoTotal : 0
  return { saldoDevedor, parcelaMensal, valorPago, mediaJuros }
}

export interface EvolucaoSaldoPoint {
  periodo: string
  valor: number
}

/**
 * Saldo devedor projetado mês a mês ao longo de `year`. Usa as fórmulas
 * SAC/Price já parametrizadas: pra cada mês, calcula quantas parcelas terão
 * sido pagas naquele ponto (a partir de `dataInicio` + amortizações naturais)
 * e aplica `financiamentoSaldoDevedor` com aquele `parcelasPagas` hipotético.
 *
 * Cobre o ano inteiro (Jan..Dez), independente do mês atual — pra histórico
 * usa contratos com dataInicio anterior; pra futuro projeta o cronograma.
 */
export function evolucaoSaldoDevedor(
  data: UserData | null | undefined,
  year?: number,
): EvolucaoSaldoPoint[] {
  const fins = listFinanciamentos(data)
  const now = new Date()
  const y = year ?? now.getFullYear()
  const out: EvolucaoSaldoPoint[] = []

  for (let m = 0; m < 12; m++) {
    let total = 0
    for (const f of fins) {
      const n = f.prazo || 0
      if (!n) continue
      const decorridos = mesesDesdeInicio(f, y, m)
      const k = Math.max(0, Math.min(n, decorridos))
      // simula saldo daquele mês com `parcelasPagas` hipotético
      const hip: Financiamento = { ...f, parcelasPagas: k }
      total += financiamentoSaldoDevedor(hip)
    }
    out.push({ periodo: MES_LABEL[m], valor: Math.round(total) })
  }

  return out
}

export interface AmortizacaoVsJurosRow {
  label: string
  amortizacao: number
  juros: number
}

/**
 * Decompõe a parcela de cada financiamento ativo em amortização + juros
 * pro mês solicitado. Default: mês atual. Pra um contrato fora da janela
 * (ainda não iniciado ou já quitado), retorna 0/0.
 *
 * SAC: amortização = PV/n constante; juros = saldoAnterior * i.
 * Price: parcela = PMT constante; juros = saldoAnterior * i; amortização = PMT - juros.
 */
export function amortizacaoVsJuros(
  data: UserData | null | undefined,
  month?: number,
  year?: number,
): AmortizacaoVsJurosRow[] {
  const fins = listFinanciamentos(data)
  const now = new Date()
  const m0 = month ?? now.getMonth()
  const y = year ?? now.getFullYear()
  const rows: AmortizacaoVsJurosRow[] = []

  for (const f of fins) {
    const n = f.prazo || 0
    const PV = f.valorFinanciado || 0
    const i = (f.taxaMensal || 0) / 100
    if (!n || !PV) {
      rows.push({ label: f.label || 'Financiamento', amortizacao: 0, juros: 0 })
      continue
    }
    const decorridos = mesesDesdeInicio(f, y, m0)
    const k = decorridos + 1 // parcela que cai nesse mês (1-indexed)
    if (k < 1 || k > n) {
      rows.push({ label: f.label || 'Financiamento', amortizacao: 0, juros: 0 })
      continue
    }
    // saldo ANTES da k-ésima parcela = saldo após (k-1) pagamentos
    const saldoAnterior = financiamentoSaldoDevedor({ ...f, parcelasPagas: k - 1 })
    const juros = saldoAnterior * i
    const parcela = financiamentoParcelaNa(f, k)
    const amortizacao = Math.max(0, parcela - juros)
    rows.push({
      label: f.label || 'Financiamento',
      amortizacao: Math.round(amortizacao),
      juros: Math.round(juros),
    })
  }

  return rows
}

/**
 * Heurística de status do contrato baseada em `dataInicio` + `parcelasPagas`.
 * "Em dia": k >= esperadas-1. "Atrasado": k < esperadas-1. "Sem data": null.
 */
export function statusFinanciamento(f: Financiamento): 'em-dia' | 'atrasado' | null {
  if (!f.dataInicio) return null
  const r = getFinanciamentoResumo(f)
  if (r.restantes === 0) return 'em-dia'
  const now = new Date()
  const esperadas = mesesDesdeInicio(f, now.getFullYear(), now.getMonth()) + 1
  if (esperadas <= 0) return 'em-dia'
  const k = f.parcelasPagas || 0
  // tolerância de 1 mês (a parcela do mês corrente pode ainda não ter caído)
  if (k >= esperadas - 1) return 'em-dia'
  return 'atrasado'
}
