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
  numSlots: number;
}

interface DayMarker {
  entrySlots: number[];
  exitSlots: { slot: number; outcome: 'win' | 'loss' }[];
}

function upTriangle(cx: number, cy: number, offset: number, fill: string, label: number) {
  const y = cy - 10 - offset;
  const w = 8, h = 15;
  return (
    <g key={offset}>
      <polygon points={`${cx},${y} ${cx - w},${y + h} ${cx + w},${y + h}`} fill={fill} opacity={0.9} />
      <text x={cx} y={y + h - 3} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#0f172a" style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {label}
      </text>
    </g>
  );
}

function downTriangle(cx: number, cy: number, offset: number, fill: string, label: number) {
  const y = cy + 8 + offset;
  const w = 8, h = 15;
  return (
    <g key={offset}>
      <polygon points={`${cx},${y + h} ${cx - w},${y} ${cx + w},${y}`} fill={fill} opacity={0.9} />
      <text x={cx} y={y + 10} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#0f172a" style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {label}
      </text>
    </g>
  );
}

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: PriceDay & { marker?: DayMarker };
}) {
  const { cx, cy, payload } = props;
  if (!payload?.marker || cx == null || cy == null) return null;
  const { entrySlots, exitSlots } = payload.marker;

  return (
    <g>
      {entrySlots.map((slot, i) =>
        upTriangle(cx, cy, i * 17, '#fbbf24', slot + 1)
      )}
      {exitSlots.map(({ slot, outcome }, i) =>
        downTriangle(cx, cy, i * 17, outcome === 'win' ? '#4ade80' : '#f87171', slot + 1)
      )}
    </g>
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: PriceDay & { marker?: DayMarker; regime?: string; deployedPct?: number } }[];
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
      {d.deployedPct !== undefined && (
        <p className="mt-1" style={{ color: d.deployedPct > 0 ? '#34d399' : '#475569' }}>
          {d.deployedPct === 0 ? '● in cash' : `● ${d.deployedPct.toFixed(0)}% deployed`}
        </p>
      )}
      {d.marker?.entrySlots.map((s) => (
        <p key={s} className="mt-1" style={{ color: '#fbbf24' }}>▲ entry (slot {s + 1})</p>
      ))}
      {d.marker?.exitSlots.map(({ slot, outcome }) => (
        <p key={slot} className="mt-1" style={{ color: outcome === 'win' ? '#4ade80' : '#f87171' }}>
          ▼ exit S{slot + 1} ({outcome})
        </p>
      ))}
    </div>
  );
}

export default function PriceChart({ prices, regimeDays, trades, numSlots }: Props) {
  // Build per-date marker map (aggregates all slots)
  const markerMap = new Map<number, DayMarker>();
  const getOrCreate = (date: number) => {
    if (!markerMap.has(date)) markerMap.set(date, { entrySlots: [], exitSlots: [] });
    return markerMap.get(date)!;
  };
  trades.forEach((t) => {
    getOrCreate(t.entryDate).entrySlots.push(t.slot ?? 0);
    if (t.exitDate != null && t.pnlPct != null && t.exitReason !== 'end_of_data') {
      getOrCreate(t.exitDate).exitSlots.push({ slot: t.slot ?? 0, outcome: t.pnlPct >= 0 ? 'win' : 'loss' });
    }
  });

  // Build per-date deployed slot count
  const deployedMap = new Map<number, number>();
  trades.forEach((t) => {
    const exit = t.exitDate ?? Infinity;
    prices.forEach((p) => {
      if (p.date >= t.entryDate && p.date < exit) {
        deployedMap.set(p.date, (deployedMap.get(p.date) ?? 0) + 1);
      }
    });
  });

  const chartData = prices.map((p, i) => ({
    ...p,
    regime: regimeDays[i]?.regime,
    marker: markerMap.get(p.date),
    deployedPct: Math.round(((deployedMap.get(p.date) ?? 0) / numSlots) * 100),
  }));

  const interval = Math.max(1, Math.floor(prices.length / 6));

  return (
    <div className="px-8 pt-7">
      <div
        className="rounded-xl pt-6 pb-1 pl-1 pr-5"
        style={{ background: '#0c1626', border: '1px solid #1e293b' }}
      >
        <p className="font-mono text-xs px-4 pb-4" style={{ color: '#334155' }}>
          PRICE —{' '}
          <span style={{ color: '#fbbf24' }}>▲ ENTRY (stacked = multi-slot)</span>
          {'  '}
          <span style={{ color: '#4ade80' }}>▼ WIN</span>
          {'  '}
          <span style={{ color: '#f87171' }}>▼ LOSS</span>
        </p>

        {/* Price chart */}
        <ResponsiveContainer width="100%" height={290}>
          <ComposedChart data={chartData} syncId="price" margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
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
              hide
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

        {/* Deployment subplot */}
        <div style={{ borderTop: '1px solid #1e293b', marginTop: 2 }}>
          <p className="font-mono px-4 pt-2" style={{ fontSize: 9, color: '#334155', letterSpacing: '0.05em' }}>
            CAPITAL DEPLOYED %
          </p>
          <ResponsiveContainer width="100%" height={58}>
            <ComposedChart data={chartData} syncId="price" margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="deployGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0.05} />
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
                domain={[0, 100]}
                ticks={[0, 50, 100]}
                tickFormatter={(v) => v + '%'}
                tick={{ fill: '#334155', fontSize: 9, fontFamily: 'DM Mono,monospace' }}
                axisLine={false} tickLine={false}
                width={48}
              />
              <Tooltip content={() => null} />

              <Area
                type="monotone"
                dataKey="deployedPct"
                stroke="#34d399"
                strokeWidth={1}
                fill="url(#deployGrad)"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
