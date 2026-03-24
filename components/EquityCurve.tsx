'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceArea,
} from 'recharts';
import type { EquityPoint, PriceDay } from '@/types';
import { formatPrice, formatDateShort } from '@/lib/btcPrice';

interface Props {
  equityCurve: EquityPoint[];
  prices: PriceDay[];
  lookbackDays: number;
  portfolioSize: number;
  cashYieldPct: number;
}

export default function EquityCurve({ equityCurve, prices, lookbackDays, portfolioSize, cashYieldPct }: Props) {
  if (equityCurve.length === 0 || prices.length === 0) {
    return (
      <div className="px-8 pt-6 text-xs font-mono" style={{ color: '#475569' }}>
        No equity data yet.
      </div>
    );
  }

  const startPrice = prices[lookbackDays]?.price ?? prices[0].price;
  const dailyCashRate = Math.pow(1 + cashYieldPct / 100, 1 / 365) - 1;

  // Build chart data: strategy + buy-hold + cash floor
  const chartData = equityCurve.map((pt, idx) => {
    const priceDay = prices.find((p) => p.date === pt.date) ??
      prices.reduce((prev, curr) =>
        Math.abs(curr.date - pt.date) < Math.abs(prev.date - pt.date) ? curr : prev
      );

    const strategyValue = Math.round(pt.equity * portfolioSize);
    const buyHoldValue = Math.round((priceDay.price / startPrice) * portfolioSize);
    const cashFloorValue = Math.round(portfolioSize * Math.pow(1 + dailyCashRate, idx));

    return {
      date: pt.date,
      strategy: strategyValue,
      buyHold: buyHoldValue,
      cashFloor: cashFloorValue,
      inPosition: pt.inPosition,
    };
  });

  // Compute in-position ranges for background shading
  const positionRanges: { x1: number; x2: number }[] = [];
  let rangeStart: number | null = null;
  for (let i = 0; i < chartData.length; i++) {
    if (chartData[i].inPosition && rangeStart === null) {
      rangeStart = chartData[i].date;
    } else if (!chartData[i].inPosition && rangeStart !== null) {
      positionRanges.push({ x1: rangeStart, x2: chartData[i - 1].date });
      rangeStart = null;
    }
  }
  if (rangeStart !== null) {
    positionRanges.push({ x1: rangeStart, x2: chartData[chartData.length - 1].date });
  }

  const finalStrategy = chartData[chartData.length - 1]?.strategy ?? portfolioSize;
  const finalBuyHold = chartData[chartData.length - 1]?.buyHold ?? portfolioSize;
  const finalCashFloor = chartData[chartData.length - 1]?.cashFloor ?? portfolioSize;
  const alpha = ((finalStrategy - finalBuyHold) / portfolioSize) * 100;
  const strategyReturn = ((finalStrategy - portfolioSize) / portfolioSize) * 100;
  const buyHoldReturn = ((finalBuyHold - portfolioSize) / portfolioSize) * 100;
  const cashFloorReturn = ((finalCashFloor - portfolioSize) / portfolioSize) * 100;

  const tickInterval = Math.max(1, Math.floor(chartData.length / 8));

  return (
    <div className="px-8 pt-6">
      {/* Summary callout */}
      <div className="flex flex-wrap gap-8 mb-6" style={{ fontFamily: 'DM Mono,monospace' }}>
        {[
          {
            label: 'Strategy final',
            value: formatPrice(finalStrategy),
            sub: (strategyReturn >= 0 ? '+' : '') + strategyReturn.toFixed(1) + '%',
            color: strategyReturn >= 0 ? '#4ade80' : '#f87171',
          },
          {
            label: 'Cash floor',
            value: formatPrice(finalCashFloor),
            sub: '+' + cashFloorReturn.toFixed(1) + '% @ ' + cashYieldPct + '% pa',
            color: '#a3e635',
          },
          {
            label: 'Buy & Hold final',
            value: formatPrice(finalBuyHold),
            sub: (buyHoldReturn >= 0 ? '+' : '') + buyHoldReturn.toFixed(1) + '%',
            color: buyHoldReturn >= 0 ? '#4ade80' : '#f87171',
          },
          {
            label: 'Alpha vs B&H',
            value: (alpha >= 0 ? '+' : '') + alpha.toFixed(1) + '%',
            sub: alpha >= 0 ? 'outperforming' : 'underperforming',
            color: alpha >= 0 ? '#4ade80' : '#f87171',
          },
        ].map(({ label, value, sub, color }) => (
          <div key={label}>
            <p className="text-xs mb-0.5" style={{ color: '#334155' }}>{label}</p>
            <p className="text-base font-semibold" style={{ color }}>{value}</p>
            <p className="text-xs" style={{ color: '#475569' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div
        className="rounded-xl overflow-hidden p-5"
        style={{ background: '#0c1626', border: '1px solid #1e293b' }}
      >
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
            <XAxis
              dataKey="date"
              tickFormatter={(ts) => formatDateShort(ts)}
              interval={tickInterval}
              tick={{ fill: '#334155', fontSize: 10, fontFamily: 'DM Mono,monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatPrice(v)}
              tick={{ fill: '#334155', fontSize: 10, fontFamily: 'DM Mono,monospace' }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={{
                background: '#0c1626',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                fontFamily: 'DM Mono,monospace',
                fontSize: 11,
              }}
              labelStyle={{ color: '#64748b' }}
              labelFormatter={(ts) => formatDateShort(ts as number)}
              formatter={(value, name) => [
                formatPrice(value as number),
                name === 'strategy' ? 'Strategy' : name === 'cashFloor' ? 'Cash floor' : 'Buy & Hold',
              ]}
            />
            <Legend
              formatter={(v) => v === 'strategy' ? 'Strategy' : v === 'cashFloor' ? 'Cash floor' : 'Buy & Hold'}
              wrapperStyle={{ fontFamily: 'DM Mono,monospace', fontSize: 11, color: '#64748b' }}
            />

            {/* In-position shading */}
            {positionRanges.map((r, i) => (
              <ReferenceArea
                key={i}
                x1={r.x1} x2={r.x2}
                fill="#38bdf8" fillOpacity={0.04}
                strokeOpacity={0}
              />
            ))}

            <Line
              type="monotone"
              dataKey="strategy"
              stroke="#38bdf8"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: '#38bdf8' }}
            />
            <Line
              type="monotone"
              dataKey="cashFloor"
              stroke="#a3e635"
              strokeWidth={1}
              dot={false}
              strokeDasharray="4 4"
              activeDot={{ r: 3, fill: '#a3e635' }}
            />
            <Line
              type="monotone"
              dataKey="buyHold"
              stroke="#475569"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 4"
              activeDot={{ r: 3, fill: '#475569' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
