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
} from 'recharts';
import type { PriceDay } from '@/types';
import { formatPrice, formatDateShort } from '@/lib/btcPrice';

interface Props {
  equityCurve: { date: number; equity: number }[];
  prices: PriceDay[];
  lookbackDays: number;
  portfolioSize: number;
}

export default function EquityCurve({ equityCurve, prices, lookbackDays, portfolioSize }: Props) {
  if (equityCurve.length === 0 || prices.length === 0) {
    return (
      <div className="px-8 pt-6 text-xs font-mono" style={{ color: '#475569' }}>
        No equity data yet.
      </div>
    );
  }

  // B&H baseline starts at the same bar the backtester starts (after lookback warmup)
  const startPrice = prices[lookbackDays]?.price ?? prices[0].price;

  // Merge strategy equity + B&H into one chart data array
  const chartData = equityCurve.map((pt) => {
    // Find matching price for this date
    const priceDay = prices.find((p) => p.date === pt.date) ??
      prices.reduce((prev, curr) =>
        Math.abs(curr.date - pt.date) < Math.abs(prev.date - pt.date) ? curr : prev
      );

    const strategyValue = Math.round(pt.equity * portfolioSize);
    const buyHoldValue = Math.round((priceDay.price / startPrice) * portfolioSize);

    return {
      date: pt.date,
      strategy: strategyValue,
      buyHold: buyHoldValue,
    };
  });

  const finalStrategy = chartData[chartData.length - 1]?.strategy ?? portfolioSize;
  const finalBuyHold = chartData[chartData.length - 1]?.buyHold ?? portfolioSize;
  const alpha = ((finalStrategy - finalBuyHold) / portfolioSize) * 100;
  const strategyReturn = ((finalStrategy - portfolioSize) / portfolioSize) * 100;
  const buyHoldReturn = ((finalBuyHold - portfolioSize) / portfolioSize) * 100;

  // Adaptive tick count based on data length
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
                name === 'strategy' ? 'Strategy' : 'Buy & Hold',
              ]}
            />
            <Legend
              formatter={(value) => value === 'strategy' ? 'Strategy' : 'Buy & Hold'}
              wrapperStyle={{ fontFamily: 'DM Mono,monospace', fontSize: 11, color: '#64748b' }}
            />
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
