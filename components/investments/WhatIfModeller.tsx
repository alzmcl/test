'use client'

import { useState, useMemo, useId } from 'react'
import type { WhatIfScenario, WhatIfResult, HoldingWithPrice } from '@/types'
import { calculateWhatIf, buildChartData } from '@/lib/portfolio'
import { formatCurrency } from '@/lib/calculations'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'

const SCENARIO_COLOURS = ['#C8962E', '#2A7F6F', '#38bdf8', '#a78bfa']

const DEFAULT_YEARS = 5

function newScenario(
  id: string,
  color: string,
  label: string,
  initialValue = 0
): WhatIfScenario {
  return {
    id,
    label,
    initial_value_aud: initialValue,
    monthly_addition_aud: 0,
    annual_return_pct: 8,
    years: DEFAULT_YEARS,
    color,
  }
}

interface Props {
  holdings: HoldingWithPrice[]
  yearsToRetirement: number
}

export default function WhatIfModeller({ holdings, yearsToRetirement }: Props) {
  const uid = useId()
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([
    newScenario(`${uid}-0`, SCENARIO_COLOURS[0], 'Scenario 1'),
  ])

  const results: WhatIfResult[] = useMemo(
    () => scenarios.map(calculateWhatIf),
    [scenarios]
  )

  const chartData = useMemo(() => buildChartData(results), [results])

  function addScenario() {
    if (scenarios.length >= 4) return
    const idx = scenarios.length
    setScenarios((s) => [
      ...s,
      newScenario(`${uid}-${Date.now()}`, SCENARIO_COLOURS[idx], `Scenario ${idx + 1}`),
    ])
  }

  function removeScenario(id: string) {
    setScenarios((s) => s.filter((sc) => sc.id !== id))
  }

  function updateScenario(id: string, patch: Partial<WhatIfScenario>) {
    setScenarios((s) => s.map((sc) => (sc.id === id ? { ...sc, ...patch } : sc)))
  }

  function importHolding(id: string, holdingId: string) {
    const h = holdings.find((h) => h.id === holdingId)
    if (!h) return
    updateScenario(id, {
      label: h.name,
      initial_value_aud: h.market_value_aud ?? h.cost_basis_aud,
    })
  }

  return (
    <div className="space-y-6">
      {/* Scenario inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {scenarios.map((sc, i) => (
          <ScenarioCard
            key={sc.id}
            scenario={sc}
            result={results[i]}
            holdings={holdings}
            yearsToRetirement={yearsToRetirement}
            onUpdate={(patch) => updateScenario(sc.id, patch)}
            onImport={(holdingId) => importHolding(sc.id, holdingId)}
            onRemove={scenarios.length > 1 ? () => removeScenario(sc.id) : undefined}
          />
        ))}

        {scenarios.length < 4 && (
          <button
            onClick={addScenario}
            className="card border-dashed border-bg-border flex items-center justify-center gap-2 text-text-muted hover:text-text-secondary hover:border-gold/40 transition-colors min-h-[180px]"
          >
            <span className="text-2xl leading-none">+</span>
            <span className="text-sm">Add scenario</span>
          </button>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card space-y-4">
          <h3 className="font-medium text-text-primary">Projected Growth</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  {results.map((r) => (
                    <linearGradient key={r.id} id={`grad-${r.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={r.color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={r.color} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3451" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  width={55}
                />
                <Tooltip
                  formatter={(v: number, name: string) => {
                    if (name.endsWith('_invested')) return null
                    return [formatCurrency(v, true), name]
                  }}
                  contentStyle={{
                    background: '#0F1E35',
                    border: '1px solid #1E3451',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(v: string) => v.endsWith('_invested') ? null : v}
                />
                {results.map((r) => (
                  <Area
                    key={r.id}
                    type="monotone"
                    dataKey={r.label}
                    stroke={r.color}
                    strokeWidth={2}
                    fill={`url(#grad-${r.id})`}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Summary table */}
      {results.length > 0 && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bg-border">
                {['Scenario', 'Return p.a.', 'Years', 'Initial', 'Total Invested', 'Final Value', 'Growth'].map(
                  (h) => (
                    <th key={h} className="px-4 py-3 text-left label">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-b border-bg-border/50">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                      <span className="text-text-primary font-medium">{r.label}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-secondary">
                    {r.annual_return_pct}%
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-secondary">{r.years}</td>
                  <td className="px-4 py-3 tabular-nums text-text-secondary">
                    {formatCurrency(r.initial_value_aud, true)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-secondary">
                    {formatCurrency(r.total_invested_aud, true)}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-gold">
                    {formatCurrency(r.final_value_aud, true)}
                  </td>
                  <td className={`px-4 py-3 tabular-nums font-medium ${r.total_growth_pct >= 0 ? 'text-positive' : 'text-negative'}`}>
                    +{formatCurrency(r.total_growth_aud, true)}{' '}
                    <span className="text-xs">({r.total_growth_pct.toFixed(1)}%)</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Individual scenario card ─────────────────────────────────────────────────

function ScenarioCard({
  scenario,
  result,
  holdings,
  yearsToRetirement,
  onUpdate,
  onImport,
  onRemove,
}: {
  scenario: WhatIfScenario
  result: WhatIfResult
  holdings: HoldingWithPrice[]
  yearsToRetirement: number
  onUpdate: (patch: Partial<WhatIfScenario>) => void
  onImport: (holdingId: string) => void
  onRemove?: () => void
}) {
  return (
    <div className="card space-y-4" style={{ borderLeftColor: scenario.color, borderLeftWidth: 3 }}>
      {/* Label + remove */}
      <div className="flex items-center justify-between gap-2">
        <input
          className="input-field flex-1 text-sm font-medium"
          value={scenario.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Scenario name"
        />
        {onRemove && (
          <button onClick={onRemove} className="text-text-subtle hover:text-negative text-lg leading-none shrink-0">
            ×
          </button>
        )}
      </div>

      {/* Import from holding */}
      {holdings.length > 0 && (
        <div className="space-y-1">
          <label className="label">Import from holding</label>
          <select
            className="input-field w-full text-sm"
            value=""
            onChange={(e) => onImport(e.target.value)}
          >
            <option value="">— or set manually below —</option>
            {holdings.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({formatCurrency(h.market_value_aud ?? h.cost_basis_aud, true)})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <SliderInput
          label="Initial (AUD)"
          value={scenario.initial_value_aud}
          min={0} max={5000000} step={10000}
          display={formatCurrency(scenario.initial_value_aud, true)}
          onChange={(v) => onUpdate({ initial_value_aud: v })}
        />
        <SliderInput
          label="Monthly add"
          value={scenario.monthly_addition_aud}
          min={0} max={50000} step={500}
          display={scenario.monthly_addition_aud === 0 ? 'None' : formatCurrency(scenario.monthly_addition_aud)}
          onChange={(v) => onUpdate({ monthly_addition_aud: v })}
        />
        <SliderInput
          label="Annual return"
          value={scenario.annual_return_pct}
          min={0} max={50} step={0.5}
          display={`${scenario.annual_return_pct}%`}
          onChange={(v) => onUpdate({ annual_return_pct: v })}
        />
        <SliderInput
          label="Years"
          value={scenario.years}
          min={1} max={30} step={1}
          display={`${scenario.years} yr${scenario.years !== 1 ? 's' : ''}`}
          onChange={(v) => onUpdate({ years: v })}
        />
      </div>

      {/* Quick set years to retirement */}
      {yearsToRetirement > 0 && scenario.years !== yearsToRetirement && (
        <button
          onClick={() => onUpdate({ years: yearsToRetirement })}
          className="text-xs text-gold underline"
        >
          Set to {yearsToRetirement} yrs (retirement)
        </button>
      )}

      {/* Result preview */}
      <div className="pt-1 border-t border-bg-border flex items-center justify-between">
        <span className="text-xs text-text-muted">Final value</span>
        <span className="font-semibold text-gold tabular-nums">
          {formatCurrency(result.final_value_aud, true)}
        </span>
      </div>
      <div className="flex items-center justify-between -mt-2">
        <span className="text-xs text-text-muted">Growth</span>
        <span className={`text-xs tabular-nums font-medium ${result.total_growth_pct >= 0 ? 'text-positive' : 'text-negative'}`}>
          +{formatCurrency(result.total_growth_aud, true)} (+{result.total_growth_pct.toFixed(1)}%)
        </span>
      </div>
    </div>
  )
}

// ─── Slider with numeric display ─────────────────────────────────────────────

function SliderInput({
  label, value, min, max, step, display, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number
  display: string; onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="text-xs font-medium text-text-secondary tabular-nums">{display}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  )
}
