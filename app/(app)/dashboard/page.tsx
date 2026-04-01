import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCurrentFinancialYear } from '@/lib/calculations'
import { DEFAULT_SETTINGS_DB } from '@/lib/constants'
import type { HouseholdSettings, ManualBalance, SuperContribution } from '@/types'
import DashboardClient from '@/components/dashboard/DashboardClient'

export const metadata: Metadata = { title: 'Dashboard — Retirement Planner' }

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const currentFY = getCurrentFinancialYear()

  const [settingsRes, balanceRes, contributionsRes] = await Promise.all([
    supabase.from('household_settings').select('*').single(),
    supabase
      .from('manual_balances')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('super_contributions')
      .select('*')
      .eq('financial_year', currentFY),
  ])

  const settings = (settingsRes.data ?? DEFAULT_SETTINGS_DB) as HouseholdSettings
  const latestBalance = (balanceRes.data ?? null) as ManualBalance | null
  const contributions = (contributionsRes.data ?? []) as SuperContribution[]

  return (
    <DashboardClient
      settings={settings}
      latestBalance={latestBalance}
      contributions={contributions}
      currentFY={currentFY}
    />
  )
}
