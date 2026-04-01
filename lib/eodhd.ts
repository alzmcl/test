import type { EodhdQuote } from '@/types'

const BASE = 'https://eodhd.com/api'

/**
 * Fetch a real-time quote for one symbol.
 * Symbols: crypto  → 'BTC-USD.CC'
 *          ASX     → 'VAS.AU'
 *          US      → 'AAPL.US'
 *          Cash    → skip (handled client-side)
 *
 * Note: real-time requires a paid EODHD plan.
 * On free tier you get end-of-day (still useful for position tracking).
 */
export async function getQuote(symbol: string, apiKey: string): Promise<EodhdQuote> {
  const url =
    `${BASE}/real-time/${encodeURIComponent(symbol)}` +
    `?api_token=${apiKey}&fmt=json`

  const res = await fetch(url, {
    next: { revalidate: 60 },
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`EODHD ${res.status} for ${symbol}`)
  }

  return res.json()
}

/**
 * Fetch quotes for multiple symbols in one request.
 * EODHD supports batching: first symbol in path, extras in ?s= param.
 * Returns array in same order as input (EODHD may reorder — we re-sort).
 */
export async function getQuotes(
  symbols: string[],
  apiKey: string
): Promise<EodhdQuote[]> {
  if (symbols.length === 0) return []

  const [first, ...rest] = symbols
  const qs = rest.length > 0 ? `&s=${rest.map(encodeURIComponent).join(',')}` : ''
  const url =
    `${BASE}/real-time/${encodeURIComponent(first)}` +
    `?api_token=${apiKey}&fmt=json${qs}`

  const res = await fetch(url, {
    next: { revalidate: 60 },
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`EODHD ${res.status}`)
  }

  const data = await res.json()
  // Single symbol → object; multiple → array
  return Array.isArray(data) ? data : [data]
}

/**
 * Infer the native price currency for a given EODHD symbol.
 * Crypto symbols are 'BASE-QUOTE.CC', so BTC-USD.CC → USD.
 * Exchange suffixes determine fiat currency.
 */
export function nativeCurrencyForSymbol(symbol: string): string {
  if (symbol === 'CASH') return 'AUD'

  // Crypto: extract the quote currency from 'BASE-QUOTE.CC'
  if (symbol.endsWith('.CC')) {
    const match = symbol.match(/^[^-]+-([A-Z]+)\.CC$/)
    return match?.[1] ?? 'USD'
  }

  const suffix = symbol.split('.').pop()?.toUpperCase() ?? ''

  switch (suffix) {
    case 'AU':
    case 'AX':
      return 'AUD'
    case 'L':
    case 'LSE':
      return 'GBP'
    case 'PA':
      return 'EUR'
    case 'TO':
      return 'CAD'
    case 'HK':
      return 'HKD'
    case 'T':
      return 'JPY'
    default:
      return 'USD' // US markets, etc.
  }
}

/**
 * Convert a native price to AUD.
 * Pass in the aud_usd_rate from household_settings (default 0.65).
 */
export function toAud(
  nativePrice: number,
  currency: string,
  audUsdRate: number
): number {
  switch (currency.toUpperCase()) {
    case 'AUD':
      return nativePrice
    case 'USD':
      return nativePrice / audUsdRate
    // Add more pairs as needed
    default:
      return nativePrice
  }
}

// ─── Common symbols for autocomplete ─────────────────────────────────────────

export const COMMON_SYMBOLS: {
  symbol: string
  name: string
  asset_type: string
  price_currency: string
}[] = [
  // Crypto
  { symbol: 'BTC-USD.CC',  name: 'Bitcoin',              asset_type: 'crypto', price_currency: 'USD' },
  { symbol: 'ETH-USD.CC',  name: 'Ethereum',             asset_type: 'crypto', price_currency: 'USD' },
  { symbol: 'SOL-USD.CC',  name: 'Solana',               asset_type: 'crypto', price_currency: 'USD' },
  // ASX ETFs
  { symbol: 'VAS.AU',      name: 'Vanguard Australian Shares (VAS)', asset_type: 'etf', price_currency: 'AUD' },
  { symbol: 'VGS.AU',      name: 'Vanguard Global Shares (VGS)',     asset_type: 'etf', price_currency: 'AUD' },
  { symbol: 'NDQ.AU',      name: 'BetaShares Nasdaq 100 (NDQ)',      asset_type: 'etf', price_currency: 'AUD' },
  { symbol: 'A200.AU',     name: 'BetaShares Aus 200 (A200)',        asset_type: 'etf', price_currency: 'AUD' },
  { symbol: 'IVV.AU',      name: 'iShares S&P 500 (IVV)',            asset_type: 'etf', price_currency: 'AUD' },
  { symbol: 'VDHG.AU',     name: 'Vanguard Diversified High Growth', asset_type: 'etf', price_currency: 'AUD' },
  // ASX stocks
  { symbol: 'CBA.AU',      name: 'Commonwealth Bank',    asset_type: 'stock_au', price_currency: 'AUD' },
  { symbol: 'BHP.AU',      name: 'BHP Group',            asset_type: 'stock_au', price_currency: 'AUD' },
  { symbol: 'CSL.AU',      name: 'CSL Limited',          asset_type: 'stock_au', price_currency: 'AUD' },
  // US stocks
  { symbol: 'AAPL.US',     name: 'Apple',                asset_type: 'stock_us', price_currency: 'USD' },
  { symbol: 'MSFT.US',     name: 'Microsoft',            asset_type: 'stock_us', price_currency: 'USD' },
  { symbol: 'NVDA.US',     name: 'NVIDIA',               asset_type: 'stock_us', price_currency: 'USD' },
  // Cash
  { symbol: 'CASH',        name: 'Cash (AUD)',           asset_type: 'cash',  price_currency: 'AUD' },
]
