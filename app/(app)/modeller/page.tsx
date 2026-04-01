import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { DEFAULT_SETTINGS_DB } from '@/lib/constants'
import type { HouseholdSettings } from '@/types'
import ModellerClient from '@/components/modeller/ModellerClient'

export const metadata: Metadata = { title: 'Modeller — Retirement Planner' }

export default async function ModellerPage() {
  const supabase = createServerSupabaseClient()
  const now = new Date()

  const [{ data: settings }, { data: budgetEntries }] = await Promise.all([
    supabase.from('household_settings').select('*').single(),
    // Pull current month's budget total to optionally override living costs
    supabase
      .from('budget_entries')
      .select('budgeted')
      .eq('year', now.getFullYear())
      .eq('month', now.getMonth() + 1),
  ])

  const budgetMonthlyTotal =
    budgetEntries && budgetEntries.length > 0
      ? budgetEntries.reduce((s, e) => s + (e.budgeted ?? 0), 0)
      : null

  return (
    <ModellerClient
      initialSettings={(settings ?? DEFAULT_SETTINGS_DB) as HouseholdSettings}
      budgetMonthlyTotal={budgetMonthlyTotal}
    />
  )
}
