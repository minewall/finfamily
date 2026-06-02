// Tipos do blob user_data (compartilhados entre Dino e DUO).
// Modelo permissivo: o blob é solto; campos extras são tolerados via index signature.

import type { Contrato } from './contratos';
import type { Tributo } from './tributos';
import type { Recado } from './recados';
import type { CotacoesAuto } from './cotacoes';

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
  /** 'familiar' (default — entra no painel da família) | 'particular' (só do titular) */
  visibilidade?: 'familiar' | 'particular' | string;
  cartaoId?: string | null;
  /** Reembolso pendente: alguém deve devolver esse valor. Schema fiel ao Dino. */
  reembolso?: ReembolsoInfo | null;
};

export interface ReembolsoInfo {
  /** Quem PAGOU (vai receber de volta) — geralmente o "person" da despesa */
  para: string;
  /** Quem DEVE devolver (pode ser 'Família' como bucket coletivo) */
  de: string;
  /** Valor a ser reembolsado (pode ser parcial do amount total) */
  valor: number;
  status: 'pendente' | 'pago';
  criadoEm: string; // YYYY-MM-DD
  paidAt?: string;  // YYYY-MM-DD, presente só quando status='pago'
}

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
  contratos?: Contrato[];
  /** Financiamentos — tipo concreto em ./financiamentos.ts. Mantido como
   *  unknown[] aqui pra evitar ciclo de import; consumidores castam. */
  financiamentos?: unknown[];
  // Patrimônio (porta do Dino) — buckets opcionais; tipos canônicos em
  // ./patrimonio.ts. Mantemos referência mole aqui pra evitar ciclos.
  equipamentos?: Array<Record<string, unknown> & { id: string }>;
  veiculos?: Array<Record<string, unknown> & { id: string }>;
  imoveis?: Array<Record<string, unknown> & { id: string }>;
  ativos?: Array<Record<string, unknown> & { id: string }>;
  passivos?: Array<Record<string, unknown> & { id: string }>;
  pessoas?: string[];
  tributos?: Tributo[];
  recados?: Recado[];
  cotacoes?: CotacoesAuto;
  /** Perfil do usuário no DUO (Sprint 5 — Configurações).
   *  Avatar fica inline em base64 por enquanto; Supabase Storage entra
   *  numa próxima sprint pra não estourar tamanho do blob. */
  profile?: {
    name?: string;
    avatar?: string | null;
    timezone?: string;
    [k: string]: unknown;
  };
  settings?: Record<string, unknown>;
  onboarding?: { completed?: boolean; [k: string]: unknown };
  flags?: Record<string, unknown>;
  [k: string]: unknown;
}
