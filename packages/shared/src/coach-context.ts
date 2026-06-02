// Builder do "system" prompt do Haile — expandido (Sprint 6).
// Porta o essencial do Dino buildContext (~25 seções) pro DUO.
// Inclui: KPIs detalhados, Poder de Escolha, breakdown por categoria,
// top despesas, splits por pessoa, metas, contas, contratos recorrentes,
// financiamentos, patrimônio, reembolsos, tributos, cotações, ICP e
// personalidade do Coach.
//
// Usado pelo Painel do Haile (chat). O conteúdo aqui é DETERMINÍSTICO —
// só lê data e formata. A IA não tem ferramentas além das já wired no
// loop de tool use; respeita esse limite.

import type { UserData } from './types'
import {
  sumReceitas, sumDespesas, currencyBRL,
  breakdownPorCategoria, topDespesas,
} from './finance'
import { calcPoderDeEscolhaV2, sumDespesasByTipo, TIPOS_BUILTIN } from './tipos'
import { getCategoryLabel } from './categories'
import { calcMetaProgresso, metaTipoLabel } from './metas'
import { getReceitasByPessoa, getDespesasByPessoa, calcContribuicaoMembro } from './familia'
import { getReembolsosPendentes, totalReembolsoPendente } from './reembolsos'
import { getCompromissos, getCompromissosByNatureza, getProximasParcelas } from './contratos'
import {
  totalEquipamentos, totalVeiculos, totalImoveis, totalEquityImoveis,
  totalAtivos, totalPassivos, totalPatrimonioLiquido,
} from './patrimonio'
import {
  financiamentoSaldoDevedor, financiamentoParcelaInicial,
  totalFinanciamentosDevedor, type Financiamento,
} from './financiamentos'
import { getTributosVencendoEm, totalTributosAno } from './tributos'
import { calculateICP, getContextoLevel, CONTEXTO_CATEGORIES, getRespostas, type ContextoState } from './contexto'
import { getPersonality, type CoachPersonalityId } from './coach-personalities'

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function fmtPct(n: number, decimals = 0): string {
  return `${(n * 100).toFixed(decimals)}%`
}

function fmtList(lines: string[], emptyMsg = '  (sem dados)'): string {
  return lines.length === 0 ? emptyMsg : lines.join('\n')
}

export interface BuildCoachOptions {
  /** Tela atual (pra hints contextuais opcionais). */
  screen?: string
  /** Override de personalidade — caso o usuário tenha escolhido outra. */
  personality?: CoachPersonalityId
}

export function buildCoachSystemPrompt(
  data: UserData,
  month: number,
  year: number,
  opts: BuildCoachOptions = {},
): string {
  // Personalidade — usa setting do user se existir, senão override de opts, senão mentor.
  const personalityId =
    opts.personality ??
    ((data.settings as { coachPersonality?: CoachPersonalityId } | undefined)?.coachPersonality) ??
    'mentor'
  const personality = getPersonality(personalityId)

  // ── Core KPIs ──────────────────────────────────────────────────
  const rec = sumReceitas(data, month, year)
  const desp = sumDespesas(data, month, year)
  const saldo = rec - desp
  const pde = calcPoderDeEscolhaV2(data, month, year)
  const tipoBreakdown = sumDespesasByTipo(data, month, year)

  // ── Breakdowns ─────────────────────────────────────────────────
  const breakdown = breakdownPorCategoria(data, month, year).slice(0, 8)
  const top = topDespesas(data, month, year, 8)

  // ── Por pessoa ─────────────────────────────────────────────────
  const recPorPessoa = getReceitasByPessoa(data, year, month)
  const despPorPessoa = getDespesasByPessoa(data, year, month)
  const pessoasMes = new Set([...Object.keys(recPorPessoa), ...Object.keys(despPorPessoa)])

  // ── Metas ──────────────────────────────────────────────────────
  const metasAtivas = (data.metas ?? []).filter((m) => m.active !== false)
  const metasTop = metasAtivas.slice(0, 5)

  // ── Contas ─────────────────────────────────────────────────────
  const contas = data.contas ?? []
  const totalContas = contas.reduce((s, c) => s + (Number(c.saldo) || 0), 0)

  // ── Compromissos ───────────────────────────────────────────────
  const recorrentes = getCompromissosByNatureza(data, 'recorrente').filter((c) => c.active !== false).slice(0, 6)
  const proximasParcelas = getProximasParcelas(data, 30).slice(0, 6)
  const totalCompromissos = getCompromissos(data).filter((c) => c.active !== false).length

  // ── Financiamentos ─────────────────────────────────────────────
  const financiamentos = ((data.financiamentos as Financiamento[] | undefined) ?? []).slice(0, 5)
  const totalDevedorFin = totalFinanciamentosDevedor(data)

  // ── Patrimônio ─────────────────────────────────────────────────
  const totEq = totalEquipamentos(data)
  const totVe = totalVeiculos(data)
  const totIm = totalImoveis(data)
  const equityIm = totalEquityImoveis(data)
  const totAt = totalAtivos(data)
  const totPa = totalPassivos(data)
  const patrLiq = totalPatrimonioLiquido(data)

  // ── Reembolsos ─────────────────────────────────────────────────
  const reembolsos = getReembolsosPendentes(data).slice(0, 5)
  const totReemb = totalReembolsoPendente(data)

  // ── Tributos ───────────────────────────────────────────────────
  const tributosVencendo = getTributosVencendoEm(data, undefined, 30).slice(0, 5)
  const totTributosAno = totalTributosAno(data, year)

  // ── Cotações ───────────────────────────────────────────────────
  const cot = data.cotacoes as { USD?: number; EUR?: number; USDT?: number; BTC?: number; _updatedAt?: string } | undefined

  // ── ICP / Contexto pessoal ─────────────────────────────────────
  const ctx = data.contexto as ContextoState | undefined
  const icpPct = calculateICP(ctx)
  const icpLevel = getContextoLevel(icpPct)

  // ── Onboarding ─────────────────────────────────────────────────
  const onb = data.onboarding as { completed?: boolean; answers?: Record<string, unknown> } | undefined
  const profile = (data.profile as { name?: string } | undefined) ?? {}

  // ─── Formatação das seções ───────────────────────────────────
  const sectionTipos = TIPOS_BUILTIN.map((t) => {
    const v = tipoBreakdown[t.id] ?? 0
    return `  - ${t.label} (${t.id}): ${currencyBRL(v)}`
  }).join('\n')

  const sectionBreakdown = fmtList(
    breakdown.map((c) => `  - ${getCategoryLabel(c.category)}: ${currencyBRL(c.total)} (${Math.round(c.pct * 100)}% · ${c.count} ${c.count === 1 ? 'lançamento' : 'lançamentos'})`),
    '  (sem despesas neste mês)',
  )

  const sectionTop = fmtList(
    top.map((t) => `  - ${t.desc}: ${currencyBRL(t.amount)} (${getCategoryLabel(t.category)}${t.person ? ', ' + t.person : ''}, ${t.date})`),
    '  (sem despesas)',
  )

  const sectionPessoas = fmtList(
    Array.from(pessoasMes).sort().map((p) => {
      const c = calcContribuicaoMembro(data, p, year, month)
      return `  - ${p}: receita ${currencyBRL(c.receita)} · despesa ${currencyBRL(c.despesa)} · líquido ${currencyBRL(c.contribuicaoLiquida)} (${c.pctReceita.toFixed(0)}% da receita / ${c.pctDespesa.toFixed(0)}% da despesa)`
    }),
    '  (sem registros por pessoa neste mês)',
  )

  const sectionMetas = fmtList(
    metasTop.map((m) => {
      const p = calcMetaProgresso(m, data, month, year)
      return `  - ${m.label} [${metaTipoLabel(m.type)}]: ${currencyBRL(p.atual)} de ${currencyBRL(p.alvo)} (${Math.round(p.pct * 100)}%${p.estourou ? ' · ESTOUROU' : ''})`
    }),
    '  (sem metas ativas)',
  )

  const sectionContas = fmtList(
    contas.map((c) => `  - ${c.nome}${c.banco ? ' (' + c.banco + ')' : ''}: ${currencyBRL(c.saldo)}`),
    '  (sem contas cadastradas)',
  )

  const sectionRecorrentes = fmtList(
    recorrentes.map((c) => `  - ${c.label}: ${currencyBRL(c.valorParcela)} ${c.periodicidade} (${c.kind})`),
    '  (sem contratos recorrentes ativos)',
  )

  const sectionProxParcelas = fmtList(
    proximasParcelas.map((p) => `  - ${p.contrato.label}: ${currencyBRL(p.valor)} em ${String(p.mes).padStart(2, '0')}/${p.ano}`),
    '  (sem parcelas próximas em 30 dias)',
  )

  const sectionFinanciamentos = fmtList(
    financiamentos.map((f) => {
      const saldo = financiamentoSaldoDevedor(f)
      const parcela = financiamentoParcelaInicial(f)
      return `  - ${f.descricao}: saldo devedor ${currencyBRL(saldo)} · parcela ${currencyBRL(parcela)} · sistema ${f.sistema.toUpperCase()} · taxa ${(f.taxaMensal || 0).toFixed(2)}% a.m.`
    }),
    '  (sem financiamentos ativos)',
  )

  const sectionReembolsos = fmtList(
    reembolsos.map((r) => {
      const info = r.reembolso!
      return `  - ${r.desc}: ${currencyBRL(info.valor)} — ${info.de} deve devolver pra ${info.para}`
    }),
    '  (sem reembolsos pendentes)',
  )

  const sectionTributos = fmtList(
    tributosVencendo.map((tv) => `  - ${tv.tributo.tipo.toUpperCase()} · ${tv.tributo.label}: ${currencyBRL(tv.valor)} (parcela ${tv.parcelaNum}/${tv.tributo.parcelas}, vence ${tv.date})`),
    '  (sem tributos vencendo nos próximos 30 dias)',
  )

  const sectionCotacoes = cot
    ? [
        cot.USD ? `  USD: R$ ${cot.USD.toFixed(2)}` : '',
        cot.EUR ? `  EUR: R$ ${cot.EUR.toFixed(2)}` : '',
        cot.USDT ? `  USDT: R$ ${cot.USDT.toFixed(2)}` : '',
        cot.BTC ? `  BTC: R$ ${cot.BTC.toFixed(2)}` : '',
      ].filter(Boolean).join('\n')
    : '  (sem cotações disponíveis)'

  // ICP — categorias com >0 respostas
  const icpRespostasLinhas: string[] = []
  for (const cat of CONTEXTO_CATEGORIES) {
    const respostas = getRespostas(ctx, cat.id)
    if (respostas.length === 0) continue
    icpRespostasLinhas.push(`  ▸ ${cat.name} (${respostas.length}/${cat.total}):`)
    for (const r of respostas.slice(0, 5)) {
      icpRespostasLinhas.push(`     - ${r.pergunta} → ${r.resposta}`)
    }
  }

  const sectionICP = icpPct > 0
    ? [
        `  Nível: ${icpLevel.name} (${icpPct}%) — ${icpLevel.desc}`,
        ...icpRespostasLinhas,
      ].join('\n')
    : '  (nenhuma resposta no Contexto Pessoal ainda — sugira gentilmente que o usuário responda algumas perguntas pra você conhecê-lo melhor)'

  const sectionPatrimonio = patrLiq !== 0 || totAt !== 0 || totPa !== 0
    ? [
        `  Patrimônio Líquido: ${currencyBRL(patrLiq)}`,
        `  Ativos financeiros: ${currencyBRL(totAt)}`,
        `  Equipamentos: ${currencyBRL(totEq)}`,
        `  Veículos: ${currencyBRL(totVe)}`,
        `  Imóveis: ${currencyBRL(totIm)} (equity líquida ${currencyBRL(equityIm)})`,
        `  Passivos: ${currencyBRL(totPa)}`,
      ].join('\n')
    : '  (patrimônio ainda não cadastrado)'

  const sectionOnb = onb?.completed
    ? `  Onboarding concluído. Nome preferido: ${profile.name || (onb.answers?.nome as string | undefined) || '(não informado)'}.`
    : `  Onboarding em andamento — pendente. Quando relevante, lembre o usuário de completá-lo em /onboarding pra você conhecê-lo melhor.`

  // Hint por tela
  const screenHint: Record<string, string> = {
    '/': 'O usuário está no Dashboard. Foque em panorama geral e próximas ações.',
    '/lancamentos': 'O usuário está olhando lançamentos. Ajude a conciliar/categorizar quando solicitado.',
    '/metas': 'O usuário está nas metas. Ajude a definir prioridades e velocidade de aporte.',
    '/familia': 'O usuário está no Painel da Família. Foque em equilíbrio entre membros.',
    '/simulador': 'O usuário está no Simulador. Ajude a interpretar resultados e ajustar premissas.',
    '/compromissos': 'O usuário está em Compromissos. Foque em recorrentes vs dívidas.',
    '/financiamentos': 'O usuário está em Financiamentos. Considere antecipações, CET e comparação SAC/Price.',
    '/patrimonio': 'O usuário está em Patrimônio. Foque em alocação e patrimônio líquido.',
  }
  const hint = opts.screen ? screenHint[opts.screen] : undefined

  // ─── Montagem final ──────────────────────────────────────────
  return [
    personality.prompt,
    ``,
    `Você é o Haile — uma inteligência financeira para famílias modernas.`,
    `Foco em escolha consciente e conquista, NUNCA em culpa. Responda em pt-BR, conciso, com bullets quando útil.`,
    `Você está no app autenticado com os dados financeiros REAIS abaixo. NUNCA invente números — use só o que está aqui.`,
    `Quando o usuário pedir uma ação envolvendo CRIAR/EDITAR/EXCLUIR lançamentos, use as ferramentas que tem (despesa/receita CRUD + bulk + query). Pra outras ações ainda sem tool, oriente a usar a UI.`,
    hint ? `\nContexto da tela: ${hint}` : '',
    ``,
    `═════════════════════════════════════════════════`,
    `CONTEXTO FINANCEIRO — ${MESES_PT[month - 1]}/${year}`,
    `═════════════════════════════════════════════════`,
    ``,
    `Perfil:`,
    sectionOnb,
    ``,
    `KPIs do mês:`,
    `  Receitas: ${currencyBRL(rec)}`,
    `  Despesas: ${currencyBRL(desp)}`,
    `  Saldo: ${currencyBRL(saldo)}`,
    `  Poder de Escolha (livre): ${currencyBRL(pde.poderDeEscolha)} (${fmtPct(pde.pct)} da receita)`,
    `  Piso de sobrevivência (essenciais + obrigatórios + comprometidos): ${currencyBRL(pde.pisoSobrevivencia)}`,
    ``,
    `Tipos cadastrados (porte do Modelo Minewall — quanto cada categoria gasta):`,
    sectionTipos,
    ``,
    `Onde foi o dinheiro (top categorias):`,
    sectionBreakdown,
    ``,
    `Maiores despesas individuais:`,
    sectionTop,
    ``,
    `Saldo por pessoa (quem contribui com o quê):`,
    sectionPessoas,
    ``,
    `Metas ativas:`,
    sectionMetas,
    ``,
    `Contas (saldos cadastrados — total ${currencyBRL(totalContas)}):`,
    sectionContas,
    ``,
    `Compromissos ativos: ${totalCompromissos} total. Recorrentes principais:`,
    sectionRecorrentes,
    ``,
    `Próximas parcelas (30 dias):`,
    sectionProxParcelas,
    ``,
    `Financiamentos ativos (total devedor ${currencyBRL(totalDevedorFin)}):`,
    sectionFinanciamentos,
    ``,
    `Patrimônio:`,
    sectionPatrimonio,
    ``,
    `Reembolsos pendentes (total ${currencyBRL(totReemb)}):`,
    sectionReembolsos,
    ``,
    `Tributos vencendo (próximos 30 dias — total do ano ${currencyBRL(totTributosAno)}):`,
    sectionTributos,
    ``,
    `Cotações${cot?._updatedAt ? ` (atualizadas ${cot._updatedAt.slice(0, 10)})` : ''}:`,
    sectionCotacoes,
    ``,
    `Contexto Pessoal do usuário (ICP):`,
    sectionICP,
    `Diretriz: use o ICP pra adaptar tom e exemplos. Mais alto = mais personalizado, menos perguntas óbvias.`,
  ].filter((s) => s !== '').join('\n')
}
