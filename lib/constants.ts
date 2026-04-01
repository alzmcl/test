import type { HouseholdSettings } from '@/types'

// ─── Default household settings ───────────────────────────────────────────────
// These seed the UI on first load; Supabase persists all user edits.

export const DEFAULT_SETTINGS: Omit<HouseholdSettings, 'id' | 'updated_at' | 'updated_by'> = {
  // Ages
  age_husband: 58,
  age_wife: 56,
  target_retirement_age: 63,

  // SMSF
  smsf_cash_investments: 2_300_000,
  smsf_btc_holdings: 1.7,

  // Mortgage
  mortgage_balance: 1_200_000,
  mortgage_rate_pct: 6.5,
  mortgage_monthly_io: 5_150,
  mortgage_monthly_pi: 13_000,
  use_io_repayments: true,

  // Offset
  offset_balance: 250_000,

  // Property
  home_value: 3_200_000,
  downsize_year: 5,
  target_new_home_price: 2_000_000,
  downsizer_contribution: 300_000,

  // Living costs
  monthly_living_costs: 10_000,
  school_fees_annual: 35_000,
  school_fees_years_remaining: 2,

  // Super
  annual_super_concessional: 60_000,

  // FX
  aud_usd_rate: 0.65,

  // Bear scenario
  bear_gross_income: 100_000,
  bear_smsf_cagr_pct: 5.0,
  bear_btc_price_usd: 75_000,

  // Base scenario
  base_gross_income: 200_000,
  base_smsf_cagr_pct: 8.0,
  base_btc_price_usd: 150_000,

  // Bull scenario
  bull_gross_income: 300_000,
  bull_smsf_cagr_pct: 12.0,
  bull_btc_price_usd: 250_000,
}

// ─── App-level constants ──────────────────────────────────────────────────────

/** Australian concessional super contributions cap (combined both members) */
export const COMBINED_SUPER_CAP = 60_000

/** Per-member concessional cap */
export const PER_MEMBER_SUPER_CAP = 30_000

/** Safe withdrawal rate for retirement income projections */
export const SAFE_WITHDRAWAL_RATE = 0.04

/** Age from which SMSF income becomes tax-free (condition of release met) */
export const TAX_FREE_AGE = 60

/** Australian FY end month (June = 6) */
export const FY_END_MONTH = 6

/** Super contributions tax rate (concessional contributions) */
export const SUPER_CONTRIBUTIONS_TAX = 0.15

// ─── Theme colours ────────────────────────────────────────────────────────────

export const COLOURS = {
  navy: '#1B3A5C',
  gold: '#C8962E',
  teal: '#2A7F6F',
  // Scenario colours
  bear: '#f87171',
  base: '#C8962E',
  bull: '#4ade80',
  // Chart colours
  chart: ['#C8962E', '#2A7F6F', '#38bdf8', '#a78bfa', '#fb923c'],
} as const

// ─── Budget ───────────────────────────────────────────────────────────────────

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// ─── Full settings object with DB fields (used as fallback) ──────────────────

export const DEFAULT_SETTINGS_DB: import('@/types').HouseholdSettings = {
  id: true,
  ...DEFAULT_SETTINGS,
  updated_at: new Date(0).toISOString(),
  updated_by: null,
}

// ─── Budget default monthly amounts ──────────────────────────────────────────
// Designed to add up to ~$15K/month (mortgage IO + all living costs)

import type { BudgetCategory } from '@/types'

export const BUDGET_DEFAULTS: Record<BudgetCategory, number> = {
  mortgage_rent:  5_150,  // IO repayments
  school_fees:    2_917,  // $35K ÷ 12
  groceries:      1_500,
  utilities:        400,
  insurance:        500,
  transport:        600,
  dining_out:       800,
  golf:             400,
  travel:           833,  // $10K ÷ 12
  kids:             500,
  medical:          300,
  subscriptions:    150,
  other:            450,
}
