import { type NextRequest, NextResponse } from 'next/server'
import { getQuotes, nativeCurrencyForSymbol } from '@/lib/eodhd'

export const revalidate = 60

/**
 * GET /api/asset-price?symbols=BTC-USD.CC,VAS.AU,AAPL.US
 *
 * Returns EODHD real-time quotes for each requested symbol.
 * Cash (symbol === 'CASH') is handled client-side and should not be sent here.
 *
 * Response:
 * {
 *   quotes: [
 *     { symbol, price, previousClose, change, change_p, currency, timestamp },
 *     ...
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('symbols') ?? ''
  const symbols = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== 'CASH')

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: [] })
  }

  const apiKey = process.env.EODHD_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'EODHD_API_KEY is not configured on the server' },
      { status: 503 }
    )
  }

  try {
    const raw = await getQuotes(symbols, apiKey)

    const quotes = raw.map((q) => ({
      symbol: q.code,
      price: q.close,
      previousClose: q.previousClose,
      change: q.change,
      change_p: q.change_p,
      currency: nativeCurrencyForSymbol(q.code),
      timestamp: q.timestamp,
    }))

    return NextResponse.json({ quotes })
  } catch (err) {
    console.error('[asset-price]', err)
    return NextResponse.json(
      { error: 'Failed to fetch prices from EODHD' },
      { status: 502 }
    )
  }
}
