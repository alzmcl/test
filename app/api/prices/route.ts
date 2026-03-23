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
  const days = Math.min(
    Math.max(parseInt(searchParams.get('days') ?? '180', 10), 30),
    365
  );

  try {
    const prices = await getPrices(days);
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
