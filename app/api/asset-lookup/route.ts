import { type NextRequest, NextResponse } from 'next/server'
import { getQuote, nativeCurrencyForSymbol } from '@/lib/eodhd'

/**
 * GET /api/asset-lookup?symbol=IOO.AU
 *
 * Returns price + name for a single symbol.
 * Uses EODHD real-time for price and EODHD search for the name.
 */
export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')?.trim()
  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 })
  }

  const apiKey = process.env.EODHD_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'EODHD_API_KEY is not configured' },
      { status: 503 }
    )
  }

  try {
    // Fetch price and name in parallel
    const [quoteRes, searchRes] = await Promise.allSettled([
      getQuote(symbol, apiKey),
      fetch(
        `https://eodhd.com/api/search/${encodeURIComponent(symbol)}?api_token=${apiKey}&limit=1&fmt=json`,
        { next: { revalidate: 3600 } }
      ).then((r) => r.json()),
    ])

    const quote = quoteRes.status === 'fulfilled' ? quoteRes.value : null
    const searchResults = searchRes.status === 'fulfilled' ? searchRes.value : []
    const searchHit = Array.isArray(searchResults) ? searchResults[0] : null

    return NextResponse.json({
      symbol,
      price: quote?.close ?? null,
      name: searchHit?.Name ?? null,
      currency: nativeCurrencyForSymbol(symbol),
    })
  } catch (err) {
    console.error('[asset-lookup]', err)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 502 })
  }
}
