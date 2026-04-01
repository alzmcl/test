import type {
  PortfolioHolding,
  HoldingWithPrice,
  EodhdQuote,
  WhatIfScenario,
  WhatIfResult,
  WhatIfYearPoint,
} from '@/types'
import { toAud } from './eodhd'

// ─── Enrich holdings with live prices ────────────────────────────────────────

/**
 * Merge holdings with EODHD quotes to produce display-ready rows.
 * Cash holdings (symbol === 'CASH') are priced at 1 AUD per unit.
 */
export function enrichHoldings(
  holdings: PortfolioHolding[],
  quotes: EodhdQuote[],
  audUsdRate: number
): HoldingWithPrice[] {
  const quoteMap = new Map(quotes.map((q) => [q.code, q]))

  return holdings.map((h): HoldingWithPrice => {
    const cost_basis_aud = h.units * h.avg_buy_price_aud

    // Cash: valued at face value, USD cash converted via FX rate
    if (h.asset_type === 'cash' || h.symbol === 'CASH' || h.symbol.startsWith('CASH_')) {
      const isUsd = h.price_currency === 'USD' || h.symbol === 'CASH_USD'
      const market_value_aud = isUsd ? h.units / audUsdRate : h.units
      const current_price_aud = isUsd ? 1 / audUsdRate : 1
      const unrealised_pnl_aud = market_value_aud - cost_basis_aud
      const unrealised_pnl_pct =
        cost_basis_aud > 0 ? (unrealised_pnl_aud / cost_basis_aud) * 100 : 0
      return {
        ...h,
        current_price_aud,
        market_value_aud,
        cost_basis_aud,
        unrealised_pnl_aud,
        unrealised_pnl_pct,
        price_change_24h_pct: 0,
      }
    }

    const quote = quoteMap.get(h.symbol)

    if (!quote) {
      return {
        ...h,
        current_price_aud: null,
        market_value_aud: null,
        cost_basis_aud,
        unrealised_pnl_aud: null,
        unrealised_pnl_pct: null,
        price_change_24h_pct: null,
      }
    }

    const current_price_aud = toAud(quote.close, h.price_currency, audUsdRate)
    const market_value_aud = h.units * current_price_aud
    const unrealised_pnl_aud = market_value_aud - cost_basis_aud
    const unrealised_pnl_pct =
      cost_basis_aud > 0 ? (unrealised_pnl_aud / cost_basis_aud) * 100 : 0

    return {
      ...h,
      current_price_aud,
      market_value_aud,
      cost_basis_aud,
      unrealised_pnl_aud,
      unrealised_pnl_pct,
      price_change_24h_pct: quote.change_p ?? null,
    }
  })
}

// ─── Portfolio summary ────────────────────────────────────────────────────────

export interface PortfolioSummaryData {
  total_market_value_aud: number
  total_cost_basis_aud: number
  total_unrealised_pnl_aud: number
  total_unrealised_pnl_pct: number
  smsf_value_aud: number
  non_smsf_value_aud: number
  by_asset_type: { type: string; value: number; pct: number }[]
  by_member: { member: string; value: number }[]
  holdings_count: number
  prices_loaded: boolean
}

export function computePortfolioSummary(
  enriched: HoldingWithPrice[]
): PortfolioSummaryData {
  const priced = enriched.filter((h) => h.market_value_aud !== null)
  const isCashHolding = (h: HoldingWithPrice) =>
    h.asset_type === 'cash' || h.symbol === 'CASH' || h.symbol.startsWith('CASH_')
  const prices_loaded = priced.length === enriched.filter((h) => !isCashHolding(h)).length

  const total_market_value_aud = enriched.reduce(
    (sum, h) => sum + (h.market_value_aud ?? h.cost_basis_aud),
    0
  )
  const total_cost_basis_aud = enriched.reduce(
    (sum, h) => sum + h.cost_basis_aud,
    0
  )
  const total_unrealised_pnl_aud = total_market_value_aud - total_cost_basis_aud
  const total_unrealised_pnl_pct =
    total_cost_basis_aud > 0
      ? (total_unrealised_pnl_aud / total_cost_basis_aud) * 100
      : 0

  const smsf_value_aud = enriched
    .filter((h) => h.is_in_smsf)
    .reduce((sum, h) => sum + (h.market_value_aud ?? h.cost_basis_aud), 0)

  const non_smsf_value_aud = total_market_value_aud - smsf_value_aud

  // Group by asset type
  const typeMap = new Map<string, number>()
  for (const h of enriched) {
    const val = h.market_value_aud ?? h.cost_basis_aud
    typeMap.set(h.asset_type, (typeMap.get(h.asset_type) ?? 0) + val)
  }
  const by_asset_type = [...typeMap.entries()]
    .map(([type, value]) => ({
      type,
      value,
      pct: total_market_value_aud > 0 ? (value / total_market_value_aud) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  // Group by member
  const memberMap = new Map<string, number>()
  for (const h of enriched) {
    const key = h.member ?? 'joint'
    memberMap.set(key, (memberMap.get(key) ?? 0) + (h.market_value_aud ?? h.cost_basis_aud))
  }
  const by_member = [...memberMap.entries()].map(([member, value]) => ({ member, value }))

  return {
    total_market_value_aud,
    total_cost_basis_aud,
    total_unrealised_pnl_aud,
    total_unrealised_pnl_pct,
    smsf_value_aud,
    non_smsf_value_aud,
    by_asset_type,
    by_member,
    holdings_count: enriched.length,
    prices_loaded,
  }
}

// ─── What-If modeller ─────────────────────────────────────────────────────────

/**
 * Project a single scenario using monthly compounding + contributions.
 *
 * FV = P(1 + r/12)^n  +  PMT × [(1 + r/12)^n − 1] / (r/12)
 *
 * where n = years × 12, r = annual_return_pct / 100
 */
export function calculateWhatIf(scenario: WhatIfScenario): WhatIfResult {
  const { initial_value_aud, monthly_addition_aud, annual_return_pct, years } = scenario
  const monthlyRate = annual_return_pct / 100 / 12
  const yearly: WhatIfYearPoint[] = [
    { year: 0, value: Math.round(initial_value_aud), invested: Math.round(initial_value_aud) },
  ]

  let value = initial_value_aud
  let totalInvested = initial_value_aud

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      if (monthlyRate === 0) {
        value += monthly_addition_aud
      } else {
        value = value * (1 + monthlyRate) + monthly_addition_aud
      }
      totalInvested += monthly_addition_aud
    }
    yearly.push({
      year: y,
      value: Math.round(value),
      invested: Math.round(totalInvested),
    })
  }

  const total_growth_aud = value - totalInvested
  const total_growth_pct =
    totalInvested > 0 ? (total_growth_aud / totalInvested) * 100 : 0

  return {
    ...scenario,
    final_value_aud: Math.round(value),
    total_invested_aud: Math.round(totalInvested),
    total_growth_aud: Math.round(total_growth_aud),
    total_growth_pct,
    yearly,
  }
}

/** Run all scenarios and return results + a merged chart dataset. */
export function buildChartData(
  results: WhatIfResult[]
): Record<string, number | string>[] {
  if (results.length === 0) return []

  const maxYears = Math.max(...results.map((r) => r.years))
  const rows: Record<string, number | string>[] = []

  for (let y = 0; y <= maxYears; y++) {
    const row: Record<string, number | string> = { year: `Yr ${y}` }
    for (const res of results) {
      const point = res.yearly.find((p) => p.year === y)
      if (point) {
        row[res.label] = point.value
        row[`${res.label}_invested`] = point.invested
      }
    }
    rows.push(row)
  }

  return rows
}

// ─── Avg buy price recalculation ─────────────────────────────────────────────

/**
 * Weighted average cost after adding a new lot.
 * existing_units × existing_avg + new_units × new_price / total_units
 */
export function newAvgBuyPrice(
  existingUnits: number,
  existingAvg: number,
  newUnits: number,
  newPrice: number
): number {
  const total = existingUnits + newUnits
  if (total === 0) return 0
  return (existingUnits * existingAvg + newUnits * newPrice) / total
}
