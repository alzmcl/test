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

const ASSETS = [
  { id: 'BTC', label: 'BTC / USD', color: '#f59e0b', title: 'Bitcoin Swing' },
  { id: 'ETH', label: 'ETH / USD', color: '#818cf8', title: 'Ethereum Swing' },
  { id: 'QQQ', label: 'QQQ / USD', color: '#4ade80', title: 'Nasdaq (QQQ) Swing' },
];

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
  const [fromDate, setFromDate] = useState(() => new Date(Date.now() - 730 * 86_400_000).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [activeTab, setActiveTab] = useState<Tab>('chart');
  const [assetId, setAssetId] = useState('BTC');

  const asset = ASSETS.find((a) => a.id === assetId) ?? ASSETS[0];

  // ── Fetch prices from our Next.js API route
  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/prices?symbol=${assetId}&from=${fromDate}&to=${toDate}`)
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
  }, [assetId, fromDate, toDate]);

  const filteredPrices = prices;

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
      const prev = filteredPrices[i - 1];
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
            style={{ color: asset.color }}
          >
            {asset.label}
          </span>
          <span className="text-xs font-mono" style={{ color: '#334155' }}>
            regime-filtered swing backtester
          </span>

          {/* Asset picker */}
          <div className="flex gap-1 ml-4">
            {ASSETS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAssetId(a.id)}
                className="text-xs font-mono px-2.5 py-1 rounded"
                style={{
                  background: assetId === a.id ? a.color + '22' : 'transparent',
                  color: assetId === a.id ? a.color : '#475569',
                  border: assetId === a.id ? `1px solid ${a.color}44` : '1px solid transparent',
                }}
              >
                {a.id}
              </button>
            ))}
          </div>

          {/* Date range controls */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-mono" style={{ color: '#334155' }}>from</span>
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => { if (e.target.value) setFromDate(e.target.value); }}
              className="text-xs font-mono px-2 py-1 rounded"
              style={{ background: '#0c1626', border: '1px solid #1e293b', color: '#94a3b8', colorScheme: 'dark' }}
            />
            <span className="text-xs font-mono" style={{ color: '#334155' }}>to</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => { if (e.target.value) setToDate(e.target.value); }}
              className="text-xs font-mono px-2 py-1 rounded"
              style={{ background: '#0c1626', border: '1px solid #1e293b', color: '#94a3b8', colorScheme: 'dark' }}
            />
          </div>
        </div>
        <h1
          className="text-3xl font-bold"
          style={{ letterSpacing: '-0.03em', lineHeight: 1.1, color: '#f1f5f9' }}
        >
          {asset.title}<br />
          <span style={{ color: asset.color }}>Strategy Scanner</span>
        </h1>
      </header>

      {loading && (
        <div className="flex items-center justify-center gap-3 min-h-[300px]" style={{ color: '#475569' }}>
          <div
            className="w-2 h-2 rounded-full animate-pulse-dot"
            style={{ background: '#38bdf8' }}
          />
          Fetching {asset.id} data…
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
              <PriceChart prices={filteredPrices} regimeDays={regimeDays} trades={result?.trades ?? []} numSlots={config.numSlots ?? 1} />
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
              cashYieldPct={config.cashYieldPct ?? 0}
            />
          )}

          {/* Optimizer tab */}
          {activeTab === 'optimizer' && (
            <Optimizer
              prices={filteredPrices}
              config={config}
              onConfigApply={(c) => {
                setConfig(c);
                setActiveTab('chart');
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
