// ─── User & Profile ──────────────────────────────────────────────────────────

export type UserRole = 'husband' | 'wife'

export interface Profile {
  id: string
  name: string
  role: UserRole
  created_at: string
}

// ─── Household Settings ───────────────────────────────────────────────────────
// Mirrors the household_settings DB table (singleton row).

export interface HouseholdSettings {
  id: boolean
  // Ages
  age_husband: number
  age_wife: number
  target_retirement_age: number
  // SMSF
  smsf_cash_investments: number
  smsf_btc_holdings: number
  // Mortgage
  mortgage_balance: number
  mortgage_rate_pct: number
  mortgage_monthly_io: number
  mortgage_monthly_pi: number
  use_io_repayments: boolean
  // Offset
  offset_balance: number
  // Property
  home_value: number
  downsize_year: number
  target_new_home_price: number
  downsizer_contribution: number
  // Living costs
  monthly_living_costs: number
  school_fees_annual: number
  school_fees_years_remaining: number
  // Super
  annual_super_concessional: number
  // FX
  aud_usd_rate: number
  // Bear scenario
  bear_gross_income: number
  bear_smsf_cagr_pct: number
  bear_btc_price_usd: number
  // Base scenario
  base_gross_income: number
  base_smsf_cagr_pct: number
  base_btc_price_usd: number
  // Bull scenario
  bull_gross_income: number
  bull_smsf_cagr_pct: number
  bull_btc_price_usd: number
  // Meta
  updated_at: string
  updated_by: string | null
}

// ─── Manual Balances ─────────────────────────────────────────────────────────

export interface ManualBalance {
  id: string
  smsf_balance: number
  offset_balance: number
  mortgage_balance: number
  notes: string | null
  recorded_at: string
  recorded_by: string | null
}

// ─── Budget ──────────────────────────────────────────────────────────────────

export type BudgetCategory =
  | 'mortgage_rent'
  | 'school_fees'
  | 'groceries'
  | 'utilities'
  | 'insurance'
  | 'transport'
  | 'dining_out'
  | 'golf'
  | 'travel'
  | 'kids'
  | 'medical'
  | 'subscriptions'
  | 'other'

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  mortgage_rent: 'Mortgage / Rent',
  school_fees: 'School Fees',
  groceries: 'Groceries',
  utilities: 'Utilities',
  insurance: 'Insurance',
  transport: 'Transport',
  dining_out: 'Dining Out',
  golf: 'Golf',
  travel: 'Travel',
  kids: 'Kids',
  medical: 'Medical',
  subscriptions: 'Subscriptions',
  other: 'Other',
}

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  'mortgage_rent',
  'school_fees',
  'groceries',
  'utilities',
  'insurance',
  'transport',
  'dining_out',
  'golf',
  'travel',
  'kids',
  'medical',
  'subscriptions',
  'other',
]

export interface BudgetEntry {
  id: string
  year: number
  month: number
  category: BudgetCategory
  budgeted: number
  actual: number | null
  notes: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

// ─── Super Contributions ─────────────────────────────────────────────────────

export type SuperMember = 'husband' | 'wife'

export interface SuperContribution {
  id: string
  financial_year: string  // e.g. '2025-26'
  member: SuperMember
  amount: number
  contribution_date: string
  notes: string | null
  created_at: string
  updated_by: string | null
}

// ─── Modeller ────────────────────────────────────────────────────────────────

export type Scenario = 'bear' | 'base' | 'bull'

export interface ScenarioInputs {
  gross_income: number
  smsf_cagr_pct: number
  btc_price_usd: number
}

export interface ModellerResult {
  scenario: Scenario
  years_to_retirement: number
  // SMSF projection
  smsf_cash_at_retirement: number
  smsf_btc_value_aud: number
  smsf_contributions_compounded: number
  smsf_total_at_retirement: number
  // Property / downsize
  offset_at_sale: number
  net_mortgage_at_sale: number
  net_sale_proceeds: number
  cash_reserve: number
  // Post-downsize (after downsizer contribution invested in SMSF)
  smsf_post_downsize: number
  // Retirement income (4% rule, tax-free from 60)
  annual_retirement_income: number
  monthly_retirement_income: number
  // Current cashflow
  monthly_gross_income: number
  monthly_net_income: number
  monthly_mortgage: number
  monthly_school_fees: number
  monthly_living_costs: number
  monthly_expenses: number
  monthly_cashflow: number
  // Offset runway (months) — null if cashflow is positive
  offset_runway_months: number | null
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface BtcPriceData {
  price_usd: number
  price_aud: number
  change_24h_pct: number
}
