import type { PriceDay } from '@/types';

const EODHD_BASE = 'https://eodhd.com/api/eod';

/**
 * Fetch daily BTC/USD closing prices via EODHD's end-of-day API.
 * Returns data sorted oldest-first.
 *
 * @param fromDate  ISO date string 'YYYY-MM-DD' (inclusive)
 * @param toDate    ISO date string 'YYYY-MM-DD' (inclusive), defaults to today
 */
export async function fetchBTCPrices(fromDate: string, toDate?: string): Promise<PriceDay[]> {
  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) throw new Error('EODHD_API_KEY is not set');

  const to = toDate ?? new Date().toISOString().split('T')[0];

  const url =
    `${EODHD_BASE}/BTC-USD.CC` +
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

/**
 * Thin wrapper used by the API route.
 */
export async function getPrices(fromDate: string, toDate?: string): Promise<PriceDay[]> {
  return fetchBTCPrices(fromDate, toDate);
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
