'use client';

import { formatDate, formatPrice } from '@/lib/btcPrice';

interface Swing {
  fromDate: number;
  toDate: number;
  fromPrice: number;
  toPrice: number;
  change: number;
}

export default function SwingTable({ swings }: { swings: Swing[] }) {
  const sorted = [...swings].sort((a, b) => b.toDate - a.toDate);

  return (
    <div className="px-8 pt-7">
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: '#0c1626', border: '1px solid #1e293b' }}
      >
        {/* Header */}
        <div
          className="px-4 py-4 border-b flex items-center justify-between"
          style={{ borderColor: '#0f172a' }}
        >
          <span className="text-sm font-semibold" style={{ color: '#94a3b8' }}>
            All 5%+ Daily Swings
          </span>
          <span className="text-xs font-mono" style={{ color: '#334155' }}>
            {swings.length} events
          </span>
        </div>

        {/* Column labels */}
        <div
          className="grid px-4 py-2 text-xs font-mono uppercase tracking-widest"
          style={{
            gridTemplateColumns: '1fr 1fr 1fr 80px',
            gap: '8px',
            background: '#080e1a',
            color: '#334155',
          }}
        >
          <span>Date</span>
          <span>From → To</span>
          <span>$ Move</span>
          <span className="text-right">% Chg</span>
        </div>

        {/* Rows */}
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {sorted.map((s, i) => {
            const isUp = s.change > 0;
            const pct = (s.change * 100).toFixed(2);
            const dMove = s.toPrice - s.fromPrice;

            return (
              <div
                key={i}
                className="grid px-4 py-2.5 border-b text-xs font-mono transition-colors hover:bg-[#0c1626]/60"
                style={{
                  gridTemplateColumns: '1fr 1fr 1fr 80px',
                  gap: '8px',
                  alignItems: 'center',
                  borderColor: '#0f172a',
                }}
              >
                <span style={{ color: '#64748b' }}>{formatDate(s.toDate)}</span>
                <span style={{ color: '#475569' }}>
                  {formatPrice(s.fromPrice)}
                  <span style={{ color: '#1e293b', margin: '0 6px' }}>→</span>
                  <span style={{ color: isUp ? '#4ade80' : '#f87171' }}>
                    {formatPrice(s.toPrice)}
                  </span>
                </span>
                <span style={{ color: isUp ? '#4ade80' : '#f87171' }}>
                  {isUp ? '+' : ''}{formatPrice(dMove)}
                </span>
                <span
                  className="text-right rounded px-2 py-0.5 font-semibold"
                  style={{
                    background: isUp ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                    color: isUp ? '#4ade80' : '#f87171',
                  }}
                >
                  {isUp ? '+' : ''}{pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
