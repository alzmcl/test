'use client';

import { useState } from 'react';
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
  trades: number;
  winRate: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeProxy: number;
}

type SortKey = 'totalReturnPct' | 'sharpeProxy' | 'winRate' | 'maxDrawdownPct';

const ENTRY_DIPS = [0.02, 0.03, 0.04, 0.05, 0.06, 0.08];
const TRAILING_STOPS = [0.04, 0.05, 0.06, 0.08, 0.10];
const ACTIVATIONS = [0.03, 0.05, 0.07, 0.10];
const REENTRY_DIPS = [0.02, 0.03, 0.05, 0.07];

export default function Optimizer({ prices, config, onConfigApply }: Props) {
  const [results, setResults] = useState<OptResult[]>([]);
  const [running, setRunning] = useState(false);
  const [sort, setSort] = useState<SortKey>('totalReturnPct');
  const [progress, setProgress] = useState(0);

  const total = ENTRY_DIPS.length * TRAILING_STOPS.length * ACTIVATIONS.length * REENTRY_DIPS.length;

  function runOptimizer() {
    setRunning(true);
    setProgress(0);
    setResults([]);

    // Use setTimeout to yield to UI before heavy computation
    setTimeout(() => {
      const found: OptResult[] = [];
      let count = 0;

      for (const entryDipPct of ENTRY_DIPS) {
        for (const trailingStopPct of TRAILING_STOPS) {
          for (const trailingStopActivationPct of ACTIVATIONS) {
            for (const reEntryDipPct of REENTRY_DIPS) {
              // Skip invalid combos: activation must be <= trailing stop
              if (trailingStopActivationPct > trailingStopPct + 0.02) {
                count++;
                continue;
              }

              const testConfig: BacktestConfig = {
                ...config,
                entryDipPct,
                trailingStopPct,
                trailingStopActivationPct,
                reEntryDipPct,
              };

              const res = runBacktest(prices, testConfig);
              const s = res.stats;

              found.push({
                entryDipPct,
                trailingStopPct,
                trailingStopActivationPct,
                reEntryDipPct,
                trades: s.totalTrades,
                winRate: s.winRate,
                totalReturnPct: s.totalReturnPct,
                maxDrawdownPct: s.maxDrawdownPct,
                sharpeProxy: s.sharpeProxy,
              });

              count++;
            }
          }
        }
      }

      setProgress(100);
      setResults(found);
      setRunning(false);
    }, 10);
  }

  const sorted = [...results].sort((a, b) => {
    if (sort === 'maxDrawdownPct') return a[sort] - b[sort]; // lower is better
    return b[sort] - a[sort]; // higher is better
  }).slice(0, 25);

  const SortBtn = ({ id, label }: { id: SortKey; label: string }) => (
    <button
      onClick={() => setSort(id)}
      className="text-xs font-mono px-2 py-1 rounded"
      style={{
        background: sort === id ? '#1e293b' : 'transparent',
        color: sort === id ? '#38bdf8' : '#475569',
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="px-8 pt-6">
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div>
          <p className="text-sm font-semibold mb-0.5" style={{ color: '#94a3b8' }}>Parameter Optimizer</p>
          <p className="text-xs font-mono" style={{ color: '#475569' }}>
            Grid search across {total} combinations — entry dip, trailing stop, activation, re-entry dip.
            Other params held at current config values.
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
          {running ? `Running… ${Math.round(progress)}%` : 'Run Optimizer'}
        </button>
      </div>

      {results.length > 0 && (
        <>
          <div className="flex gap-1 mb-3 flex-wrap">
            <span className="text-xs font-mono self-center mr-1" style={{ color: '#334155' }}>Sort:</span>
            <SortBtn id="totalReturnPct" label="Return" />
            <SortBtn id="sharpeProxy" label="Sharpe" />
            <SortBtn id="winRate" label="Win rate" />
            <SortBtn id="maxDrawdownPct" label="Min drawdown" />
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid #1e293b' }}
          >
            {/* Header */}
            <div
              className="grid text-xs font-mono px-4 py-2"
              style={{
                gridTemplateColumns: '2rem 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 5rem',
                background: '#080e1a',
                color: '#334155',
              }}
            >
              <span>#</span>
              <span>Entry</span>
              <span>Stop</span>
              <span>Activ.</span>
              <span>Re-entry</span>
              <span>Trades</span>
              <span>Win%</span>
              <span>Return</span>
              <span>Drawdown</span>
              <span>Sharpe</span>
            </div>

            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {sorted.map((r, i) => {
                const isActive =
                  Math.abs(r.entryDipPct - config.entryDipPct) < 0.001 &&
                  Math.abs(r.trailingStopPct - config.trailingStopPct) < 0.001 &&
                  Math.abs(r.trailingStopActivationPct - config.trailingStopActivationPct) < 0.001 &&
                  Math.abs(r.reEntryDipPct - config.reEntryDipPct) < 0.001;

                return (
                  <div
                    key={i}
                    className="grid text-xs font-mono px-4 py-2.5 items-center"
                    style={{
                      gridTemplateColumns: '2rem 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 5rem',
                      background: isActive ? '#0f1f33' : i % 2 === 0 ? '#0c1626' : '#080e1a',
                      borderBottom: '1px solid #0f172a',
                      borderLeft: isActive ? '2px solid #38bdf8' : '2px solid transparent',
                    }}
                  >
                    <span style={{ color: '#334155' }}>{i + 1}</span>
                    <span style={{ color: '#94a3b8' }}>{(r.entryDipPct * 100).toFixed(0)}%</span>
                    <span style={{ color: '#94a3b8' }}>{(r.trailingStopPct * 100).toFixed(0)}%</span>
                    <span style={{ color: '#94a3b8' }}>{(r.trailingStopActivationPct * 100).toFixed(0)}%</span>
                    <span style={{ color: '#94a3b8' }}>{(r.reEntryDipPct * 100).toFixed(0)}%</span>
                    <span style={{ color: '#e2e8f0' }}>{r.trades}</span>
                    <span style={{ color: '#e2e8f0' }}>{r.winRate}%</span>
                    <span style={{ color: r.totalReturnPct >= 0 ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                      {(r.totalReturnPct >= 0 ? '+' : '') + r.totalReturnPct + '%'}
                    </span>
                    <span style={{ color: '#f87171' }}>-{r.maxDrawdownPct}%</span>
                    <button
                      onClick={() =>
                        onConfigApply({
                          ...config,
                          entryDipPct: r.entryDipPct,
                          trailingStopPct: r.trailingStopPct,
                          trailingStopActivationPct: r.trailingStopActivationPct,
                          reEntryDipPct: r.reEntryDipPct,
                        })
                      }
                      className="px-2 py-0.5 rounded text-xs font-mono"
                      style={{
                        background: '#1e293b',
                        color: '#38bdf8',
                        cursor: 'pointer',
                      }}
                    >
                      Apply
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs font-mono mt-3" style={{ color: '#334155' }}>
            Top 25 of {results.filter((r) => r.trades > 0).length} valid combinations.
            Optimised on historical data — results may not generalise forward.
          </p>
        </>
      )}
    </div>
  );
}
