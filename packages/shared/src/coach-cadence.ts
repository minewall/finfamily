// Cadência adaptativa do Haile pra pergunta-do-dia do ICP.
//
// Três fases baseadas na idade da conta (signup do usuário):
//   1) Onboarding (≤30d):    1 pergunta por dia
//   2) Construção (31-90d):  3x por semana — Seg, Qua, Sex
//   3) Manutenção (>90d):    1x por semana — Seg
//
// Acima do calendário, gatilhos contextuais podem disparar uma pergunta
// extra (ex.: primeira meta criada → puxa próxima pendente da categoria
// `dreams`). MVP cobre só `firstMeta`; outros gatilhos ficam de TODO.
//
// "Hoje" é resolvido em America/Sao_Paulo pra não embaralhar fronteiras
// de dia. Idade da conta é em dias absolutos a partir do signup ISO.

import { CONTEXTO_CATEGORIES, getAnsweredIds, PERGUNTAS_BANCO } from './contexto'
import type { ContextoState, PerguntaSpec } from './contexto'

export type CadencePhase = 'onboarding' | 'construction' | 'maintenance'

const TZ = 'America/Sao_Paulo'
const MS_DAY = 24 * 60 * 60 * 1000

/** Retorna YYYY-MM-DD no fuso de Brasília. */
export function todayKey(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: TZ })
}

/** Dia da semana (0=Dom, 1=Seg, ..., 6=Sáb) em Brasília. */
function weekdayBR(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
  }).formatToParts(now)
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun'
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd)
}

/** Idade da conta em dias (calendário UTC) a partir do signup ISO. */
function ageInDays(signupISO: string, now: Date): number {
  const t0 = new Date(signupISO).getTime()
  const t1 = now.getTime()
  if (!Number.isFinite(t0)) return 0
  return Math.floor((t1 - t0) / MS_DAY)
}

export function getUserPhase(
  signupISO: string | undefined | null,
  now: Date = new Date(),
): CadencePhase {
  if (!signupISO) return 'onboarding'
  const age = ageInDays(signupISO, now)
  if (age < 30) return 'onboarding'
  if (age <= 90) return 'construction'
  return 'maintenance'
}

export function shouldShowQuestionToday(
  signupISO: string | undefined | null,
  lastShownISO: string | undefined | null,
  now: Date = new Date(),
): boolean {
  const today = todayKey(now)
  const lastDay = lastShownISO ? todayKey(new Date(lastShownISO)) : null
  if (lastDay === today) return false

  const phase = getUserPhase(signupISO, now)
  if (phase === 'onboarding') return true

  const wd = weekdayBR(now)
  if (phase === 'construction') return wd === 1 || wd === 3 || wd === 5
  return wd === 1
}

export const PHASE_HINTS: Record<CadencePhase, string> = {
  onboarding: 'Conhecendo você (1 pergunta por dia nos primeiros 30 dias)',
  construction: 'Te conhecendo melhor (3 perguntas por semana)',
  maintenance: 'Pergunta semanal pra refinar seu perfil',
}

/** Próxima pergunta pendente da categoria. */
export function nextPendingByCategory(
  ctx: ContextoState | undefined | null,
  categoriaId: string,
): PerguntaSpec | null {
  const respondidas = new Set<string>()
  for (const cat of CONTEXTO_CATEGORIES) {
    for (const id of getAnsweredIds(ctx, cat.id)) respondidas.add(id)
  }
  return (
    PERGUNTAS_BANCO.find(
      (p) => p.categoria === categoriaId && !respondidas.has(p.id),
    ) ?? null
  )
}
