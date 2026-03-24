import type { PriceDay } from '@/types';

const EODHD_BASE = 'https://eodhd.com/api/eod';

// Map from our asset id to EODHD ticker symbol
const EODHD_TICKER: Record<string, string> = {
  BTC:   'BTC-USD.CC',
  ETH:   'ETH-USD.CC',
  QQQ:   'QQQ.US',
  NVDA:  'NVDA.US',
  MSFT:  'MSFT.US',
  GOOGL: 'GOOGL.US',
  BOTZ:  'BOTZ.US',
};

/**
 * Fetch daily closing prices for the given asset via EODHD's end-of-day API.
 * Returns data sorted oldest-first.
 *
 * @param symbol    Asset id: 'BTC' | 'ETH' | 'QQQ'
 * @param fromDate  ISO date string 'YYYY-MM-DD' (inclusive)
 * @param toDate    ISO date string 'YYYY-MM-DD' (inclusive), defaults to today
 */
export async function fetchPrices(symbol: string, fromDate: string, toDate?: string): Promise<PriceDay[]> {
  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) throw new Error('EODHD_API_KEY is not set');

  const ticker = EODHD_TICKER[symbol] ?? EODHD_TICKER['BTC'];
  const to = toDate ?? new Date().toISOString().split('T')[0];

  const url =
    `${EODHD_BASE}/${ticker}` +
    `?api_token=${apiKey}&fmt=json&from=${fromDate}&to=${to}`;

  const res = await fetch(url, {
    // Next.js 14 fetch cache: revalidate at most once per hour
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(
      `EODHD API error ${res.status}: ${await res.text().catch(() => '')}`
    );
  }

  const json = (await res.json()) as Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    adjusted_close: number;
    volume: number;
  }>;

  return json
    .map((row) => ({
      date: new Date(row.date).getTime(),
      price: Math.round(row.adjusted_close),
    }))
    .sort((a, b) => a.date - b.date);
}

/** @deprecated use fetchPrices('BTC', ...) */
export async function fetchBTCPrices(fromDate: string, toDate?: string): Promise<PriceDay[]> {
  return fetchPrices('BTC', fromDate, toDate);
}

/**
 * Thin wrapper used by the API route.
 */
export async function getPrices(symbol: string, fromDate: string, toDate?: string): Promise<PriceDay[]> {
  return fetchPrices(symbol, fromDate, toDate);
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
