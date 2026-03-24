'use client';

import { useState, useEffect } from 'react';
import type { PriceDay, BacktestConfig, BacktestResult } from '@/types';
import { DEFAULT_BACKTEST_CONFIG } from '@/types';
import { detectRegimes } from '@/lib/regime';
import { runBacktest } from '@/lib/backtester';
import { formatDate, formatPrice } from '@/lib/btcPrice';
import StatCards from './StatCards';
import PriceChart from './PriceChart';
import SwingTable from './SwingTable';
import BacktestPanel from './BacktestPanel';
import TradeLog from './TradeLog';
import EquityCurve from './EquityCurve';
import Optimizer from './Optimizer';

const THRESHOLD = 0.05;
type Tab = 'chart' | 'trades' | 'equity' | 'optimizer';

const TABS: { id: Tab; label: string }[] = [
  { id: 'chart',     label: 'Chart' },
  { id: 'trades',    label: 'Trades' },
  { id: 'equity',    label: 'Equity' },
  { id: 'optimizer', label: 'Optimizer' },
];

export default function BTCSwingAnalyzer() {
  const [prices, setPrices] = useState<PriceDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<BacktestConfig>(DEFAULT_BACKTEST_CONFIG);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [days, setDays] = useState(180);
  const [startDate, setStartDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('chart');

  // ── Fetch prices from our Next.js API route
  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/prices?days=${days}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ prices: PriceDay[]; error?: string }>;
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPrices(data.prices);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [days]);

  // ── Filter prices by optional start date
  const filteredPrices = startDate
    ? prices.filter((p) => p.date >= new Date(startDate).getTime())
    : prices;

  // ── Run backtester whenever prices or config change
  useEffect(() => {
    if (filteredPrices.length < 2) return;
    const res = runBacktest(filteredPrices, config);
    setResult(res);
  }, [filteredPrices, config]);

  // ── Derive 5%+ swing events for the table
  const swings = filteredPrices.reduce(
    (acc, cur, i) => {
      if (i === 0) return acc;
      const prev = prices[i - 1];
      const change = (cur.price - prev.price) / prev.price;
      if (Math.abs(change) >= THRESHOLD) {
        acc.push({
          fromDate: prev.date,
          toDate: cur.date,
          fromPrice: prev.price,
          toPrice: cur.price,
          change,
        });
      }
      return acc;
    },
    [] as {
      fromDate: number;
      toDate: number;
      fromPrice: number;
      toPrice: number;
      change: number;
    }[]
  );

  const regimeDays = filteredPrices.length > 0
    ? detectRegimes(filteredPrices, config.regimeAdxPeriod, config.regimeAdxThreshold)
    : [];

  const stats = filteredPrices.length
    ? {
        total: swings.length,
        gains: swings.filter((s) => s.change > 0).length,
        drops: swings.filter((s) => s.change < 0).length,
        avgSwing:
          swings.reduce((a, s) => a + Math.abs(s.change) * 100, 0) /
          (swings.length || 1),
        biggestGain: Math.max(0, ...swings.map((s) => s.change)),
        biggestDrop: Math.min(0, ...swings.map((s) => s.change)),
        days: filteredPrices.length,
      }
    : null;

  return (
    <div className="min-h-screen pb-16" style={{ background: '#060b14', color: '#e2e8f0' }}>
      {/* Header */}
      <header
        className="px-8 pt-10 pb-7 border-b"
        style={{
          borderColor: '#0f172a',
          background: 'linear-gradient(180deg,#080e1a 0%,#060b14 100%)',
        }}
      >
        <div className="flex items-baseline gap-3 mb-2 flex-wrap">
          <span
            className="text-xs font-mono uppercase tracking-widest"
            style={{ color: '#f59e0b' }}
          >
            BTC / USD
          </span>
          <span className="text-xs font-mono" style={{ color: '#334155' }}>
            regime-filtered swing backtester
          </span>

          {/* Date range controls */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-mono" style={{ color: '#334155' }}>from</span>
            <input
              type="date"
              value={startDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => {
                setStartDate(e.target.value);
                // ensure we fetch enough history
                if (e.target.value) {
                  const daysNeeded = Math.ceil((Date.now() - new Date(e.target.value).getTime()) / 86400000) + 10;
                  setDays(Math.min(730, Math.max(days, daysNeeded)));
                }
              }}
              className="text-xs font-mono px-2 py-1 rounded"
              style={{ background: '#0c1626', border: '1px solid #1e293b', color: '#94a3b8', colorScheme: 'dark' }}
            />
            {startDate && (
              <button
                onClick={() => setStartDate('')}
                className="text-xs font-mono px-1.5 py-1 rounded"
                style={{ background: '#1e293b', color: '#64748b', border: '1px solid #1e293b' }}
              >
                ✕
              </button>
            )}
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="text-xs font-mono px-2 py-1 rounded"
              style={{ background: '#0c1626', border: '1px solid #1e293b', color: '#94a3b8' }}
            >
              {[90, 180, 270, 365, 730].map((d) => (
                <option key={d} value={d}>{d}d</option>
              ))}
            </select>
          </div>
        </div>
        <h1
          className="text-3xl font-bold"
          style={{ letterSpacing: '-0.03em', lineHeight: 1.1, color: '#f1f5f9' }}
        >
          Bitcoin Swing<br />
          <span style={{ color: '#38bdf8' }}>Strategy Scanner</span>
        </h1>
      </header>

      {loading && (
        <div className="flex items-center justify-center gap-3 min-h-[300px]" style={{ color: '#475569' }}>
          <div
            className="w-2 h-2 rounded-full animate-pulse-dot"
            style={{ background: '#38bdf8' }}
          />
          Fetching {days} days of BTC data…
        </div>
      )}

      {error && (
        <div className="px-8 pt-8 font-mono text-sm" style={{ color: '#f87171' }}>
          ⚠ Failed to load data: {error}
        </div>
      )}

      {!loading && !error && stats && (
        <>
          <StatCards stats={stats} />

          {/* Tab bar */}
          <div
            className="flex px-8 pt-6 gap-1 overflow-x-auto"
            style={{ borderBottom: '1px solid #0f172a' }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2 text-xs font-mono rounded-t transition-colors whitespace-nowrap"
                style={{
                  background: activeTab === tab.id ? '#0c1626' : 'transparent',
                  color: activeTab === tab.id ? '#38bdf8' : '#475569',
                  border: activeTab === tab.id ? '1px solid #1e293b' : '1px solid transparent',
                  borderBottom: activeTab === tab.id ? '1px solid #0c1626' : '1px solid transparent',
                  marginBottom: activeTab === tab.id ? '-1px' : '0',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Chart tab */}
          {activeTab === 'chart' && (
            <>
              <PriceChart prices={filteredPrices} regimeDays={regimeDays} trades={result?.trades ?? []} />
              <BacktestPanel
                result={result}
                config={config}
                onConfigChange={setConfig}
              />
              <SwingTable swings={swings} />

              {/* Reality check */}
              <div className="px-8 pt-5">
                <div
                  className="rounded-xl p-5 flex gap-4"
                  style={{ background: '#12100a', border: '1px solid #292524' }}
                >
                  <span className="text-xl leading-snug">⚠️</span>
                  <div>
                    <p className="text-sm font-semibold mb-1.5" style={{ color: '#fbbf24' }}>
                      Strategy Reality Check
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: '#78716c' }}>
                      Swings are visible <em>in hindsight</em>. Real-time execution is harder: you
                      don't know if a 3% dip becomes 5% or reverses. Exchange fees (0.1–0.5%),
                      slippage, and capital-gains tax all erode theoretical returns. The regime
                      filter improves signal quality but doesn't eliminate losses.
                      Most retail swing strategies underperform a simple hold.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Trades tab */}
          {activeTab === 'trades' && (
            <TradeLog
              trades={result?.trades ?? []}
              portfolioSize={config.portfolioSize}
            />
          )}

          {/* Equity tab */}
          {activeTab === 'equity' && (
            <EquityCurve
              equityCurve={result?.equityCurve ?? []}
              prices={filteredPrices}
              lookbackDays={config.lookbackDays}
              portfolioSize={config.portfolioSize}
            />
          )}

          {/* Optimizer tab */}
          {activeTab === 'optimizer' && (
            <Optimizer
              prices={filteredPrices}
              config={config}
              onConfigApply={(c) => {
                setConfig(c);
                setDays(730);
                setActiveTab('chart');
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
