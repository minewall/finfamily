// Helpers financeiros puros — portados do Store do Dino. Compartilhados DUO↔Dino.
import type { UserData } from './types';

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
