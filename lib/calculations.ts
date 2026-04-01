import type { HouseholdSettings, ModellerResult, Scenario } from '@/types'
import { SAFE_WITHDRAWAL_RATE, SUPER_CONTRIBUTIONS_TAX, FY_END_MONTH } from './constants'

// ─── Core modeller ────────────────────────────────────────────────────────────

/**
 * Calculate full retirement projection for a given scenario.
 *
 * Logic:
 *  SMSF at retirement = (cash/investments × CAGR^years)
 *                     + compounded annual contributions (net of 15% tax)
 *                     + (BTC holdings × BTC price in AUD)
 *
 *  Bear: contributions stop after year 1
 *  Base / Bull: $60K/year for all years
 *
 *  Net mortgage at sale = mortgage balance − offset balance at year of sale
 *  Net sale proceeds    = home sale price − net mortgage
 *  Cash reserve         = net proceeds − new home price − downsizer contribution
 *  SMSF post-downsize   = SMSF total + downsizer contribution grown for remaining years
 *  Annual retirement income = (SMSF post-downsize + cash reserve) × 4%
 *  Offset runway        = offset balance ÷ monthly shortfall (if cashflow negative)
 */
export function calculateModeller(
  settings: HouseholdSettings,
  scenario: Scenario,
  /** Override monthly living costs (e.g. from Budget totals) */
  livingCostsOverride?: number
): ModellerResult {
  const grossIncome = settings[`${scenario}_gross_income`]
  const cagr = settings[`${scenario}_smsf_cagr_pct`] / 100
  const btcPriceUsd = settings[`${scenario}_btc_price_usd`]
  const btcPriceAud = btcPriceUsd / settings.aud_usd_rate

  const years = settings.target_retirement_age - settings.age_husband

  // ── SMSF projection ────────────────────────────────────────────────────────

  // Cash/investments base compounded
  const smsf_cash_at_retirement =
    settings.smsf_cash_investments * Math.pow(1 + cagr, years)

  // BTC at retirement price
  const smsf_btc_value_aud = settings.smsf_btc_holdings * btcPriceAud

  // Annual concessional contributions net of 15% contributions tax
  const annualNetContribution =
    settings.annual_super_concessional * (1 - SUPER_CONTRIBUTIONS_TAX)

  // Bear: only year-1 contribution. Base/Bull: every year.
  const contributionYears = scenario === 'bear' ? 1 : years

  let smsf_contributions_compounded = 0
  for (let y = 1; y <= contributionYears; y++) {
    // Contribution made at start of year y grows for (years - y) remaining years
    smsf_contributions_compounded +=
      annualNetContribution * Math.pow(1 + cagr, years - y + 1)
  }

  const smsf_total_at_retirement =
    smsf_cash_at_retirement + smsf_btc_value_aud + smsf_contributions_compounded

  // ── Property / downsize ────────────────────────────────────────────────────

  // IO switch saves (PI - IO) each month; that accumulates in the offset
  const monthlyIOSavings =
    settings.mortgage_monthly_pi - settings.mortgage_monthly_io

  // Offset grows from IO savings for the years until sale (capped at years to retirement)
  const yearsToSale = Math.min(settings.downsize_year, years)
  const offset_at_sale =
    settings.offset_balance + monthlyIOSavings * 12 * yearsToSale

  // Net mortgage balance at sale (can't go negative)
  const net_mortgage_at_sale = Math.max(
    0,
    settings.mortgage_balance - offset_at_sale
  )

  const net_sale_proceeds = settings.home_value - net_mortgage_at_sale

  // Allocate proceeds
  const cash_reserve = Math.max(
    0,
    net_sale_proceeds - settings.target_new_home_price - settings.downsizer_contribution
  )

  // Downsizer contribution grows in SMSF for remaining years after sale
  const remainingYears = Math.max(0, years - yearsToSale)
  const downsizeContribGrown =
    settings.downsizer_contribution * Math.pow(1 + cagr, remainingYears)

  const smsf_post_downsize = smsf_total_at_retirement + downsizeContribGrown

  // ── Retirement income ──────────────────────────────────────────────────────

  // 4% rule applied to SMSF + cash reserve (all tax-free from age 60)
  const annual_retirement_income =
    (smsf_post_downsize + cash_reserve) * SAFE_WITHDRAWAL_RATE
  const monthly_retirement_income = annual_retirement_income / 12

  // ── Current cashflow ───────────────────────────────────────────────────────

  const monthly_gross_income = grossIncome / 12
  const annualTax = estimateAustralianIncomeTax(grossIncome)
  const monthly_net_income = (grossIncome - annualTax) / 12

  const monthly_mortgage = settings.use_io_repayments
    ? settings.mortgage_monthly_io
    : settings.mortgage_monthly_pi

  const monthly_school_fees =
    settings.school_fees_years_remaining > 0
      ? settings.school_fees_annual / 12
      : 0

  const monthly_living_costs = livingCostsOverride ?? settings.monthly_living_costs

  const monthly_expenses =
    monthly_mortgage + monthly_school_fees + monthly_living_costs

  const monthly_cashflow = monthly_net_income - monthly_expenses

  // Offset runway — only meaningful when cashflow is negative
  const offset_runway_months =
    monthly_cashflow < 0
      ? settings.offset_balance / Math.abs(monthly_cashflow)
      : null

  return {
    scenario,
    years_to_retirement: years,
    smsf_cash_at_retirement,
    smsf_btc_value_aud,
    smsf_contributions_compounded,
    smsf_total_at_retirement,
    offset_at_sale,
    net_mortgage_at_sale,
    net_sale_proceeds,
    cash_reserve,
    smsf_post_downsize,
    annual_retirement_income,
    monthly_retirement_income,
    monthly_gross_income,
    monthly_net_income,
    monthly_mortgage,
    monthly_school_fees,
    monthly_living_costs,
    monthly_expenses,
    monthly_cashflow,
    offset_runway_months,
  }
}

/**
 * Run all three scenarios and return them together.
 */
export function calculateAllScenarios(
  settings: HouseholdSettings,
  livingCostsOverride?: number
): { bear: ModellerResult; base: ModellerResult; bull: ModellerResult } {
  return {
    bear: calculateModeller(settings, 'bear', livingCostsOverride),
    base: calculateModeller(settings, 'base', livingCostsOverride),
    bull: calculateModeller(settings, 'bull', livingCostsOverride),
  }
}

// ─── Australian income tax estimate (FY2025, resident) ────────────────────────
// Tax brackets: https://www.ato.gov.au/rates/individual-income-tax-rates/

function estimateAustralianIncomeTax(grossIncome: number): number {
  if (grossIncome <= 18_200) return 0
  if (grossIncome <= 45_000)
    return (grossIncome - 18_200) * 0.19
  if (grossIncome <= 120_000)
    return 5_092 + (grossIncome - 45_000) * 0.325
  if (grossIncome <= 180_000)
    return 29_467 + (grossIncome - 120_000) * 0.37
  return 51_667 + (grossIncome - 180_000) * 0.45
}

// ─── Financial year helpers ───────────────────────────────────────────────────

/**
 * Returns the current Australian financial year label, e.g. '2025-26'.
 */
export function getCurrentFinancialYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-based
  if (month > FY_END_MONTH) {
    return `${year}-${String(year + 1).slice(2)}`
  }
  return `${year - 1}-${String(year).slice(2)}`
}

/**
 * Returns the date by which FY contributions must be made (30 June).
 */
export function getFyEndDate(fyLabel: string): Date {
  const endYear = parseInt(fyLabel.slice(0, 4)) + 1
  return new Date(endYear, 5, 30) // June 30
}

/**
 * Days remaining in the current financial year (to 30 June).
 */
export function daysToFyEnd(): number {
  const today = new Date()
  const fyEnd = getFyEndDate(getCurrentFinancialYear())
  const diff = fyEnd.getTime() - today.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// ─── Age / countdown helpers ─────────────────────────────────────────────────

/**
 * Approximate days until a person reaches age 60, given their current age.
 * Uses start-of-year approximation (no exact birthday needed).
 */
export function daysUntilAge60(currentAge: number): number {
  const yearsRemaining = 60 - currentAge
  if (yearsRemaining <= 0) return 0
  return Math.round(yearsRemaining * 365.25)
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000)
      return `$${(value / 1_000_000).toFixed(2)}M`
    if (Math.abs(value) >= 1_000)
      return `$${(value / 1_000).toFixed(0)}K`
  }
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-AU').format(value)
}
