// Tributário — porta do Store do Dino (getTributos / addTributo / etc.).
// Schema fiel: { id, tipo, label, valor, parcelas, pagas, vencimentoMes, vencimentoDia, ano, pessoa, anexo?, createdAt }
// Mais campos IRPF-only opcionais (status, aReceber, aPagar, totalParcelas, dataEntrega) e ipva-only (placa).
//
// Helpers PUROS — qualquer mutação fica no store da UI.

export type TributoTipo = 'irpf' | 'iptu' | 'ipva' | 'outros';

export type IRPFStatus = 'rascunho' | 'declarada' | 'pendente';

export interface Tributo {
  id: string;
  tipo: TributoTipo;
  label: string;
  valor: number;
  parcelas: number;
  pagas: number;
  vencimentoMes: number; // 1..12 — mês da 1ª parcela
  vencimentoDia: number; // 1..31
  ano: number;
  pessoa?: string | null;
  anexo?: string | null;
  createdAt?: string;
  // IRPF-only
  status?: IRPFStatus | string;
  aReceber?: number;
  aPagar?: number;
  totalParcelas?: number;
  dataEntrega?: string;
  // IPVA-only
  placa?: string;
  [k: string]: unknown;
}

export interface ProximoVencimentoTributo {
  tributo: Tributo;
  /** Número sequencial da parcela (1..N) */
  parcelaNum: number;
  /** YYYY-MM-DD do vencimento */
  date: string;
  /** Valor da parcela (valor / parcelas) */
  valor: number;
}

function pad2(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getTributos(data: { tributos?: Tributo[] }): Tributo[] {
  return (data.tributos ?? []) as Tributo[];
}

export function getTributosByTipo(
  data: { tributos?: Tributo[] },
  tipo: TributoTipo,
): Tributo[] {
  return getTributos(data).filter((t) => t.tipo === tipo);
}

/**
 * Soma do "valor anual" planejado: IPTU+IPVA+Outros somam valor cheio; IRPF entra como
 * (aPagar - aReceber) — quando líquido é negativo significa restituição.
 */
export function totalTributosAno(
  data: { tributos?: Tributo[] },
  ano: number,
): number {
  const lista = getTributos(data).filter((t) => (t.ano ?? ano) === ano);
  const irpf = lista.find((t) => t.tipo === 'irpf');
  const outros = lista.filter((t) => t.tipo !== 'irpf');
  const totOutros = outros.reduce((s, t) => s + (t.valor || 0), 0);
  const irpfNet = irpf ? ((irpf.aReceber || 0) - (irpf.aPagar || 0)) : 0;
  // Convenção do Dino: total = outros - irpfNet (restituição abate, a pagar soma).
  return totOutros - irpfNet;
}

/**
 * Lista parcelas vencendo dentro de `days` dias a partir de `refDate` (YYYY-MM-DD),
 * ordenado por data. Inclui parcelas vencidas pendentes (date < ref) que ainda estão
 * dentro da janela — útil pra alertas.
 *
 * Lógica: cada tributo gera 1 parcela por mês sequencial a partir de vencimentoMes
 * no ano do tributo, total de `parcelas`. Para IRPF, a 1ª cai em Maio do ano da
 * declaração (mesmo que vencimentoMes não esteja setado).
 */
export function getTributosVencendoEm(
  data: { tributos?: Tributo[] },
  refDate: string = todayISO(),
  days: number = 30,
): ProximoVencimentoTributo[] {
  const lista = getTributos(data);
  const ref = new Date(refDate + 'T00:00:00');
  const limit = new Date(ref);
  limit.setDate(limit.getDate() + days);
  const limitISO = limit.toISOString().slice(0, 10);

  const out: ProximoVencimentoTributo[] = [];
  for (const t of lista) {
    const parcelas = Math.max(1, t.parcelas || 1);
    const vencMesBase = t.tipo === 'irpf' ? 5 : (t.vencimentoMes || 1); // IRPF default Maio
    const vencDia = Math.max(1, Math.min(31, t.vencimentoDia || 10));
    const valorParc = (t.valor || 0) / parcelas;
    const pagas = Math.max(0, t.pagas || 0);
    for (let p = 0; p < parcelas; p++) {
      if (p < pagas) continue; // já pagas não geram alerta
      const monthsOffset = p;
      const mesAbs = vencMesBase - 1 + monthsOffset;
      const ano = (t.ano || ref.getFullYear()) + Math.floor(mesAbs / 12);
      const mes = ((mesAbs % 12) + 12) % 12;
      // Ajuste último dia válido do mês
      const lastDay = new Date(ano, mes + 1, 0).getDate();
      const dia = Math.min(vencDia, lastDay);
      const date = `${ano}-${pad2(mes + 1)}-${pad2(dia)}`;
      if (date <= limitISO) {
        out.push({
          tributo: t,
          parcelaNum: p + 1,
          date,
          valor: valorParc,
        });
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
