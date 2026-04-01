'use client'

import { useState, useEffect, useCallback } from 'react'
import type { HouseholdSettings, ManualBalance, SuperContribution, BtcPriceData } from '@/types'
import { calculateModeller } from '@/lib/calculations'
import BalancesSection from './BalancesSection'
import BtcPriceCard from './BtcPriceCard'
import CountdownCard from './CountdownCard'
import SuperProgressSection from './SuperProgressSection'
import CashflowCard from './CashflowCard'

interface Props {
  settings: HouseholdSettings
  latestBalance: ManualBalance | null
  contributions: SuperContribution[]
  currentFY: string
}

export default function DashboardClient({
  settings,
  latestBalance,
  contributions,
  currentFY,
}: Props) {
  const [btc, setBtc] = useState<BtcPriceData | null>(null)
  const [btcLoading, setBtcLoading] = useState(true)
  const [balance, setBalance] = useState<ManualBalance | null>(latestBalance)

  const fetchBtc = useCallback(async () => {
    try {
      const res = await fetch('/api/btc-price')
      if (res.ok) {
        const data = await res.json()
        setBtc(data)
      }
    } catch {
      // silently ignore
    } finally {
      setBtcLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBtc()
    const interval = setInterval(fetchBtc, 60_000)
    return () => clearInterval(interval)
  }, [fetchBtc])

  // Compute live SMSF total: manual cash balance + BTC value at live price
  const btcPriceAud = btc ? btc.price_aud : settings.base_btc_price_usd / settings.aud_usd_rate
  const smsfBtcValueAud = settings.smsf_btc_holdings * btcPriceAud
  const smsfCashBalance = balance?.smsf_balance ?? settings.smsf_cash_investments
  const smsfTotalAud = smsfCashBalance + smsfBtcValueAud

  // Current cashflow using base scenario
  const baseResult = calculateModeller(settings, 'base')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-muted mt-0.5">Live snapshot — today</p>
        </div>
        <button
          onClick={fetchBtc}
          disabled={btcLoading}
          className="btn-ghost text-sm px-3 py-1.5"
        >
          {btcLoading ? '…' : '↻'}
        </button>
      </div>

      {/* Balances row */}
      <BalancesSection
        settings={settings}
        balance={balance}
        smsfTotalAud={smsfTotalAud}
        smsfBtcValueAud={smsfBtcValueAud}
        onBalanceUpdated={setBalance}
      />

      {/* Live metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BtcPriceCard btc={btc} loading={btcLoading} />
        <CountdownCard label="Days to 60" ageNow={settings.age_husband} memberLabel="Husband" />
        <CountdownCard label="Days to 60" ageNow={settings.age_wife} memberLabel="Wife" />
        <CashflowCard result={baseResult} />
      </div>

      {/* FY super contributions */}
      <SuperProgressSection
        contributions={contributions}
        currentFY={currentFY}
        settings={settings}
      />
    </div>
  )
}
