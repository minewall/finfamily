// Engine de Tipos (porta do Dino). Cada despesa tem um "tipo" que reflete
// o COMPORTAMENTO da saída (essencial/obrigatório/comprometido/opcional/
// eventual). O Poder de Escolha é receitas menos o "piso de sobrevivência"
// (essencial + obrigatório + comprometido).
//
// Resolução de tipo (precedência):
//   1. d.tipoOverride no lançamento
//   2. settings.subcatTipo[`${cat}.${sub}`] — override do usuário por sub
//   3. settings.catTipo[cat] — override do usuário por categoria
//   4. DEFAULT_CAT_TIPO[cat] — default da Haile
//   5. 'opcional' (fallback)

import type { UserData, Despesa } from './types'
import { sumReceitas } from './finance'

export type TipoId = 'essencial' | 'obrigatorio' | 'comprometido' | 'opcional' | 'eventual'

export interface TipoDef {
  id: TipoId
  label: string
  color: string
  icon: string
  comportamento: TipoId
  desc: string
  ordem: number
  builtin: true
}

export const TIPOS_BUILTIN: TipoDef[] = [
  { id: 'essencial',    label: 'Essencial',    color: '#EF4444', icon: 'shield-alert',  comportamento: 'essencial',    desc: 'Não posso viver sem isso este mês',                  ordem: 1, builtin: true },
  { id: 'obrigatorio',  label: 'Obrigatório',  color: '#A78BFA', icon: 'scale',         comportamento: 'obrigatorio',  desc: 'Saída imposta por terceiros (pensão, multa, IR)',     ordem: 2, builtin: true },
  { id: 'comprometido', label: 'Comprometido', color: '#F59E0B', icon: 'lock',          comportamento: 'comprometido', desc: 'Posso cortar mas com custo (multa, perda, dor)',      ordem: 3, builtin: true },
  { id: 'opcional',     label: 'Opcional',     color: '#22C55E', icon: 'circle-check',  comportamento: 'opcional',     desc: 'Posso cortar amanhã sem grande impacto',              ordem: 4, builtin: true },
  { id: 'eventual',     label: 'Eventual',     color: '#0EA5E9', icon: 'calendar-days', comportamento: 'eventual',     desc: 'Não é mensal — vem de vez em quando',                 ordem: 5, builtin: true },
]

// Mapa default de categoria → tipo. Espelha o Dino.
export const DEFAULT_CAT_TIPO: Record<string, TipoId> = {
  moradia:     'essencial',
  alimentacao: 'essencial',
  transporte:  'essencial',
  saude:       'essencial',
  educacao:    'essencial',
  pets:        'comprometido',
  servicos_profissionais: 'comprometido',
  financeiro:  'obrigatorio',
  assinaturas: 'opcional',
  lazer:       'opcional',
  pessoal:     'opcional',
  apoio_financeiro: 'opcional',
}

// Tipos que contam como "piso de sobrevivência" (NÃO entram no Poder de Escolha).
const PISO_TIPOS: TipoId[] = ['essencial', 'obrigatorio', 'comprometido']

// Tipos legados → novo modelo (migração defensiva)
const _LEGACY_MAP: Record<string, TipoId> = {
  fixa_essencial:        'essencial',
  fixa_comprometida:     'comprometido',
  variavel_comprometida: 'comprometido',
  variavel_opcional:     'opcional',
  pontual:               'eventual',
}

function normalize(t: string | undefined): TipoId {
  if (!t) return 'opcional'
  if (_LEGACY_MAP[t]) return _LEGACY_MAP[t]
  if (['essencial', 'obrigatorio', 'comprometido', 'opcional', 'eventual'].includes(t)) {
    return t as TipoId
  }
  return 'opcional'
}

/** Lê o tipo efetivo de uma categoria (override do user > default).
 *  Resolução: data.catTipo[cat] (DUO) > data.settings.catTipo[cat] (Dino) > DEFAULT. */
export function getCatTipo(data: UserData, cat: string): TipoId {
  const topMap = (data.catTipo ?? {}) as Record<string, string>
  if (topMap[cat]) return normalize(topMap[cat])
  const settingsMap = ((data.settings as Record<string, unknown> | undefined)?.catTipo ?? {}) as Record<string, string>
  if (settingsMap[cat]) return normalize(settingsMap[cat])
  if (DEFAULT_CAT_TIPO[cat]) return DEFAULT_CAT_TIPO[cat]
  return 'opcional'
}

/** Tipo de uma subcat: override próprio > tipo da categoria. */
export function getSubcatTipo(data: UserData, cat: string, sub: string | null | undefined): TipoId {
  const map = ((data.settings as Record<string, unknown> | undefined)?.subcatTipo ?? {}) as Record<string, string>
  const k = `${cat}.${sub ?? ''}`
  if (sub && map[k]) return normalize(map[k])
  return getCatTipo(data, cat)
}

/** Resolve o tipo efetivo de UMA despesa: override no lançamento > subcat > cat > 'opcional'. */
export function getDespesaTipo(data: UserData, d: Despesa): TipoId {
  const override = (d as unknown as { tipoOverride?: string }).tipoOverride
  if (override) return normalize(override)
  return getSubcatTipo(data, d.category ?? '', d.sub)
}

/** Agrega despesas do mês por tipo. Ignora receitas (já não estão em despesas) e categoria 'cartoes'. */
export function sumDespesasByTipo(data: UserData, month: number, year: number): Record<TipoId, number> {
  const totals: Record<TipoId, number> = { essencial: 0, obrigatorio: 0, comprometido: 0, opcional: 0, eventual: 0 }
  for (const d of data.despesas ?? []) {
    if (d.month !== month || d.year !== year) continue
    if (d.category === 'cartoes' || d.category === 'receita') continue
    const tipo = getDespesaTipo(data, d)
    totals[tipo] = (totals[tipo] || 0) + (Number(d.amount) || 0)
  }
  return totals
}

export interface PoderDeEscolhaV2 {
  receitas: number
  pisoSobrevivencia: number
  poderDeEscolha: number
  pct: number
  byTipo: Record<TipoId, number>
}

/**
 * Poder de Escolha v2 — fiel ao Dino. Usa engine de tipos (cat/subcat/override)
 * em vez da heurística canônica fixa da v1. Piso = essencial + obrigatorio +
 * comprometido. Receita - piso = Poder de Escolha.
 */
export function calcPoderDeEscolhaV2(data: UserData, month: number, year: number): PoderDeEscolhaV2 {
  const receitas = sumReceitas(data, month, year)
  const byTipo = sumDespesasByTipo(data, month, year)
  const piso = PISO_TIPOS.reduce((s, t) => s + (byTipo[t] || 0), 0)
  return {
    receitas,
    pisoSobrevivencia: piso,
    poderDeEscolha: receitas - piso,
    pct: receitas > 0 ? (receitas - piso) / receitas : 0,
    byTipo,
  }
}
