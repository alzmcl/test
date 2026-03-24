/**
 * Regime detection
 * ────────────────
 * Classifies each day as 'trending' or 'choppy' using two signals:
 *
 *  1. ADX proxy   — measures directional movement strength via smoothed DM+/DM-.
 *                   ADX-proxy >= adxThreshold  ⇒ trending
 *
 *  2. Volatility  — 14-day rolling std-dev of daily log-returns, annualised.
 *                   High vol alone doesn’t mean trending, so it’s used as a
 *                   secondary filter: if vol is very low the market may be
 *                   ranging even if ADX ticks up.
 *
 * Both signals must agree (ADX high AND vol above floor) to label 'trending'.
 */

import type { PriceDay, Regime, RegimeDay } from '@/types';

// ─── Config ────────────────────────────────────────────────────────────

const ADX_PERIOD = 14;
/** ADX-proxy threshold above which we consider the market trending */
const ADX_TRENDING_THRESHOLD = 25;
/** Minimum annualised volatility to permit 'trending' label (filters dead range) */
const MIN_VOL_FLOOR = 0.30; // 30% pa

// ─── Maths helpers ───────────────────────────────────────────────────

function smma(values: number[], period: number): number[] {
  /** Smoothed moving average (Wilder’s) */
  const result: number[] = Array(values.length).fill(0);
  if (values.length < period) return result;

  // Seed with simple average
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  result[period - 1] = sum / period;

  for (let i = period; i < values.length; i++) {
    result[i] = (result[i - 1] * (period - 1) + values[i]) / period;
  }
  return result;
}

function stddev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((acc, v) => acc + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

// ─── ADX proxy (price-only, no OHLCV) ──────────────────────────────────

/**
 * Without OHLCV we approximate DM+ / DM- from consecutive close prices:
 *   DM+ = max(close[i] - close[i-1], 0)
 *   DM- = max(close[i-1] - close[i], 0)
 * Then ADX-proxy = SMMA(|DM+ - DM-| / (DM+ + DM-)) * 100
 */
function computeAdxProxy(prices: number[], period: number): number[] {
  const n = prices.length;
  const dmPlus: number[] = Array(n).fill(0);
  const dmMinus: number[] = Array(n).fill(0);

  for (let i = 1; i < n; i++) {
    const diff = prices[i] - prices[i - 1];
    dmPlus[i] = Math.max(diff, 0);
    dmMinus[i] = Math.max(-diff, 0);
  }

  const smDmPlus = smma(dmPlus, period);
  const smDmMinus = smma(dmMinus, period);

  const dx: number[] = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const total = smDmPlus[i] + smDmMinus[i];
    dx[i] = total === 0 ? 0 : (Math.abs(smDmPlus[i] - smDmMinus[i]) / total) * 100;
  }

  return smma(dx, period);
}

// ─── Rolling volatility ─────────────────────────────────────────────────

function computeRollingVol(prices: number[], period: number): number[] {
  const n = prices.length;
  const result: number[] = Array(n).fill(0);

  for (let i = period; i < n; i++) {
    const window = prices.slice(i - period, i + 1);
    const logReturns = window
      .slice(1)
      .map((p, j) => Math.log(p / window[j]));
    // Annualise: daily std * sqrt(365)
    result[i] = stddev(logReturns) * Math.sqrt(365);
  }
  return result;
}

// ─── Public API ─────────────────────────────────────────────────────────

export function detectRegimes(
  prices: PriceDay[],
  adxPeriod = ADX_PERIOD,
  adxThreshold = ADX_TRENDING_THRESHOLD
): RegimeDay[] {
  const closes = prices.map((p) => p.price);
  const adxProxy = computeAdxProxy(closes, adxPeriod);
  const vol = computeRollingVol(closes, adxPeriod);

  return prices.map((p, i) => {
    let regime: Regime = 'unknown';
    if (i >= adxPeriod * 2) {
      const isTrending =
        adxProxy[i] >= adxThreshold && vol[i] >= MIN_VOL_FLOOR;
      regime = isTrending ? 'trending' : 'choppy';
    }
    return {
      ...p,
      regime,
      adxProxy: Math.round(adxProxy[i] * 10) / 10,
      volatility: Math.round(vol[i] * 1000) / 10, // stored as %, e.g. 65.3
    };
  });
}
