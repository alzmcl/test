'use client';

import type { BacktestConfig, BacktestResult } from '@/types';
import { DEFAULT_BACKTEST_CONFIG, RANGE_MODE_CONFIG } from '@/types';
import { formatPrice } from '@/lib/btcPrice';

interface Props {
  result: BacktestResult | null;
  config: BacktestConfig;
  onConfigChange: (c: BacktestConfig) => void;
}

function Slider({
  label, value, min, max, step, format, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-mono" style={{ color: '#64748b' }}>{label}</span>
        <span className="text-xs font-mono font-semibold" style={{ color: '#38bdf8' }}>
          {format(value)}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded appearance-none cursor-pointer"
        style={{ accentColor: '#38bdf8', background: '#1e293b' }}
      />
    </div>
  );
}

function SliderGroup({ label }: { label: string }) {
  return (
    <p className="text-xs font-mono uppercase tracking-widest pt-1" style={{ color: '#334155' }}>
      {label}
    </p>
  );
}

export default function BacktestPanel({ result, config, onConfigChange }: Props) {
  const s = result?.stats;

  function update(patch: Partial<BacktestConfig>) {
    onConfigChange({ ...config, ...patch });
  }

  return (
    <div className="px-8 pt-7">
      <div style={{ background: 'red', color: 'white', padding: 8, marginBottom: 8, fontFamily: 'monospace', fontSize: 12 }}>
        *** DEBUG: BacktestPanel v2 rendering ***
      </div>
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: '#0c1626', border: '1px solid #1e293b' }}
      >
        {/* Title bar */}
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: '#0f172a' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: '#94a3b8' }}>
              Backtester
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => onConfigChange({ ...config, ...DEFAULT_BACKTEST_CONFIG })}
                style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #94a3b8', borderRadius: 4, padding: '2px 10px', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer' }}
              >
                Default
              </button>
              <button
                onClick={() => onConfigChange({ ...config, ...RANGE_MODE_CONFIG })}
                style={{ background: '#0e3a52', color: '#38bdf8', border: '1px solid #38bdf8', borderRadius: 4, padding: '2px 10px', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer' }}
              >
                Range
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs font-mono" style={{ color: '#475569' }}>Regime filter</span>
            <div
              onClick={() => update({ regimeFilter: !config.regimeFilter })}
              className="relative w-8 h-4 rounded-full transition-colors cursor-pointer"
              style={{
                background: config.regimeFilter ? '#38bdf8' : '#1e293b',
              }}
            >
              <div
                className="absolute top-0.5 w-3 h-3 rounded-full transition-transform"
                style={{
                  background: '#fff',
                  left: config.regimeFilter ? '17px' : '2px',
                }}
              />
            </div>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Controls */}
          <div className="p-5 border-r flex flex-col gap-4" style={{ borderColor: '#0f172a' }}>
            <SliderGroup label="Entry / Exit" />
            <Slider
              label="Entry dip %"
              value={config.entryDipPct}
              min={0.01} max={0.12} step={0.005}
              format={(v) => (v * 100).toFixed(1) + '%'}
              onChange={(v) => update({ entryDipPct: v })}
            />
            <Slider
              label="Trailing stop activation %"
              value={config.trailingStopActivationPct}
              min={0.01} max={0.15} step={0.005}
              format={(v) => (v * 100).toFixed(1) + '%'}
              onChange={(v) => update({ trailingStopActivationPct: v })}
            />
            <Slider
              label="Trailing stop %"
              value={config.trailingStopPct}
              min={0.02} max={0.15} step={0.005}
              format={(v) => (v * 100).toFixed(1) + '%'}
              onChange={(v) => update({ trailingStopPct: v })}
            />
            <Slider
              label="Re-entry dip %"
              value={config.reEntryDipPct}
              min={0.01} max={0.10} step={0.005}
              format={(v) => (v * 100).toFixed(1) + '%'}
              onChange={(v) => update({ reEntryDipPct: v })}
            />
            <Slider
              label="Lookback window"
              value={config.lookbackDays}
              min={5} max={30} step={1}
              format={(v) => v + 'd'}
              onChange={(v) => update({ lookbackDays: v })}
            />
            <Slider
              label="Re-entry cooldown"
              value={config.reEntryCooldownBars}
              min={0} max={10} step={1}
              format={(v) => v + ' bars'}
              onChange={(v) => update({ reEntryCooldownBars: v })}
            />

            <SliderGroup label="Regime" />
            <Slider
              label="ADX period"
              value={config.regimeAdxPeriod}
              min={5} max={30} step={1}
              format={(v) => v + 'd'}
              onChange={(v) => update({ regimeAdxPeriod: v })}
            />
            <Slider
              label="ADX threshold"
              value={config.regimeAdxThreshold}
              min={10} max={40} step={1}
              format={(v) => v.toString()}
              onChange={(v) => update({ regimeAdxThreshold: v })}
            />
          </div>

          {/* Stats */}
          {s && (
            <div className="p-5">
              {/* Portfolio size input */}
              <div className="mb-4 flex items-center gap-3">
                <span className="text-xs font-mono" style={{ color: '#64748b' }}>Portfolio size</span>
                <input
                  type="number"
                  value={config.portfolioSize}
                  min={100}
                  step={1000}
                  onChange={(e) => update({ portfolioSize: Number(e.target.value) })}
                  className="text-xs font-mono px-2 py-1 rounded w-28"
                  style={{
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    color: '#94a3b8',
                  }}
                />
              </div>

              <div
                className="grid grid-cols-2 gap-x-6 gap-y-3"
                style={{ fontFamily: 'DM Mono,monospace' }}
              >
                {([
                  ['Trades',         s.totalTrades],
                  ['Win rate',       s.winRate + '%'],
                  ['Avg win',        '+' + s.avgWinPct + '%'],
                  ['Avg loss',       s.avgLossPct + '%'],
                  ['Total return',   (s.totalReturnPct >= 0 ? '+' : '') + s.totalReturnPct + '%'],
                  ['Max drawdown',   '-' + s.maxDrawdownPct + '%'],
                  ['Sharpe (proxy)', s.sharpeProxy],
                  ['In choppy',      s.tradesInChoppy + ' trades'],
                  ['Final value',    formatPrice(s.portfolioFinalValue)],
                ] as [string, string | number][]).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs mb-0.5" style={{ color: '#334155' }}>{k}</p>
                    <p
                      className="text-sm font-semibold"
                      style={{
                        color:
                          typeof v === 'string' && v.startsWith('+')
                            ? '#4ade80'
                            : typeof v === 'string' && v.startsWith('-')
                            ? '#f87171'
                            : '#e2e8f0',
                      }}
                    >
                      {v}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
