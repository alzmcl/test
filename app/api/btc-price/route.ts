import { NextResponse } from 'next/server'
import { getQuote, toAud } from '@/lib/eodhd'

export const revalidate = 60

/**
 * GET /api/btc-price
 *
 * Returns the current BTC price in both USD and AUD via EODHD.
 * Falls back to CoinGecko if EODHD_API_KEY is not set (development convenience).
 */
export async function GET() {
  const apiKey = process.env.EODHD_API_KEY
  const audUsdRate = parseFloat(process.env.DEFAULT_AUD_USD_RATE ?? '0.65')

  // ── EODHD (primary) ───────────────────────────────────────────────────────
  if (apiKey) {
    try {
      const quote = await getQuote('BTC-USD.CC', apiKey)
      const price_usd = quote.close
      const price_aud = toAud(price_usd, 'USD', audUsdRate)

      return NextResponse.json({
        price_usd,
        price_aud,
        change_24h_pct: quote.change_p ?? 0,
        source: 'eodhd',
      })
    } catch (err) {
      console.warn('[btc-price] EODHD failed, falling back to CoinGecko:', err)
    }
  }

  // ── CoinGecko fallback (no key required) ─────────────────────────────────
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,aud&include_24hr_change=true',
      { next: { revalidate: 60 }, headers: { Accept: 'application/json' } }
    )

    if (!res.ok) throw new Error(`CoinGecko ${res.status}`)

    const data = await res.json()
    const btc = data?.bitcoin

    return NextResponse.json({
      price_usd: btc.usd,
      price_aud: btc.aud,
      change_24h_pct: btc.usd_24h_change ?? 0,
      source: 'coingecko',
    })
  } catch (err) {
    console.error('[btc-price] both sources failed:', err)
    return NextResponse.json(
      { error: 'Unable to fetch BTC price' },
      { status: 502 }
    )
  }
}
