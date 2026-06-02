// Framework de "fluxo guiado" pro Simulador do Haile.
// Cada fluxo = lista de steps (pergunta + coleta) → cálculo → recomendação.
// Lógica pura (sem React). O componente de UI percorre os steps.
//
// Filosofia: o usuário NÃO precisa saber qual calculadora usar — ele responde
// uma pergunta-âncora e o framework conduz. Defaults inteligentes vindos do
// contexto (saldo, renda, Poder de Escolha) reduzem fricção.

export type FieldKind = 'currency' | 'months' | 'years' | 'percent' | 'text' | 'select'

import type { UserData } from './types'
import { calcPoderDeEscolhaV2 } from './tipos'
import { getRespostas } from './contexto'

/** Contexto financeiro disponível pros defaults inteligentes dos fluxos. */
export interface FluxoCtx {
  data: UserData
  month: number
  year: number
}

export interface FieldSpec {
  id: string
  label: string
  kind: FieldKind
  hint?: string
  /** Para 'select' — opções estáticas. */
  options?: { value: string; label: string }[]
  /** Para 'select' com opções dependentes do contexto (ex: lista de financiamentos). */
  optionsFn?: (ctx?: FluxoCtx) => { value: string; label: string }[]
  /** Default dinâmico. Recebe (valores já preenchidos, contexto financeiro). */
  defaultValue?: (values: Record<string, unknown>, ctx?: FluxoCtx) => string | number | undefined
  /** Validação simples — retorna null se OK ou mensagem de erro */
  validate?: (v: unknown, all: Record<string, unknown>) => string | null
  /** Mostrar campo só sob condição (ex: outro campo tem valor X) */
  visibleIf?: (values: Record<string, unknown>) => boolean
}

export interface StepSpec {
  id: string
  /** Pergunta-âncora deste step (uma decisão por step) */
  question: string
  /** Texto curto de orientação (opcional) */
  hint?: string
  /** Campos coletados neste step */
  fields: FieldSpec[]
}

export interface ResultBlock {
  /** Frase principal — voz do Haile, não só números */
  headline: string
  /** Lista de bullets com detalhes/premissas */
  details: string[]
  /** Métricas-chave pra cartões/destaque */
  metrics?: { label: string; value: string; tone?: 'pos' | 'neg' | 'neutral' }[]
  /** CTAs sugeridos */
  ctas?: { label: string; action: 'create-meta' | 'ask-haile' | 'adjust' | 'navigate'; payload?: unknown }[]
}

export interface FluxoSpec<R = ResultBlock> {
  id: string
  /** Categoria pra agrupar no menu do simulador */
  bucket: 'investir' | 'objetivos' | 'dividas'
  /** Título curto pra cartão/lista */
  title: string
  /** Pergunta-âncora geral (ex: "Comprar ou alugar o carro?") */
  question: string
  /** 1 frase explicando pra que serve */
  description: string
  icon?: string // nome lucide opcional
  steps: StepSpec[]
  /** Recebe o values final + contexto financeiro opcional → produz o ResultBlock. */
  compute: (values: Record<string, unknown>, ctx?: FluxoCtx) => R
}

// ── Helpers numéricos ─────────────────────────────────────────────
export function asNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'))
    if (Number.isFinite(n)) return n
  }
  return fallback
}

/**
 * Aporte mensal necessário pra chegar em FV em n meses a uma taxa i ao mês,
 * considerando saldo inicial PV. Fórmula de anuidade ordinária postcipada.
 *
 *   FV = PV·(1+i)^n + PMT · [((1+i)^n − 1) / i]
 *   → PMT = (FV − PV·(1+i)^n) / [((1+i)^n − 1) / i]
 */
export function aporteMensal(fv: number, pv: number, n: number, i: number): number {
  if (n <= 0) return 0
  if (i <= 0) return (fv - pv) / n
  const fator = Math.pow(1 + i, n)
  const num = fv - pv * fator
  const den = (fator - 1) / i
  return num / den
}

/**
 * Em quantos meses chego em FV com PV inicial e aporte mensal PMT a uma taxa i.
 * Retorna número fracionário; quem mostra arredonda.
 */
export function mesesNecessarios(fv: number, pv: number, pmt: number, i: number): number {
  if (fv <= pv) return 0
  if (pmt <= 0 && i <= 0) return Infinity
  if (i <= 0) return (fv - pv) / pmt
  // FV = (PV + PMT/i)·(1+i)^n − PMT/i  →  n = log((FV·i + PMT)/(PV·i + PMT)) / log(1+i)
  const num = fv * i + pmt
  const den = pv * i + pmt
  if (den <= 0 || num <= 0) return Infinity
  return Math.log(num / den) / Math.log(1 + i)
}

/** Converte taxa anual % → mensal decimal (i_mensal = (1+i_anual)^(1/12) − 1). */
export function aaToAmDecimal(taxaAnualPct: number): number {
  return Math.pow(1 + taxaAnualPct / 100, 1 / 12) - 1
}

// ── Helpers de contexto pros defaults inteligentes ────────────────
// Pequenos atalhos pra fluxos lerem do UserData sem precisar conhecer
// a estrutura interna. Todos defensivos (null-safe, fallback 0).

/** Soma o saldo de todas as contas cadastradas (R$). */
export function sumContas(ctx?: FluxoCtx): number {
  if (!ctx) return 0
  return (ctx.data.contas ?? []).reduce((s, c) => s + (Number(c.saldo) || 0), 0)
}

/** Receita média dos últimos N meses corridos (default 3). */
export function receitaMediaNMeses(ctx: FluxoCtx | undefined, n = 3): number {
  if (!ctx) return 0
  const recs = ctx.data.receitas ?? []
  if (recs.length === 0) return 0
  let total = 0
  let count = 0
  for (let i = 0; i < n; i++) {
    let m = ctx.month - i
    let y = ctx.year
    while (m <= 0) { m += 12; y -= 1 }
    const soma = recs
      .filter((r) => r.month === m && r.year === y)
      .reduce((s, r) => s + (Number(r.amount) || 0), 0)
    total += soma
    count += 1
  }
  return count > 0 ? total / count : 0
}

/** Poder de Escolha mensal (sobra) no mês corrente do ctx. */
export function getPoderEscolha(ctx?: FluxoCtx): number {
  if (!ctx) return 0
  const pde = calcPoderDeEscolhaV2(ctx.data, ctx.month, ctx.year)
  return Math.max(0, pde.poderDeEscolha || 0)
}

/** Idade do usuário vinda do profile (campo opcional). null se não houver. */
export function getProfileIdade(ctx?: FluxoCtx): number | null {
  if (!ctx) return null
  const raw = (ctx.data.profile as { idade?: unknown; birthYear?: unknown } | undefined) ?? {}
  const idade = Number(raw.idade)
  if (Number.isFinite(idade) && idade > 0 && idade < 120) return Math.round(idade)
  const by = Number(raw.birthYear)
  if (Number.isFinite(by) && by > 1900 && by < ctx.year) return ctx.year - by
  return null
}

export type RiskProfile = 'conservador' | 'moderado' | 'agressivo'

/** Perfil de risco extraído das respostas do ICP (categoria `risk`). */
export function getRiskProfile(ctx?: FluxoCtx): RiskProfile {
  if (!ctx) return 'moderado'
  const respostas = getRespostas(ctx.data.contexto, 'risk')
  const perfil = respostas.find((r) => r.perguntaId === 'risk_perfil')
  if (perfil?.opcaoId === 'conservador') return 'conservador'
  if (perfil?.opcaoId === 'arrojado') return 'agressivo'
  if (perfil?.opcaoId === 'moderado') return 'moderado'
  const reacao = respostas.find((r) => r.perguntaId === 'risk_perde')
  if (reacao?.opcaoId === 'tira_tudo') return 'conservador'
  if (reacao?.opcaoId === 'aporta_mais') return 'agressivo'
  return 'moderado'
}

/** Número de dependentes via ICP (categoria `family`). 0 se não houver. */
export function getDependentes(ctx?: FluxoCtx): number {
  if (!ctx) return 0
  const r = getRespostas(ctx.data.contexto, 'family').find((x) => x.perguntaId === 'family_dependentes')
  if (!r?.opcaoId) return 0
  if (r.opcaoId === '0') return 0
  if (r.opcaoId === '1') return 1
  if (r.opcaoId === '2_3') return 2
  if (r.opcaoId === '4mais') return 4
  return 0
}

/** Soma estimada de custo mensal de TODOS os veículos cadastrados no Patrimônio. */
export function veiculosCustoMensalCadastrado(ctx?: FluxoCtx): number {
  if (!ctx) return 0
  const veiculos = (ctx.data.veiculos ?? []) as Array<Record<string, unknown>>
  if (veiculos.length === 0) return 0
  let total = 0
  for (const v of veiculos) {
    const ipva = Number(v.ipvaAnual) || 0
    const seguro = Number(v.seguroAnual) || 0
    const manut = Number(v.manutencaoMensal) || 0
    total += ipva / 12 + seguro / 12 + manut
  }
  return total
}

/** Valor médio dos veículos cadastrados (compra ou atual). 0 se não houver. */
export function veiculoValorCadastrado(ctx?: FluxoCtx): number {
  if (!ctx) return 0
  const veiculos = (ctx.data.veiculos ?? []) as Array<Record<string, unknown>>
  if (veiculos.length === 0) return 0
  const valores = veiculos
    .map((v) => Number(v.valorAtual) || Number(v.valorCompra) || 0)
    .filter((n) => n > 0)
  if (valores.length === 0) return 0
  return valores.reduce((s, n) => s + n, 0) / valores.length
}

/** Formata meses → "Xa Ym" ou "Xm" */
export function fmtMeses(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (n <= 0) return 'já alcançado'
  const m = Math.ceil(n)
  if (m < 12) return `${m} ${m === 1 ? 'mês' : 'meses'}`
  const a = Math.floor(m / 12)
  const r = m % 12
  if (r === 0) return `${a} ${a === 1 ? 'ano' : 'anos'}`
  return `${a}a ${r}m`
}
