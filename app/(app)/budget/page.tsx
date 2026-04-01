import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { BudgetEntry } from '@/types'
import BudgetClient from '@/components/budget/BudgetClient'

export const metadata: Metadata = { title: 'Budget — Retirement Planner' }

export default async function BudgetPage() {
  const supabase = createServerSupabaseClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // Load current month's entries (may be empty on first visit)
  const { data: entries } = await supabase
    .from('budget_entries')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .order('category')

  return (
    <BudgetClient
      initialEntries={(entries ?? []) as BudgetEntry[]}
      initialYear={year}
      initialMonth={month}
    />
  )
}
