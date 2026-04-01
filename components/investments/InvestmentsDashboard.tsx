'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PortfolioHolding, HoldingWithPrice, EodhdQuote } from '@/types'
import { enrichHoldings, computePortfolioSummary } from '@/lib/portfolio'
import PortfolioSummary from './PortfolioSummary'
import HoldingsTable from './HoldingsTable'
import WhatIfModeller from './WhatIfModeller'

interface Props {
  initialHoldings: PortfolioHolding[]
  audUsdRate: number
}

type Tab = 'portfolio' | 'whatif'

export default function InvestmentsDashboard({ initialHoldings, audUsdRate }: Props) {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(initialHoldings)
  const [quotes, setQuotes] = useState<EodhdQuote[]>([])
  const [pricesLoading, setPricesLoading] = useState(true)
  const [pricesError, setPricesError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('portfolio')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const activeHoldings = holdings.filter((h) => h.is_active)

  const fetchPrices = useCallback(async () => {
    // Skip price fetch if no non-cash holdings
    const symbols = activeHoldings
      .filter((h) => h.symbol !== 'CASH' && h.asset_type !== 'cash')
      .map((h) => h.symbol)

    if (symbols.length === 0) {
      setPricesLoading(false)
      return
    }

    setPricesLoading(true)
    setPricesError(null)

    try {
      const res = await fetch(
        `/api/asset-price?symbols=${encodeURIComponent([...new Set(symbols)].join(','))}`
      )
      const data = await res.json()

      if (!res.ok) {
        setPricesError(data.error ?? 'Failed to load prices')
        return
      }

      // Map API response shape to EodhdQuote shape
      const mapped: EodhdQuote[] = (data.quotes ?? []).map((q: {
        symbol: string
        price: number
        previousClose: number
        change: number
        change_p: number
        timestamp: number
      }) => ({
        code: q.symbol,
        close: q.price,
        previousClose: q.previousClose,
        change: q.change,
        change_p: q.change_p,
        timestamp: q.timestamp,
        open: q.price,
        high: q.price,
        low: q.price,
        volume: 0,
      }))

      setQuotes(mapped)
      setLastRefreshed(new Date())
    } catch {
      setPricesError('Network error fetching prices')
    } finally {
      setPricesLoading(false)
    }
  }, [activeHoldings.map((h) => h.symbol).join(',')])

  // Fetch prices on mount and when holdings change
  useEffect(() => {
    fetchPrices()
  }, [fetchPrices])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchPrices, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchPrices])

  const enriched: HoldingWithPrice[] = enrichHoldings(activeHoldings, quotes, audUsdRate)
  const summary = computePortfolioSummary(enriched)

  // Approximate years to retirement from the SMSF modeller default (age 58 → 63 = 5 years)
  // This could be wired to household_settings in a future step
  const yearsToRetirement = 5

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Investments</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Portfolio tracker &amp; what-if modeller
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-text-subtle">
              Prices: {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchPrices}
            disabled={pricesLoading}
            className="btn-ghost text-sm px-3 py-1.5"
          >
            {pricesLoading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Price error banner */}
      {pricesError && (
        <div className="bg-negative/10 border border-negative/30 rounded-lg px-4 py-3 text-sm text-negative">
          {pricesError} — set <code>EODHD_API_KEY</code> in your environment to enable live prices.
        </div>
      )}

      {/* Portfolio summary (always visible) */}
      <PortfolioSummary summary={summary} loading={pricesLoading} />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-bg-border">
        {(['portfolio', 'whatif'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px ${
              tab === t
                ? 'border-gold text-gold'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {t === 'portfolio' ? 'Holdings' : 'What-If Modeller'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'portfolio' && (
        <HoldingsTable
          holdings={enriched}
          loading={pricesLoading}
          onHoldingsChange={setHoldings}
        />
      )}

      {tab === 'whatif' && (
        <WhatIfModeller
          holdings={enriched}
          yearsToRetirement={yearsToRetirement}
        />
      )}
    </div>
  )
}
