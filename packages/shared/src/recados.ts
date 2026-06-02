// Recados do Haile — notificações/insights persistentes.
//
// O Dino tinha tipos {insight, alerta, dica, meta, oportunidade, conquista}.
// No DUO simplificamos para 3 prioridades visuais (info | aviso | urgente)
// + um campo `tipo` livre (string) pra agrupamento futuro. O motor de geração
// (Coach/triggers) é responsabilidade de outra sprint — aqui só store + UI.

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
