'use client'

import type { PortfolioSummaryData } from '@/lib/portfolio'
import { formatCurrency } from '@/lib/calculations'
import { COLOURS } from '@/lib/constants'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { ASSET_TYPE_LABELS } from '@/types'

const CHART_COLOURS = [
  COLOURS.gold, COLOURS.teal, '#38bdf8', '#a78bfa', '#fb923c', '#f472b6', '#34d399',
]

interface Props {
  summary: PortfolioSummaryData
  loading: boolean
}

export default function PortfolioSummary({ summary, loading }: Props) {
  const pnlPositive = summary.total_unrealised_pnl_aud >= 0

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total Value"
          value={formatCurrency(summary.total_market_value_aud, true)}
          loading={loading}
          highlight
        />
        <KpiCard
          label="Cost Basis"
          value={formatCurrency(summary.total_cost_basis_aud, true)}
          loading={loading}
        />
        <KpiCard
          label="Unrealised P&L"
          value={
            (pnlPositive ? '+' : '') +
            formatCurrency(summary.total_unrealised_pnl_aud, true)
          }
          sub={`${pnlPositive ? '+' : ''}${summary.total_unrealised_pnl_pct.toFixed(2)}%`}
          loading={loading}
          positive={pnlPositive}
          negative={!pnlPositive}
        />
        <KpiCard
          label="SMSF / Personal"
          value={formatCurrency(summary.smsf_value_aud, true)}
          sub={`Personal: ${formatCurrency(summary.non_smsf_value_aud, true)}`}
          loading={loading}
        />
      </div>

      {/* Allocation chart + breakdown */}
      {summary.by_asset_type.length > 0 && (
        <div className="card flex flex-col sm:flex-row gap-6">
          {/* Donut chart */}
          <div className="shrink-0 h-40 w-40 mx-auto sm:mx-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.by_asset_type}
                  dataKey="value"
                  nameKey="type"
                  innerRadius="60%"
                  outerRadius="85%"
                  paddingAngle={2}
                >
                  {summary.by_asset_type.map((entry, i) => (
                    <Cell
                      key={entry.type}
                      fill={CHART_COLOURS[i % CHART_COLOURS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => formatCurrency(v, true)}
                  contentStyle={{
                    background: '#0F1E35',
                    border: '1px solid #1E3451',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex-1 flex flex-col justify-center gap-2">
            <span className="label mb-1">Allocation</span>
            {summary.by_asset_type.map((entry, i) => (
              <div key={entry.type} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: CHART_COLOURS[i % CHART_COLOURS.length] }}
                  />
                  <span className="text-sm text-text-secondary truncate">
                    {ASSET_TYPE_LABELS[entry.type as keyof typeof ASSET_TYPE_LABELS] ?? entry.type}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-text-muted">
                    {formatCurrency(entry.value, true)}
                  </span>
                  <span className="text-xs text-text-subtle w-10 text-right">
                    {entry.pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  loading,
  highlight,
  positive,
  negative,
}: {
  label: string
  value: string
  sub?: string
  loading: boolean
  highlight?: boolean
  positive?: boolean
  negative?: boolean
}) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="label">{label}</span>
      {loading ? (
        <div className="h-6 w-28 bg-bg-raised rounded animate-pulse" />
      ) : (
        <span
          className={`text-xl font-semibold tabular-nums ${
            highlight
              ? 'text-gold'
              : positive
              ? 'text-positive'
              : negative
              ? 'text-negative'
              : 'text-text-primary'
          }`}
        >
          {value}
        </span>
      )}
      {sub && !loading && (
        <span className="text-xs text-text-muted">{sub}</span>
      )}
    </div>
  )
}
