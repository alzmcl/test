'use client'

import type { HouseholdSettings } from '@/types'
import { formatCurrency } from '@/lib/calculations'

interface Props {
  settings: HouseholdSettings
  onUpdate: (patch: Partial<HouseholdSettings>) => void
}

export default function SharedInputs({ settings, onUpdate }: Props) {
  return (
    <div className="card space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6">

        {/* ── Ages ─────────────────────────────────────────── */}
        <Section title="Ages">
          <Slider label="Husband's age" value={settings.age_husband} min={45} max={75} step={1}
            display={`${settings.age_husband}`}
            onChange={(v) => onUpdate({ age_husband: v })} />
          <Slider label="Wife's age" value={settings.age_wife} min={45} max={75} step={1}
            display={`${settings.age_wife}`}
            onChange={(v) => onUpdate({ age_wife: v })} />
          <Slider label="Target retirement age" value={settings.target_retirement_age} min={55} max={70} step={1}
            display={`${settings.target_retirement_age}`}
            onChange={(v) => onUpdate({ target_retirement_age: v })} />
        </Section>

        {/* ── SMSF ─────────────────────────────────────────── */}
        <Section title="SMSF">
          <Slider label="Cash + investments" value={settings.smsf_cash_investments}
            min={0} max={5_000_000} step={50_000}
            display={formatCurrency(settings.smsf_cash_investments, true)}
            onChange={(v) => onUpdate({ smsf_cash_investments: v })} />
          <Slider label="BTC holdings" value={settings.smsf_btc_holdings}
            min={0} max={10} step={0.1}
            display={`${settings.smsf_btc_holdings.toFixed(2)} BTC`}
            onChange={(v) => onUpdate({ smsf_btc_holdings: v })} />
          <Slider label="Annual concessional contributions" value={settings.annual_super_concessional}
            min={0} max={60_000} step={5_000}
            display={formatCurrency(settings.annual_super_concessional)}
            onChange={(v) => onUpdate({ annual_super_concessional: v })} />
        </Section>

        {/* ── Mortgage & offset ─────────────────────────────── */}
        <Section title="Mortgage &amp; Offset">
          <Slider label="Mortgage balance" value={settings.mortgage_balance}
            min={0} max={3_000_000} step={10_000}
            display={formatCurrency(settings.mortgage_balance, true)}
            onChange={(v) => onUpdate({ mortgage_balance: v })} />
          <Slider label="Monthly IO repayment" value={settings.mortgage_monthly_io}
            min={1_000} max={20_000} step={50}
            display={`${formatCurrency(settings.mortgage_monthly_io)}/mo`}
            onChange={(v) => onUpdate({ mortgage_monthly_io: v })} />
          <Slider label="Offset balance" value={settings.offset_balance}
            min={0} max={1_000_000} step={10_000}
            display={formatCurrency(settings.offset_balance, true)}
            onChange={(v) => onUpdate({ offset_balance: v })} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="io_toggle" className="w-4 h-4 accent-gold"
              checked={settings.use_io_repayments}
              onChange={(e) => onUpdate({ use_io_repayments: e.target.checked })} />
            <label htmlFor="io_toggle" className="text-sm text-text-secondary cursor-pointer">
              Using IO repayments
            </label>
          </div>
        </Section>

        {/* ── Property / downsize ───────────────────────────── */}
        <Section title="Property &amp; Downsize">
          <Slider label="Home value today" value={settings.home_value}
            min={500_000} max={10_000_000} step={50_000}
            display={formatCurrency(settings.home_value, true)}
            onChange={(v) => onUpdate({ home_value: v })} />
          <Slider label="Downsize in year" value={settings.downsize_year}
            min={1} max={15} step={1}
            display={`Year ${settings.downsize_year}`}
            onChange={(v) => onUpdate({ downsize_year: v })} />
          <Slider label="Target new home price" value={settings.target_new_home_price}
            min={500_000} max={5_000_000} step={50_000}
            display={formatCurrency(settings.target_new_home_price, true)}
            onChange={(v) => onUpdate({ target_new_home_price: v })} />
          <Slider label="Downsizer contribution" value={settings.downsizer_contribution}
            min={0} max={600_000} step={10_000}
            display={formatCurrency(settings.downsizer_contribution, true)}
            onChange={(v) => onUpdate({ downsizer_contribution: v })} />
        </Section>

        {/* ── Living costs ──────────────────────────────────── */}
        <Section title="Living Costs">
          <Slider label="Monthly living costs" value={settings.monthly_living_costs}
            min={0} max={30_000} step={500}
            display={`${formatCurrency(settings.monthly_living_costs)}/mo`}
            onChange={(v) => onUpdate({ monthly_living_costs: v })} />
          <Slider label="School fees (annual)" value={settings.school_fees_annual}
            min={0} max={100_000} step={1_000}
            display={formatCurrency(settings.school_fees_annual)}
            onChange={(v) => onUpdate({ school_fees_annual: v })} />
          <Slider label="School fee years remaining" value={settings.school_fees_years_remaining}
            min={0} max={10} step={1}
            display={`${settings.school_fees_years_remaining} yr${settings.school_fees_years_remaining !== 1 ? 's' : ''}`}
            onChange={(v) => onUpdate({ school_fees_years_remaining: v })} />
        </Section>

        {/* ── FX ────────────────────────────────────────────── */}
        <Section title="FX">
          <Slider label="AUD/USD rate" value={settings.aud_usd_rate}
            min={0.4} max={1.2} step={0.01}
            display={`${settings.aud_usd_rate.toFixed(2)}`}
            onChange={(v) => onUpdate({ aud_usd_rate: v })} />
        </Section>

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3
        className="text-xs font-semibold uppercase tracking-widest text-text-subtle border-b border-bg-border pb-1"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Slider({
  label, value, min, max, step, display, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number
  display: string; onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="text-xs font-semibold text-text-primary tabular-nums shrink-0">
          {display}
        </span>
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
