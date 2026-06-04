// Estatísticas agregadas das receitas pra UI da tela Receitas (Track M).
//
// Convenções:
// - "Total Ano" = soma de todas receitas do ano (independente de mês).
// - "Média Mensal" = Total Ano / nº de meses que tiveram receita (>0).
// - "Meses OK" = meses do ano cuja receita ≥ threshold (piso de sobrevivência v2
//   do mês corrente — se houver — senão > 0).
// - "Melhor Mês" = mês com maior soma de receitas.
// - "Valor Futuro" = soma de receitas com data > hoje no resto do ano corrente.
// - "Meta Anual" = se houver meta ativa do tipo `min_receita`, multiplica por 12
//   (mensal) e considera o `atual` como Total Ano. Caso contrário, retorna null
//   pra UI exibir CTA "Defina uma meta de receita".
//
// Importante: helpers puros, sem efeitos colaterais. Recebem `UserData`.

import {
  type UserData,
  type Meta,
  sumReceitas,
  calcPoderDeEscolhaV2,
} from '@haile/shared'

export interface ReceitasKpis {
  totalAno: number
  mediaMensal: number
  mesesOk: number
  melhorMes: { month: number; valor: number } | null
  valorFuturo: number
  metaAnual: { atual: number; meta: number } | null
}

/** Soma receitas por mês (1..12) do ano dado. Retorna array [jan..dez]. */
function receitasPorMes(data: UserData, year: number): number[] {
  const arr = Array(12).fill(0)
  for (let m = 1; m <= 12; m++) {
    arr[m - 1] = sumReceitas(data, m, year)
  }
  return arr
}

/** Acha a meta ativa do tipo `min_receita` (a primeira ativa, fiel ao Dino). */
function findMetaReceitaAtiva(data: UserData): Meta | null {
  const xs = (data.metas ?? []) as Meta[]
  return xs.find((m) => m.type === 'min_receita' && m.active !== false && Number(m.target) > 0) ?? null
}

/** Threshold pra "Meses OK". Usa piso de sobrevivência do mês corrente como
 *  proxy do "necessário pra cobrir custos"; se não der pra calcular, cai em 0. */
function thresholdMesesOk(data: UserData, year: number): number {
  const now = new Date()
  const month0 = now.getMonth()
  const yearForPiso = now.getFullYear() === year ? year : year
  try {
    const pde = calcPoderDeEscolhaV2(data, month0 + 1, yearForPiso)
    return Number(pde.pisoSobrevivencia) || 0
  } catch {
    return 0
  }
}

export function receitasKpis(data: UserData, year: number): ReceitasKpis {
  const porMes = receitasPorMes(data, year)
  const totalAno = porMes.reduce((s, v) => s + v, 0)
  const mesesComReceita = porMes.filter((v) => v > 0).length
  const mediaMensal = mesesComReceita > 0 ? totalAno / mesesComReceita : 0

  const threshold = thresholdMesesOk(data, year)
  const mesesOk = porMes.filter((v) => threshold > 0 ? v >= threshold : v > 0).length

  let melhorMes: { month: number; valor: number } | null = null
  for (let i = 0; i < 12; i++) {
    if (porMes[i] > 0 && (melhorMes == null || porMes[i] > melhorMes.valor)) {
      melhorMes = { month: i + 1, valor: porMes[i] }
    }
  }

  // Valor futuro = receitas com data > hoje no resto do ano corrente.
  const today = new Date()
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const valorFuturo = (data.receitas ?? [])
    .filter((r) => r.year === year && (r.date ?? '') > todayISO)
    .reduce((s, r) => s + (Number(r.amount) || 0), 0)

  const metaReceita = findMetaReceitaAtiva(data)
  const metaAnual = metaReceita
    ? { atual: totalAno, meta: (Number(metaReceita.target) || 0) * 12 }
    : null

  return { totalAno, mediaMensal, mesesOk, melhorMes, valorFuturo, metaAnual }
}

export interface PessoaReceitaRow {
  pessoa: string
  meses: number[]
  total: number
}

/** Agrega receitas por pessoa × mês. Inclui todas pessoas em `data.pessoas`
 *  (mesmo com total 0). Pessoas que apareceram em receitas mas não estão na
 *  lista também são incluídas. */
export function receitasPorPessoaMes(data: UserData, year: number): PessoaReceitaRow[] {
  const map = new Map<string, number[]>()

  // Pré-popular com as pessoas conhecidas (mantém ordem do cadastro)
  for (const p of data.pessoas ?? []) {
    map.set(p, Array(12).fill(0))
  }

  for (const r of data.receitas ?? []) {
    if (r.year !== year) continue
    const pessoa = (typeof r.person === 'string' && r.person.length > 0) ? r.person : '—'
    const m = Number(r.month)
    if (!m || m < 1 || m > 12) continue
    const arr = map.get(pessoa) ?? Array(12).fill(0)
    arr[m - 1] = (arr[m - 1] || 0) + (Number(r.amount) || 0)
    map.set(pessoa, arr)
  }

  const rows: PessoaReceitaRow[] = []
  for (const [pessoa, meses] of map.entries()) {
    const total = meses.reduce((s, v) => s + v, 0)
    rows.push({ pessoa, meses, total })
  }
  // Ordena por total desc
  rows.sort((a, b) => b.total - a.total)
  return rows
}
