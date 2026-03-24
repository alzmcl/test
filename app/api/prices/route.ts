/**
 * GET /api/prices?days=180
 *
 * Returns daily BTC/USD closing prices for the last `days` days.
 * Response is cached at the Edge for 1 hour.
 *
 * Shape: { prices: PriceDay[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrices } from '@/lib/btcPrice';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const today = new Date().toISOString().split('T')[0];
  const from = searchParams.get('from') ?? new Date(Date.now() - 180 * 86_400_000).toISOString().split('T')[0];
  const to = searchParams.get('to') ?? today;

  try {
    const prices = await getPrices(from, to);
    return NextResponse.json(
      { prices },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
