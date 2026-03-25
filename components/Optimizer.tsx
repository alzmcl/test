'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { BacktestConfig, PriceDay } from '@/types';
import { runBacktest } from '@/lib/backtester';

interface Props {
  prices: PriceDay[];
  config: BacktestConfig;
  onConfigApply: (c: BacktestConfig) => void;
}

interface OptResult {
  entryDipPct: number;
  trailingStopPct: number;
  trailingStopActivationPct: number;
  reEntryDipPct: number;
  lookbackDays: number;
  hardStopPct: number;
  trades: number;
  winRate: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeProxy: number;
  profitFactor: number;
  timeInMarketPct: number;
}

type SortKey = 'totalReturnPct' | 'sharpeProxy' | 'winRate' | 'maxDrawdownPct' | 'profitFactor' | 'timeInMarketPct';
type ViewKey = 'table' | 'heatmap' | 'sensitivity';

type ParamKey =
  | 'entryDipPct'
  | 'trailingStopPct'
  | 'trailingStopActivationPct'
  | 'reEntryDipPct'
  | 'lookbackDays'
  | 'hardStopPct';

const PARAM_LABELS: Record<ParamKey, string> = {
  entryDipPct: 'Entry dip',
  trailingStopPct: 'Trailing stop',
  trailingStopActivationPct: 'Activation',
  reEntryDipPct: 'Re-entry dip',
  lookbackDays: 'Lookback days',
  hardStopPct: 'Hard stop',
};

const PARAM_COLORS: Record<ParamKey, string> = {
  entryDipPct: '#38bdf8',
  trailingStopPct: '#818cf8',
  trailingStopActivationPct: '#f59e0b',
  reEntryDipPct: '#4ade80',
  lookbackDays: '#fb923c',
  hardStopPct: '#f87171',
};

const ENTRY_DIPS = [0.02, 0.03, 0.04, 0.05, 0.06, 0.08];
const TRAILING_STOPS = [0.04, 0.05, 0.06, 0.08, 0.10];
const ACTIVATIONS = [0.03, 0.05, 0.07, 0.10];
const REENTRY_DIPS = [0.02, 0.03, 0.05, 0.07];
const LOOKBACK_DAYS_OPTS = [10, 14, 20, 30];
const HARD_STOP_OPTS = [0, 0.05, 0.08, 0.12];

const PARAM_VALUES: Record<ParamKey, number[]> = {
  entryDipPct: ENTRY_DIPS,
  trailingStopPct: TRAILING_STOPS,
  trailingStopActivationPct: ACTIVATIONS,
  reEntryDipPct: REENTRY_DIPS,
  lookbackDays: LOOKBACK_DAYS_OPTS,
  hardStopPct: HARD_STOP_OPTS,
};

// Approximate upper bound (actual valid count is lower due to activation constraint)
const TOTAL = ENTRY_DIPS.length * TRAILING_STOPS.length * ACTIVATIONS.length * REENTRY_DIPS.length
  * LOOKBACK_DAYS_OPTS.length * HARD_STOP_OPTS.length;

function formatParamValue(param: ParamKey, val: number): string {
  if (param === 'lookbackDays') return val + 'd';
  if (param === 'hardStopPct') return val === 0 ? 'off' : (val * 100).toFixed(0) + '%';
  return (val * 100).toFixed(0) + '%';
}

// ─── Colour scale for heatmap ───────────────────────────────────────────────
function returnColor(pct: number): string {
  if (pct <= -10) return '#7f1d1d';
  if (pct < 0)    return '#f87171';
  if (pct < 5)    return '#f59e0b';
  if (pct < 15)   return '#4ade80';
  return '#16a34a';
}

// ─── Analysis helpers ────────────────────────────────────────────────────────

function buildHeatmap(
  results: OptResult[],
  xParam: ParamKey,
  yParam: ParamKey
): { xVals: number[]; yVals: number[]; cells: number[][] } {
  const xVals = PARAM_VALUES[xParam];
  const yVals = PARAM_VALUES[yParam];

  // cells[yi][xi] = best return for that (x,y) combo across free params
  const cells: number[][] = yVals.map(() => xVals.map(() => -Infinity));

  for (const r of results) {
    const xi = xVals.indexOf(r[xParam]);
    const yi = yVals.indexOf(r[yParam]);
    if (xi < 0 || yi < 0) continue;
    if (r.totalReturnPct > cells[yi][xi]) {
      cells[yi][xi] = r.totalReturnPct;
    }
  }

  // Replace -Infinity with 0 for cells with no valid combos
  return {
    xVals,
    yVals,
    cells: cells.map((row) => row.map((v) => (isFinite(v) ? v : 0))),
  };
}

function buildSensitivity(
  results: OptResult[]
): Record<ParamKey, { label: string; avg: number }[]> {
  const params: ParamKey[] = [
    'entryDipPct', 'trailingStopPct', 'trailingStopActivationPct', 'reEntryDipPct',
    'lookbackDays', 'hardStopPct',
  ];
  const out = {} as Record<ParamKey, { label: string; avg: number }[]>;

  for (const p of params) {
    out[p] = PARAM_VALUES[p].map((val) => {
      const group = results.filter((r) => r[p] === val);
      const avg = group.length
        ? group.reduce((a, r) => a + r.totalReturnPct, 0) / group.length
        : 0;
      return {
        label: formatParamValue(p, val),
        avg: Math.round(avg * 100) / 100,
      };
    });
  }

  return out;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ViewBtn({
  id, active, label, onClick,
}: {
  id: ViewKey; active: boolean; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-mono px-3 py-1.5 rounded"
      style={{
        background: active ? '#1e293b' : 'transparent',
        color: active ? '#38bdf8' : '#475569',
        border: active ? '1px solid #334155' : '1px solid transparent',
      }}
    >
      {label}
    </button>
  );
}

function SortBtn({ id, active, label, onClick }: { id: SortKey; active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-mono px-2 py-1 rounded"
      style={{
        background: active ? '#1e293b' : 'transparent',
        color: active ? '#38bdf8' : '#475569',
      }}
    >
      {label}
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function Optimizer({ prices, config, onConfigApply }: Props) {
  const [results, setResults] = useState<OptResult[]>([]);
  const [running, setRunning] = useState(false);
  const [sort, setSort] = useState<SortKey>('totalReturnPct');
  const [view, setView] = useState<ViewKey>('table');
  const [heatX, setHeatX] = useState<ParamKey>('entryDipPct');
  const [heatY, setHeatY] = useState<ParamKey>('trailingStopPct');
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number; val: number } | null>(null);
  const [minTrades, setMinTrades] = useState(6);

  function runOptimizer() {
    setRunning(true);
    setResults([]);

    setTimeout(() => {
      const found: OptResult[] = [];

      for (const lookbackDays of LOOKBACK_DAYS_OPTS) {
        for (const hardStopPct of HARD_STOP_OPTS) {
          for (const entryDipPct of ENTRY_DIPS) {
            for (const trailingStopPct of TRAILING_STOPS) {
              for (const trailingStopActivationPct of ACTIVATIONS) {
                for (const reEntryDipPct of REENTRY_DIPS) {
                  if (trailingStopActivationPct > trailingStopPct + 0.02) continue;

                  const testConfig: BacktestConfig = {
                    ...config,
                    lookbackDays,
                    hardStopPct,
                    entryDipPct,
                    trailingStopPct,
                    trailingStopActivationPct,
                    reEntryDipPct,
                  };

                  const res = runBacktest(prices, testConfig);
                  const s = res.stats;

                  found.push({
                    lookbackDays,
                    hardStopPct,
                    entryDipPct,
                    trailingStopPct,
                    trailingStopActivationPct,
                    reEntryDipPct,
                    trades: s.totalTrades,
                    winRate: s.winRate,
                    totalReturnPct: s.totalReturnPct,
                    maxDrawdownPct: s.maxDrawdownPct,
                    sharpeProxy: s.sharpeProxy,
                    profitFactor: s.profitFactor,
                    timeInMarketPct: s.timeInMarketPct,
                  });
                }
              }
            }
          }
        }
      }

      setResults(found);
      setRunning(false);
    }, 10);
  }

  // Best by Sharpe among combos with enough trades AND meaningful market activity
  const recommended = results.length
    ? results
        .filter((r) => r.trades >= minTrades && r.timeInMarketPct >= 10)
        .reduce<OptResult | null>((best, r) => (!best || r.sharpeProxy > best.sharpeProxy ? r : best), null)
    : null;

  const sorted = [...results]
    .filter((r) => r.trades >= minTrades)
    .sort((a, b) => sort === 'maxDrawdownPct' ? a[sort] - b[sort] : b[sort] - a[sort])
    .slice(0, 30);

  const heatmap = results.length ? buildHeatmap(results, heatX, heatY) : null;
  const sensitivity = results.length ? buildSensitivity(results) : null;

  // ── Heatmap X axis must differ from Y
  function setHeatXSafe(p: ParamKey) {
    setHeatX(p);
    if (p === heatY) {
      const other = (Object.keys(PARAM_VALUES) as ParamKey[]).find((k) => k !== p)!;
      setHeatY(other);
    }
  }
  function setHeatYSafe(p: ParamKey) {
    setHeatY(p);
    if (p === heatX) {
      const other = (Object.keys(PARAM_VALUES) as ParamKey[]).find((k) => k !== p)!;
      setHeatX(other);
    }
  }

  return (
    <div className="px-8 pt-6">
      {/* Header + Run button */}
      <div className="flex items-start gap-4 mb-5 flex-wrap">
        <div>
          <p className="text-sm font-semibold mb-0.5" style={{ color: '#94a3b8' }}>Parameter Optimizer</p>
          <p className="text-xs font-mono" style={{ color: '#475569' }}>
            Grid search across ~{TOTAL.toLocaleString()} combinations — entry dip, trailing stop, activation,
            re-entry dip, lookback window, hard stop. Runs on the current date range.
          </p>
        </div>
        <button
          onClick={runOptimizer}
          disabled={running || prices.length === 0}
          className="ml-auto px-4 py-2 rounded text-xs font-mono font-semibold transition-colors"
          style={{
            background: running ? '#1e293b' : '#38bdf8',
            color: running ? '#475569' : '#0c1626',
            cursor: running ? 'not-allowed' : 'pointer',
          }}
        >
          {running ? 'Running…' : 'Run Optimizer'}
        </button>
      </div>

      {results.length > 0 && (
        <>
          {/* Recommended banner */}
          {recommended && (
            <div
              className="rounded-xl p-4 mb-5 flex flex-wrap items-center gap-4"
              style={{ background: '#0a1929', border: '1px solid #38bdf8' }}
            >
              <div>
                <p className="text-xs font-mono mb-1" style={{ color: '#38bdf8' }}>
                  ★ RECOMMENDED (best Sharpe, ≥{minTrades} trades)
                </p>
                <div className="flex flex-wrap gap-4" style={{ fontFamily: 'DM Mono,monospace' }}>
                  {(
                    [
                      ['Entry', (recommended.entryDipPct * 100).toFixed(0) + '%'],
                      ['Stop', (recommended.trailingStopPct * 100).toFixed(0) + '%'],
                      ['Activ.', (recommended.trailingStopActivationPct * 100).toFixed(0) + '%'],
                      ['Re-entry', (recommended.reEntryDipPct * 100).toFixed(0) + '%'],
                      ['Lookback', recommended.lookbackDays + 'd'],
                      ['H.Stop', recommended.hardStopPct === 0 ? 'off' : (recommended.hardStopPct * 100).toFixed(0) + '%'],
                      ['Trades', String(recommended.trades)],
                      ['Cash%', (100 - recommended.timeInMarketPct).toFixed(0) + '%'],
                      ['P.Factor', recommended.profitFactor >= 99 ? '∞' : recommended.profitFactor.toFixed(2)],
                      ['Return', (recommended.totalReturnPct >= 0 ? '+' : '') + recommended.totalReturnPct + '%'],
                      ['Sharpe', recommended.sharpeProxy.toFixed(2)],
                      ['Win%', recommended.winRate + '%'],
                      ['Drawdown', '-' + recommended.maxDrawdownPct + '%'],
                    ] as [string, string][]
                  ).map(([k, v]) => (
                    <div key={k}>
                      <p className="text-xs" style={{ color: '#334155' }}>{k}</p>
                      <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() =>
                  onConfigApply({
                    ...config,
                    lookbackDays: recommended.lookbackDays,
                    hardStopPct: recommended.hardStopPct,
                    entryDipPct: recommended.entryDipPct,
                    trailingStopPct: recommended.trailingStopPct,
                    trailingStopActivationPct: recommended.trailingStopActivationPct,
                    reEntryDipPct: recommended.reEntryDipPct,
                  })
                }
                className="ml-auto px-4 py-2 rounded text-xs font-mono font-semibold"
                style={{ background: '#38bdf8', color: '#0c1626', cursor: 'pointer' }}
              >
                Apply
              </button>
            </div>
          )}
          {!recommended && results.length > 0 && (
            <div className="rounded-xl p-4 mb-5 text-xs font-mono" style={{ background: '#0a1929', border: '1px solid #334155', color: '#f59e0b' }}>
              No combination with ≥{minTrades} trades found. Try lowering the min trades filter.
            </div>
          )}

          {/* View toggle */}
          <div className="flex gap-1 mb-4">
            <ViewBtn id="table" active={view === 'table'} label="Table" onClick={() => setView('table')} />
            <ViewBtn id="heatmap" active={view === 'heatmap'} label="Heatmap" onClick={() => setView('heatmap')} />
            <ViewBtn id="sensitivity" active={view === 'sensitivity'} label="Sensitivity" onClick={() => setView('sensitivity')} />
          </div>

          {/* ── TABLE VIEW ─────────────────────────────────────────────── */}
          {view === 'table' && (
            <>
              <div className="flex gap-1 mb-3 flex-wrap items-center">
                <span className="text-xs font-mono self-center mr-1" style={{ color: '#334155' }}>Sort:</span>
                <SortBtn id="totalReturnPct" active={sort === 'totalReturnPct'} label="Return" onClick={() => setSort('totalReturnPct')} />
                <SortBtn id="sharpeProxy" active={sort === 'sharpeProxy'} label="Sharpe" onClick={() => setSort('sharpeProxy')} />
                <SortBtn id="profitFactor" active={sort === 'profitFactor'} label="P.Factor" onClick={() => setSort('profitFactor')} />
                <SortBtn id="winRate" active={sort === 'winRate'} label="Win rate" onClick={() => setSort('winRate')} />
                <SortBtn id="maxDrawdownPct" active={sort === 'maxDrawdownPct'} label="Min drawdown" onClick={() => setSort('maxDrawdownPct')} />
                <SortBtn id="timeInMarketPct" active={sort === 'timeInMarketPct'} label="Active%" onClick={() => setSort('timeInMarketPct')} />
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs font-mono" style={{ color: '#334155' }}>Min trades:</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={minTrades}
                    onChange={(e) => setMinTrades(Math.max(1, Number(e.target.value)))}
                    className="text-xs font-mono px-2 py-1 rounded w-14 text-center"
                    style={{ background: '#0c1626', border: '1px solid #1e293b', color: '#94a3b8' }}
                  />
                </div>
              </div>

              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e293b' }}>
                <div
                  className="grid text-xs font-mono px-4 py-2"
                  style={{
                    gridTemplateColumns: '2rem 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 5rem',
                    background: '#080e1a',
                    color: '#334155',
                  }}
                >
                  <span>#</span>
                  <span>Entry</span>
                  <span>Stop</span>
                  <span>H.Stop</span>
                  <span>Lookback</span>
                  <span>Trades</span>
                  <span>Cash%</span>
                  <span>P.Factor</span>
                  <span>Win%</span>
                  <span>Return</span>
                  <span>Drawdown</span>
                  <span></span>
                </div>

                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {sorted.map((r, i) => {
                    const isActive =
                      Math.abs(r.entryDipPct - config.entryDipPct) < 0.001 &&
                      Math.abs(r.trailingStopPct - config.trailingStopPct) < 0.001 &&
                      r.lookbackDays === config.lookbackDays &&
                      Math.abs(r.hardStopPct - config.hardStopPct) < 0.001;
                    const isRec =
                      recommended &&
                      r.entryDipPct === recommended.entryDipPct &&
                      r.trailingStopPct === recommended.trailingStopPct &&
                      r.lookbackDays === recommended.lookbackDays &&
                      r.hardStopPct === recommended.hardStopPct;
                    const pfColor = r.profitFactor >= 2 ? '#4ade80' : r.profitFactor >= 1 ? '#f59e0b' : '#f87171';

                    return (
                      <div
                        key={i}
                        className="grid text-xs font-mono px-4 py-2.5 items-center"
                        style={{
                          gridTemplateColumns: '2rem 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 5rem',
                          background: isActive ? '#0f1f33' : i % 2 === 0 ? '#0c1626' : '#080e1a',
                          borderBottom: '1px solid #0f172a',
                          borderLeft: isRec ? '2px solid #38bdf8' : isActive ? '2px solid #f59e0b' : '2px solid transparent',
                        }}
                      >
                        <span style={{ color: '#334155' }}>{i + 1}</span>
                        <span style={{ color: '#94a3b8' }}>{(r.entryDipPct * 100).toFixed(0)}%</span>
                        <span style={{ color: '#94a3b8' }}>{(r.trailingStopPct * 100).toFixed(0)}%</span>
                        <span style={{ color: '#94a3b8' }}>{r.hardStopPct === 0 ? 'off' : (r.hardStopPct * 100).toFixed(0) + '%'}</span>
                        <span style={{ color: '#94a3b8' }}>{r.lookbackDays}d</span>
                        <span style={{ color: '#e2e8f0' }}>{r.trades}</span>
                        <span style={{ color: r.timeInMarketPct < 15 ? '#f59e0b' : '#94a3b8' }}>
                          {(100 - r.timeInMarketPct).toFixed(0)}%
                        </span>
                        <span style={{ color: pfColor, fontWeight: 600 }}>
                          {r.profitFactor >= 99 ? '∞' : r.profitFactor.toFixed(2)}
                        </span>
                        <span style={{ color: '#e2e8f0' }}>{r.winRate}%</span>
                        <span style={{ color: r.totalReturnPct >= 0 ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                          {(r.totalReturnPct >= 0 ? '+' : '') + r.totalReturnPct + '%'}
                        </span>
                        <span style={{ color: '#f87171' }}>-{r.maxDrawdownPct}%</span>
                        <button
                          onClick={() =>
                            onConfigApply({
                              ...config,
                              lookbackDays: r.lookbackDays,
                              hardStopPct: r.hardStopPct,
                              entryDipPct: r.entryDipPct,
                              trailingStopPct: r.trailingStopPct,
                              trailingStopActivationPct: r.trailingStopActivationPct,
                              reEntryDipPct: r.reEntryDipPct,
                            })
                          }
                          className="px-2 py-0.5 rounded text-xs font-mono"
                          style={{ background: '#1e293b', color: '#38bdf8', cursor: 'pointer' }}
                        >
                          Apply
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs font-mono mt-3" style={{ color: '#334155' }}>
                Top 30 of {results.filter((r) => r.trades >= minTrades).length} combinations with ≥{minTrades} trades
                ({results.filter((r) => r.trades > 0).length} total valid).
                Blue border = recommended. Amber border = current config.
                P.Factor: green ≥2, amber ≥1, red &lt;1. Cash%: amber = &gt;85% idle.
              </p>
            </>
          )}

          {/* ── HEATMAP VIEW ───────────────────────────────────────────── */}
          {view === 'heatmap' && heatmap && (
            <div>
              {/* Axis selectors */}
              <div className="flex gap-4 mb-4 flex-wrap items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono" style={{ color: '#475569' }}>X axis:</span>
                  <select
                    value={heatX}
                    onChange={(e) => setHeatXSafe(e.target.value as ParamKey)}
                    className="text-xs font-mono px-2 py-1 rounded"
                    style={{ background: '#0c1626', border: '1px solid #1e293b', color: '#94a3b8' }}
                  >
                    {(Object.keys(PARAM_LABELS) as ParamKey[]).map((k) => (
                      <option key={k} value={k}>{PARAM_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono" style={{ color: '#475569' }}>Y axis:</span>
                  <select
                    value={heatY}
                    onChange={(e) => setHeatYSafe(e.target.value as ParamKey)}
                    className="text-xs font-mono px-2 py-1 rounded"
                    style={{ background: '#0c1626', border: '1px solid #1e293b', color: '#94a3b8' }}
                  >
                    {(Object.keys(PARAM_LABELS) as ParamKey[]).filter((k) => k !== heatX).map((k) => (
                      <option key={k} value={k}>{PARAM_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
                <span className="text-xs font-mono" style={{ color: '#334155' }}>
                  (cells show best return across free params)
                </span>
              </div>

              {/* Colour legend */}
              <div className="flex gap-3 mb-4 flex-wrap">
                {[
                  ['≤ -10%', '#7f1d1d'],
                  ['-10% to 0%', '#f87171'],
                  ['0% to +5%', '#f59e0b'],
                  ['+5% to +15%', '#4ade80'],
                  ['> +15%', '#16a34a'],
                ].map(([label, color]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
                    <span className="text-xs font-mono" style={{ color: '#475569' }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div
                className="rounded-xl overflow-hidden p-4"
                style={{ background: '#0c1626', border: '1px solid #1e293b' }}
              >
                {/* X axis labels */}
                <div className="flex mb-1 ml-16">
                  {heatmap.xVals.map((xv) => (
                    <div
                      key={xv}
                      className="text-xs font-mono text-center"
                      style={{ flex: 1, color: '#475569' }}
                    >
                      {(xv * 100).toFixed(0)}%
                    </div>
                  ))}
                </div>
                <p className="text-xs font-mono text-center mb-2" style={{ color: '#334155' }}>
                  {PARAM_LABELS[heatX]}
                </p>

                {/* Rows */}
                {heatmap.yVals.map((yv, yi) => (
                  <div key={yv} className="flex items-center mb-1">
                    {/* Y axis label */}
                    <div
                      className="text-xs font-mono text-right pr-2 shrink-0"
                      style={{ width: '4rem', color: '#475569' }}
                    >
                      {(yv * 100).toFixed(0)}%
                    </div>
                    {/* Cells */}
                    {heatmap.cells[yi].map((val, xi) => (
                      <div
                        key={xi}
                        style={{ flex: 1, position: 'relative' }}
                        onMouseEnter={() => setHoveredCell({ x: xi, y: yi, val })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div
                          className="mx-0.5 rounded flex items-center justify-center text-xs font-mono font-semibold cursor-default"
                          style={{
                            background: returnColor(val),
                            color: '#000',
                            height: '2.5rem',
                            opacity: 0.85,
                          }}
                        >
                          {val >= 0 ? '+' : ''}{val.toFixed(0)}%
                        </div>
                        {/* Tooltip */}
                        {hoveredCell?.x === xi && hoveredCell?.y === yi && (
                          <div
                            className="absolute z-10 px-3 py-2 rounded text-xs font-mono whitespace-nowrap"
                            style={{
                              background: '#0c1626',
                              border: '1px solid #1e293b',
                              bottom: '110%',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              color: '#e2e8f0',
                            }}
                          >
                            <p>{PARAM_LABELS[heatX]}: {(heatmap.xVals[xi] * 100).toFixed(0)}%</p>
                            <p>{PARAM_LABELS[heatY]}: {(heatmap.yVals[yi] * 100).toFixed(0)}%</p>
                            <p style={{ color: val >= 0 ? '#4ade80' : '#f87171' }}>
                              Best return: {val >= 0 ? '+' : ''}{val.toFixed(2)}%
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}

                {/* Y axis title */}
                <p className="text-xs font-mono text-center mt-2" style={{ color: '#334155' }}>
                  {PARAM_LABELS[heatY]}
                </p>
              </div>
            </div>
          )}

          {/* ── SENSITIVITY VIEW ───────────────────────────────────────── */}
          {view === 'sensitivity' && sensitivity && (
            <div>
              <p className="text-xs font-mono mb-4" style={{ color: '#475569' }}>
                Average return across all combinations for each parameter value. Shows which parameters have the most impact.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {(Object.keys(sensitivity) as ParamKey[]).map((param) => {
                  const data = sensitivity[param];
                  const color = PARAM_COLORS[param];
                  return (
                    <div
                      key={param}
                      className="rounded-xl p-4"
                      style={{ background: '#0c1626', border: '1px solid #1e293b' }}
                    >
                      <p className="text-xs font-mono mb-3 font-semibold" style={{ color }}>
                        {PARAM_LABELS[param]}
                      </p>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                          <XAxis
                            dataKey="label"
                            tick={{ fill: '#475569', fontSize: 10, fontFamily: 'DM Mono,monospace' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tickFormatter={(v) => v + '%'}
                            tick={{ fill: '#475569', fontSize: 10, fontFamily: 'DM Mono,monospace' }}
                            axisLine={false}
                            tickLine={false}
                            width={40}
                          />
                          <Tooltip
                            contentStyle={{
                              background: '#0c1626',
                              border: '1px solid #1e293b',
                              borderRadius: '6px',
                              fontFamily: 'DM Mono,monospace',
                              fontSize: 11,
                            }}
                            formatter={(v) => [(v as number).toFixed(2) + '%', 'Avg return']}
                          />
                          <ReferenceLine y={0} stroke="#1e293b" />
                          <Bar dataKey="avg" radius={[3, 3, 0, 0]}>
                            {data.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={entry.avg >= 0 ? color : '#f87171'}
                                fillOpacity={0.8}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs font-mono mt-3" style={{ color: '#334155' }}>
                Bars coloured by parameter (positive) or red (negative avg return). Taller bars = bigger impact on strategy returns.
              </p>
            </div>
          )}
        </>
      )}

      {results.length === 0 && !running && (
        <p className="text-xs font-mono mt-2" style={{ color: '#334155' }}>
          Click Run Optimizer to search {TOTAL} parameter combinations.
        </p>
      )}
    </div>
  );
}
