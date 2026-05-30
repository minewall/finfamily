// Helpers financeiros puros — portados do Store do Dino. Compartilhados DUO↔Dino.
import type { UserData, Despesa, Receita } from './types';

export function sumReceitas(data: UserData, month: number, year: number): number {
  return (data.receitas ?? [])
    .filter((r) => r.month === month && r.year === year)
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
}

export function sumDespesas(data: UserData, month: number, year: number): number {
  return (data.despesas ?? [])
    .filter((d) => d.month === month && d.year === year)
    .reduce((s, d) => s + (Number(d.amount) || 0), 0);
}

export function saldoMes(data: UserData, month: number, year: number): number {
  return sumReceitas(data, month, year) - sumDespesas(data, month, year);
}

export function currencyBRL(v: number): string {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Lançamento unificado (despesa OU receita) com sinal — pra listas/extratos.
// `kind` preserva a origem; `amountSigned` = positivo p/ receita, negativo p/ despesa.
export interface UnifiedLancamento {
  id: string;
  kind: 'receita' | 'despesa';
  date: string;
  desc: string;
  amount: number;
  amountSigned: number;
  person?: string;
  category?: string;
  sub?: string | null;
  contaId?: string | null;
}

function toUnified(d: Despesa | Receita, kind: 'receita' | 'despesa'): UnifiedLancamento {
  const amount = Math.abs(Number(d.amount) || 0);
  return {
    id: d.id,
    kind,
    date: d.date,
    desc: d.desc ?? '',
    amount,
    amountSigned: kind === 'receita' ? amount : -amount,
    person: d.person,
    category: d.category,
    sub: (d as Despesa).sub ?? null,
    contaId: d.contaId ?? null,
  };
}

// Junta receitas + despesas (com sinal) e ordena por data DESC.
// Opcional: filtra por month/year.
export function getLancamentos(
  data: UserData,
  opts?: { month?: number; year?: number },
): UnifiedLancamento[] {
  const { month, year } = opts ?? {};
  const inFilter = (x: { month?: number; year?: number }) =>
    (year == null || x.year === year) && (month == null || x.month === month);
  const recs = (data.receitas ?? []).filter(inFilter).map((r) => toUnified(r, 'receita'));
  const desp = (data.despesas ?? []).filter(inFilter).map((d) => toUnified(d, 'despesa'));
  return [...recs, ...desp].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

// Cor estável por nome de pessoa (paleta da marca).
const PERSON_COLORS = ['#6b5ef5', '#2dcfc0', '#ff70b8', '#ffa930', '#4aa8ff', '#1dc97e'];
export function personColor(name?: string | null): string {
  if (!name) return '#454b6d';
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PERSON_COLORS[h % PERSON_COLORS.length];
}

export function personInitial(name?: string | null): string {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase() || '?';
}
