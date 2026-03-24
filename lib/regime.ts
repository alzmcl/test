/**
 * Regime detection
 * ────────────────
 * Classifies each day as 'trending' or 'choppy' using MA slope:
 *
 *   1. Compute a simple moving average of `maPeriod` days.
 *   2. Measure how much the MA has moved over the last `maPeriod` days
 *      as a fraction of the earlier MA value.
 *   3. If |slope| >= slopeThreshold → 'trending' (strong directional move).
 *      Otherwise → 'choppy' (ranging / mean-reverting).
 *
 * No OHLCV needed. No double-smoothing lag. Threshold is in plain % terms
 * (e.g. 0.05 = MA must have moved 5% over the lookback window).
 */

import type { PriceDay, Regime, RegimeDay } from '@/types';

// ─── Config ────────────────────────────────────────────────────────────

const MA_PERIOD = 20;
/** Fractional move of MA over maPeriod days to qualify as trending */
const SLOPE_THRESHOLD = 0.05; // 5%

// ─── Simple moving average ──────────────────────────────────────────────

function computeSMA(prices: number[], period: number): number[] {
  const result: number[] = Array(prices.length).fill(0);
  for (let i = period - 1; i < prices.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += prices[j];
    result[i] = sum / period;
  }
  return result;
}

// ─── Public API ─────────────────────────────────────────────────────────

export function detectRegimes(
  prices: PriceDay[],
  maPeriod = MA_PERIOD,
  slopeThresholdPct = SLOPE_THRESHOLD * 100 // passed in as whole number, e.g. 25 → reuse old param
): RegimeDay[] {
  const closes = prices.map((p) => p.price);
  const ma = computeSMA(closes, maPeriod);
  // Normalise: callers pass adxThreshold as a whole number (e.g. 25).
  // We interpret it as a % slope threshold (5 → 5% move over maPeriod days).
  const threshold = slopeThresholdPct / 100;

  return prices.map((p, i) => {
    let regime: Regime = 'unknown';
    if (i >= maPeriod * 2) {
      const maNow = ma[i];
      const maThen = ma[i - maPeriod];
      const slope = maThen === 0 ? 0 : (maNow - maThen) / maThen;
      const isTrending = Math.abs(slope) >= threshold;
      regime = isTrending ? 'trending' : 'choppy';
    }
    return {
      ...p,
      regime,
      adxProxy: Math.round(Math.abs(
        ma[i] && ma[i - maPeriod]
          ? ((ma[i] - ma[i - maPeriod]) / ma[i - maPeriod]) * 100
          : 0
      ) * 10) / 10,
      volatility: 0,
    };
  });
}
