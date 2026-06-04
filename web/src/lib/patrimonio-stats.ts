// Helpers de estatística para a tela de Patrimônio (4 KPIs + donut + evolução).
// Tolerantes a `data` parcial/ausente — retornam zeros / arrays vazios.

import {
  totalPatrimonioLiquido,
  totalReservas,
  totalEquipamentos,
  totalVeiculos,
  totalImoveis,
  ativoValorBRL,
  reservaValorAtual,
  saldoMes,
  type Ativo,
  type Cotacoes,
  type UserData,
} from '@haile/shared'

const MESES_CURTOS = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

export interface PatrimonioKpis {
  total: number
  reservas: number
  rendimentoAnoEst: number
  outros: number
}

export interface DistribuicaoSlice {
  label: string
  value: number
}

export interface EvolucaoPoint {
  periodo: string
  valor: number
}

function getCotacoes(data: UserData | null | undefined): Cotacoes {
  return (data?.settings ?? {}) as Cotacoes
}

function isReservaAtivo(a: Ativo): boolean {
  if (a.kind === 'reserva') return true
  if (a.kind === 'cripto' || a.kind === 'fiat') return false
  if (a.platform != null || a.qty != null || a.unitPrice != null) return false
  return a.valorInvestido != null || a.rendimento != null || a.nome != null
}

/**
 * 4 KPIs do topo:
 * - total: patrimônio líquido (ativos + bens − passivos)
 * - reservas: soma das reservas em ativos (renda fixa/variável etc, sem cripto)
 * - rendimentoAnoEst: soma de (valorAtual − valorInvestido) das reservas com ambos
 *   campos preenchidos — proxy de ganho realizado no ano (não anualiza).
 * - outros: bens não-investimento ao valor de mercado (equip + veíc + imóveis cheios).
 */
export function patrimonioKpis(data: UserData | null | undefined): PatrimonioKpis {
  if (!data) return { total: 0, reservas: 0, rendimentoAnoEst: 0, outros: 0 }
  const cotacoes = getCotacoes(data)
  const total = totalPatrimonioLiquido(data, cotacoes)
  const reservas = totalReservas(data)

  const ativos = (data.ativos ?? []) as Ativo[]
  let rendimento = 0
  for (const a of ativos) {
    if (!isReservaAtivo(a)) continue
    const inv = Number(a.valorInvestido) || 0
    const atual = Number(a.valorAtual) || 0
    if (inv > 0 && atual > 0) rendimento += atual - inv
  }

  const outros = totalEquipamentos(data) + totalVeiculos(data) + totalImoveis(data)
  return { total, reservas, rendimentoAnoEst: rendimento, outros }
}

/**
 * Distribuição do portfólio para o donut. Agrega por:
 * - FIAT BR (reservas em real, default)
 * - Cripto / FIAT estrangeiro (qty * unitPrice convertido em BRL)
 * - Imóveis (equity)
 * - Veículos
 * - Equipamentos
 *
 * Categorias com valor 0 são omitidas.
 */
export function patrimonioDistribuicao(
  data: UserData | null | undefined,
): DistribuicaoSlice[] {
  if (!data) return []
  const cotacoes = getCotacoes(data)
  const ativos = (data.ativos ?? []) as Ativo[]

  let fiatBR = 0
  let cripto = 0
  let fiatEstrangeiro = 0

  for (const a of ativos) {
    if (isReservaAtivo(a)) {
      fiatBR += reservaValorAtual(a)
      continue
    }
    const brl = ativoValorBRL(a, cotacoes)
    const isCripto =
      a.kind === 'cripto' ||
      (typeof a.categoria === 'string' && a.categoria.toLowerCase().includes('cripto')) ||
      ['BTC', 'ETH', 'USDT', 'USDC'].includes(String(a.currency ?? '').toUpperCase())
    if (isCripto) cripto += brl
    else fiatEstrangeiro += brl
  }

  const imoveis = totalImoveis(data)
  const veiculos = totalVeiculos(data)
  const equipamentos = totalEquipamentos(data)

  const slices: DistribuicaoSlice[] = [
    { label: 'FIAT BR', value: fiatBR },
    { label: 'Cripto', value: cripto },
    { label: 'FIAT estrangeiro', value: fiatEstrangeiro },
    { label: 'Imóveis', value: imoveis },
    { label: 'Veículos', value: veiculos },
    { label: 'Equipamentos', value: equipamentos },
  ]
  return slices.filter((s) => s.value > 0)
}

/**
 * Evolução mensal estimada (12 meses) do patrimônio.
 *
 * Heurística: mês 12 (referência) = patrimônio atual. Para meses anteriores,
 * subtrai recursivamente o saldo (receitas − despesas) do mês seguinte:
 *   mês N = mês (N+1) − saldoMes(N+1)
 *
 * Quando year não é passado, usa o ano corrente.
 *
 * TODO: usar snapshots reais quando o backend persistir histórico do
 *       patrimônio líquido. Hoje a curva reflete apenas a variação induzida
 *       pelo fluxo do ano corrente — não captura valorização de ativos.
 */
export function patrimonioEvolucaoEstimada(
  data: UserData | null | undefined,
  year?: number,
): EvolucaoPoint[] {
  const ref = year ?? new Date().getFullYear()
  if (!data) {
    return MESES_CURTOS.map((m) => ({ periodo: m, valor: 0 }))
  }
  const cotacoes = getCotacoes(data)
  const atual = totalPatrimonioLiquido(data, cotacoes)
  const valores = new Array<number>(12).fill(0)
  valores[11] = atual
  for (let m = 10; m >= 0; m--) {
    const saldoMesSeguinte = saldoMes(data, m + 2, ref)
    valores[m] = valores[m + 1] - saldoMesSeguinte
  }
  return valores.map((v, i) => ({ periodo: MESES_CURTOS[i], valor: v }))
}
