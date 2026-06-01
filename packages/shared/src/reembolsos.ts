// Reembolsos — quem precisa devolver pra quem.
// Schema na despesa (fiel ao Dino):
//   despesa.reembolso = { para, de, valor, status, criadoEm, paidAt? }
//
// Caso de uso típico: cônjuge A paga uma despesa com o cartão dele, mas
// metade era do cônjuge B. Em vez de virar um split do mês inteiro
// (que zera quando B "devolve em dinheiro"), vira reembolso: a despesa
// continua 100% de A no mês, mas marca-se "B deve R$ X". Quando B paga,
// o reembolso vira 'pago'.

import type { Despesa, UserData } from './types'

export function getReembolsos(data: UserData, status: 'pendente' | 'pago' | 'todos' = 'todos'): Despesa[] {
  const all = (data.despesas ?? []).filter((d) => !!d.reembolso)
  if (status === 'todos') return all
  return all.filter((d) => d.reembolso?.status === status)
}

export function getReembolsosPendentes(data: UserData): Despesa[] {
  return getReembolsos(data, 'pendente')
}

/** Soma de tudo que está em aberto a receber (somando os "valor"
 *  de cada reembolso pendente; cai pra amount se valor faltar). */
export function totalReembolsoPendente(data: UserData): number {
  return getReembolsosPendentes(data).reduce(
    (s, d) => s + Number(d.reembolso?.valor ?? d.amount ?? 0),
    0,
  )
}

/** Agrupa pendentes por "de" (quem deve devolver). */
export function reembolsosPendentesPorDevedor(data: UserData): Record<string, { total: number; items: Despesa[] }> {
  const acc: Record<string, { total: number; items: Despesa[] }> = {}
  for (const d of getReembolsosPendentes(data)) {
    const de = d.reembolso?.de ?? '—'
    if (!acc[de]) acc[de] = { total: 0, items: [] }
    acc[de].total += Number(d.reembolso?.valor ?? d.amount ?? 0)
    acc[de].items.push(d)
  }
  return acc
}
