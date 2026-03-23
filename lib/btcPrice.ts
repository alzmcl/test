import type { PriceDay } from '@/types';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

/**
 * Fetch daily BTC/USD closing prices via CoinGecko's free /market_chart/range
 * endpoint.  Returns data sorted oldest-first.
 *
 * @param days  How many days back to fetch (default 180 = ~6 months)
 */
export async function fetchBTCPrices(days = 180): Promise<PriceDay[]> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 86_400;

  // Optionally inject a CoinGecko Pro key for higher rate limits
  const apiKey = process.env.COINGECKO_API_KEY;
  const headers: HeadersInit = apiKey
    ? { 'x-cg-pro-api-key': apiKey }
    : {};

  const url =
    `${COINGECKO_BASE}/coins/bitcoin/market_chart/range` +
    `?vs_currency=usd&from=${from}&to=${to}`;

  const res = await fetch(url, {
    headers,
    // Next.js 14 fetch cache: revalidate at most once per hour
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(
      `CoinGecko API error ${res.status}: ${await res.text().catch(() => '')}`
    );
  }

  const json = (await res.json()) as { prices: [number, number][] };

  return json.prices
    .map(([ts, price]) => ({
      date: ts,
      price: Math.round(price),
    }))
    .sort((a, b) => a.date - b.date);
}

/**
 * Thin wrapper used by the API route — tries Supabase cache first,
 * then falls back to CoinGecko if data is stale / missing.
 *
 * For the scaffold this just calls CoinGecko directly.  Wire up Supabase
 * persistence in the next phase.
 */
export async function getPrices(days = 180): Promise<PriceDay[]> {
  return fetchBTCPrices(days);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

export function formatPrice(p: number): string {
  return '$' + Math.round(p).toLocaleString();
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

export function formatDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  });
}
