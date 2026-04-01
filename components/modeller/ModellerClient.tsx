'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import type { HouseholdSettings } from '@/types'
import { calculateAllScenarios } from '@/lib/calculations'
import { createClient } from '@/lib/supabase'
import SharedInputs from './SharedInputs'
import ScenarioColumn from './ScenarioColumn'

interface Props {
  initialSettings: HouseholdSettings
  budgetMonthlyTotal: number | null
}

export default function ModellerClient({ initialSettings, budgetMonthlyTotal }: Props) {
  const [settings, setSettings] = useState<HouseholdSettings>(initialSettings)
  const [useBudgetCosts, setUseBudgetCosts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showInputs, setShowInputs] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced save to Supabase
  const save = useCallback((patch: Partial<HouseholdSettings>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      const supabase = createClient()
      await supabase
        .from('household_settings')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', true)
      setSaving(false)
    }, 600)
  }, [])

  function update(patch: Partial<HouseholdSettings>) {
    setSettings((s) => ({ ...s, ...patch }))
    save(patch)
  }

  const livingCostsOverride =
    useBudgetCosts && budgetMonthlyTotal !== null ? budgetMonthlyTotal : undefined

  const results = useMemo(
    () => calculateAllScenarios(settings, livingCostsOverride),
    [settings, livingCostsOverride]
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Modeller</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Retirement projection — bear / base / bull
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-text-subtle">Saving…</span>}
          {budgetMonthlyTotal !== null && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-3.5 h-3.5 accent-gold"
                checked={useBudgetCosts}
                onChange={(e) => setUseBudgetCosts(e.target.checked)}
              />
              <span className="text-xs text-text-muted">
                Use budget costs (${budgetMonthlyTotal.toLocaleString()}/mo)
              </span>
            </label>
          )}
          <button
            onClick={() => setShowInputs((v) => !v)}
            className="btn-ghost text-sm px-3 py-1.5 border border-bg-border"
          >
            {showInputs ? '↑ Hide inputs' : '↓ Show inputs'}
          </button>
        </div>
      </div>

      {/* Inputs */}
      {showInputs && (
        <SharedInputs settings={settings} onUpdate={update} />
      )}

      {/* Scenario columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ScenarioColumn
          scenario="bear"
          settings={settings}
          result={results.bear}
          onUpdate={update}
        />
        <ScenarioColumn
          scenario="base"
          settings={settings}
          result={results.base}
          onUpdate={update}
        />
        <ScenarioColumn
          scenario="bull"
          settings={settings}
          result={results.bull}
          onUpdate={update}
        />
      </div>
    </div>
  )
}
