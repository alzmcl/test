/**
 * Regime-filtered BTC swing backtester
 * ───────────────────────────────────
 *  1. Entry dip      — price drops >= entryDipPct below rolling lookbackDays high
 *  2. Trailing stop  — activates after gain >= trailingStopActivationPct;
 *                       exits when price drops >= trailingStopPct below position high
 *  2a. Hard stop     — exits when loss >= hardStopPct before trailing stop activates (0 = off)
 *  3. Re-entry       — after cooldown AND price dipped >= reEntryDipPct below last exit
 *  4. Regime filter  — if regimeFilter=true, only enter in 'choppy' days
 *  5. Allocation     — allocationPct% of portfolio per slot; remainder earns cashYieldPct% pa
 *  6. Multi-slot     — numSlots concurrent positions; each successive slot requires an
 *                       additional slotDipIncrement dip before triggering
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

// ─── Slot state ────────────────────────────────────────────────────────────

interface Slot {
  inPosition: boolean;
  btcValue: number;    // normalised fraction of initial portfolio in BTC
  entryPrice: number;
  positionHigh: number;
  cooldownBarsLeft: number;
  lastExitPrice: number;
  currentTrade: Omit<Trade, 'exitDate' | 'exitPrice' | 'exitReason' | 'pnlPct'> | null;
}

function makeSlot(): Slot {
  return {
    inPosition: false,
    btcValue: 0,
    entryPrice: 0,
    positionHigh: 0,
    cooldownBarsLeft: 0,
    lastExitPrice: 0,
    currentTrade: null,
  };
}

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
    numSlots = 1,
    slotDipIncrement = 0.02,
  } = config;

  const allocationPerSlot = Math.min(1, allocationPct / 100) / numSlots;
  const dailyCashRate = Math.pow(1 + cashYieldPct / 100, 1 / 365) - 1;

  const regimeDays = detectRegimes(prices, regimeAdxPeriod, regimeAdxThreshold);
  const n = regimeDays.length;

  const trades: Trade[] = [];
  const equityCurve: EquityPoint[] = [];

  const slots: Slot[] = Array.from({ length: numSlots }, makeSlot);
  let cashValue = 1.0;
  let daysInMarket = 0;

  for (let i = lookbackDays; i < n; i++) {
    const day = regimeDays[i];
    const price = day.price;
    const prevPrice = regimeDays[i - 1].price;
    const btcDailyReturn = (price - prevPrice) / prevPrice;
    const windowHigh = Math.max(...regimeDays.slice(i - lookbackDays, i).map((d) => d.price));
    const regimeOk = !regimeFilter || day.regime === 'choppy';

    // ── 1. Apply daily cash yield ─────────────────────────────────────────
    cashValue *= (1 + dailyCashRate);

    let anyInPosition = false;

    // ── 2. Process each slot ─────────────────────────────────────────────
    for (let s = 0; s < numSlots; s++) {
      const slot = slots[s];

      if (slot.cooldownBarsLeft > 0) slot.cooldownBarsLeft--;

      if (slot.inPosition) {
        anyInPosition = true;

        // Apply BTC daily return to this slot's position
        slot.btcValue *= (1 + btcDailyReturn);

        // Update trailing high
        if (price > slot.positionHigh) slot.positionHigh = price;

        // Check exit
        const gainFromEntry = (slot.positionHigh - slot.entryPrice) / slot.entryPrice;
        const trailingActive = gainFromEntry >= trailingStopActivationPct;
        let exitReason: TradeReason | null = null;

        if (trailingActive && price <= slot.positionHigh * (1 - trailingStopPct)) {
          exitReason = 'trailing_stop';
        } else if (!trailingActive && hardStopPct > 0) {
          if ((slot.entryPrice - price) / slot.entryPrice >= hardStopPct) {
            exitReason = 'hard_stop';
          }
        }

        if (exitReason) {
          slot.btcValue *= (1 - feePct); // exit fee
          const grossReturn = (price - slot.entryPrice) / slot.entryPrice;
          const pnlPct = grossReturn - 2 * feePct;
          slot.lastExitPrice = price;

          trades.push({
            ...slot.currentTrade!,
            exitDate: day.date,
            exitPrice: price,
            exitReason,
            pnlPct,
          });

          cashValue += slot.btcValue;
          slot.btcValue = 0;
          slot.inPosition = false;
          slot.currentTrade = null;
          slot.cooldownBarsLeft = reEntryCooldownBars;
        }
      } else if (slot.cooldownBarsLeft === 0) {
        // Each successive slot requires a larger dip
        const slotDipThreshold = entryDipPct + s * slotDipIncrement;
        const dipTriggered = price <= windowHigh * (1 - slotDipThreshold);
        const reEntryOk = slot.lastExitPrice === 0 || price <= slot.lastExitPrice * (1 - reEntryDipPct);

        if (regimeOk && dipTriggered && reEntryOk) {
          const totalEquity = cashValue + slots.reduce((sum, sl) => sum + sl.btcValue, 0);
          const deployAmount = totalEquity * allocationPerSlot;

          if (deployAmount <= cashValue) {
            slot.btcValue = deployAmount * (1 - feePct); // entry fee
            cashValue -= deployAmount;
            slot.inPosition = true;
            slot.entryPrice = price;
            slot.positionHigh = price;
            slot.currentTrade = {
              entryDate: day.date,
              entryPrice: price,
              regime: day.regime,
              slot: s,
              entryValue: deployAmount,
            };
          }
        }
      }
    }

    if (anyInPosition) daysInMarket++;

    const equity = Math.round(
      (cashValue + slots.reduce((sum, sl) => sum + sl.btcValue, 0)) * 10000
    ) / 10000;
    equityCurve.push({ date: day.date, equity, inPosition: anyInPosition });
  }

  // Close any open slots at last bar
  const lastDay = regimeDays[n - 1];
  for (const slot of slots) {
    if (slot.inPosition && slot.currentTrade) {
      slot.btcValue *= (1 - feePct);
      const grossReturn = (lastDay.price - slot.entryPrice) / slot.entryPrice;
      const pnlPct = grossReturn - 2 * feePct;
      trades.push({
        ...slot.currentTrade,
        exitDate: lastDay.date,
        exitPrice: lastDay.price,
        exitReason: 'end_of_data',
        pnlPct,
      });
    }
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
  const closedTrades = trades.filter((t) => t.pnlPct !== null && t.exitReason !== 'end_of_data');
  const wins = closedTrades.filter((t) => (t.pnlPct ?? 0) > 0);
  const losses = closedTrades.filter((t) => (t.pnlPct ?? 0) <= 0);

  const winRate = closedTrades.length ? wins.length / closedTrades.length : 0;
  const avgWinPct = wins.length
    ? wins.reduce((a, t) => a + (t.pnlPct ?? 0), 0) / wins.length : 0;
  const avgLossPct = losses.length
    ? losses.reduce((a, t) => a + (t.pnlPct ?? 0), 0) / losses.length : 0;

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
      (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity
    );
  }
  const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / (dailyReturns.length || 1);
  const stdReturn = Math.sqrt(
    dailyReturns.reduce((a, r) => a + (r - meanReturn) ** 2, 0) / (dailyReturns.length || 1)
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
