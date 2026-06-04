// Helpers de estatística de despesas pra tela /despesas (DUO).
// Puros — recebem UserData, devolvem agregações.
import type { UserData, Despesa } from '@haile/shared'
import { getCategoryLabel } from '@haile/shared'

export type Periodo = 'mes' | 'trim' | 'sem' | 'ano'

export interface PeriodoRange {
  start: number // 1..12
  end: number   // 1..12
  label: string
}

const MESES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

/**
 * Faixa de meses (start/end inclusivos, 1..12) pra um período/mês/ano.
 * Trim = trimestre que contém `month`; Sem = semestre; Ano = todo.
 */
export function periodRange(periodo: Periodo, year: number, month: number): PeriodoRange {
  if (periodo === 'ano') return { start: 1, end: 12, label: `${year}` }
  if (periodo === 'sem') {
    const h1 = month <= 6
    return {
      start: h1 ? 1 : 7,
      end: h1 ? 6 : 12,
      label: `${h1 ? 'H1' : 'H2'} ${year}`,
    }
  }
  if (periodo === 'trim') {
    const q = Math.ceil(month / 3)
    const s = (q - 1) * 3 + 1
    return { start: s, end: s + 2, label: `Q${q} ${year}` }
  }
  // mês
  return { start: month, end: month, label: `${MESES_FULL[month - 1]} ${year}` }
}

/** Despesas filtradas pelo período (mês/trim/sem/ano) + ano. */
export function despesasNoPeriodo(
  data: UserData,
  periodo: Periodo,
  year: number,
  month: number,
): Despesa[] {
  const { start, end } = periodRange(periodo, year, month)
  return (data.despesas ?? []).filter(
    (d) => d.year === year && d.month >= start && d.month <= end,
  )
}

/** Agrupa por categoria → ordena DESC. */
export function despesasPorCategoria(
  despesas: Despesa[],
): Array<{ label: string; value: number; categoryKey: string }> {
  const acc = new Map<string, number>()
  for (const d of despesas) {
    const k = d.category ?? 'outros'
    acc.set(k, (acc.get(k) ?? 0) + (Number(d.amount) || 0))
  }
  return [...acc.entries()]
    .map(([categoryKey, value]) => ({
      categoryKey,
      label: getCategoryLabel(categoryKey),
      value,
    }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Despesas por pessoa × mês (12 buckets) no ano.
 * Considera `split` quando presente: rateia o valor pelos splits;
 * caso contrário, usa `person` direto. Pessoas vazias são ignoradas.
 *
 * Retorna apenas pessoas que tiveram despesa no ano.
 */
export function despesasPorPessoaMes(
  data: UserData,
  year: number,
): Array<{ pessoa: string; meses: number[]; total: number }> {
  const map = new Map<string, number[]>()
  for (const d of (data.despesas ?? [])) {
    if (d.year !== year) continue
    const m = d.month
    if (!m || m < 1 || m > 12) continue
    const amount = Number(d.amount) || 0
    const splits = Array.isArray(d.split) ? d.split.filter((s) => s && s.person) : null
    if (splits && splits.length > 0) {
      for (const s of splits) {
        const v = Number(s.valor) || 0
        const arr = map.get(s.person) ?? new Array(12).fill(0)
        arr[m - 1] += v
        map.set(s.person, arr)
      }
    } else {
      const p = (d.person ?? '').trim()
      if (!p) continue
      const arr = map.get(p) ?? new Array(12).fill(0)
      arr[m - 1] += amount
      map.set(p, arr)
    }
  }
  return [...map.entries()]
    .map(([pessoa, meses]) => ({
      pessoa,
      meses,
      total: meses.reduce((s, x) => s + x, 0),
    }))
    .sort((a, b) => b.total - a.total)
}

/**
 * Despesas por categoria × mês (12) no ano + total.
 * Ordenado por total DESC.
 */
export function despesasPorCategoriaMes(
  data: UserData,
  year: number,
): Array<{ categoria: string; categoryKey: string; meses: number[]; total: number }> {
  const map = new Map<string, number[]>()
  for (const d of (data.despesas ?? [])) {
    if (d.year !== year) continue
    const m = d.month
    if (!m || m < 1 || m > 12) continue
    const k = d.category ?? 'outros'
    const arr = map.get(k) ?? new Array(12).fill(0)
    arr[m - 1] += Number(d.amount) || 0
    map.set(k, arr)
  }
  return [...map.entries()]
    .map(([categoryKey, meses]) => ({
      categoryKey,
      categoria: getCategoryLabel(categoryKey),
      meses,
      total: meses.reduce((s, x) => s + x, 0),
    }))
    .sort((a, b) => b.total - a.total)
}

export const MESES_LABELS_CURTOS = MESES_CURTOS
export const MESES_LABELS_FULL = MESES_FULL
