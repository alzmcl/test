import { NextResponse } from 'next/server'

// CoinGecko free API — no key required, rate-limited to ~30 req/min
const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,aud&include_24hr_change=true'

// Cache for 60 seconds to avoid hammering the free tier
export const revalidate = 60

export async function GET() {
  try {
    const res = await fetch(COINGECKO_URL, {
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `CoinGecko responded with ${res.status}` },
        { status: 502 }
      )
    }

    const data = await res.json()
    const btc = data?.bitcoin

    if (!btc) {
      return NextResponse.json(
        { error: 'Unexpected CoinGecko response shape' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      price_usd: btc.usd,
      price_aud: btc.aud,
      change_24h_pct: btc.usd_24h_change ?? 0,
    })
  } catch (err) {
    console.error('[btc-price] fetch error', err)
    return NextResponse.json(
      { error: 'Failed to fetch BTC price' },
      { status: 500 }
    )
  }
}
