// Helpers de UI pra a tela de Lançamentos (Track R).
// Status determinístico baseado em date (sem flag no schema atual),
// cores determinísticas pra avatar/categoria com fallback.

import { getCategoryColor } from '@haile/shared'
import type { UnifiedLancamento, UserData } from '@haile/shared'

export type LancamentoStatus = 'agendado' | 'pago' | 'atrasado'

/** Hoje em ISO YYYY-MM-DD usando timezone local (mesmo critério dos lançamentos). */
function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Status visual do lançamento:
 *  - agendado: date > hoje (ainda vai acontecer)
 *  - pago: date <= hoje (já entrou/saiu)
 *  - atrasado: reservado (o schema atual não tem flag de "não pago"; pra Despesa
 *              com `reembolso.status === 'pendente'` e date passada, dá pra marcar atrasado).
 *
 * Como o blob atual não traz "status" em Lancamento, a heurística é puramente
 * temporal e fica explícita aqui pra evoluir sem mudar callers.
 */
export function lancamentoStatus(l: { date?: string }): LancamentoStatus {
  const today = todayISO()
  const d = (l.date ?? '').slice(0, 10)
  if (!d) return 'pago'
  return d > today ? 'agendado' : 'pago'
}

// Paleta determinística — espelha PERSON_COLORS do shared, mas exposta aqui
// pra uso em qualquer chave (não só pessoa). Hex puro pra style inline.
const AVATAR_PALETTE = ['#6b5ef5', '#2dcfc0', '#ff70b8', '#ffa930', '#4aa8ff', '#1dc97e']

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** Cor determinística pra avatar — paleta de 6 cores. */
export function avatarColor(name?: string | null): string {
  if (!name) return '#454b6d'
  return AVATAR_PALETTE[hashStr(name) % AVATAR_PALETTE.length]
}

/** Inicial pra avatar (1 char maiúsculo, fallback "?"). */
export function avatarInitial(name?: string | null): string {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase() || '?'
}

/**
 * Cor de categoria. Tenta o catálogo canônico do shared; se não houver,
 * tenta `data.settings.catTipo[catId].cor` (futuro); por fim, cai pra
 * cor determinística baseada no nome da categoria.
 */
export function categoriaColor(catId: string | undefined | null, data?: UserData | null): string {
  if (!catId) return '#454b6d'
  const canonical = getCategoryColor(catId)
  if (canonical && canonical !== '#454b6d') return canonical
  // Fallback futuro: cor configurada no Store por usuário.
  const settings = (data as unknown as { settings?: { catTipo?: Record<string, { cor?: string }> } } | null | undefined)?.settings
  const overrideCor = settings?.catTipo?.[catId]?.cor
  if (typeof overrideCor === 'string' && overrideCor) return overrideCor
  return avatarColor(catId)
}

/** Filtro por kind (Todos/Receitas/Despesas) — usado pelo toggle no header. */
export type KindToggle = 'todos' | 'receita' | 'despesa'

export function filterByKind(xs: UnifiedLancamento[], k: KindToggle): UnifiedLancamento[] {
  if (k === 'todos') return xs
  return xs.filter((x) => x.kind === k)
}
