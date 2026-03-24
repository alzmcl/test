/**
 * Regime-filtered BTC swing backtester
 * ───────────────────────────────────
 * Strategy rules (all configurable via BacktestConfig):
 *
 *  1. Entry dip      — price drops >= entryDipPct below rolling lookbackDays high
 *  2. Trailing stop  — activates after position gains >= trailingStopActivationPct;
 *                       then exits when price drops >= trailingStopPct below position high
 *  2a. Hard stop     — if trailing stop has not yet activated, exits when loss from entry
 *                       exceeds hardStopPct (0 = disabled)
 *  3. Re-entry       — after cooldown expires AND price has dipped >= reEntryDipPct
 *                       below last exit price
 *  4. Regime filter  — if regimeFilter=true, only enter in 'choppy' days;
 *                       ignore dip signals on 'trending' days
 *  5. Allocation     — only allocationPct% of portfolio goes into each trade;
 *                       remainder earns cashYieldPct% annual rate in cash
 *
 * One position at a time (no pyramiding).
 * Equity is tracked day-by-day so idle cash accrues yield continuously.
 */

import type {
  BacktestConfig,
  BacktestResult,
  BacktestStats,
  EquityPoint,
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
    trailingStopActivationPct,
    hardStopPct,
    reEntryDipPct,
    reEntryCooldownBars,
    regimeFilter,
    lookbackDays,
    feePct,
    regimeAdxPeriod,
    regimeAdxThreshold,
    portfolioSize,
    allocationPct = 100,
    cashYieldPct = 0,
  } = config;

  const allocationFrac = Math.min(1, Math.max(0, allocationPct / 100));
  const dailyCashRate = Math.pow(1 + cashYieldPct / 100, 1 / 365) - 1;

  const regimeDays = detectRegimes(prices, regimeAdxPeriod, regimeAdxThreshold);
  const n = regimeDays.length;

  const trades: Trade[] = [];
  const equityCurve: EquityPoint[] = [];

  // Portfolio tracked as two buckets (both normalised so they start at 1 total)
  let btcValue = 0;    // fraction of initial portfolio currently in BTC
  let cashValue = 1.0; // fraction of initial portfolio currently in cash

  let inPosition = false;
  let entryPrice = 0;
  let positionHigh = 0;
  let cooldownBarsLeft = 0;
  let lastExitPrice = 0;
  let currentTrade: Omit<Trade, 'exitDate' | 'exitPrice' | 'exitReason' | 'pnlPct'> | null = null;
  let daysInMarket = 0;

  for (let i = lookbackDays; i < n; i++) {
    const day = regimeDays[i];
    const price = day.price;
    const prevPrice = regimeDays[i - 1].price;

    // ── 1. Apply daily returns ────────────────────────────────────────────
    if (inPosition) {
      const btcDailyReturn = (price - prevPrice) / prevPrice;
      btcValue *= (1 + btcDailyReturn);
      cashValue *= (1 + dailyCashRate);
      daysInMarket++;
    } else {
      cashValue *= (1 + dailyCashRate);
    }

    // ── 2. Cooldown tick ─────────────────────────────────────────────────
    if (cooldownBarsLeft > 0) cooldownBarsLeft--;

    // ── 3. Exit checks ───────────────────────────────────────────────────
    if (inPosition) {
      if (price > positionHigh) positionHigh = price;

      const gainFromEntry = (positionHigh - entryPrice) / entryPrice;
      const trailingActive = gainFromEntry >= trailingStopActivationPct;
      let exitReason: TradeReason | null = null;

      if (trailingActive && price <= positionHigh * (1 - trailingStopPct)) {
        exitReason = 'trailing_stop';
      } else if (!trailingActive && hardStopPct > 0) {
        const lossFromEntry = (entryPrice - price) / entryPrice;
        if (lossFromEntry >= hardStopPct) exitReason = 'hard_stop';
      }

      if (exitReason) {
        btcValue *= (1 - feePct); // exit fee
        const grossReturn = (price - entryPrice) / entryPrice;
        const pnlPct = grossReturn - 2 * feePct;
        lastExitPrice = price;

        trades.push({
          ...currentTrade!,
          exitDate: day.date,
          exitPrice: price,
          exitReason,
          pnlPct,
        });

        cashValue = btcValue + cashValue; // merge back to cash
        btcValue = 0;
        inPosition = false;
        currentTrade = null;
        cooldownBarsLeft = reEntryCooldownBars;
      }
    }

    // ── 4. Entry check ───────────────────────────────────────────────────
    if (!inPosition && cooldownBarsLeft === 0) {
      const windowHigh = Math.max(...regimeDays.slice(i - lookbackDays, i).map((d) => d.price));
      const regimeOk = !regimeFilter || day.regime === 'choppy';
      const dipTriggered = price <= windowHigh * (1 - entryDipPct);
      const reEntryOk = lastExitPrice === 0 || price <= lastExitPrice * (1 - reEntryDipPct);

      if (regimeOk && dipTriggered && reEntryOk) {
        const totalEquity = cashValue; // btcValue is 0 when not in position
        btcValue = totalEquity * allocationFrac * (1 - feePct); // entry fee
        cashValue = totalEquity * (1 - allocationFrac);
        inPosition = true;
        entryPrice = price;
        positionHigh = price;
        currentTrade = {
          entryDate: day.date,
          entryPrice: price,
          regime: day.regime,
        };
      }
    }

    // ── 5. Record equity ─────────────────────────────────────────────────
    const equity = Math.round((btcValue + cashValue) * 10000) / 10000;
    equityCurve.push({ date: day.date, equity, inPosition });
  }

  // Close any open trade at last bar
  if (inPosition && currentTrade) {
    const lastDay = regimeDays[n - 1];
    btcValue *= (1 - feePct);
    const grossReturn = (lastDay.price - entryPrice) / entryPrice;
    const pnlPct = grossReturn - 2 * feePct;

    trades.push({
      ...currentTrade,
      exitDate: lastDay.date,
      exitPrice: lastDay.price,
      exitReason: 'end_of_data',
      pnlPct,
    });
  }

  const totalBars = n - lookbackDays;
  const stats = computeStats(trades, equityCurve, portfolioSize, daysInMarket, totalBars);

  return { trades, equityCurve, stats };
}

// ─── Stats ────────────────────────────────────────────────────────────────

function computeStats(
  trades: Trade[],
  equityCurve: EquityPoint[],
  portfolioSize: number,
  daysInMarket: number,
  totalBars: number,
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

  const firstEquity = equityCurve[0]?.equity ?? 1;
  const lastEquity = equityCurve[equityCurve.length - 1]?.equity ?? 1;
  const totalReturnPct = (lastEquity - firstEquity) / firstEquity;

  let peak = firstEquity;
  let maxDrawdown = 0;
  for (const { equity } of equityCurve) {
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

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
  const portfolioFinalValue = Math.round(portfolioSize * (1 + totalReturnPct));
  const timeInMarketPct = totalBars > 0 ? Math.round((daysInMarket / totalBars) * 1000) / 10 : 0;

  return {
    totalTrades: closedTrades.length,
    winRate: Math.round(winRate * 1000) / 10,
    avgWinPct: Math.round(avgWinPct * 10000) / 100,
    avgLossPct: Math.round(avgLossPct * 10000) / 100,
    totalReturnPct: Math.round(totalReturnPct * 10000) / 100,
    maxDrawdownPct: Math.round(maxDrawdown * 10000) / 100,
    sharpeProxy: Math.round(sharpeProxy * 100) / 100,
    tradesInTrending,
    tradesInChoppy,
    portfolioFinalValue,
    timeInMarketPct,
  };
}
