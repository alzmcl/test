// ─── Portfolio ────────────────────────────────────────────────────────────────

export type AssetType = 'crypto' | 'stock' | 'etf' | 'cash' | 'bond' | 'property' | 'other'
export type TransactionType = 'buy' | 'sell' | 'dividend' | 'transfer_in' | 'transfer_out' | 'adjustment'
export type HoldingMember = 'husband' | 'wife' | 'joint'

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  crypto: 'Crypto',
  stock: 'Stock',
  etf: 'ETF',
  cash: 'Cash',
  bond: 'Bond',
  property: 'Property',
  other: 'Other',
}

export interface PortfolioHolding {
  id: string
  symbol: string
  name: string
  asset_type: AssetType
  units: number
  avg_buy_price_aud: number
  price_currency: string      // native EODHD price currency ('AUD', 'USD', etc.)
  is_in_smsf: boolean
  member: HoldingMember | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface PortfolioTransaction {
  id: string
  holding_id: string
  symbol: string
  transaction_type: TransactionType
  units: number
  price_per_unit_aud: number
  fees_aud: number
  total_aud: number
  transaction_date: string
  notes: string | null
  created_at: string
  updated_by: string | null
}

/** Holding enriched with live price data */
export interface HoldingWithPrice extends PortfolioHolding {
  current_price_aud: number | null
  market_value_aud: number | null
  cost_basis_aud: number
  unrealised_pnl_aud: number | null
  unrealised_pnl_pct: number | null
  price_change_24h_pct: number | null
}

/** Raw quote from EODHD real-time endpoint */
export interface EodhdQuote {
  code: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  previousClose: number
  change: number
  change_p: number  // percentage change
}

// ─── What-If Modeller ─────────────────────────────────────────────────────────

export interface WhatIfScenario {
  id: string            // client-side uuid for list key
  label: string
  initial_value_aud: number
  monthly_addition_aud: number
  annual_return_pct: number
  years: number
  color: string         // chart line colour
}

export interface WhatIfYearPoint {
  year: number
  value: number
  invested: number
}

export interface WhatIfResult extends WhatIfScenario {
  final_value_aud: number
  total_invested_aud: number
  total_growth_aud: number
  total_growth_pct: number
  yearly: WhatIfYearPoint[]
}

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
