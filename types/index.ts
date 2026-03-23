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
  /** Minimum bars to wait before re-entry after a stop-out */
  reEntryCooldownBars: number;
  /** Only trade when regime === 'trending'. Set false to trade all regimes. */
  regimeFilter: boolean;
  /** Rolling window (days) used for local-high calculation */
  lookbackDays: number;
  /** Exchange fee per side (e.g. 0.001 = 0.1%) */
  feePct: number;
}

export const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
  entryDipPct: 0.04,
  trailingStopPct: 0.06,
  reEntryCooldownBars: 2,
  regimeFilter: true,
  lookbackDays: 14,
  feePct: 0.001,
};

export type TradeSide = 'buy' | 'sell';
export type TradeReason = 'entry_dip' | 'trailing_stop' | 'end_of_data';

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
