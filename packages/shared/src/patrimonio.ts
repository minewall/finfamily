// Patrimônio — porta DIRETA da lógica de cálculo do Dino (app/js/store.js).
// Funções puras sobre os tipos + agregados sobre `UserData`. Sem persistência.
//
// Buckets:
//   - Equipamentos: notebooks, celulares, eletro, móveis (depreciação linear)
//   - Veículos: carros/motos (depreciação anual + TCO)
//   - Imóveis: casa/apto/sala/terreno (valorização anual + equity + rentabilidade)
//   - Ativos: investimentos (reservas) + crypto/FIAT
//   - Passivos: dívidas (banco, cartão, jurídico, etc.)
//
// Total ativos (cálculo do Dino): reservas + ativos_em_BRL + veículos + imóveis + equipamentos.

import type { UserData } from './types'

// ─── TIPOS ─────────────────────────────────────────────────────────

export interface Equipamento {
  id: string
  nome: string
  categoria?: 'eletronico' | 'eletrodomestico' | 'moveis' | 'ferramenta' | 'outro' | string
  valorCompra?: number
  dataCompra?: string // YYYY-MM-DD
  /** Override manual; se setado, ignora depreciação. */
  valorAtual?: number
  /** Depreciação anual em %. Default 20. */
  depreciacaoAnualPct?: number
  /** Anos de vida útil. Default 5. */
  vidaUtilAnos?: number
  custoManutencaoMensal?: number
  custoAnualExtra?: number
  notes?: string
  createdAt?: string
  [k: string]: unknown
}

export interface Veiculo {
  id: string
  marca?: string
  modelo?: string
  apelido?: string
  ano?: number | null
  placa?: string
  cor?: string
  valorCompra?: number
  dataCompra?: string
  valorAtual?: number
  /** Default 10. */
  depreciacaoAnualPct?: number
  ipvaAnual?: number
  seguroAnual?: number
  manutencaoMensal?: number
  notes?: string
  createdAt?: string
  [k: string]: unknown
}

export interface Imovel {
  id: string
  tipo?: 'casa' | 'apartamento' | 'sala' | 'terreno' | 'outro' | string
  apelido?: string
  endereco?: string
  valorCompra?: number
  dataCompra?: string
  valorAtual?: number
  /** Default 0 (conservador). */
  valorizacaoAnualPct?: number
  financiado?: boolean
  saldoDevedor?: number
  parcelaFinanciamento?: number
  iptuAnual?: number
  condominioMensal?: number
  manutencaoMensal?: number
  alugado?: boolean
  aluguelMensal?: number
  notes?: string
  createdAt?: string
  [k: string]: unknown
}

/**
 * Bucket único "ativos" no Dino aceita dois schemas:
 *  - Reserva: { nome, tipo, valorInvestido, valorAtual, rendimento, imposto, carencia }
 *  - Crypto/FIAT: { platform, type, qty, unitPrice, currency, updated, categoria, sub }
 *
 * No DUO mantemos compatível usando shape único permissivo. As funções de cálculo
 * diferenciam pelo formato dos campos. Para preservar separação visual, `kind`
 * pode ser preenchido (mas o Dino não preenche — então é opcional).
 */
export interface Ativo {
  id: string
  kind?: 'reserva' | 'cripto' | 'fiat' | string
  // Reserva fields
  nome?: string
  tipo?: string
  valorInvestido?: number
  valorAtual?: number
  rendimento?: number
  imposto?: number
  carencia?: string
  // Crypto/FIAT fields
  platform?: string
  type?: string
  categoria?: string
  sub?: string
  qty?: number
  unitPrice?: number
  currency?: 'BRL' | 'USD' | 'EUR' | string
  updated?: string
  [k: string]: unknown
}

export interface Passivo {
  id: string
  desc: string
  tipo?: 'banco' | 'cartao' | 'empresarial' | 'pessoal' | 'emprestimo' | 'juridico' | 'bloqueio' | string
  credor?: string
  responsavel?: string
  valorOriginal?: number
  valorProposta?: number | null
  valorAcordado?: number | null
  status?: 'pendente' | 'em_negociacao' | 'acordado' | 'quitado' | string
  dataRef?: string | null
  notes?: string
  contratoId?: string
  attachment?: unknown
  [k: string]: unknown
}

// ─── CONSTANTES (fiel ao Dino) ─────────────────────────────────────

export interface MoedaSpec {
  id: string
  label: string
  simbolo: string
  tipo: 'fiat' | 'cripto'
  alertaDias: number
  base?: boolean
}

export const MOEDAS: MoedaSpec[] = [
  { id: 'BRL', label: 'Real', simbolo: 'R$', tipo: 'fiat', alertaDias: 30, base: true },
  { id: 'USD', label: 'Dólar', simbolo: 'US$', tipo: 'fiat', alertaDias: 7 },
  { id: 'EUR', label: 'Euro', simbolo: '€', tipo: 'fiat', alertaDias: 7 },
  { id: 'BTC', label: 'Bitcoin', simbolo: '₿', tipo: 'cripto', alertaDias: 2 },
  { id: 'ETH', label: 'Ethereum', simbolo: 'Ξ', tipo: 'cripto', alertaDias: 2 },
  { id: 'USDT', label: 'Tether', simbolo: '₮', tipo: 'cripto', alertaDias: 7 },
]

export interface AtivoCategoria {
  id: string
  label: string
  /** 0=segurança total, 4=especulativo */
  risco: number
  /** 0=ilíquido, 3=alta (≤D+1) */
  liquidez: number
  desc: string
}

export const ATIVO_CATEGORIAS: AtivoCategoria[] = [
  { id: 'renda_fixa', label: 'Renda Fixa', risco: 1, liquidez: 2, desc: 'CDB, Tesouro, LCI/LCA, Debêntures' },
  { id: 'renda_variavel', label: 'Renda Variável', risco: 3, liquidez: 3, desc: 'Ações, FIIs, ETFs, Fundos Multi' },
  { id: 'cripto', label: 'Cripto', risco: 4, liquidez: 3, desc: 'BTC, ETH, stablecoins, altcoins' },
  { id: 'previdencia', label: 'Previdência', risco: 2, liquidez: 1, desc: 'PGBL, VGBL — longo prazo' },
  { id: 'commodities', label: 'Commodities', risco: 2, liquidez: 1, desc: 'Ouro, prata, metais físicos' },
  { id: 'outros', label: 'Outros', risco: 3, liquidez: 0, desc: 'Tokens/NFT, joias, arte, empréstimos a receber' },
]

export const ATIVO_SUBCATEGORIAS: Record<string, string[]> = {
  renda_fixa: ['Tesouro Direto', 'CDB', 'LCI / LCA', 'Debêntures', 'Fundos RF', 'Outros'],
  renda_variavel: ['Ações nacionais', 'Ações internacionais / BDR', 'FIIs', 'ETFs', 'Fundos Multimercado', 'Outros'],
  cripto: ['Bitcoin (BTC)', 'Ethereum (ETH)', 'Stablecoins (USDT/USDC)', 'Altcoins', 'Outros'],
  previdencia: ['PGBL', 'VGBL'],
  commodities: ['Ouro físico', 'Prata física', 'Outros metais'],
  outros: ['Tokens / NFT', 'Joias / Coleção / Arte', 'Empréstimo a receber', 'Outros'],
}

export const RESERVA_TIPOS: string[] = [
  'Renda Fixa - CDB',
  'Renda Fixa - LCI/LCA',
  'Renda Fixa - Tesouro Selic',
  'Renda Fixa - Poupança',
  'Renda Variável - Ações/FII',
  'Renda Variável - ETF',
  'Reserva em Dinheiro',
  'Outros',
]

export const IMPOSTO_OPTS: Array<{ label: string; val: number }> = [
  { label: 'Isento (LCI/LCA/Poupança)', val: 0 },
  { label: '15% (acima de 720 dias)', val: 0.15 },
  { label: '17,5% (361–720 dias)', val: 0.175 },
  { label: '20% (até 360 dias)', val: 0.2 },
]

// ─── HELPERS ───────────────────────────────────────────────────────

const MS_YEAR = 1000 * 60 * 60 * 24 * 365.25
const MS_MONTH = 1000 * 60 * 60 * 24 * 30.44

function anosDesde(dateStr?: string, ref: number = Date.now()): number {
  if (!dateStr) return 0
  const t = new Date(dateStr).getTime()
  if (!Number.isFinite(t)) return 0
  return Math.max(0, (ref - t) / MS_YEAR)
}

function mesesDesde(dateStr?: string, ref: number = Date.now()): number {
  if (!dateStr) return 0
  const t = new Date(dateStr).getTime()
  if (!Number.isFinite(t)) return 0
  return Math.max(0, (ref - t) / MS_MONTH)
}

// ─── EQUIPAMENTOS ──────────────────────────────────────────────────

export function equipamentoValorEstimado(e: Equipamento, ref: number = Date.now()): number {
  if (!e.valorCompra || !e.dataCompra) return e.valorAtual || 0
  // No Dino: `if (e.valorAtual != null && e.valorAtual !== '') return e.valorAtual`
  // — override manual prevalece (inclusive 0 explícito).
  if (e.valorAtual != null && (e.valorAtual as unknown) !== '') return e.valorAtual
  const anos = anosDesde(e.dataCompra, ref)
  const vidaUtil = e.vidaUtilAnos || 5
  if (anos >= vidaUtil) return 0
  const taxaAnual = (e.depreciacaoAnualPct ?? 20) / 100
  return Math.max(0, e.valorCompra * Math.pow(1 - taxaAnual, anos))
}

export function equipamentoCustoAnual(e: Equipamento): number {
  return (e.custoManutencaoMensal || 0) * 12 + (e.custoAnualExtra || 0)
}

export function totalEquipamentos(data: UserData | null | undefined): number {
  const list = (data?.equipamentos ?? []) as Equipamento[]
  return list.reduce((s, e) => s + equipamentoValorEstimado(e), 0)
}

// ─── VEÍCULOS ──────────────────────────────────────────────────────

export function veiculoValorEstimado(v: Veiculo, ref: number = Date.now()): number {
  if (!v.valorCompra || !v.dataCompra) return v.valorAtual || 0
  if (v.valorAtual) return v.valorAtual // valor manual prevalece (truthy: 0 não vale)
  const meses = mesesDesde(v.dataCompra, ref)
  const taxa = (v.depreciacaoAnualPct ?? 10) / 100
  const fator = Math.pow(1 - taxa, meses / 12)
  return Math.max(0, v.valorCompra * fator)
}

export function veiculoCustoAnual(v: Veiculo): number {
  return (v.ipvaAnual || 0) + (v.seguroAnual || 0) + (v.manutencaoMensal || 0) * 12
}

export function veiculoIdadeAnos(v: Veiculo, ref: number = Date.now()): number {
  return anosDesde(v.dataCompra, ref)
}

export interface VeiculoTcoPoint {
  ano: number
  valorEstim: number
  gastoOp: number
  custoAcum: number
  custoLiq: number
  deprecAno: number
}

export function veiculoTCO(v: Veiculo, anosTotal: number): VeiculoTcoPoint[] {
  const valorCompra = v.valorCompra || 0
  const deprec = (v.depreciacaoAnualPct ?? 10) / 100
  const custoOpAnual = veiculoCustoAnual(v)
  const N = Math.max(1, Math.min(40, anosTotal || 10))
  const series: VeiculoTcoPoint[] = []
  for (let i = 0; i <= N; i++) {
    const valorEstim = valorCompra * Math.pow(1 - deprec, i)
    const gastoOp = custoOpAnual * i
    const custoAcum = valorCompra + gastoOp
    const custoLiq = custoAcum - valorEstim
    const deprecAno = i > 0 ? valorCompra * Math.pow(1 - deprec, i - 1) - valorEstim : 0
    series.push({
      ano: i,
      valorEstim: parseFloat(valorEstim.toFixed(2)),
      gastoOp: parseFloat(gastoOp.toFixed(2)),
      custoAcum: parseFloat(custoAcum.toFixed(2)),
      custoLiq: parseFloat(custoLiq.toFixed(2)),
      deprecAno: parseFloat(deprecAno.toFixed(2)),
    })
  }
  return series
}

export function totalVeiculos(data: UserData | null | undefined): number {
  const list = (data?.veiculos ?? []) as Veiculo[]
  return list.reduce((s, v) => s + veiculoValorEstimado(v), 0)
}

// ─── IMÓVEIS ───────────────────────────────────────────────────────

export function imovelValorEstimado(im: Imovel, ref: number = Date.now()): number {
  if (!im.valorCompra || !im.dataCompra) return im.valorAtual || 0
  if (im.valorAtual) return im.valorAtual
  const meses = mesesDesde(im.dataCompra, ref)
  const taxa = (im.valorizacaoAnualPct ?? 0) / 100
  return im.valorCompra * Math.pow(1 + taxa, meses / 12)
}

export function imovelEquity(im: Imovel): number {
  return imovelValorEstimado(im) - (im.saldoDevedor || 0)
}

export function imovelCustoAnual(im: Imovel): number {
  return (
    (im.iptuAnual || 0) +
    (im.condominioMensal || 0) * 12 +
    (im.manutencaoMensal || 0) * 12 +
    (im.parcelaFinanciamento || 0) * 12
  )
}

export function imovelReceitaAnual(im: Imovel): number {
  return (im.aluguelMensal || 0) * 12
}

export function imovelRentabilidadeAluguel(im: Imovel): number {
  const val = imovelValorEstimado(im)
  if (!val || !im.aluguelMensal) return 0
  return (im.aluguelMensal * 12) / val
}

export function totalImoveis(data: UserData | null | undefined): number {
  const list = (data?.imoveis ?? []) as Imovel[]
  return list.reduce((s, im) => s + imovelValorEstimado(im), 0)
}

export function totalEquityImoveis(data: UserData | null | undefined): number {
  const list = (data?.imoveis ?? []) as Imovel[]
  return list.reduce((s, im) => s + imovelEquity(im), 0)
}

// ─── ATIVOS (reservas + crypto/FIAT) ───────────────────────────────

export interface Cotacoes {
  usdBrl?: number
  eurBrl?: number
  btcBrl?: number
  ethBrl?: number
  usdtBrl?: number
}

/**
 * Heurística pra distinguir reserva de crypto/FIAT. No Dino existem dois shapes
 * conviventes — reservas têm `valorInvestido`/`rendimento`/`nome`; crypto/FIAT
 * têm `platform`/`qty`/`unitPrice`/`currency`.
 */
function isReserva(a: Ativo): boolean {
  if (a.kind === 'reserva') return true
  if (a.kind === 'cripto' || a.kind === 'fiat') return false
  // Heurística por presença de campos
  if (a.platform != null || a.qty != null || a.unitPrice != null) return false
  if (a.valorInvestido != null || a.rendimento != null) return true
  return false
}

/** Valor em BRL de um ativo crypto/FIAT. */
export function ativoValorBRL(a: Ativo, cotacoes: Cotacoes = {}): number {
  const { usdBrl = 5.85, eurBrl = 6.4 } = cotacoes
  const val = (a.qty || 0) * (a.unitPrice || 0)
  if (a.currency === 'USD') return val * usdBrl
  if (a.currency === 'EUR') return val * eurBrl
  return val
}

/** Rendimento líquido anual estimado de uma reserva. */
export function reservaRendimentoLiquido(r: Ativo): number {
  if (!r.rendimento || (r.tipo || '').includes('Dinheiro')) return 0
  return (r.valorInvestido || 0) * ((r.rendimento || 0) / 100) * (1 - (r.imposto || 0))
}

/** Valor "atual" da reserva (manual ou investido). */
export function reservaValorAtual(r: Ativo): number {
  return r.valorAtual || r.valorInvestido || 0
}

/**
 * Soma todos os ativos em BRL — combina reservas (`valorAtual||valorInvestido`)
 * e ativos crypto/FIAT (com conversão por cotação). NÃO inclui veículos/imóveis/equip.
 */
export function totalAtivos(data: UserData | null | undefined, cotacoes: Cotacoes = {}): number {
  const list = (data?.ativos ?? []) as Ativo[]
  const settings = (data?.settings ?? {}) as Cotacoes
  const cot: Cotacoes = { ...settings, ...cotacoes }
  let total = 0
  for (const a of list) {
    if (isReserva(a)) total += reservaValorAtual(a)
    else total += ativoValorBRL(a, cot)
  }
  // O Dino também acumula data.reservas separado, mas no schema oficial
  // novo o bucket "ativos" carrega reservas também. Para compatibilidade com
  // blobs antigos, somamos data.reservas se existir.
  const reservasLegacy = (data as { reservas?: Ativo[] } | null | undefined)?.reservas
  if (Array.isArray(reservasLegacy)) {
    for (const r of reservasLegacy) total += reservaValorAtual(r)
  }
  return total
}

export function totalReservas(data: UserData | null | undefined): number {
  const list = (data?.ativos ?? []) as Ativo[]
  let total = 0
  for (const a of list) if (isReserva(a)) total += reservaValorAtual(a)
  const reservasLegacy = (data as { reservas?: Ativo[] } | null | undefined)?.reservas
  if (Array.isArray(reservasLegacy)) {
    for (const r of reservasLegacy) total += reservaValorAtual(r)
  }
  return total
}

export function totalCriptoFiat(data: UserData | null | undefined, cotacoes: Cotacoes = {}): number {
  const list = (data?.ativos ?? []) as Ativo[]
  const settings = (data?.settings ?? {}) as Cotacoes
  const cot: Cotacoes = { ...settings, ...cotacoes }
  let total = 0
  for (const a of list) if (!isReserva(a)) total += ativoValorBRL(a, cot)
  return total
}

// ─── PASSIVOS ──────────────────────────────────────────────────────

export function totalPassivos(data: UserData | null | undefined): number {
  const list = (data?.passivos ?? []) as Passivo[]
  return list
    .filter((p) => p.status !== 'quitado')
    .reduce((s, p) => s + (p.valorAcordado || p.valorProposta || p.valorOriginal || 0), 0)
}

// ─── AGREGADO: PATRIMÔNIO LÍQUIDO ──────────────────────────────────

/**
 * Patrimônio líquido = ativos + equipamentos + veículos + (imóveis em equity) − passivos.
 *
 * Nota: para imóveis, somamos *equity* (valor estimado − saldo devedor), porque o
 * saldo devedor já representa um passivo embutido no próprio imóvel.
 */
export function totalPatrimonioLiquido(
  data: UserData | null | undefined,
  cotacoes: Cotacoes = {},
): number {
  const ativos = totalAtivos(data, cotacoes)
  const equip = totalEquipamentos(data)
  const veic = totalVeiculos(data)
  const imoveisEquity = totalEquityImoveis(data)
  const pass = totalPassivos(data)
  return ativos + equip + veic + imoveisEquity - pass
}
