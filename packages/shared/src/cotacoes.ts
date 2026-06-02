// Cotações automáticas — busca USD/EUR via AwesomeAPI e USDT/BTC via CoinGecko.
//
// Esta camada é PURA: só faz parse das respostas. O fetch fica em /web/src/lib
// (precisa de window.fetch, e queremos manter `shared` agnóstico de runtime).

export interface CotacoesAuto {
  /** USD → BRL */
  USD?: number;
  /** EUR → BRL */
  EUR?: number;
  /** USDT → BRL */
  USDT?: number;
  /** BTC → BRL */
  BTC?: number;
  /** ISO timestamp da última atualização. */
  _updatedAt?: string;
}

/** Resposta da AwesomeAPI — chaves vêm como USDBRL, EURBRL etc. */
export interface AwesomeApiResponse {
  USDBRL?: { ask?: string; bid?: string };
  EURBRL?: { ask?: string; bid?: string };
  USDTBRL?: { ask?: string; bid?: string };
  [k: string]: unknown;
}

/** Resposta CoinGecko simple/price. */
export interface CoinGeckoResponse {
  bitcoin?: { brl?: number };
  tether?: { brl?: number };
  [k: string]: unknown;
}

/**
 * Combina as duas respostas em um objeto `CotacoesAuto`. Tolera ausência (retorna
 * objeto parcial). Stamp `_updatedAt` apenas se ao menos uma cotação foi
 * encontrada — caso contrário retorna {} (sinaliza falha total).
 */
export function parseCotacoes(
  fiat: AwesomeApiResponse | null,
  cripto: CoinGeckoResponse | null,
  nowISO: string = new Date().toISOString(),
): CotacoesAuto {
  const out: CotacoesAuto = {};
  if (fiat) {
    const usd = fiat.USDBRL?.ask ? parseFloat(fiat.USDBRL.ask) : NaN;
    const eur = fiat.EURBRL?.ask ? parseFloat(fiat.EURBRL.ask) : NaN;
    if (Number.isFinite(usd) && usd > 0) out.USD = usd;
    if (Number.isFinite(eur) && eur > 0) out.EUR = eur;
    // AwesomeAPI também responde USDT — preferimos esse quando vier
    const usdt = fiat.USDTBRL?.ask ? parseFloat(fiat.USDTBRL.ask) : NaN;
    if (Number.isFinite(usdt) && usdt > 0) out.USDT = usdt;
  }
  if (cripto) {
    const btc = cripto.bitcoin?.brl;
    const tether = cripto.tether?.brl;
    if (typeof btc === 'number' && btc > 0) out.BTC = btc;
    if (typeof tether === 'number' && tether > 0 && !out.USDT) out.USDT = tether;
  }
  if (Object.keys(out).length > 0) out._updatedAt = nowISO;
  return out;
}

/** True quando `_updatedAt` é mais antigo que `maxAgeMs` (ou ausente). */
export function cotacoesExpiradas(
  c: CotacoesAuto | undefined | null,
  maxAgeMs: number,
  nowMs: number = Date.now(),
): boolean {
  if (!c?._updatedAt) return true;
  const t = new Date(c._updatedAt).getTime();
  if (!Number.isFinite(t)) return true;
  return nowMs - t > maxAgeMs;
}
