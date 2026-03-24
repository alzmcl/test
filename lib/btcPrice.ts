import type { PriceDay } from '@/types';

const EODHD_BASE = 'https://eodhd.com/api/eod';

/**
 * Fetch daily BTC/USD closing prices via EODHD's end-of-day API.
 * Returns data sorted oldest-first.
 *
 * @param days  How many days back to fetch (default 180 = ~6 months)
 */
export async function fetchBTCPrices(days = 180): Promise<PriceDay[]> {
  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) throw new Error('EODHD_API_KEY is not set');

  const to = new Date();
  const from = new Date(Date.now() - days * 86_400_000);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const url =
    `${EODHD_BASE}/BTC-USD.CC` +
    `?api_token=${apiKey}&fmt=json&from=${fmt(from)}&to=${fmt(to)}`;

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
