/**
 * Regime-filtered BTC swing backtester
 * ───────────────────────────────────
 * Strategy rules (all configurable via BacktestConfig):
 *
 *  1. Entry dip      — price drops >= entryDipPct below rolling lookbackDays high
 *  2. Trailing stop  — price drops >= trailingStopPct below the highest close
 *                       since entry  → exit, start cooldown
 *  3. Re-entry       — after cooldown expires, wait for next dip signal
 *  4. Regime filter  — if regimeFilter=true, only enter in 'trending' days;
 *                       ignore dip signals on 'choppy' days
 *
 * One position at a time (no pyramiding).
 */

import type {
  BacktestConfig,
  BacktestResult,
  BacktestStats,
  Trade,
  TradeReason,
} from '@/types';
import { detectRegimes } from '@/lib/regime';
import type { PriceDay } from '@/types';

// ─── Core runner ───────────────────────────────────────────────────────────

export function runBacktest(
  prices: PriceDay[],
  config: BacktestConfig
): BacktestResult {
  const {
    entryDipPct,
    trailingStopPct,
    reEntryCooldownBars,
    regimeFilter,
    lookbackDays,
    feePct,
  } = config;

  const regimeDays = detectRegimes(prices);
  const n = regimeDays.length;

  const trades: Trade[] = [];
  const equityCurve: { date: number; equity: number }[] = [];

  let equity = 1.0;           // normalised — starts at $1
  let inPosition = false;
  let entryPrice = 0;
  let positionHigh = 0;       // highest close since entry
  let cooldownBarsLeft = 0;
  let currentTrade: Omit<Trade, 'exitDate' | 'exitPrice' | 'exitReason' | 'pnlPct'> | null = null;

  for (let i = lookbackDays; i < n; i++) {
    const day = regimeDays[i];
    const price = day.price;

    // — Rolling lookback high (exclusive of today)
    const windowHigh = Math.max(...regimeDays.slice(i - lookbackDays, i).map((d) => d.price));

    // — Cooldown tick
    if (cooldownBarsLeft > 0) cooldownBarsLeft--;

    if (inPosition) {
      // Update trailing high
      if (price > positionHigh) positionHigh = price;

      // Check trailing stop
      const stopLevel = positionHigh * (1 - trailingStopPct);
      if (price <= stopLevel) {
        const exitReason: TradeReason = 'trailing_stop';
        const grossReturn = (price - entryPrice) / entryPrice;
        const pnlPct = grossReturn - 2 * feePct; // buy + sell fee
        equity *= 1 + pnlPct;

        trades.push({
          ...currentTrade!,
          exitDate: day.date,
          exitPrice: price,
          exitReason,
          pnlPct,
        });

        inPosition = false;
        currentTrade = null;
        cooldownBarsLeft = reEntryCooldownBars;
      }
    } else {
      // Not in position — look for entry
      if (cooldownBarsLeft === 0) {
        const regimeOk = !regimeFilter || day.regime === 'trending';
        const dipTriggered = price <= windowHigh * (1 - entryDipPct);

        if (regimeOk && dipTriggered) {
          entryPrice = price;
          positionHigh = price;
          inPosition = true;
          currentTrade = {
            entryDate: day.date,
            entryPrice: price,
            regime: day.regime,
          };
        }
      }
    }

    equityCurve.push({ date: day.date, equity: Math.round(equity * 10000) / 10000 });
  }

  // Close any open trade at last bar
  if (inPosition && currentTrade) {
    const lastDay = regimeDays[n - 1];
    const grossReturn = (lastDay.price - entryPrice) / entryPrice;
    const pnlPct = grossReturn - 2 * feePct;
    equity *= 1 + pnlPct;

    trades.push({
      ...currentTrade,
      exitDate: lastDay.date,
      exitPrice: lastDay.price,
      exitReason: 'end_of_data',
      pnlPct,
    });
  }

  const stats = computeStats(trades, equityCurve);

  return { trades, equityCurve, stats };
}

// ─── Stats ────────────────────────────────────────────────────────────────

function computeStats(
  trades: Trade[],
  equityCurve: { date: number; equity: number }[]
): BacktestStats {
  const closedTrades = trades.filter((t) => t.pnlPct !== null);
  const wins = closedTrades.filter((t) => (t.pnlPct ?? 0) > 0);
  const losses = closedTrades.filter((t) => (t.pnlPct ?? 0) <= 0);

  const winRate = closedTrades.length ? wins.length / closedTrades.length : 0;
  const avgWinPct = wins.length
    ? wins.reduce((a, t) => a + (t.pnlPct ?? 0), 0) / wins.length
    : 0;
  const avgLossPct = losses.length
    ? losses.reduce((a, t) => a + (t.pnlPct ?? 0), 0) / losses.length
    : 0;

  // Total return from equity curve
  const firstEquity = equityCurve[0]?.equity ?? 1;
  const lastEquity = equityCurve[equityCurve.length - 1]?.equity ?? 1;
  const totalReturnPct = (lastEquity - firstEquity) / firstEquity;

  // Max drawdown
  let peak = firstEquity;
  let maxDrawdown = 0;
  for (const { equity } of equityCurve) {
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Sharpe proxy: annualised mean / std of daily returns
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    dailyReturns.push(
      (equityCurve[i].equity - equityCurve[i - 1].equity) /
        equityCurve[i - 1].equity
    );
  }
  const meanReturn =
    dailyReturns.reduce((a, b) => a + b, 0) / (dailyReturns.length || 1);
  const stdReturn = Math.sqrt(
    dailyReturns.reduce((a, r) => a + (r - meanReturn) ** 2, 0) /
      (dailyReturns.length || 1)
  );
  const sharpeProxy = stdReturn === 0 ? 0 : (meanReturn / stdReturn) * Math.sqrt(365);

  const tradesInTrending = trades.filter((t) => t.regime === 'trending').length;
  const tradesInChoppy = trades.filter((t) => t.regime === 'choppy').length;

  return {
    totalTrades: closedTrades.length,
    winRate: Math.round(winRate * 1000) / 10,     // store as %
    avgWinPct: Math.round(avgWinPct * 10000) / 100,
    avgLossPct: Math.round(avgLossPct * 10000) / 100,
    totalReturnPct: Math.round(totalReturnPct * 10000) / 100,
    maxDrawdownPct: Math.round(maxDrawdown * 10000) / 100,
    sharpeProxy: Math.round(sharpeProxy * 100) / 100,
    tradesInTrending,
    tradesInChoppy,
  };
}
