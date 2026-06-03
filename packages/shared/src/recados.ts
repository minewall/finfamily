// Recados do Haile — notificações/insights persistentes.
//
// O Dino tinha tipos {insight, alerta, dica, meta, oportunidade, conquista}.
// No DUO simplificamos para 3 prioridades visuais (info | aviso | urgente)
// + um campo `tipo` livre (string) pra agrupamento futuro.
//
// `gerarRecadosAutomaticos` (final do arquivo) implementa o motor de
// triggers determinísticos — roda no boot da página Recados e produz
// IDs estáveis (`auto:trigger:periodo`) pra ser idempotente.

import type { UserData } from './types';
import type { Contrato } from './contratos';
import type { Ativo } from './patrimonio';
import { sumReceitas, sumDespesas, saldoMes } from './finance';
import { calcPoderDeEscolhaV2 } from './tipos';
import {
  totalPatrimonioLiquido,
  ATIVO_CATEGORIAS,
} from './patrimonio';

export type RecadoPrioridade = 'info' | 'aviso' | 'urgente';

export type RecadoOrigem = 'coach' | 'sistema' | 'manual';

export interface RecadoAction {
  /** 'navigate' = pula pra outra rota; 'dismiss' = só fecha. */
  kind: 'navigate' | 'dismiss';
  /** Para 'navigate': rota destino (ex: '/despesas'). */
  to?: string;
  /** Texto do CTA. */
  label?: string;
}

export interface Recado {
  id: string;
  /** Tipo livre — ex 'insight', 'alerta', 'conquista'. Default 'info'. */
  tipo?: string;
  titulo: string;
  corpo: string;
  /** ISO timestamp. */
  criadoEm: string;
  /** ISO timestamp, presente quando o recado foi marcado como lido. */
  lidoEm?: string | null;
  prioridade: RecadoPrioridade;
  origem?: RecadoOrigem;
  action?: RecadoAction | null;
  /** Pessoa associada (opcional) — usado pra filtro por avatar. */
  pessoa?: string | null;
  [k: string]: unknown;
}

export interface RecadoFilter {
  /** true = só não-lidos */
  apenasNaoLidos?: boolean;
  prioridade?: RecadoPrioridade;
  /** Filtra por pessoa (string vazia = sem filtro). */
  pessoa?: string;
}

function newId(): string {
  return '_' + Math.random().toString(36).slice(2);
}

export function getRecados(
  data: { recados?: Recado[] },
  filter: RecadoFilter = {},
): Recado[] {
  let recs = (data.recados ?? []) as Recado[];
  if (filter.apenasNaoLidos) recs = recs.filter((r) => !r.lidoEm);
  if (filter.prioridade) recs = recs.filter((r) => r.prioridade === filter.prioridade);
  if (filter.pessoa) recs = recs.filter((r) => r.pessoa === filter.pessoa);
  // Mais recentes primeiro
  return [...recs].sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
}

export function countNaoLidos(data: { recados?: Recado[] }): number {
  return (data.recados ?? []).filter((r) => !r.lidoEm).length;
}

/** Retorna nova lista com o recado marcado como lido. Pura. */
export function marcarLido(
  data: { recados?: Recado[] },
  id: string,
): Recado[] {
  const now = new Date().toISOString();
  return (data.recados ?? []).map((r) =>
    r.id === id ? { ...r, lidoEm: r.lidoEm ?? now } : r,
  );
}

/** Utility — gera um recado de sistema (sem persistir). O store decide. */
export function gerarRecadoSistema(
  tipo: string,
  titulo: string,
  corpo: string,
  opts: Partial<Pick<Recado, 'prioridade' | 'action' | 'pessoa'>> = {},
): Recado {
  return {
    id: newId(),
    tipo,
    titulo,
    corpo,
    criadoEm: new Date().toISOString(),
    lidoEm: null,
    prioridade: opts.prioridade ?? 'info',
    origem: 'sistema',
    action: opts.action ?? null,
    pessoa: opts.pessoa ?? null,
  };
}

// ─── Motor de triggers automáticos ─────────────────────────────────
//
// `gerarRecadosAutomaticos(data)` é PURA: dado o estado, decide quais
// recados emitir. IDs são determinísticos no formato
//   auto:<trigger>:<periodo>
// onde periodo é YYYY-MM ou YYYY-MM-DD conforme a granularidade.
// Idempotência: chama-se quantas vezes quiser por dia, só devolve
// itens que ainda NÃO existem no blob.

function isoYYYYMM(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function isoYYYYMMDD(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

interface TriggerFields {
  tipo: string;
  titulo: string;
  corpo: string;
  prioridade: RecadoPrioridade;
  action?: RecadoAction | null;
  pessoa?: string | null;
}

function buildRecado(
  triggerId: string,
  periodo: string,
  fields: TriggerFields,
): Recado {
  return {
    id: `auto:${triggerId}:${periodo}`,
    criadoEm: new Date().toISOString(),
    lidoEm: null,
    origem: 'sistema',
    tipo: fields.tipo,
    titulo: fields.titulo,
    corpo: fields.corpo,
    prioridade: fields.prioridade,
    action: fields.action ?? null,
    pessoa: fields.pessoa ?? null,
  };
}

interface CicloMes { month: number; year: number }

function ciclosAnteriores(ref: Date, n: number): CicloMes[] {
  // retorna os N meses ANTES do mês de `ref`, do mais recente pro mais antigo
  const out: CicloMes[] = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - i, 1));
    out.push({ month: d.getUTCMonth() + 1, year: d.getUTCFullYear() });
  }
  return out;
}

/** Formata BRL sem dependência de Intl.NumberFormat local (mantém determinismo). */
function fmtBRL(v: number): string {
  const fixed = Math.abs(v).toFixed(2);
  const [intPart, dec] = fixed.split('.');
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${withSep},${dec}`;
}

/** True quando o ativo deve ser tratado como investimento (renda fixa/variável/cripto/etc). */
function ativoEhInvestimento(a: Ativo): boolean {
  // Heurística: tudo que cai em uma das categorias de patrimônio (ATIVO_CATEGORIAS)
  // conta como investimento. Reservas (CDB, Tesouro etc.) e cripto/FIAT também.
  const catIds = new Set(ATIVO_CATEGORIAS.map((c) => c.id));
  if (a.categoria && catIds.has(a.categoria)) return true;
  if (a.kind === 'reserva' || a.kind === 'cripto' || a.kind === 'fiat') return true;
  // Schemas reserva (Dino) e crypto/FIAT — qualquer ativo registrado é investimento.
  if (a.valorInvestido != null || a.valorAtual != null) return true;
  if (a.qty != null && a.unitPrice != null) return true;
  return false;
}

/**
 * Avalia triggers sobre `data` e devolve recados novos (que ainda não
 * existem em data.recados). Todos os triggers são determinísticos.
 *
 * Triggers:
 *  - saldo_baixo (mensal): Poder de Escolha < 10% da receita média (3m).
 *  - subuso_tipo (mensal): nenhum lançamento em algum tipo nos últimos 30d
 *    e o tipo tem orçamento (limite_desp ativo) configurado.
 *  - meta_curta (mensal): meta com prazo < 90d e progresso < 50%.
 *  - compromisso_vencendo (diário): parcela pendente nos próximos 3 dias.
 *  - sequencia_positiva (mensal): 3 meses seguidos com sobra positiva.
 *  - despesa_subiu (mensal): categoria com aumento >20% vs mediana 3 ciclos.
 *  - big_expense (mensal): despesa única > 30% da média mensal de despesas (3 ciclos).
 *  - new_investment (idempotente por ativo): primeiro ativo de investimento registrado.
 *  - patrimonio_swing (mensal): variação > ±10% do patrimônio líquido.
 *  - recurring_missing (mensal): compromisso recorrente sumiu este mês.
 */
export function gerarRecadosAutomaticos(data: UserData | null | undefined): Recado[] {
  if (!data) return [];

  const now = new Date();
  const mes = now.getUTCMonth() + 1;
  const ano = now.getUTCFullYear();
  const periodoMes = isoYYYYMM(now);
  const periodoDia = isoYYYYMMDD(now);

  const existentes = new Set((data.recados ?? []).map((r) => r.id));
  const novos: Recado[] = [];

  const push = (r: Recado) => {
    if (!existentes.has(r.id)) novos.push(r);
  };

  // ── 1) Saldo baixo ───────────────────────────────────────────────
  // Receita média dos últimos 3 meses (inclui mês atual) — base mais
  // estável que só o mês corrente, evita falso positivo em começo de mês.
  const ciclos3 = [{ month: mes, year: ano }, ...ciclosAnteriores(now, 2)];
  const recMed = ciclos3.reduce((s, c) => s + sumReceitas(data, c.month, c.year), 0) / 3;
  if (recMed > 0) {
    const pde = calcPoderDeEscolhaV2(data, mes, ano);
    const pct = recMed > 0 ? pde.poderDeEscolha / recMed : 0;
    if (pct < 0.10) {
      push(buildRecado('saldo_baixo', periodoMes, {
        tipo: 'alerta',
        titulo: 'Seu Poder de Escolha está apertado',
        corpo:
          'Neste mês, depois dos compromissos essenciais, sobra menos de 10% da sua renda média. ' +
          'Bora dar uma olhada nas despesas variáveis pra recuperar fôlego — eu te ajudo a priorizar.',
        prioridade: 'urgente',
        action: { kind: 'navigate', to: '/despesas', label: 'Revisar despesas' },
      }));
    }
  }

  // ── 2) Sub-uso de tipo ───────────────────────────────────────────
  // Se existe meta de tipo `limite_desp` ativa e nenhum lançamento dessa
  // categoria nos últimos 30 dias, sinaliza pra revisar se o orçamento
  // ainda faz sentido (alívio de capa mental). Trade-off: usa `category`
  // do limite como proxy do "tipo" porque metas no Dino são por categoria.
  const limites = (data.metas ?? []).filter((m) => m.type === 'limite_desp' && m.active);
  if (limites.length > 0) {
    const cutoff = new Date(Date.UTC(ano, now.getUTCMonth(), now.getUTCDate() - 30));
    const cutoffStr = isoYYYYMMDD(cutoff);
    const despesas = data.despesas ?? [];
    for (const lim of limites) {
      const cat = (lim as Record<string, unknown>).category as string | undefined;
      if (!cat) continue;
      const recentes = despesas.filter((d) => d.category === cat && d.date >= cutoffStr);
      if (recentes.length === 0) {
        push(buildRecado(`subuso_${cat}`, periodoMes, {
          tipo: 'dica',
          titulo: `Sem movimento em ${cat} no último mês`,
          corpo:
            `Você tem um limite de gastos ativo para "${cat}", mas não registrei nada por lá nos últimos 30 dias. ` +
            'Vale checar se ainda faz sentido manter esse limite — ou se faltou registrar algo.',
          prioridade: 'aviso',
          action: { kind: 'navigate', to: '/metas', label: 'Ver metas' },
        }));
      }
    }
  }

  // ── 3) Meta perto de vencer sem progresso ────────────────────────
  // Considera metas com `deadline` (YYYY-MM-DD) <90d e progresso <50%.
  for (const meta of data.metas ?? []) {
    const m = meta as Record<string, unknown>;
    const deadline = (m.deadline as string | undefined) || (m.prazo as string | undefined);
    if (!deadline) continue;
    const dl = new Date(deadline + 'T00:00:00Z');
    if (Number.isNaN(dl.getTime())) continue;
    const diasParaFim = Math.floor((dl.getTime() - now.getTime()) / 86_400_000);
    if (diasParaFim < 0 || diasParaFim > 90) continue;
    const target = Number(meta.target) || 0;
    const current = Number(meta.current) || 0;
    if (target <= 0) continue;
    const progresso = current / target;
    if (progresso >= 0.5) continue;
    push(buildRecado(`meta_curta_${meta.id}`, periodoMes, {
      tipo: 'alerta',
      titulo: `Meta "${meta.label}" precisa de atenção`,
      corpo:
        `Faltam ${diasParaFim} dia(s) pro prazo e você está em ${Math.round(progresso * 100)}% da meta. ` +
        'Bora repensar o ritmo: posso te ajudar a redistribuir o aporte ou ajustar o prazo.',
      prioridade: 'urgente',
      action: { kind: 'navigate', to: '/metas', label: 'Abrir meta' },
    }));
  }

  // ── 4) Compromisso vencendo nos próximos 3 dias ──────────────────
  // Granularidade diária — o ID muda a cada dia pra reaparecer caso o
  // usuário tenha excluído. Janela 0..3 inclui hoje.
  const contratos = (data.contratos ?? []) as Contrato[];
  for (const c of contratos) {
    if (c.active === false) continue;
    const parcelas = c.parcelas ?? [];
    for (const p of parcelas) {
      if (p.status !== 'pendente') continue;
      const venc = new Date(p.date + 'T00:00:00Z');
      const dias = Math.floor((venc.getTime() - now.getTime()) / 86_400_000);
      if (dias < 0 || dias > 3) continue;
      const quando = dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`;
      push(buildRecado(`compromisso_${c.id}_${p.num}`, periodoDia, {
        tipo: 'alerta',
        titulo: `${c.label} vence ${quando}`,
        corpo:
          `Parcela ${p.num} de ${c.parcelasTotal} — confira se o pagamento está agendado pra evitar ` +
          'multa ou juros. Se já pagou, marca como concluído.',
        prioridade: 'urgente',
        action: { kind: 'navigate', to: '/compromissos', label: 'Ver compromisso' },
      }));
    }
  }

  // ── 5) Sequência de meses positivos ──────────────────────────────
  // Mês corrente + 2 anteriores com saldo > 0 → celebrar + sugerir investir.
  const tresUltimos = [{ month: mes, year: ano }, ...ciclosAnteriores(now, 2)];
  const todosPositivos = tresUltimos.every((c) => saldoMes(data, c.month, c.year) > 0);
  // exige pelo menos algum movimento no mês corrente pra evitar falso positivo
  const temMovimentoMes = sumReceitas(data, mes, ano) + sumDespesas(data, mes, ano) > 0;
  if (todosPositivos && temMovimentoMes) {
    push(buildRecado('sequencia_positiva', periodoMes, {
      tipo: 'conquista',
      titulo: 'Três meses seguidos no azul — parabéns',
      corpo:
        'Você fechou os últimos três ciclos com sobra. Esse é um ótimo momento pra direcionar parte ' +
        'desse excedente pra um objetivo ou investimento — bora simular juntos?',
      prioridade: 'info',
      action: { kind: 'navigate', to: '/simulador', label: 'Abrir Simulador' },
    }));
  }

  // ── 6) Despesa recorrente subiu >20% vs mediana de 3 ciclos ──────
  // Agrupa por categoria (proxy de "despesa recorrente"). Compara total
  // do mês corrente com a mediana dos 3 meses anteriores. Threshold 20%
  // foi escolhido pra evitar barulho de variações sazonais menores.
  const catTotaisAtual = new Map<string, number>();
  for (const d of data.despesas ?? []) {
    if (d.month !== mes || d.year !== ano) continue;
    if (!d.category) continue;
    catTotaisAtual.set(d.category, (catTotaisAtual.get(d.category) ?? 0) + (Number(d.amount) || 0));
  }
  const ciclos3Ant = ciclosAnteriores(now, 3);
  for (const [cat, atual] of catTotaisAtual.entries()) {
    if (atual < 50) continue; // ignora categorias muito pequenas (ruído)
    const historicos = ciclos3Ant.map((c) =>
      (data.despesas ?? [])
        .filter((d) => d.category === cat && d.month === c.month && d.year === c.year)
        .reduce((s, d) => s + (Number(d.amount) || 0), 0),
    ).filter((v) => v > 0);
    if (historicos.length < 2) continue; // exige histórico minimamente real
    const sorted = [...historicos].sort((a, b) => a - b);
    const mediana = sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    if (mediana <= 0) continue;
    const variacao = (atual - mediana) / mediana;
    if (variacao <= 0.20) continue;
    const pct = Math.round(variacao * 100);
    push(buildRecado(`subida_${cat}`, periodoMes, {
      tipo: 'insight',
      titulo: `Despesas em "${cat}" subiram ${pct}%`,
      corpo:
        `Comparando com a mediana dos últimos 3 meses, esse grupo cresceu ${pct}%. ` +
        'Vale revisar o que mudou — pode ser um único lançamento atípico ou um padrão novo se formando.',
      prioridade: 'aviso',
      action: { kind: 'navigate', to: '/despesas', label: 'Ver despesas' },
    }));
  }

  // ── 7) Despesa grande (single transaction) ───────────────────────
  // Pega despesa única do mês corrente com valor > 30% da média mensal
  // de despesas dos últimos 3 meses ANTERIORES. Threshold 30% capta
  // gastos relevantes sem soar alarme em rotina (vs. mediana, usamos
  // média simples — gasto pontual num mês inflaria mediana se incluído).
  // Key inclui despesaId — assim ela só dispara 1x por despesa.
  const despesasMes = (data.despesas ?? []).filter(
    (d) => d.month === mes && d.year === ano,
  );
  if (despesasMes.length > 0) {
    const totaisAnt = ciclos3Ant.map((c) =>
      (data.despesas ?? [])
        .filter((d) => d.month === c.month && d.year === c.year)
        .reduce((s, d) => s + (Number(d.amount) || 0), 0),
    ).filter((v) => v > 0);
    if (totaisAnt.length >= 2) {
      const mediaAnt = totaisAnt.reduce((a, b) => a + b, 0) / totaisAnt.length;
      if (mediaAnt > 0) {
        const limiar = mediaAnt * 0.30;
        for (const d of despesasMes) {
          const valor = Number(d.amount) || 0;
          if (valor <= limiar) continue;
          const cat = d.category || 'sem categoria';
          push(buildRecado(`big_expense_${d.id}`, periodoMes, {
            tipo: 'insight',
            titulo: 'Despesa acima do seu padrão',
            corpo:
              `Notei um gasto de ${fmtBRL(valor)} em "${cat}" este mês — bem acima da sua média mensal. ` +
              'Quer registrar como esperado ou é hora de revisar?',
            prioridade: 'aviso',
            action: { kind: 'navigate', to: `/lancamentos?despesaId=${d.id}`, label: 'Ver lançamento' },
          }));
        }
      }
    }
  }

  // ── 8) Novo investimento registrado ──────────────────────────────
  // Celebrativo, baixa prioridade. Key inclui ativoId — só dispara
  // 1x por ativo (sem janela de tempo). Filtra só ativos que parecem
  // investimentos reais (ver heurística `ativoEhInvestimento`).
  // Sem dependência de coachTriggers.lastInvestimentoCheckedAt — o
  // próprio set de `existentes` já garante idempotência.
  const ativosLista = (data.ativos ?? []) as Ativo[];
  for (const a of ativosLista) {
    if (!ativoEhInvestimento(a)) continue;
    const nome = (a.nome as string | undefined)
      || (a.platform as string | undefined)
      || (a.sub as string | undefined)
      || (a.tipo as string | undefined)
      || 'novo ativo';
    // Periodo fixo (sem mês) — quando aparece, aparece pra sempre como
    // marco. Usar 'all' deixa explícito que não há renovação periódica.
    push(buildRecado(`new_investment_${a.id}`, 'all', {
      tipo: 'conquista',
      titulo: 'Mais um passo em direção ao seu futuro',
      corpo:
        `Você acabou de registrar "${nome}" no seu patrimônio. ` +
        'Quer que eu te ajude a acompanhar a evolução?',
      prioridade: 'info',
      action: { kind: 'navigate', to: '/patrimonio', label: 'Abrir patrimônio' },
    }));
  }

  // ── 9) Variação significativa do patrimônio líquido (> 10% no mês) ─
  // Threshold 10% pra evitar barulho de cotação BRL/USD em qualquer dia.
  // TODO: quando existir `data.patrimonioSnapshots` (snapshots mensais),
  //   usar diretamente snapshot.anterior vs atual. Hoje fazemos uma
  //   aproximação: comparamos o patrimônio líquido atual com (atual
  //   menos saldo do mês corrente). Isso mede só o "delta gerado pelo
  //   fluxo do mês" — não captura variação por valorização/depreciação
  //   de cotações ou imóveis. É heurístico, mas evita falso silêncio.
  type WithSnapshots = UserData & {
    patrimonioSnapshots?: Array<{ periodo: string; valor: number }>;
  };
  const snapshots = (data as WithSnapshots).patrimonioSnapshots;
  const patrimAtual = totalPatrimonioLiquido(data);
  let variacaoPct: number | null = null;
  if (Array.isArray(snapshots) && snapshots.length > 0) {
    // Snapshot do mês anterior (formato YYYY-MM).
    const mesAnt = ciclosAnteriores(now, 1)[0];
    const periodoAnt = `${mesAnt.year}-${String(mesAnt.month).padStart(2, '0')}`;
    const snapAnt = snapshots.find((s) => s.periodo === periodoAnt);
    if (snapAnt && snapAnt.valor > 0) {
      variacaoPct = (patrimAtual - snapAnt.valor) / snapAnt.valor;
    }
  } else {
    // Heurística: aproximação pelo saldo do mês.
    const saldo = saldoMes(data, mes, ano);
    const patrimAnterior = patrimAtual - saldo;
    if (patrimAnterior > 1000) {
      // Limiar 1k pra evitar divisão por valores irrisórios em estados
      // iniciais (zero/quase-zero patrimônio).
      variacaoPct = (patrimAtual - patrimAnterior) / patrimAnterior;
    }
  }
  if (variacaoPct != null && Math.abs(variacaoPct) > 0.10) {
    const pct = Math.round(Math.abs(variacaoPct) * 100);
    if (variacaoPct > 0) {
      push(buildRecado('patrimonio_swing_up', periodoMes, {
        tipo: 'conquista',
        titulo: `Seu patrimônio cresceu ${pct}% este mês`,
        corpo:
          `Comparando com o mês anterior, seu patrimônio líquido subiu cerca de ${pct}%. ` +
          'Que tal aproveitar pra dar um próximo passo no seu plano?',
        prioridade: 'info',
        action: { kind: 'navigate', to: '/patrimonio', label: 'Ver patrimônio' },
      }));
    } else {
      push(buildRecado('patrimonio_swing_down', periodoMes, {
        tipo: 'alerta',
        titulo: `Patrimônio recuou ${pct}% este mês`,
        corpo:
          `Seu patrimônio líquido caiu cerca de ${pct}% no comparativo com o mês passado. ` +
          'Pode ser oscilação de mercado ou ajuste em algum ativo — bora dar uma olhada juntos?',
        prioridade: 'aviso',
        action: { kind: 'navigate', to: '/patrimonio', label: 'Investigar' },
      }));
    }
  }

  // ── 10) Recorrência sumida ───────────────────────────────────────
  // Compromisso recorrente que estava sendo pago nos últimos 2 meses e
  // este mês não tem parcela paga + a data já passou — pode ter sido
  // cancelado ou só esqueceu de marcar. Threshold: data de vencimento
  // já passou de >5 dias (margem pra delay normal de pagamento).
  for (const c of contratos) {
    if (c.active === false) continue;
    if ((c.natureza || 'recorrente') !== 'recorrente') continue;
    const parcelas = c.parcelas ?? [];
    if (parcelas.length === 0) continue;

    // Parcelas pagas dos últimos 2 meses anteriores ao corrente.
    const doisUltimos = ciclosAnteriores(now, 2);
    const teveHistorico = doisUltimos.every((cm) =>
      parcelas.some((p) => p.mes === cm.month && p.ano === cm.year && p.status === 'pago'),
    );
    if (!teveHistorico) continue;

    // Parcela do mês corrente.
    const parcelaMes = parcelas.find((p) => p.mes === mes && p.ano === ano);
    if (!parcelaMes) continue;
    if (parcelaMes.status === 'pago') continue;

    const venc = new Date(parcelaMes.date + 'T00:00:00Z');
    const diasAtraso = Math.floor((now.getTime() - venc.getTime()) / 86_400_000);
    if (diasAtraso <= 5) continue; // dá margem pro pagamento normal

    push(buildRecado(`recurring_missing_${c.id}`, periodoMes, {
      tipo: 'dica',
      titulo: `${c.label} não apareceu este mês`,
      corpo:
        `"${c.label}" costuma cair certinho e ainda não foi marcado em ${periodoMes}. ` +
        'Você cancelou ou só faltou registrar?',
      prioridade: 'aviso',
      action: { kind: 'navigate', to: '/compromissos', label: 'Abrir compromisso' },
    }));
  }

  return novos;
}
