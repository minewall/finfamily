// Helpers de estatísticas pra Visão Geral (Track T).
// - Saúde Financeira (score 0-100 + 4 bandas + componentes)
// - Previsão de Caixa 30 dias (saldo, receitas e despesas previstas, fluxo diário)
// - Próximas Parcelas inline (até 14 dias, focado e compacto)
//
// Todos puros — sem side effects, sem hooks. Recebem `UserData` e retornam
// objetos prontos pra render.

import type { UserData } from '@haile/shared'
import {
  saldoMes,
  calcPoderDeEscolhaV2,
  sumDespesasByTipo,
  getCompromissos,
} from '@haile/shared'

// ─────────────────────────────────────────────────────────────────
// Saúde Financeira
// ─────────────────────────────────────────────────────────────────

export type ClassificacaoSaude = 'critica' | 'atencao' | 'estavel' | 'forte'

export interface SaudeFinanceira {
  /** 0-100 */
  score: number
  classificacao: ClassificacaoSaude
  componentes: {
    /** % do Poder de Escolha sobre a receita do mês (0..1) */
    pdeSobreReceita: number
    /** Quantos meses a reserva (saldo total das contas) cobre dos essenciais médios */
    reservaSobreEssenciais: number
    /** Quantos meses consecutivos com saldo positivo (terminando no mês atual e olhando pra trás) */
    sequenciaSaldoPositivo: number
  }
}

function clamp(n: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n))
}

/** Interpola linear entre pontos de uma curva (x ascendente). */
function interpolateCurve(x: number, points: Array<[number, number]>): number {
  if (points.length === 0) return 0
  if (x <= points[0]![0]) return points[0]![1]
  if (x >= points[points.length - 1]![0]) return points[points.length - 1]![1]
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]!
    const [x1, y1] = points[i + 1]!
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0)
      return y0 + (y1 - y0) * t
    }
  }
  return points[points.length - 1]![1]
}

/** Avança (mes,ano) em -n meses. */
function shiftMonth(month: number, year: number, deltaMonths: number): { month: number; year: number } {
  let m = month + deltaMonths
  let y = year
  while (m <= 0) {
    m += 12
    y -= 1
  }
  while (m > 12) {
    m -= 12
    y += 1
  }
  return { month: m, year: y }
}

export function calcularSaudeFinanceira(
  data: UserData,
  year: number,
  month: number,
): SaudeFinanceira {
  const pde = calcPoderDeEscolhaV2(data, month, year)
  const receitas = pde.receitas

  // 1) PdE / Receita
  const pdeRatio = receitas > 0 ? clamp(pde.poderDeEscolha / receitas) : 0
  // Curva: 0% → 0, 10% → 30, 30% → 60, 50%+ → 100
  const pdePontos = interpolateCurve(pdeRatio, [
    [0.0, 0],
    [0.1, 30],
    [0.3, 60],
    [0.5, 100],
  ])

  // 2) Reserva / Essenciais médios (3 meses)
  const totalContas = (data.contas ?? []).reduce((s, c) => s + (Number(c.saldo) || 0), 0)
  let somaEssenciais = 0
  let mesesConsiderados = 0
  for (let i = 0; i < 3; i++) {
    const { month: m, year: y } = shiftMonth(month, year, -i)
    const byTipo = sumDespesasByTipo(data, m, y)
    const essenciais = (byTipo.essencial || 0) + (byTipo.obrigatorio || 0) + (byTipo.comprometido || 0)
    if (essenciais > 0) {
      somaEssenciais += essenciais
      mesesConsiderados += 1
    }
  }
  const essenciaisMedios = mesesConsiderados > 0 ? somaEssenciais / mesesConsiderados : 0
  const reservaMeses = essenciaisMedios > 0 ? totalContas / essenciaisMedios : totalContas > 0 ? 12 : 0
  // Curva: 0 → 0, 3 → 30, 6 → 60, 12+ → 100
  const reservaPontos = interpolateCurve(reservaMeses, [
    [0, 0],
    [3, 30],
    [6, 60],
    [12, 100],
  ])

  // 3) Sequência saldo positivo (do mês corrente pra trás)
  let sequencia = 0
  for (let i = 0; i < 12; i++) {
    const { month: m, year: y } = shiftMonth(month, year, -i)
    const s = saldoMes(data, m, y)
    if (s > 0) sequencia += 1
    else break
  }
  // Bonus +10pts se >= 3
  const sequenciaBonus = sequencia >= 3 ? 100 : sequencia >= 2 ? 60 : sequencia >= 1 ? 30 : 0

  // Média ponderada: PdE 40% + Reserva 50% + Sequência 10%
  const scoreRaw = pdePontos * 0.4 + reservaPontos * 0.5 + sequenciaBonus * 0.1
  const score = Math.round(clamp(scoreRaw, 0, 100))

  let classificacao: ClassificacaoSaude
  if (score < 30) classificacao = 'critica'
  else if (score < 55) classificacao = 'atencao'
  else if (score < 75) classificacao = 'estavel'
  else classificacao = 'forte'

  return {
    score,
    classificacao,
    componentes: {
      pdeSobreReceita: pdeRatio,
      reservaSobreEssenciais: reservaMeses,
      sequenciaSaldoPositivo: sequencia,
    },
  }
}

// ─────────────────────────────────────────────────────────────────
// Previsão de Caixa 30 dias
// ─────────────────────────────────────────────────────────────────

export interface FluxoDiarioPonto {
  /** YYYY-MM-DD */
  data: string
  saldo: number
}

export interface PrevisaoCaixa {
  saldoAtual: number
  receitasPrevistas: number
  despesasPrevistas: number
  saldoFinal30d: number
  fluxoDiario: FluxoDiarioPonto[]
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function todayISO(): string {
  return isoDay(new Date())
}

export function calcularPrevisaoCaixa(data: UserData): PrevisaoCaixa {
  const today = todayISO()
  const start = new Date(today + 'T00:00:00')
  const limit = new Date(start)
  limit.setDate(limit.getDate() + 30)
  const limitISO = isoDay(limit)

  const saldoAtual = (data.contas ?? []).reduce((s, c) => s + (Number(c.saldo) || 0), 0)

  // Buckets por dia: receitas (+) e despesas (-)
  const deltaPorDia = new Map<string, number>()
  const addDelta = (date: string, delta: number) => {
    if (!date || date < today || date > limitISO) return
    deltaPorDia.set(date, (deltaPorDia.get(date) ?? 0) + delta)
  }

  // Receitas previstas: entradas datadas em data.receitas com date >= today e <= limit
  let receitasPrevistas = 0
  for (const r of data.receitas ?? []) {
    const date = String(r.date ?? '')
    if (!date || date < today || date > limitISO) continue
    const amt = Number(r.amount) || 0
    receitasPrevistas += amt
    addDelta(date, amt)
  }

  // Despesas previstas: parcelas pendentes/atrasadas dos contratos no período +
  // despesas datadas em data.despesas no período (lançamentos agendados manuais).
  // Pra evitar duplicação, ignoramos despesas que tenham contratoId associado
  // (lançamentos virtuais do Dino) — DUO mantém parcelas no contrato.
  let despesasPrevistas = 0
  for (const c of getCompromissos(data)) {
    if (c.active === false) continue
    for (const p of c.parcelas ?? []) {
      if (p.status === 'pago') continue
      if (!p.date || p.date < today || p.date > limitISO) continue
      const valor = p.valorPago ?? c.valorParcela
      const amt = Number(valor) || 0
      despesasPrevistas += amt
      addDelta(p.date, -amt)
    }
  }
  for (const d of data.despesas ?? []) {
    // Defesa: se tiver contratoId/financiamentoId, skip pra não duplicar
    const tieIn = (d as { contratoId?: string; financiamentoId?: string }).contratoId
      ?? (d as { contratoId?: string; financiamentoId?: string }).financiamentoId
    if (tieIn) continue
    const date = String(d.date ?? '')
    if (!date || date < today || date > limitISO) continue
    const amt = Number(d.amount) || 0
    despesasPrevistas += amt
    addDelta(date, -amt)
  }

  // Fluxo diário (acumulado): caminha do hoje até +30 dias somando deltas
  const fluxoDiario: FluxoDiarioPonto[] = []
  let saldo = saldoAtual
  const cursor = new Date(start)
  for (let i = 0; i <= 30; i++) {
    const iso = isoDay(cursor)
    const delta = deltaPorDia.get(iso) ?? 0
    saldo += delta
    fluxoDiario.push({ data: iso, saldo })
    cursor.setDate(cursor.getDate() + 1)
  }

  return {
    saldoAtual,
    receitasPrevistas,
    despesasPrevistas,
    saldoFinal30d: saldo,
    fluxoDiario,
  }
}

// ─────────────────────────────────────────────────────────────────
// Próximas Parcelas Inline
// ─────────────────────────────────────────────────────────────────

export interface ProximaParcelaInline {
  /** contratoId */
  id: string
  label: string
  /** YYYY-MM-DD */
  vencimento: string
  valor: number
  /** Pode ser negativo se já venceu (atrasada) */
  diasAteVencimento: number
}

function diffDaysISO(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + 'T00:00:00')
  const to = new Date(toISO + 'T00:00:00')
  const ms = to.getTime() - from.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export function getProximasParcelasInline(
  data: UserData,
  limit: number = 5,
): ProximaParcelaInline[] {
  const today = todayISO()
  const horizon = new Date(today + 'T00:00:00')
  horizon.setDate(horizon.getDate() + 14)
  const horizonISO = isoDay(horizon)

  const out: ProximaParcelaInline[] = []
  for (const c of getCompromissos(data)) {
    if (c.active === false) continue
    for (const p of c.parcelas ?? []) {
      if (p.status === 'pago') continue
      if (!p.date) continue
      if (p.date > horizonISO) continue
      out.push({
        id: c.id,
        label: c.label,
        vencimento: p.date,
        valor: p.valorPago ?? c.valorParcela,
        diasAteVencimento: diffDaysISO(today, p.date),
      })
    }
  }
  out.sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  return out.slice(0, limit)
}
