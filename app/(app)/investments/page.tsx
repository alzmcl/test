import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { PortfolioHolding } from '@/types'
import InvestmentsDashboard from '@/components/investments/InvestmentsDashboard'

export const metadata: Metadata = { title: 'Investments — Retirement Planner' }

export default async function InvestmentsPage() {
  const supabase = createServerSupabaseClient()

  const [{ data: holdings }, { data: settings }] = await Promise.all([
    supabase
      .from('portfolio_holdings')
      .select('*')
      .eq('is_active', true)
      .order('created_at'),
    supabase
      .from('household_settings')
      .select('aud_usd_rate')
      .single(),
  ])

  return (
    <InvestmentsDashboard
      initialHoldings={(holdings ?? []) as PortfolioHolding[]}
      audUsdRate={settings?.aud_usd_rate ?? 0.65}
    />
  )
}
