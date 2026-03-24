'use client';

import { useState } from 'react';
import type { Trade } from '@/types';
import { formatDate, formatPrice } from '@/lib/btcPrice';

interface Props {
  trades: Trade[];
  portfolioSize: number;
}

type SortKey = 'date' | 'pnl' | 'duration';

function badge(text: string, color: string) {
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-xs font-mono"
      style={{ background: color + '22', color }}
    >
      {text}
    </span>
  );
}

export default function TradeLog({ trades, portfolioSize }: Props) {
  const [sort, setSort] = useState<SortKey>('date');

  const closed = trades.filter((t) => t.exitDate !== null && t.pnlPct !== null && t.exitReason !== 'end_of_data');

  const sorted = [...closed].sort((a, b) => {
    if (sort === 'date') return b.entryDate !== a.entryDate ? b.entryDate - a.entryDate : a.slot - b.slot;
    if (sort === 'pnl') return (a.pnlPct ?? 0) - (b.pnlPct ?? 0);
    if (sort === 'duration') {
      const da = (a.exitDate ?? a.entryDate) - a.entryDate;
      const db = (b.exitDate ?? b.entryDate) - b.entryDate;
      return db - da;
    }
    return 0;
  });

  const wins = closed.filter((t) => (t.pnlPct ?? 0) > 0);
  const losses = closed.filter((t) => (t.pnlPct ?? 0) <= 0);
  const bestPnl = closed.length ? Math.max(...closed.map((t) => t.pnlPct ?? 0)) : 0;
  const worstPnl = closed.length ? Math.min(...closed.map((t) => t.pnlPct ?? 0)) : 0;

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
      {/* Summary row */}
      <div className="flex flex-wrap gap-6 mb-5" style={{ fontFamily: 'DM Mono,monospace' }}>
        {[
          ['Trades', closed.length, '#e2e8f0'],
          ['Wins', wins.length, '#4ade80'],
          ['Losses', losses.length, '#f87171'],
          ['Best', '+' + (bestPnl * 100).toFixed(2) + '%', '#4ade80'],
          ['Worst', (worstPnl * 100).toFixed(2) + '%', '#f87171'],
        ].map(([k, v, c]) => (
          <div key={k as string}>
            <p className="text-xs mb-0.5" style={{ color: '#334155' }}>{k}</p>
            <p className="text-sm font-semibold" style={{ color: c as string }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Sort controls */}
      <div className="flex gap-1 mb-3">
        <span className="text-xs font-mono self-center mr-1" style={{ color: '#334155' }}>Sort:</span>
        <SortBtn id="date" label="Date" />
        <SortBtn id="pnl" label="P&L" />
        <SortBtn id="duration" label="Duration" />
      </div>

      {closed.length === 0 ? (
        <p className="text-xs font-mono" style={{ color: '#475569' }}>
          No closed trades yet — adjust the sliders to generate signals.
        </p>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid #1e293b' }}
        >
          {/* Table header */}
          <div
            className="grid text-xs font-mono px-4 py-2"
            style={{
              gridTemplateColumns: '1fr 1fr 0.6fr 0.4fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr',
              background: '#080e1a',
              color: '#334155',
            }}
          >
            <span>Entry</span>
            <span>Exit</span>
            <span>Days</span>
            <span>Slot</span>
            <span>Amount</span>
            <span>Entry $</span>
            <span>Exit $</span>
            <span>Reason</span>
            <span>Regime</span>
            <span>P&L %</span>
            <span>P&L $</span>
          </div>

          {/* Table rows */}
          <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
            {sorted.map((t, i) => {
              const pnl = t.pnlPct ?? 0;
              const pnlDollar = Math.round(portfolioSize * pnl);
              const durationMs = (t.exitDate ?? t.entryDate) - t.entryDate;
              const durationDays = Math.round(durationMs / 86_400_000);
              const isWin = pnl > 0;

              return (
                <div
                  key={i}
                  className="grid text-xs font-mono px-4 py-2.5 items-center"
                  style={{
                    gridTemplateColumns: '1fr 1fr 0.6fr 0.4fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr',
                    background: i % 2 === 0 ? '#0c1626' : '#080e1a',
                    borderBottom: '1px solid #0f172a',
                  }}
                >
                  <span style={{ color: '#64748b' }}>{formatDate(t.entryDate)}</span>
                  <span style={{ color: '#64748b' }}>
                    {t.exitDate ? formatDate(t.exitDate) : '—'}
                  </span>
                  <span style={{ color: '#475569' }}>{durationDays}d</span>
                  <span style={{ color: '#475569' }}>S{(t.slot ?? 0) + 1}</span>
                  <span style={{ color: '#64748b' }}>{formatPrice(Math.round((t.entryValue ?? 0) * portfolioSize))}</span>
                  <span style={{ color: '#94a3b8' }}>{formatPrice(t.entryPrice)}</span>
                  <span style={{ color: '#94a3b8' }}>
                    {t.exitPrice ? formatPrice(t.exitPrice) : '—'}
                  </span>
                  <span>
                    {t.exitReason === 'trailing_stop' && badge('stop', isWin ? '#4ade80' : '#f87171')}
                    {t.exitReason === 'hard_stop' && badge('hard stop', '#f87171')}
                    {t.exitReason === 'end_of_data' && badge('open', '#f59e0b')}
                    {t.exitReason === 're_entry_dip' && badge('re-entry', '#38bdf8')}
                  </span>
                  <span>
                    {t.regime === 'choppy' && badge('choppy', '#f59e0b')}
                    {t.regime === 'trending' && badge('trend', '#f87171')}
                    {t.regime === 'unknown' && badge('?', '#475569')}
                  </span>
                  <span style={{ color: isWin ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                    {(pnl >= 0 ? '+' : '') + (pnl * 100).toFixed(2) + '%'}
                  </span>
                  <span style={{ color: isWin ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                    {(pnlDollar >= 0 ? '+' : '-') + formatPrice(Math.abs(pnlDollar))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
