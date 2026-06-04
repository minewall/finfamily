// Helpers de visualização da tela Compromissos (Track O).
// Lógica derivada das parcelas do contrato; não modifica nada no schema.

import type { Contrato, UserData } from '@haile/shared'
import { getCompromissos } from '@haile/shared'

const MESES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const

/** Paleta estável (6 cores) — coerente com brand tokens Haile. */
const NAME_PALETTE = [
  '#6b5ef5', // indigo
  '#1dc97e', // green
  '#2dd4bf', // teal
  '#f59e0b', // amber
  '#ff4a68', // red
  '#3b82f6', // blue
] as const

export interface EvolucaoComprometimentoPonto {
  periodo: string // 'jan' | 'fev' | …
  valor: number   // soma das parcelas devidas naquele mês
}

/**
 * Soma das parcelas (não-pagas E pagas, é o COMPROMISSO devido naquele mês)
 * de cada mês do ano. Olha o `parcelas` embutido em cada contrato ativo.
 * Default: ano corrente.
 */
export function evolucaoComprometimento(
  data: UserData,
  year?: number,
): EvolucaoComprometimentoPonto[] {
  const ano = year ?? new Date().getFullYear()
  const contratos = getCompromissos(data)
  const buckets = new Array(12).fill(0) as number[]

  for (const c of contratos) {
    if (c.active === false) continue
    const parcelas = c.parcelas ?? []
    for (const p of parcelas) {
      if (p.ano !== ano) continue
      const idx = (p.mes ?? 0) - 1
      if (idx < 0 || idx > 11) continue
      const valor = p.valorPago ?? c.valorParcela ?? 0
      buckets[idx] += valor
    }
  }

  return buckets.map((valor, i) => ({ periodo: MESES_PT[i], valor }))
}

export type CompromissoStatus = 'ativo' | 'pausado' | 'encerrado'

/**
 * Pausado = `active === false`.
 * Encerrado = todas as parcelas pagas (ou sem parcelas restantes).
 * Ativo = qualquer outro caso.
 */
export function compromissoStatus(c: Contrato): CompromissoStatus {
  if (c.active === false) return 'pausado'
  const parcelas = c.parcelas ?? []
  if (parcelas.length > 0) {
    const pagas = parcelas.filter((p) => p.status === 'pago').length
    if (pagas === parcelas.length) return 'encerrado'
  }
  return 'ativo'
}

export type CompromissoTipo = 'assinatura' | 'servico' | 'divida'

/**
 * Mapeia para 3 buckets visuais:
 * - 'divida'     → natureza === 'divida'
 * - 'assinatura' → tipoCompromisso in (assinatura, plano)
 * - 'servico'    → tudo mais (aluguel, servico_pessoal/terceiros, educacao, outros, undefined)
 */
export function compromissoTipo(c: Contrato): CompromissoTipo {
  if (c.natureza === 'divida') return 'divida'
  const t = c.tipoCompromisso
  if (t === 'assinatura' || t === 'plano') return 'assinatura'
  return 'servico'
}

/** Hash estável de string → índice na paleta. */
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** Cor estável derivada do nome (mesmo nome → mesma cor sempre). */
export function colorFromName(name: string): string {
  const key = (name || '').trim().toLowerCase()
  if (!key) return NAME_PALETTE[0]
  return NAME_PALETTE[hashString(key) % NAME_PALETTE.length]
}
