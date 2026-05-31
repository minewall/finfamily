// Tipos de Meta + helpers de progresso. Modelo simplificado do Dino:
// portamos os 4 tipos principais (objetivo/reserva/limite_desp/min_receita).
import type { Meta, UserData } from './types'
import { sumReceitas, sumDespesas } from './finance'

export type MetaTipo = 'objetivo' | 'reserva' | 'limite_desp' | 'min_receita'

export const META_TIPOS: { id: MetaTipo; label: string; desc: string }[] = [
  { id: 'objetivo',     label: 'Objetivo',          desc: 'Algo que você quer alcançar (viagem, casa, carro).' },
  { id: 'reserva',      label: 'Reserva',           desc: 'Reserva de emergência ou de longo prazo.' },
  { id: 'limite_desp',  label: 'Limite de gastos',  desc: 'Teto de gasto mensal (do tipo "não passar de R$ X").' },
  { id: 'min_receita',  label: 'Receita mínima',    desc: 'Meta de receita mensal mínima.' },
]

export function metaTipoLabel(t?: string): string {
  return META_TIPOS.find((x) => x.id === t)?.label ?? (t ?? '—')
}

export interface MetaProgresso {
  /** valor atual aplicável (R$ acumulado, receita do mês, despesa do mês…) */
  atual: number
  /** valor-alvo (R$) */
  alvo: number
  /** fração 0..1 do progresso (clamp p/ barras) */
  pct: number
  /** para limite_desp: true se gasto excedeu o teto */
  estourou?: boolean
}

export function calcMetaProgresso(meta: Meta, data: UserData, month: number, year: number): MetaProgresso {
  const alvo = Number(meta.target) || 0
  const tipo = (meta.type as MetaTipo) || 'objetivo'

  if (tipo === 'objetivo' || tipo === 'reserva') {
    const atual = Number(meta.current) || 0
    const pct = alvo > 0 ? Math.min(1, atual / alvo) : 0
    return { atual, alvo, pct }
  }
  if (tipo === 'limite_desp') {
    const atual = sumDespesas(data, month, year)
    const pct = alvo > 0 ? Math.min(1, atual / alvo) : 0
    return { atual, alvo, pct, estourou: alvo > 0 && atual > alvo }
  }
  if (tipo === 'min_receita') {
    const atual = sumReceitas(data, month, year)
    const pct = alvo > 0 ? Math.min(1, atual / alvo) : 0
    return { atual, alvo, pct }
  }
  return { atual: 0, alvo, pct: 0 }
}
