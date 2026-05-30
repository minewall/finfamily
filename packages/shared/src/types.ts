// Tipos do blob user_data (compartilhados entre Dino e DUO).
// Modelo permissivo: o blob é solto; campos extras são tolerados via index signature.

export interface Lancamento {
  id: string;
  desc: string;
  amount: number;
  date: string; // YYYY-MM-DD
  month: number;
  year: number;
  person?: string;
  category?: string;
  sub?: string | null;
  contaId?: string | null;
  [k: string]: unknown;
}

export type Receita = Lancamento & { type?: string; natureza?: string };

export type Despesa = Lancamento & {
  pay?: string | null;
  split?: Array<{ person: string; valor: number }> | null;
  visibilidade?: string;
  cartaoId?: string | null;
};

export interface Conta {
  id: string;
  nome: string;
  banco?: string;
  tipo?: string;
  categoria?: 'bancaria' | 'digital' | 'cripto' | string;
  saldo: number;
  cor?: string;
}

export interface Meta {
  id: string;
  label: string;
  type?: string;
  target?: number;
  current?: number;
  active?: boolean;
  [k: string]: unknown;
}

export interface UserData {
  receitas?: Receita[];
  despesas?: Despesa[];
  contas?: Conta[];
  metas?: Meta[];
  settings?: Record<string, unknown>;
  onboarding?: { completed?: boolean; [k: string]: unknown };
  flags?: Record<string, unknown>;
  [k: string]: unknown;
}
