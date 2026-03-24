// ─── Price feed ────────────────────────────────────────────────────────────

export interface OHLCVDay {
  date: number;   // Unix ms timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Lightweight version returned by CoinGecko /market_chart (no OHLCV) */
export interface PriceDay {
  date: number;   // Unix ms timestamp
  price: number;
}

// ─── Regime detection ──────────────────────────────────────────────────────

export type Regime = 'trending' | 'choppy' | 'unknown';

export interface RegimeDay extends PriceDay {
  regime: Regime;
  /** ADX-proxy value (0–100). Higher = more trending. */
  adxProxy: number;
  /** Rolling 14-day return volatility (annualised) */
  volatility: number;
}

// ─── Backtester ────────────────────────────────────────────────────────────

export interface BacktestConfig {
  /** % dip from rolling high to trigger entry (e.g. 0.04 = 4%) */
  entryDipPct: number;
  /** % drop from position high to trigger trailing stop (e.g. 0.06 = 6%) */
  trailingStopPct: number;
  /** % gain from entry before trailing stop activates (e.g. 0.05 = 5%) */
  trailingStopActivationPct: number;
  /** % dip from last exit price required to re-enter (e.g. 0.03 = 3%) */
  reEntryDipPct: number;
  /** Minimum bars to wait before re-entry after a stop-out */
  reEntryCooldownBars: number;
  /** Only trade when regime === 'choppy'. Set false to trade all regimes. */
  regimeFilter: boolean;
  /** Rolling window (days) used for local-high calculation */
  lookbackDays: number;
  /** Exchange fee per side (e.g. 0.001 = 0.1%) */
  feePct: number;
  /** ADX rolling window in days */
  regimeAdxPeriod: number;
  /** ADX-proxy threshold above which market is 'trending' */
  regimeAdxThreshold: number;
  /** Portfolio starting size in USD */
  portfolioSize: number;
}

export const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
  entryDipPct: 0.04,
  trailingStopPct: 0.06,
  trailingStopActivationPct: 0.05,
  reEntryDipPct: 0.03,
  reEntryCooldownBars: 2,
  regimeFilter: true,
  lookbackDays: 14,
  feePct: 0.001,
  regimeAdxPeriod: 14,
  regimeAdxThreshold: 25,
  portfolioSize: 10000,
};

/**
 * Range Mode: buy on small dips, sell after 5% gain (trailing), re-enter on 5% pullback.
 * Designed for sideways / choppy markets where price oscillates in a range.
 */
export const RANGE_MODE_CONFIG: Omit<BacktestConfig, 'portfolioSize'> = {
  entryDipPct: 0.03,
  trailingStopActivationPct: 0.05,
  trailingStopPct: 0.035,
  reEntryDipPct: 0.05,
  reEntryCooldownBars: 1,
  regimeFilter: false,
  lookbackDays: 7,
  feePct: 0.001,
  regimeAdxPeriod: 14,
  regimeAdxThreshold: 25,
};

export type TradeSide = 'buy' | 'sell';
export type TradeReason = 'entry_dip' | 'trailing_stop' | 'end_of_data' | 're_entry_dip';

export interface Trade {
  entryDate: number;
  entryPrice: number;
  exitDate: number | null;
  exitPrice: number | null;
  exitReason: TradeReason | null;
  pnlPct: number | null;          // after fees
  regime: Regime;
}

export interface BacktestResult {
  trades: Trade[];
  equityCurve: { date: number; equity: number }[];
  stats: BacktestStats;
}

export interface BacktestStats {
  totalTrades: number;
  winRate: number;          // 0–1
  avgWinPct: number;
  avgLossPct: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeProxy: number;      // annualised Sharpe approximation
  tradesInTrending: number;
  tradesInChoppy: number;
  portfolioFinalValue: number;
}

// ─── Supabase DB rows ───────────────────────────────────────────────────────

export interface DbPriceRow {
  id: number;
  date: string;    // ISO date 'YYYY-MM-DD'
  close: number;
  created_at: string;
}

export interface DbBacktestRun {
  id: string;       // uuid
  created_at: string;
  config: BacktestConfig;
  stats: BacktestStats;
  trades: Trade[];
}
