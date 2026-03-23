'use client';

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { PriceDay, RegimeDay, Trade } from '@/types';
import { formatDateShort, formatDate, formatPrice } from '@/lib/btcPrice';

interface Props {
  prices: PriceDay[];
  regimeDays: RegimeDay[];
  trades: Trade[];
}

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: PriceDay & { isSwing?: boolean };
}) {
  const { cx, cy, payload } = props;
  if (!payload?.isSwing || cx == null || cy == null) return null;
  return (
    <circle
      cx={cx} cy={cy} r={4}
      fill="#f59e0b" stroke="#f59e0b"
      strokeWidth={1.5} opacity={0.85}
    />
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: PriceDay & { isSwing?: boolean; regime?: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg px-3.5 py-2.5 font-mono text-xs"
      style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        color: '#94a3b8',
      }}
    >
      <p className="font-bold mb-1" style={{ color: '#e2e8f0' }}>
        {formatDate(d.date)}
      </p>
      <p style={{ color: '#38bdf8' }}>{formatPrice(d.price)}</p>
      {d.regime && (
        <p
          className="mt-1"
          style={{ color: d.regime === 'trending' ? '#4ade80' : '#f59e0b' }}
        >
          {d.regime === 'trending' ? '↗ trending' : '↔ choppy'}
        </p>
      )}
      {d.isSwing && (
        <p className="mt-1" style={{ color: '#f59e0b' }}>⚡ 5%+ swing day</p>
      )}
    </div>
  );
}

export default function PriceChart({ prices, regimeDays, trades }: Props) {
  // Merge regime info onto chart data
  const swingSet = new Set<number>();
  for (let i = 1; i < prices.length; i++) {
    const change = (prices[i].price - prices[i - 1].price) / prices[i - 1].price;
    if (Math.abs(change) >= 0.05) {
      swingSet.add(i - 1);
      swingSet.add(i);
    }
  }

  const chartData = prices.map((p, i) => ({
    ...p,
    isSwing: swingSet.has(i),
    regime: regimeDays[i]?.regime,
  }));

  // Entry / exit reference lines
  const entryDates = trades.map((t) => t.entryDate);
  const exitDates = trades.filter((t) => t.exitDate).map((t) => t.exitDate!);

  const interval = Math.max(1, Math.floor(prices.length / 6));

  return (
    <div className="px-8 pt-7">
      <div
        className="rounded-xl pt-6 pb-3 pl-1 pr-5"
        style={{ background: '#0c1626', border: '1px solid #1e293b' }}
      >
        <p className="font-mono text-xs px-4 pb-4" style={{ color: '#334155' }}>
          PRICE —{' '}
          <span style={{ color: '#f59e0b' }}>● SWING DAYS (≥5%)</span>
          {'  '}
          <span style={{ color: '#4ade80' }}>▲ ENTRY</span>
          {'  '}
          <span style={{ color: '#f87171' }}>▼ EXIT</span>
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

            {/* Entry lines */}
            {entryDates.map((d) => (
              <ReferenceLine key={`e-${d}`} x={d} stroke="#4ade80" strokeOpacity={0.4} strokeWidth={1} strokeDasharray="3 3" />
            ))}
            {/* Exit lines */}
            {exitDates.map((d) => (
              <ReferenceLine key={`x-${d}`} x={d} stroke="#f87171" strokeOpacity={0.4} strokeWidth={1} strokeDasharray="3 3" />
            ))}

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
