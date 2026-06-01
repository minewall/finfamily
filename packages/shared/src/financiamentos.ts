// Engine de cálculo de financiamentos — porte FIEL do Store do Dino (app/js/store.js
// linhas 2259-2463). Schema e fórmulas preservados; nada de números diferentes do Dino.
//
// Convenções:
// - `taxaMensal` em **percentual ao mês** (ex.: 1.0 = 1% a.m.). NÃO confundir com fração.
// - `sistema`: 'price' (parcela fixa) ou 'sac' (parcela decrescente).
// - `prazo`: número de parcelas (meses).
// - `parcelasPagas`: quantas já foram pagas (0..prazo).
// - `valorFinanciado` (PV): saldo original financiado.

import type { UserData } from './types';

export type SistemaAmortizacao = 'sac' | 'price';

/** Tipos de financiamento/dívida com perfil esperado de taxa (anual, %). */
export interface FinanciamentoTipoInfo {
  id: string;
  label: string;
  taxaMin: number;
  taxaMax: number;
  saudavel: boolean;
  prioridade: number;
  desc: string;
}

/** Lista canônica de tipos — FIEL ao Dino (Store.FINANCIAMENTO_TIPOS). */
export const FINANCIAMENTO_TIPOS: FinanciamentoTipoInfo[] = [
  { id: 'imobiliario',     label: 'Imobiliário',         taxaMin: 8,   taxaMax: 12,   saudavel: true,  prioridade: 8, desc: 'Casa/apartamento (SFH, SBPE, PMCMV)' },
  { id: 'veiculo',         label: 'Veículo',             taxaMin: 18,  taxaMax: 30,   saudavel: false, prioridade: 5, desc: 'CDC, leasing de carro ou moto' },
  { id: 'estudantil',      label: 'Estudantil',          taxaMin: 6,   taxaMax: 15,   saudavel: true,  prioridade: 7, desc: 'FIES, P-FIES, financiamento privado' },
  { id: 'consignado',      label: 'Consignado',          taxaMin: 18,  taxaMax: 30,   saudavel: false, prioridade: 4, desc: 'Desconto direto na folha (CLT, aposentado)' },
  { id: 'pessoal',         label: 'Pessoal',             taxaMin: 30,  taxaMax: 120,  saudavel: false, prioridade: 2, desc: 'Empréstimo livre, sem garantia específica' },
  { id: 'rotativo',        label: 'Cartão Rotativo',     taxaMin: 200, taxaMax: 500,  saudavel: false, prioridade: 1, desc: 'Saldo não pago da fatura — taxa altíssima' },
  { id: 'cheque_especial', label: 'Cheque Especial',     taxaMin: 80,  taxaMax: 200,  saudavel: false, prioridade: 1, desc: 'Limite negativo da conta — taxa muito alta' },
  { id: 'familiar',        label: 'Familiar / Amigo',    taxaMin: 0,   taxaMax: 0,    saudavel: true,  prioridade: 6, desc: 'Empréstimo informal — geralmente sem juros, mas é compromisso' },
];

export interface Financiamento {
  id: string;
  label: string;                       // descrição visível
  tipo?: string;                       // id em FINANCIAMENTO_TIPOS
  type?: string;                       // categoria legada (imovel/veiculo/...)
  sistema: SistemaAmortizacao;
  valorFinanciado: number;             // PV
  taxaMensal: number;                  // % a.m. (ex.: 1.0 = 1%)
  prazo: number;                       // meses totais
  parcelasPagas?: number;              // já quitadas
  dataInicio?: string;                 // YYYY-MM-DD
  banco?: string;
  notes?: string;
  contaId?: string | null;
  person?: string;
  createdAt?: string;
  [k: string]: unknown;
}

/** Resumo computado pra UI (KPIs do card). */
export interface FinanciamentoResumo {
  pagas: number;
  restantes: number;
  totalPago: number;
  totalRestante: number;
  totalJuros: number;
  saldoAtual: number;
  parcelaAtual: number;       // valor da k-ésima (última paga); 0 se k=0
  parcelaProxima: number;     // valor da (k+1)-ésima
  parcelaInicial: number;
  parcelaFinal: number;
  cetAnual: number;           // em %
  pctPago: number;            // 0..100, baseado em capital+juros do contrato total
}

// ─────────────────────────────────────────────────────────────────
// Fórmulas — porte 1:1 do Dino. Não alterar sem migration paralela.
// ─────────────────────────────────────────────────────────────────

/** Primeira parcela. SAC: amortização + juros sobre saldo total. Price: PMT constante. */
export function financiamentoParcelaInicial(f: Financiamento): number {
  const PV = f.valorFinanciado || 0;
  const i  = (f.taxaMensal || 0) / 100;
  const n  = f.prazo || 0;
  if (!PV || !n) return 0;
  if (f.sistema === 'sac') {
    return (PV / n) + PV * i;
  }
  if (i === 0) return PV / n;
  return PV * i / (1 - Math.pow(1 + i, -n));
}

/** Valor da k-ésima parcela (1-indexed). */
export function financiamentoParcelaNa(f: Financiamento, k: number): number {
  const PV = f.valorFinanciado || 0;
  const i  = (f.taxaMensal || 0) / 100;
  const n  = f.prazo || 0;
  if (!PV || !n || k < 1 || k > n) return 0;
  if (f.sistema === 'sac') {
    const amort = PV / n;
    const saldoAnterior = PV - amort * (k - 1);
    return amort + saldoAnterior * i;
  }
  return financiamentoParcelaInicial(f);
}

/** Saldo devedor após `parcelasPagas` pagamentos. */
export function financiamentoSaldoDevedor(f: Financiamento): number {
  const PV = f.valorFinanciado || 0;
  const i  = (f.taxaMensal || 0) / 100;
  const n  = f.prazo || 0;
  const k  = Math.min(f.parcelasPagas || 0, n);
  if (!PV) return 0;
  if (k >= n) return 0;
  if (f.sistema === 'sac') {
    return PV - (PV / n) * k;
  }
  if (i === 0) return PV - (PV / n) * k;
  const PMT = financiamentoParcelaInicial(f);
  // saldo após k pagamentos = PV*(1+i)^k - PMT*((1+i)^k - 1)/i
  return PV * Math.pow(1 + i, k) - PMT * (Math.pow(1 + i, k) - 1) / i;
}

export function financiamentoTotalPago(f: Financiamento): number {
  const k = f.parcelasPagas || 0;
  if (f.sistema === 'sac') {
    let s = 0;
    for (let j = 1; j <= k; j++) s += financiamentoParcelaNa(f, j);
    return s;
  }
  return financiamentoParcelaInicial(f) * k;
}

export function financiamentoTotalRestante(f: Financiamento): number {
  const n = f.prazo || 0;
  const k = f.parcelasPagas || 0;
  if (f.sistema === 'sac') {
    let s = 0;
    for (let j = k + 1; j <= n; j++) s += financiamentoParcelaNa(f, j);
    return s;
  }
  return financiamentoParcelaInicial(f) * (n - k);
}

export function financiamentoTotalJuros(f: Financiamento): number {
  const PV = f.valorFinanciado || 0;
  const n = f.prazo || 0;
  if (f.sistema === 'sac') {
    let s = 0;
    for (let j = 1; j <= n; j++) s += financiamentoParcelaNa(f, j);
    return s - PV;
  }
  return financiamentoParcelaInicial(f) * n - PV;
}

/** CET anual aproximado: (1 + i_mensal)^12 - 1, em %. Fiel ao Dino. */
export function financiamentoCETAnual(f: Financiamento): number {
  const i = (f.taxaMensal || 0) / 100;
  return (Math.pow(1 + i, 12) - 1) * 100;
}

export type EstrategiaAntecipacao = 'prazo' | 'parcela';

export interface ResultadoAntecipacao {
  quitacao: boolean;
  mesesEconomizados: number;
  jurosEconomizados: number;
  novosMeses?: number;
  novaParcela?: number;
  reducaoParcela?: number;
}

/** Simula amortização extra única. */
export function financiamentoAntecipar(
  f: Financiamento,
  valorExtra: number,
  estrategia: EstrategiaAntecipacao = 'prazo',
): ResultadoAntecipacao {
  const i = (f.taxaMensal || 0) / 100;
  const k = f.parcelasPagas || 0;
  const n = f.prazo || 0;
  const saldoAtual = financiamentoSaldoDevedor(f);
  if (valorExtra >= saldoAtual) {
    return {
      quitacao: true,
      mesesEconomizados: n - k,
      jurosEconomizados: financiamentoTotalRestante(f) - saldoAtual,
    };
  }
  const novoSaldo = saldoAtual - valorExtra;
  const restante = n - k;
  if (estrategia === 'prazo') {
    const PMT = financiamentoParcelaInicial(f);
    if (i === 0 || PMT <= novoSaldo * i) {
      return { quitacao: false, mesesEconomizados: 0, jurosEconomizados: 0 };
    }
    const novosMeses = Math.ceil(Math.log(PMT / (PMT - novoSaldo * i)) / Math.log(1 + i));
    const jurosOriginais = financiamentoTotalRestante(f) - saldoAtual;
    const jurosNovo = PMT * novosMeses - novoSaldo;
    return {
      quitacao: false,
      mesesEconomizados: Math.max(0, restante - novosMeses),
      jurosEconomizados: Math.max(0, jurosOriginais - jurosNovo),
      novosMeses,
      novaParcela: PMT,
    };
  }
  // estrategia 'parcela': mantém prazo, recalcula parcela
  let novaParcela: number;
  if (i === 0) novaParcela = novoSaldo / restante;
  else novaParcela = novoSaldo * i / (1 - Math.pow(1 + i, -restante));
  const PMTOriginal = financiamentoParcelaInicial(f);
  const jurosOriginais = financiamentoTotalRestante(f) - saldoAtual;
  const jurosNovo = novaParcela * restante - novoSaldo;
  return {
    quitacao: false,
    mesesEconomizados: 0,
    jurosEconomizados: Math.max(0, jurosOriginais - jurosNovo),
    novosMeses: restante,
    novaParcela,
    reducaoParcela: PMTOriginal - novaParcela,
  };
}

export interface ResultadoAporteMensal {
  mesesEconomizados: number;
  jurosEconomizados: number;
  novosMeses: number;
  totalAportado: number;
  parcelaEfetiva?: number;
}

/** Aporte mensal extra fixo durante toda a vida do financiamento. */
export function financiamentoAnteciparRecorrente(
  f: Financiamento,
  aporteMensal: number,
): ResultadoAporteMensal {
  const i = (f.taxaMensal || 0) / 100;
  const n = f.prazo || 0;
  const k = f.parcelasPagas || 0;
  const restante = n - k;
  if (!aporteMensal || aporteMensal <= 0 || restante <= 0) {
    return { mesesEconomizados: 0, jurosEconomizados: 0, novosMeses: restante, totalAportado: 0 };
  }
  const PMT = financiamentoParcelaInicial(f);
  let saldo = financiamentoSaldoDevedor(f);
  let mesesGastos = 0;
  let totalPago = 0;
  let totalAportado = 0;
  const maxIter = restante * 2; // safety
  while (saldo > 0.01 && mesesGastos < maxIter) {
    const juros = saldo * i;
    const amortRegular = (f.sistema === 'sac')
      ? ((f.valorFinanciado || 0) / n)
      : Math.max(0, PMT - juros);
    const pagamentoMes = amortRegular + juros + aporteMensal;
    const pagamentoEfetivo = Math.min(pagamentoMes, saldo + juros);
    totalPago += pagamentoEfetivo;
    totalAportado += aporteMensal;
    saldo = Math.max(0, saldo + juros - pagamentoEfetivo);
    mesesGastos++;
  }
  const jurosOriginais = financiamentoTotalRestante(f) - financiamentoSaldoDevedor(f);
  const jurosNovo = totalPago - financiamentoSaldoDevedor(f);
  return {
    mesesEconomizados: Math.max(0, restante - mesesGastos),
    jurosEconomizados: Math.max(0, jurosOriginais - jurosNovo),
    novosMeses: mesesGastos,
    totalAportado,
    parcelaEfetiva: PMT + aporteMensal,
  };
}

export interface SimulacaoSistema {
  sistema: SistemaAmortizacao;
  parcelaInicial: number;
  parcelaFinal: number;
  totalPago: number;
  totalJuros: number;
}

/** Simula o mesmo contrato em outro sistema (SAC ↔ Price). */
export function financiamentoSimularSistema(
  f: Financiamento,
  sistemaAlvo: SistemaAmortizacao,
): SimulacaoSistema {
  const hipotetico: Financiamento = { ...f, sistema: sistemaAlvo, parcelasPagas: 0 };
  return {
    sistema:        sistemaAlvo,
    parcelaInicial: financiamentoParcelaInicial(hipotetico),
    parcelaFinal:   financiamentoParcelaNa(hipotetico, hipotetico.prazo || 1),
    totalPago:      financiamentoTotalPago({ ...hipotetico, parcelasPagas: hipotetico.prazo }),
    totalJuros:     financiamentoTotalJuros(hipotetico),
  };
}

export function totalFinanciamentosDevedor(data: UserData): number {
  const lista = ((data?.financiamentos as Financiamento[] | undefined) ?? []);
  return lista.reduce((s, f) => s + financiamentoSaldoDevedor(f), 0);
}

/** Agregador para a UI — calcula tudo o que o card precisa numa só chamada. */
export function getFinanciamentoResumo(f: Financiamento): FinanciamentoResumo {
  const n = f.prazo || 0;
  const k = Math.min(f.parcelasPagas || 0, n);
  const restantes = Math.max(0, n - k);
  const parcelaAtual = k > 0 ? financiamentoParcelaNa(f, k) : 0;
  const parcelaProxima = k < n ? financiamentoParcelaNa(f, k + 1) : 0;
  const parcelaInicial = financiamentoParcelaInicial(f);
  const parcelaFinal = n > 0 ? financiamentoParcelaNa(f, n) : 0;
  const totalPago = financiamentoTotalPago(f);
  const totalJuros = financiamentoTotalJuros(f);
  const totalRestante = financiamentoTotalRestante(f);
  const saldoAtual = financiamentoSaldoDevedor(f);
  const cetAnual = financiamentoCETAnual(f);
  const PV = f.valorFinanciado || 0;
  const totalContrato = PV + totalJuros;
  const pctPago = totalContrato > 0 ? (totalPago / totalContrato) * 100 : 0;
  return {
    pagas: k,
    restantes,
    totalPago,
    totalRestante,
    totalJuros,
    saldoAtual,
    parcelaAtual,
    parcelaProxima,
    parcelaInicial,
    parcelaFinal,
    cetAnual,
    pctPago,
  };
}
