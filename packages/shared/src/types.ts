// Tipos do blob user_data (compartilhados entre Dino e DUO).
// Modelo permissivo: o blob é solto; campos extras são tolerados via index signature.

import type { Contrato } from './contratos';
import type { Tributo } from './tributos';
import type { Recado } from './recados';
import type { CotacoesAuto } from './cotacoes';
import type { ContextoState } from './contexto';
import type { OnboardingState } from './onboarding';

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
  /** Categorias custom criadas pelo usuário (somam-se às built-in de CATEGORIES). */
  categoriasCustom?: Array<{ id: string; label: string; color: string; icon: string }>;
  /** Ordem custom de exibição das categorias (lista de ids, built-in + custom). */
  categoryOrder?: string[];
  /** Subcategorias por categoria. Chave = catId, valor = lista de nomes. */
  subcategorias?: Record<string, string[]>;
  /** Tipos custom (somam-se aos TIPOS_BUILTIN). Não substituem os built-in. */
  tiposCustom?: Array<{ id: string; label: string; comportamento: string; color: string }>;
  /** Override de tipo por categoria (já lido por getCatTipo). */
  catTipo?: Record<string, string>;
  onboarding?: OnboardingState;
  /** ICP / Contexto Pessoal — respostas por categoria. */
  contexto?: ContextoState;
  /** Knowledgebase pessoal da IA de conciliação — mapa descrição→categoria
   *  aprendido a partir das escolhas/correções do usuário. */
  iaKnowledge?: IaKnowledge;
  flags?: Record<string, unknown>;
  [k: string]: unknown;
}

/** Entrada do knowledgebase pessoal da IA de conciliação. */
export interface IaKnowledgeEntry {
  /** id da categoria escolhida (ex: 'alimentacao'). */
  category: string;
  /** id/nome da subcategoria (opcional). */
  sub?: string;
  /** confiança no mapeamento — 1.0 quando confirmado, decresce em correções. */
  confidence: number;
  /** quantas vezes o usuário confirmou este mapeamento. */
  count: number;
  /** ISO timestamp da última atualização. */
  updatedAt: string;
}

/** Mapa descrição-normalizada → entrada. Persistido em `UserData.iaKnowledge`. */
export type IaKnowledge = Record<string, IaKnowledgeEntry>;
