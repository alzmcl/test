'use client';

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PriceDay, RegimeDay, Trade } from '@/types';
import { formatDateShort, formatDate, formatPrice } from '@/lib/btcPrice';

interface Props {
  prices: PriceDay[];
  regimeDays: RegimeDay[];
  trades: Trade[];
}

type TradeMarker = 'entry' | 'win' | 'loss';

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: PriceDay & { tradeMarker?: TradeMarker };
}) {
  const { cx, cy, payload } = props;
  if (!payload?.tradeMarker || cx == null || cy == null) return null;

  if (payload.tradeMarker === 'entry') {
    // upward triangle, cyan
    return <polygon points={`${cx},${cy - 7} ${cx - 5},${cy + 4} ${cx + 5},${cy + 4}`} fill="#fbbf24" opacity={0.9} />;
  }
  const color = payload.tradeMarker === 'win' ? '#4ade80' : '#f87171';
  // downward triangle
  return <polygon points={`${cx},${cy + 7} ${cx - 5},${cy - 4} ${cx + 5},${cy - 4}`} fill={color} opacity={0.9} />;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: PriceDay & { tradeMarker?: TradeMarker; regime?: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg px-3.5 py-2.5 font-mono text-xs"
      style={{ background: '#0f172a', border: '1px solid #1e293b', color: '#94a3b8' }}
    >
      <p className="font-bold mb-1" style={{ color: '#e2e8f0' }}>{formatDate(d.date)}</p>
      <p style={{ color: '#38bdf8' }}>{formatPrice(d.price)}</p>
      {d.regime && (
        <p className="mt-1" style={{ color: d.regime === 'trending' ? '#4ade80' : '#f59e0b' }}>
          {d.regime === 'trending' ? '↗ trending' : '↔ choppy'}
        </p>
      )}
      {d.tradeMarker === 'entry' && <p className="mt-1" style={{ color: '#fbbf24' }}>▲ entry</p>}
      {d.tradeMarker === 'win'   && <p className="mt-1" style={{ color: '#4ade80' }}>▼ exit (win)</p>}
      {d.tradeMarker === 'loss'  && <p className="mt-1" style={{ color: '#f87171' }}>▼ exit (loss)</p>}
    </div>
  );
}

export default function PriceChart({ prices, regimeDays, trades }: Props) {
  const entryDates = new Set(trades.map((t) => t.entryDate));
  const exitMap = new Map<number, 'win' | 'loss'>();
  trades.forEach((t) => {
    if (t.exitDate != null && t.pnlPct != null) {
      exitMap.set(t.exitDate, t.pnlPct >= 0 ? 'win' : 'loss');
    }
  });

  const chartData = prices.map((p, i) => ({
    ...p,
    regime: regimeDays[i]?.regime,
    tradeMarker: entryDates.has(p.date)
      ? ('entry' as TradeMarker)
      : exitMap.has(p.date)
        ? exitMap.get(p.date)
        : undefined,
  }));

  const interval = Math.max(1, Math.floor(prices.length / 6));

  return (
    <div className="px-8 pt-7">
      <div
        className="rounded-xl pt-6 pb-3 pl-1 pr-5"
        style={{ background: '#0c1626', border: '1px solid #1e293b' }}
      >
        <p className="font-mono text-xs px-4 pb-4" style={{ color: '#334155' }}>
          PRICE —{' '}
          <span style={{ color: '#fbbf24' }}>▲ ENTRY</span>
          {'  '}
          <span style={{ color: '#4ade80' }}>▼ WIN</span>
          {'  '}
          <span style={{ color: '#f87171' }}>▼ LOSS</span>
        </p>

        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tick={{ fill: '#334155', fontSize: 10, fontFamily: 'DM Mono,monospace' }}
              axisLine={false} tickLine={false}
              interval={interval}
            />
            <YAxis
              tickFormatter={(v) => '$' + (v / 1000).toFixed(0) + 'k'}
              tick={{ fill: '#334155', fontSize: 10, fontFamily: 'DM Mono,monospace' }}
              axisLine={false} tickLine={false}
              width={48} domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="price"
              stroke="#38bdf8"
              strokeWidth={1.5}
              fill="url(#priceGrad)"
              dot={<CustomDot />}
              activeDot={{ r: 5, fill: '#38bdf8', stroke: '#060b14', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
