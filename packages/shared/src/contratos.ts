// Compromissos (Contratos recorrentes + Dívidas) — porta da lógica do Dino store.js.
//
// IMPORTANTE: o Dino gera "lançamentos virtuais" (receitas/despesas com `contratoId`)
// para cada parcela. No DUO, mantemos os PARCELAS embutidos no próprio contrato
// como um array (`parcelas: Parcela[]`), evitando o efeito cascata sobre as listas
// de lançamentos. Esse é o tradeoff escolhido para o MVP: schema mais simples,
// performance preservada, dados de pagamento (paid/valorPago) preservados entre
// regenerações. KPIs ainda derivam corretamente.

export type Periodicidade =
  | 'unico'
  | 'semanal'
  | 'quinzenal'
  | 'mensal'
  | 'bimestral'
  | 'trimestral'
  | 'semestral'
  | 'anual';

export type NaturezaCompromisso = 'recorrente' | 'divida';
export type KindCompromisso = 'despesa' | 'receita';

export interface PeriodicidadeDef {
  id: Periodicidade;
  label: string;
  stepMeses: number;
  desc: string;
}

export interface CompromissoTipoDef {
  id: string;
  label: string;
  fixoMensal: boolean;
  flexivel: boolean;
  desc: string;
}

// Fiel ao Dino (store.js linhas 152-161).
export const PERIODICIDADES: PeriodicidadeDef[] = [
  { id: 'unico',      label: 'Único',       stepMeses: 0,    desc: 'Acontece uma vez só' },
  { id: 'semanal',    label: 'Semanal',     stepMeses: 0.25, desc: 'A cada semana (~4x/mês)' },
  { id: 'quinzenal',  label: 'Quinzenal',   stepMeses: 0.5,  desc: 'A cada duas semanas (~2x/mês)' },
  { id: 'mensal',     label: 'Mensal',      stepMeses: 1,    desc: 'Todo mês' },
  { id: 'bimestral',  label: 'Bimestral',   stepMeses: 2,    desc: 'A cada dois meses' },
  { id: 'trimestral', label: 'Trimestral',  stepMeses: 3,    desc: 'A cada três meses' },
  { id: 'semestral',  label: 'Semestral',   stepMeses: 6,    desc: 'A cada seis meses' },
  { id: 'anual',      label: 'Anual',       stepMeses: 12,   desc: 'Uma vez por ano' },
];

// Fiel ao Dino (store.js linhas 571-579).
export const COMPROMISSO_TIPOS: CompromissoTipoDef[] = [
  { id: 'assinatura',        label: 'Assinatura',           fixoMensal: true,  flexivel: true,  desc: 'Serviço digital recorrente (Netflix, Spotify, ChatGPT)' },
  { id: 'aluguel',           label: 'Aluguel',              fixoMensal: true,  flexivel: false, desc: 'Imóvel residencial ou comercial' },
  { id: 'servico_pessoal',   label: 'Serviço Pessoal',      fixoMensal: true,  flexivel: true,  desc: 'Pessoa física informal (faxina, jardineiro, babá, personal)' },
  { id: 'servico_terceiros', label: 'Serviços de Terceiros',fixoMensal: true,  flexivel: false, desc: 'Empresa/PJ profissional (advogado, contador, consultoria, agência)' },
  { id: 'educacao',          label: 'Educação',             fixoMensal: true,  flexivel: false, desc: 'Mensalidade escolar, faculdade, idioma' },
  { id: 'plano',             label: 'Plano',                fixoMensal: true,  flexivel: false, desc: 'Saúde, seguro, academia (Gympass, convênio)' },
  { id: 'outros',            label: 'Outros',               fixoMensal: false, flexivel: true,  desc: 'Compromisso recorrente que não cabe nos outros tipos' },
];

export function periodicidadeStepMeses(id?: Periodicidade | string | null): number {
  const p = PERIODICIDADES.find((x) => x.id === id);
  return p ? p.stepMeses : 1; // default mensal pra retrocompatibilidade (fiel ao Dino)
}

// Status individual da parcela.
export type ParcelaStatus = 'pendente' | 'pago' | 'atrasada';

export interface Parcela {
  mes: number; // 1..12
  ano: number;
  /** Data alvo de vencimento (YYYY-MM-DD). Calculada via diaVencimento ou último dia válido. */
  date: string;
  status: ParcelaStatus;
  /** Valor efetivamente pago (pode divergir do `valorParcela` se houve ajuste). */
  valorPago?: number;
  /** Número sequencial 1..N — útil para "Parcela 3/12". */
  num: number;
}

export interface Contrato {
  id: string;
  label: string;
  kind: KindCompromisso;
  natureza: NaturezaCompromisso;
  /** Tipo qualificador. Para natureza=recorrente usa COMPROMISSO_TIPOS; para divida pode ficar vazio (Financiamentos é outra tela). */
  tipoCompromisso?: string;
  valorParcela: number;
  /** Entrada (só faz sentido para dívida). */
  entrada?: number;
  /** Total de parcelas (1..N). Para recorrente "infinito" use um número grande tipo 360 ou defina dataFim. */
  parcelasTotal: number;
  periodicidade: Periodicidade;
  /** YYYY-MM-DD. */
  dataInicio: string;
  /** YYYY-MM-DD opcional — usa o cálculo automático quando ausente. */
  dataFim?: string;
  diaVencimento?: number; // 1..31
  category?: string;
  sub?: string | null;
  pay?: string | null;
  contaId?: string | null;
  responsavel?: string; // pessoa
  notas?: string;
  active?: boolean;
  createdAt?: string;
  /** Estado serializado das parcelas (mantém paid/atrasada entre regenerações). */
  parcelas?: Parcela[];
}

export interface ContratoPerformance {
  totalParcelas: number;
  cumpridas: number;
  parcelasRestantes: number;
  pagas: number;
  pendentes: number;
  atrasadas: number;
  valorTotal: number;
  valorCumprido: number;
  totalPago: number;
  totalPrevisto: number;
  valorRestante: number;
  pctValor: number;
  pctParcelas: number;
  impactoMensal: number;
  proxima?: Parcela | null;
}

// ── Helpers de data ──────────────────────────────────────────────

function pad2(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Soma `n` meses a uma data (lidando com fim de mês corretamente). */
function addMeses(dateISO: string, nMeses: number, diaVencimento?: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  if (!y || !m) return dateISO;
  const baseDay = diaVencimento ?? d ?? 1;
  // Cria no meio do mês para evitar overflow ao somar, depois ajusta o dia.
  const proto = new Date(y, (m - 1) + nMeses, 15, 12, 0, 0);
  const lastDay = new Date(proto.getFullYear(), proto.getMonth() + 1, 0).getDate();
  const dia = Math.min(Math.max(1, baseDay), lastDay);
  proto.setDate(dia);
  return `${proto.getFullYear()}-${pad2(proto.getMonth() + 1)}-${pad2(proto.getDate())}`;
}

// ── API pública ──────────────────────────────────────────────────

export function getCompromissos(data: { contratos?: Contrato[] }): Contrato[] {
  // Defensive: ?? só protege null/undefined; blob corrompido pode ter
  // contratos = number/string/objeto → for-of em prod crashava.
  return (Array.isArray(data.contratos) ? data.contratos : []) as Contrato[];
}

export function getCompromissosByNatureza(
  data: { contratos?: Contrato[] },
  nat: NaturezaCompromisso,
): Contrato[] {
  return getCompromissos(data).filter((c) => (c.natureza || 'recorrente') === nat);
}

/**
 * Gera (ou regenera) o array `parcelas` de um contrato.
 * Mantém status `pago` (e `valorPago`) das parcelas já existentes (case por mês/ano).
 * Marca como `atrasada` parcelas vencidas que ainda estão `pendente`.
 */
export function regenAllContratos(contrato: Contrato, refDate: string = todayISO()): Contrato {
  const stepBruto = periodicidadeStepMeses(contrato.periodicidade);
  // semanal/quinzenal são tratados como ~mensal pra geração (fiel ao Dino linhas 2511-2512)
  const stepMeses = stepBruto < 1 ? 1 : Math.round(stepBruto);
  const total = Math.max(0, Math.floor(contrato.parcelasTotal || 0));

  // Mapa de pagas já registradas (por mes-ano)
  const paidMap = new Map<string, Parcela>();
  (contrato.parcelas ?? []).forEach((p) => {
    if (p.status === 'pago') paidMap.set(`${p.ano}-${p.mes}`, p);
  });

  const parcelas: Parcela[] = [];
  for (let i = 0; i < total; i++) {
    const date = addMeses(contrato.dataInicio, i * stepMeses, contrato.diaVencimento);
    const [yStr, mStr] = date.split('-');
    const ano = Number(yStr);
    const mes = Number(mStr);
    const existente = paidMap.get(`${ano}-${mes}`);
    let status: ParcelaStatus = 'pendente';
    if (existente) status = 'pago';
    else if (date < refDate) status = 'atrasada';
    parcelas.push({
      num: i + 1,
      mes,
      ano,
      date,
      status,
      valorPago: existente?.valorPago,
    });
  }

  return { ...contrato, parcelas };
}

/**
 * Marca parcelas vencidas (date < today) que estão como `pendente` como `atrasada`.
 * Não toca em parcelas já `pago`.
 */
export function markAllPastParcelas(contrato: Contrato, refDate: string = todayISO()): Contrato {
  const parcelas = (contrato.parcelas ?? []).map((p) => {
    if (p.status === 'pago') return p;
    if (p.date < refDate) return { ...p, status: 'atrasada' as const };
    return p;
  });
  return { ...contrato, parcelas };
}

export function getContratoPerformance(
  contrato: Contrato,
  refDate: string = todayISO(),
): ContratoPerformance {
  const parcelas = contrato.parcelas ?? [];
  const totalParcelas = parcelas.length || contrato.parcelasTotal || 0;
  const pagas = parcelas.filter((p) => p.status === 'pago').length;
  const atrasadas = parcelas.filter((p) => p.status === 'atrasada').length;
  const pendentes = parcelas.filter((p) => p.status === 'pendente').length;
  const cumpridas = pagas;

  const valorParcela = contrato.valorParcela || 0;
  const entrada = contrato.entrada || 0;
  const totalPrevisto = entrada + valorParcela * totalParcelas;
  const totalPago =
    entrada +
    parcelas
      .filter((p) => p.status === 'pago')
      .reduce((s, p) => s + (p.valorPago ?? valorParcela), 0);
  const valorRestante = Math.max(0, totalPrevisto - totalPago);
  const parcelasRestantes = Math.max(0, totalParcelas - pagas);

  const pctValor = totalPrevisto > 0 ? totalPago / totalPrevisto : 0;
  const pctParcelas = totalParcelas > 0 ? pagas / totalParcelas : 0;

  const proxima = parcelas
    .filter((p) => p.status !== 'pago' && p.date >= refDate)
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;

  return {
    totalParcelas,
    cumpridas,
    parcelasRestantes,
    pagas,
    pendentes,
    atrasadas,
    valorTotal: totalPrevisto,
    valorCumprido: totalPago,
    totalPago,
    totalPrevisto,
    valorRestante,
    pctValor,
    pctParcelas,
    impactoMensal: valorParcela,
    proxima,
  };
}

export interface ProximaParcela {
  contrato: Contrato;
  parcela: Parcela;
  mes: number;
  ano: number;
  date: string;
  valor: number;
}

/**
 * Lista parcelas pendentes/atrasadas dentro de `daysAhead` dias a partir de hoje,
 * ordenadas por data crescente.
 */
export function getProximasParcelas(
  data: { contratos?: Contrato[] },
  daysAhead: number = 30,
  refDate: string = todayISO(),
): ProximaParcela[] {
  const today = new Date(refDate + 'T00:00:00');
  const limit = new Date(today);
  limit.setDate(limit.getDate() + daysAhead);
  const limitISO = limit.toISOString().slice(0, 10);

  const result: ProximaParcela[] = [];
  for (const c of getCompromissos(data)) {
    if (c.active === false) continue;
    for (const p of (c.parcelas ?? [])) {
      if (p.status === 'pago') continue;
      // inclui atrasadas (date < today) e pendentes dentro do limite
      if (p.date <= limitISO) {
        result.push({
          contrato: c,
          parcela: p,
          mes: p.mes,
          ano: p.ano,
          date: p.date,
          valor: p.valorPago ?? c.valorParcela,
        });
      }
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}
