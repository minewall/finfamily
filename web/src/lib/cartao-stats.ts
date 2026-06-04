// Helpers de estatística pra tela /cartoes do DUO.
//
// O blob `data.cartoes` veio do Dino com schema solto:
//   { id, name|nome, banco, tipoCartao, limit|limite, closingDay|fechamento,
//     dueDay|vencimento, color|cor, ultimosDigitos?, parcelas?: Array<...> }
//
// Mantemos os dois nomes (Dino/DUO) por compatibilidade. As funções abaixo
// aceitam o blob solto via `UserData` e lêem ambos os aliases.

import type { UserData, Despesa } from '@haile/shared'

export interface CartaoLike {
  id: string
  // aliases — Dino usa `name`/`limit`/`closingDay`/`dueDay`/`color`, novo schema usa pt-BR.
  name?: string
  nome?: string
  banco?: string
  limit?: number | null
  limite?: number | null
  closingDay?: number | null
  fechamento?: number | null
  dueDay?: number | null
  vencimento?: number | null
  color?: string
  cor?: string
  ultimosDigitos?: string | null
  tipoCartao?: string
  parcelas?: Array<ParcelaDino>
  [k: string]: unknown
}

/** Parcela como o Dino salva dentro de `cartao.parcelas`. */
export interface ParcelaDino {
  id?: string
  descricao?: string
  desc?: string
  parcela?: number       // valor de uma parcela
  total?: number         // valor total do parcelamento
  qtd?: number           // total de parcelas
  totalParcelas?: number // alias antigo
  inicio?: string        // YYYY-MM
  start?: string         // alias antigo
  cartaoId?: string
  [k: string]: unknown
}

export interface CartaoKpis {
  limiteTotal: number
  utilizadoMes: number
  parcelasMes: number
}

export interface ParcelamentoAtivo {
  id: string
  descricao: string
  parcelaAtual: number
  parcelaTotal: number
  valorParcela: number
  totalRestante: number
  cartaoId?: string
}

// ───────────────── helpers internos ─────────────────

function getCartoes(data: UserData | null | undefined): CartaoLike[] {
  if (!data) return []
  const raw = (data as unknown as { cartoes?: unknown }).cartoes
  return Array.isArray(raw) ? (raw as CartaoLike[]) : []
}

export function cartaoLimite(c: CartaoLike): number {
  return Number(c.limite ?? c.limit ?? 0) || 0
}
export function cartaoNome(c: CartaoLike): string {
  return (c.nome ?? c.name ?? '') as string
}
export function cartaoCor(c: CartaoLike): string {
  return (c.cor ?? c.color ?? '#6b5ef5') as string
}
export function cartaoFechamento(c: CartaoLike): number | null {
  const v = c.fechamento ?? c.closingDay
  return v == null ? null : Number(v)
}
export function cartaoVencimento(c: CartaoLike): number | null {
  const v = c.vencimento ?? c.dueDay
  return v == null ? null : Number(v)
}

function despesaCartaoId(d: Despesa): string | undefined {
  const ext = d as unknown as { cartaoId?: string | null; cartao?: string | null }
  return (ext.cartaoId ?? ext.cartao) ?? undefined
}

/** Tenta extrair parcela atual/total a partir de aliases comuns. */
function parcelaInfo(d: Despesa): { atual: number; total: number } | null {
  const ext = d as unknown as {
    parcelaAtual?: number
    parcelaTotal?: number
    parcelas?: number
    parcelasTotal?: number
    totalParcelas?: number
    parcelaN?: number
  }
  const total =
    Number(ext.parcelaTotal ?? ext.parcelasTotal ?? ext.totalParcelas ?? ext.parcelas ?? 0) || 0
  const atual = Number(ext.parcelaAtual ?? ext.parcelaN ?? 0) || 0
  if (total <= 1) return null
  return { atual, total }
}

// ───────────────── API pública ─────────────────

/**
 * Soma o limite de todos os cartões + utilizado e parcelas devidas no mês.
 *
 * - utilizadoMes: soma de despesas do mês com `cartaoId` setado.
 * - parcelasMes: soma de despesas do mês que estão dentro do range de
 *   parcelamento (parcelaAtual >= 1 && <= parcelaTotal). Mais o que vier
 *   das parcelas inline em `cartao.parcelas` do Dino.
 */
export function cartaoKpis(data: UserData, year: number, month: number): CartaoKpis {
  const cartoes = getCartoes(data)
  const limiteTotal = cartoes.reduce((s, c) => s + cartaoLimite(c), 0)

  const despesas = (data.despesas ?? []) as Despesa[]
  let utilizadoMes = 0
  let parcelasMes = 0

  for (const d of despesas) {
    if (d.year !== year || d.month !== month) continue
    if (despesaCartaoId(d)) {
      utilizadoMes += Number(d.amount) || 0
    }
    const p = parcelaInfo(d)
    if (p) parcelasMes += Number(d.amount) || 0
  }

  // Parcelas inline em cartao.parcelas (modelo Dino): adiciona ao parcelasMes
  // se a parcela está vigente no mês alvo. Não duplica com `utilizadoMes` —
  // ali é o que rolou no fluxo de despesas.
  for (const c of cartoes) {
    const parcelas = Array.isArray(c.parcelas) ? c.parcelas : []
    for (const p of parcelas) {
      const inicio = (p.inicio ?? p.start ?? '') as string
      const qtd = Number(p.qtd ?? p.totalParcelas ?? 0) || 0
      const valor = Number(p.parcela ?? 0) || 0
      if (!inicio || qtd < 1 || !valor) continue
      const [iy, im] = inicio.split('-').map(Number)
      if (!iy || !im) continue
      // parcela k vence no mês (iy,im+k-1). Vigente se [0..qtd-1] cobre month/year.
      const startIdx = iy * 12 + (im - 1)
      const targetIdx = year * 12 + (month - 1)
      const k = targetIdx - startIdx + 1
      if (k >= 1 && k <= qtd) parcelasMes += valor
    }
  }

  return { limiteTotal, utilizadoMes, parcelasMes }
}

/**
 * Lista parcelamentos ativos (parcelaAtual < parcelaTotal). Cobre dois
 * caminhos:
 *   1) Despesa com aliases `parcelaAtual`/`parcelaTotal` (caminho previsto
 *      no spec do user).
 *   2) Cartão com array `cartao.parcelas` (modelo do Dino) — calcula a
 *      parcela atual com base em `inicio` (YYYY-MM) vs hoje.
 */
export function parcelamentosAtivos(data: UserData): ParcelamentoAtivo[] {
  const out: ParcelamentoAtivo[] = []

  // 1) despesas com parcelaAtual/parcelaTotal
  const despesas = (data.despesas ?? []) as Despesa[]
  const seen = new Set<string>()
  for (const d of despesas) {
    const info = parcelaInfo(d)
    if (!info) continue
    if (info.atual <= 0 || info.atual >= info.total) continue
    const valor = Number(d.amount) || 0
    const restante = (info.total - info.atual) * valor
    // Dedup por descrição+cartão (uma despesa parcelada gera N linhas mensais)
    const key = `${d.desc}|${despesaCartaoId(d) ?? ''}|${info.total}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      id: d.id,
      descricao: d.desc || 'Parcelamento',
      parcelaAtual: info.atual,
      parcelaTotal: info.total,
      valorParcela: valor,
      totalRestante: restante,
      cartaoId: despesaCartaoId(d),
    })
  }

  // 2) parcelamentos inline (modelo Dino)
  const cartoes = getCartoes(data)
  const now = new Date()
  const ny = now.getFullYear()
  const nm = now.getMonth() + 1
  const targetIdx = ny * 12 + (nm - 1)
  for (const c of cartoes) {
    const parcelas = Array.isArray(c.parcelas) ? c.parcelas : []
    for (const p of parcelas) {
      const inicio = (p.inicio ?? p.start ?? '') as string
      const qtd = Number(p.qtd ?? p.totalParcelas ?? 0) || 0
      const valor = Number(p.parcela ?? 0) || 0
      if (!inicio || qtd < 1 || !valor) continue
      const [iy, im] = inicio.split('-').map(Number)
      if (!iy || !im) continue
      const startIdx = iy * 12 + (im - 1)
      const k = Math.max(1, targetIdx - startIdx + 1)
      if (k >= qtd) continue // já quitou
      const restante = (qtd - k + 1) * valor
      out.push({
        id: (p.id ?? `${c.id}-${inicio}-${p.descricao ?? p.desc ?? ''}`) as string,
        descricao: (p.descricao ?? p.desc ?? 'Parcelamento') as string,
        parcelaAtual: k,
        parcelaTotal: qtd,
        valorParcela: valor,
        totalRestante: restante,
        cartaoId: c.id,
      })
    }
  }

  return out
}

/** Soma de despesas do mês alvo no cartão informado. */
export function utilizadoMesCartao(
  data: UserData,
  cartaoId: string,
  year: number,
  month: number,
): number {
  const despesas = (data.despesas ?? []) as Despesa[]
  let total = 0
  for (const d of despesas) {
    if (d.year !== year || d.month !== month) continue
    if (despesaCartaoId(d) !== cartaoId) continue
    total += Number(d.amount) || 0
  }
  return total
}

/**
 * Escurece/clareia um hex em `percent` (-100..100). Pura, sem libs.
 * Usada pro gradient do card visual.
 */
export function shade(hex: string, percent: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return hex
  let r = (num >> 16) & 0xff
  let g = (num >> 8) & 0xff
  let b = num & 0xff
  const t = percent < 0 ? 0 : 255
  const p = Math.abs(percent) / 100
  r = Math.round((t - r) * p) + r
  g = Math.round((t - g) * p) + g
  b = Math.round((t - b) * p) + b
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}
