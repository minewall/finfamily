// Fetch das cotações automáticas (USD/EUR via AwesomeAPI; BTC via CoinGecko).
// As duas APIs são públicas e historicamente CORS-OK. Se algum dia falharem
// por CORS, registrar como pendência e considerar proxy.
//
// Retorna o objeto `Cotacoes` parseado, ou null se ambas as chamadas falharam.

import {
  parseCotacoes,
  type CotacaoSymbol,
  type CotacoesAuto,
  type AwesomeApiResponse,
  type CoinGeckoResponse,
} from '@haile/shared'

const FIAT_URL = 'https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,USDT-BRL'
const CRIPTO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl'

async function safeFetchJson<T>(url: string, timeoutMs = 8000): Promise<T | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchCotacoes(): Promise<CotacoesAuto | null> {
  const [fiat, cripto] = await Promise.all([
    safeFetchJson<AwesomeApiResponse>(FIAT_URL),
    safeFetchJson<CoinGeckoResponse>(CRIPTO_URL),
  ])
  if (!fiat && !cripto) return null
  const parsed = parseCotacoes(fiat, cripto)
  return Object.keys(parsed).length > 0 ? parsed : null
}

/**
 * Fetch só de UMA moeda. Útil pro refresh granular na tela de Configurações.
 * Para USD/EUR/USDT chama AwesomeAPI; pra BTC chama CoinGecko.
 */
export async function fetchCotacaoUnica(symbol: CotacaoSymbol): Promise<CotacoesAuto | null> {
  if (symbol === 'BTC') {
    const cripto = await safeFetchJson<CoinGeckoResponse>(CRIPTO_URL)
    if (!cripto) return null
    const parsed = parseCotacoes(null, cripto)
    return Object.keys(parsed).length > 0 ? parsed : null
  }
  const url = `https://economia.awesomeapi.com.br/last/${symbol}-BRL`
  const fiat = await safeFetchJson<AwesomeApiResponse>(url)
  if (!fiat) return null
  const parsed = parseCotacoes(fiat, null)
  return Object.keys(parsed).length > 0 ? parsed : null
}
