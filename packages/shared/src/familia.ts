// Painel da Família — helpers puros (espelha store.js do Dino).
// Lê do UserData; nunca muta. UI no DUO consome esses agregados.
//
// Regras (fiel ao Dino):
//   - Despesa SEM split → 100% pra d.person (ou "Família" se sem titular).
//   - Despesa COM split → cada pessoa entra com sua fatia; resto (se split
//     soma < amount) vira "Família".
//   - Receita → vai pra r.person (ou "Família").
//
// Convenção: "Família" é o bucket coletivo (gastos comuns, despesas sem
// titular). Não confundir com o nome cadastrado de uma pessoa.

import type { Despesa, UserData, Meta } from './types'

const COLETIVO = 'Família'

/** Contribuição por pessoa de UMA despesa (considerando split). */
export function computeContribuicoesByPerson(despesa: Despesa): Record<string, number> {
  const total = Number(despesa.amount) || 0
  if (!despesa.split || !despesa.split.length) return { [COLETIVO]: total }
  const map: Record<string, number> = {}
  let sumValor = 0
  for (const s of despesa.split) {
    const v = Number(s.valor) || 0
    map[s.person] = (map[s.person] || 0) + v
    sumValor += v
  }
  const resto = Math.max(0, total - sumValor)
  if (resto > 0.01) map[COLETIVO] = (map[COLETIVO] || 0) + resto
  return map
}

export interface PessoaBucket {
  total: number
  items: Despesa[]
}

/** { [pessoa]: { total, items } } no mês/ano (mês opcional). */
export function getReceitasByPessoa(
  data: UserData,
  year: number,
  month?: number,
): Record<string, PessoaBucket> {
  const acc: Record<string, PessoaBucket> = {}
  for (const r of data.receitas ?? []) {
    if (r.year !== year) continue
    if (month != null && r.month !== month) continue
    const p = (r.person || COLETIVO) as string
    if (!acc[p]) acc[p] = { total: 0, items: [] }
    acc[p].total += Number(r.amount) || 0
    acc[p].items.push(r as unknown as Despesa)
  }
  return acc
}

export function getDespesasByPessoa(
  data: UserData,
  year: number,
  month?: number,
): Record<string, PessoaBucket> {
  const acc: Record<string, PessoaBucket> = {}
  for (const d of data.despesas ?? []) {
    if (d.year !== year) continue
    if (month != null && d.month !== month) continue
    const hasSplit = Array.isArray(d.split) && d.split.length > 0
    if (!hasSplit) {
      const p = (d.person || COLETIVO) as string
      if (!acc[p]) acc[p] = { total: 0, items: [] }
      acc[p].total += Number(d.amount) || 0
      acc[p].items.push(d)
      continue
    }
    const contrib = computeContribuicoesByPerson(d)
    for (const [p, v] of Object.entries(contrib)) {
      if (!acc[p]) acc[p] = { total: 0, items: [] }
      acc[p].total += v
      acc[p].items.push(d)
    }
  }
  return acc
}

export interface ContribuicaoMembro {
  receita: number
  despesa: number
  contribuicaoLiquida: number
  pctReceita: number
  pctDespesa: number
}

export function calcContribuicaoMembro(
  data: UserData,
  pessoa: string,
  year: number,
  month?: number,
): ContribuicaoMembro {
  if (!pessoa) {
    return { receita: 0, despesa: 0, contribuicaoLiquida: 0, pctReceita: 0, pctDespesa: 0 }
  }
  const rec = getReceitasByPessoa(data, year, month)
  const desp = getDespesasByPessoa(data, year, month)
  const receita = rec[pessoa]?.total ?? 0
  const despesa = desp[pessoa]?.total ?? 0
  const totalRec = Object.values(rec).reduce((s, x) => s + x.total, 0)
  const totalDesp = Object.values(desp).reduce((s, x) => s + x.total, 0)
  return {
    receita,
    despesa,
    contribuicaoLiquida: receita - despesa,
    pctReceita: totalRec > 0 ? (receita / totalRec) * 100 : 0,
    pctDespesa: totalDesp > 0 ? (despesa / totalDesp) * 100 : 0,
  }
}

/** Metas com escopo de família (explícito ou por heurística de label). */
export function getMetasFamilia(data: UserData): Meta[] {
  const metas = (data.metas ?? []).filter((m) => m.active !== false)
  return metas.filter((m) => {
    const escopo = (m as { escopo?: string }).escopo
    const tipo = (m as { tipo?: string }).tipo
    if (tipo === 'familia' || escopo === 'familia') return true
    const lbl = String(m.label || '').toLowerCase()
    return /famí|familia|viagem|casa|carro|imóvel|imovel/.test(lbl)
  })
}

/** Conjunto ordenado de pessoas que aparecem nos dados — inclui as
 * cadastradas em data.pessoas e as referenciadas em receitas/despesas.
 * "Família" entra no fim quando há entradas coletivas. */
export function pessoasNoMes(data: UserData, year: number, month?: number): string[] {
  const set = new Set<string>(data.pessoas ?? [])
  const rec = getReceitasByPessoa(data, year, month)
  const desp = getDespesasByPessoa(data, year, month)
  Object.keys(rec).forEach((p) => set.add(p))
  Object.keys(desp).forEach((p) => set.add(p))
  const all = Array.from(set)
  // Coletivo "Família" sempre por último
  return [...all.filter((p) => p !== COLETIVO).sort(), ...(all.includes(COLETIVO) ? [COLETIVO] : [])]
}

export const FAMILIA_COLETIVO = COLETIVO
