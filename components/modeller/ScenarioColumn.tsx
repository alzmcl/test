'use client'

import type { HouseholdSettings, ModellerResult, Scenario } from '@/types'
import { formatCurrency } from '@/lib/calculations'

interface Props {
  scenario: Scenario
  settings: HouseholdSettings
  result: ModellerResult
  onUpdate: (patch: Partial<HouseholdSettings>) => void
}

const SCENARIO_STYLE = {
  bear: { border: 'border-negative/40', label: 'text-negative', title: 'Bear' },
  base: { border: 'border-gold/40',     label: 'text-gold',     title: 'Base' },
  bull: { border: 'border-positive/40', label: 'text-positive', title: 'Bull' },
} as const

export default function ScenarioColumn({ scenario, settings, result, onUpdate }: Props) {
  const style = SCENARIO_STYLE[scenario]

  const incomeKey    = `${scenario}_gross_income`    as keyof HouseholdSettings
  const cagrKey      = `${scenario}_smsf_cagr_pct`  as keyof HouseholdSettings
  const btcKey       = `${scenario}_btc_price_usd`  as keyof HouseholdSettings

  const grossIncome  = settings[incomeKey]  as number
  const cagrPct      = settings[cagrKey]    as number
  const btcUsd       = settings[btcKey]     as number

  const cashflowPos  = result.monthly_cashflow >= 0

  return (
    <div className={`card border-t-2 ${style.border} space-y-4`}>
      {/* Scenario header */}
      <div className={`text-sm font-bold uppercase tracking-widest ${style.label}`}>
        {style.title} Case
      </div>

      {/* Per-scenario assumptions */}
      <div className="space-y-3 pb-4 border-b border-bg-border">
        <ScenarioInput
          label="Gross income"
          value={grossIncome}
          min={0} max={1_000_000} step={10_000}
          display={formatCurrency(grossIncome, true)}
          color={style.label}
          onChange={(v) => onUpdate({ [incomeKey]: v } as Partial<HouseholdSettings>)}
        />
        <ScenarioInput
          label="SMSF CAGR"
          value={cagrPct}
          min={0} max={25} step={0.5}
          display={`${cagrPct}% p.a.`}
          color={style.label}
          onChange={(v) => onUpdate({ [cagrKey]: v } as Partial<HouseholdSettings>)}
        />
        <ScenarioInput
          label="BTC at retirement (USD)"
          value={btcUsd}
          min={0} max={2_000_000} step={5_000}
          display={`$${btcUsd.toLocaleString()}`}
          color={style.label}
          onChange={(v) => onUpdate({ [btcKey]: v } as Partial<HouseholdSettings>)}
        />
      </div>

      {/* Results */}
      <div className="space-y-2 text-sm">
        <ResultGroup title="SMSF at Retirement">
          <Row label="Cash + investments"  value={formatCurrency(result.smsf_cash_at_retirement, true)} />
          <Row label="BTC value (AUD)"     value={formatCurrency(result.smsf_btc_value_aud, true)} />
          <Row label="Contributions grown" value={formatCurrency(result.smsf_contributions_compounded, true)} />
          <Row label="Total SMSF"          value={formatCurrency(result.smsf_total_at_retirement, true)} bold highlight={style.label} />
        </ResultGroup>

        <ResultGroup title="Downsize">
          <Row label="Offset at sale"      value={formatCurrency(result.offset_at_sale, true)} />
          <Row label="Net mortgage"        value={formatCurrency(result.net_mortgage_at_sale, true)} />
          <Row label="Sale proceeds"       value={formatCurrency(result.net_sale_proceeds, true)} />
          <Row label="Cash reserve"        value={formatCurrency(result.cash_reserve, true)} bold />
        </ResultGroup>

        <ResultGroup title="Retirement Income (4% rule)">
          <Row label="SMSF post-downsize"  value={formatCurrency(result.smsf_post_downsize, true)} />
          <Row label="Annual income"       value={formatCurrency(result.annual_retirement_income, true)} bold highlight={style.label} />
          <Row label="Monthly income"      value={formatCurrency(result.monthly_retirement_income)} />
        </ResultGroup>

        <ResultGroup title="Current Cashflow">
          <Row label="Monthly net income"  value={formatCurrency(result.monthly_net_income)} />
          <Row label="Mortgage"            value={`− ${formatCurrency(result.monthly_mortgage)}`} />
          <Row label="School fees"         value={`− ${formatCurrency(result.monthly_school_fees)}`} />
          <Row label="Living costs"        value={`− ${formatCurrency(result.monthly_living_costs)}`} />
          <Row
            label="Monthly cashflow"
            value={`${cashflowPos ? '+' : ''}${formatCurrency(result.monthly_cashflow)}`}
            bold
            highlight={cashflowPos ? 'text-positive' : 'text-negative'}
          />
          {!cashflowPos && result.offset_runway_months !== null && (
            <Row
              label="Offset runway"
              value={`${Math.floor(result.offset_runway_months)} months`}
              highlight="text-warning"
            />
          )}
        </ResultGroup>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScenarioInput({
  label, value, min, max, step, display, color, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number
  display: string; color: string; onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs text-text-muted">{label}</span>
        <span className={`text-xs font-semibold tabular-nums shrink-0 ${color}`}>{display}</span>
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

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 pt-2">
      <div className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
        {title}
      </div>
      {children}
    </div>
  )
}

function Row({
  label, value, bold, highlight,
}: {
  label: string; value: string; bold?: boolean; highlight?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-text-muted text-xs">{label}</span>
      <span
        className={`tabular-nums text-xs shrink-0 ${bold ? 'font-semibold' : ''} ${
          highlight ?? 'text-text-secondary'
        }`}
      >
        {value}
      </span>
    </div>
  )
}
