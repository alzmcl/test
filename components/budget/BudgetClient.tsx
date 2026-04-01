'use client'

import { useState, useCallback } from 'react'
import type { BudgetEntry, BudgetCategory } from '@/types'
import { BUDGET_CATEGORIES, BUDGET_CATEGORY_LABELS } from '@/types'
import { BUDGET_DEFAULTS, MONTH_NAMES } from '@/lib/constants'
import { formatCurrency } from '@/lib/calculations'
import { createClient } from '@/lib/supabase'

interface Props {
  initialEntries: BudgetEntry[]
  initialYear: number
  initialMonth: number
}

type ViewMode = 'monthly' | 'annual'

// Build a keyed map from entries array
function buildMap(entries: BudgetEntry[]): Record<BudgetCategory, BudgetEntry | null> {
  const map = {} as Record<BudgetCategory, BudgetEntry | null>
  for (const cat of BUDGET_CATEGORIES) map[cat] = null
  for (const e of entries) map[e.category as BudgetCategory] = e
  return map
}

export default function BudgetClient({ initialEntries, initialYear, initialMonth }: Props) {
  const [year,  setYear]  = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [entries, setEntries] = useState<Record<BudgetCategory, BudgetEntry | null>>(
    buildMap(initialEntries)
  )
  const [view, setView] = useState<ViewMode>('monthly')
  const [saving, setSaving] = useState<Set<BudgetCategory>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)

  // Load a different month
  const loadMonth = useCallback(async (y: number, m: number) => {
    setYear(y)
    setMonth(m)
    const supabase = createClient()
    const { data } = await supabase
      .from('budget_entries')
      .select('*')
      .eq('year', y)
      .eq('month', m)
      .order('category')
    setEntries(buildMap((data ?? []) as BudgetEntry[]))
  }, [])

  function prevMonth() {
    const d = new Date(year, month - 2, 1)
    loadMonth(d.getFullYear(), d.getMonth() + 1)
  }

  function nextMonth() {
    const d = new Date(year, month, 1)
    loadMonth(d.getFullYear(), d.getMonth() + 1)
  }

  // Upsert a single cell value
  const saveCell = useCallback(
    async (category: BudgetCategory, field: 'budgeted' | 'actual', rawValue: string) => {
      const value = rawValue === '' ? null : parseFloat(rawValue)
      if (field === 'budgeted' && value === null) return // budgeted can't be null

      setSaving((s) => new Set(s).add(category))

      let uid = userId
      if (!uid) {
        const supabase = createClient()
        const { data: u } = await supabase.auth.getUser()
        uid = u.user?.id ?? null
        setUserId(uid)
      }

      const supabase = createClient()
      const existing = entries[category]

      const upsertPayload = {
        year,
        month,
        category,
        budgeted: field === 'budgeted' ? (value as number) : (existing?.budgeted ?? BUDGET_DEFAULTS[category]),
        actual:   field === 'actual'   ? value            : (existing?.actual   ?? null),
        updated_by: uid,
      }

      const { data, error } = await supabase
        .from('budget_entries')
        .upsert(upsertPayload, { onConflict: 'year,month,category' })
        .select()
        .single()

      setSaving((s) => { const n = new Set(s); n.delete(category); return n })

      if (!error && data) {
        setEntries((prev) => ({ ...prev, [category]: data as BudgetEntry }))
      }
    },
    [year, month, entries, userId]
  )

  // Totals
  const totalBudgeted = BUDGET_CATEGORIES.reduce(
    (s, c) => s + (entries[c]?.budgeted ?? BUDGET_DEFAULTS[c]), 0
  )
  const totalActual = BUDGET_CATEGORIES.reduce(
    (s, c) => s + (entries[c]?.actual ?? 0), 0
  )
  const totalVariance = totalActual - totalBudgeted
  const multiplier = view === 'annual' ? 12 : 1
  const hasAnyActuals = BUDGET_CATEGORIES.some((c) => entries[c]?.actual != null)

  const isCurrentMonth =
    year === new Date().getFullYear() && month === new Date().getMonth() + 1

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Budget</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Actual vs budget — click any cell to edit
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Monthly / Annual toggle */}
          <div className="flex rounded-lg border border-bg-border overflow-hidden text-sm">
            {(['monthly', 'annual'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 capitalize transition-colors ${
                  view === v ? 'bg-navy text-gold' : 'text-text-muted hover:bg-bg-raised'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Month navigator */}
          <div className="flex items-center gap-1 border border-bg-border rounded-lg overflow-hidden text-sm">
            <button onClick={prevMonth} className="px-3 py-1.5 text-text-muted hover:bg-bg-raised">‹</button>
            <span className="px-2 text-text-secondary whitespace-nowrap">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="px-3 py-1.5 text-text-muted hover:bg-bg-raised disabled:opacity-30"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <div className="label mb-1">Budgeted</div>
          <div className="text-xl font-semibold text-text-primary tabular-nums">
            {formatCurrency(totalBudgeted * multiplier, true)}
          </div>
        </div>
        <div className="card text-center">
          <div className="label mb-1">Actual</div>
          <div className="text-xl font-semibold text-text-primary tabular-nums">
            {hasAnyActuals ? formatCurrency(totalActual * multiplier, true) : '—'}
          </div>
        </div>
        <div className="card text-center">
          <div className="label mb-1">Variance</div>
          <div className={`text-xl font-semibold tabular-nums ${
            totalVariance <= 0 ? 'text-positive' : 'text-negative'
          }`}>
            {hasAnyActuals
              ? `${totalVariance <= 0 ? '' : '+'}${formatCurrency(totalVariance * multiplier, true)}`
              : '—'}
          </div>
        </div>
      </div>

      {/* Budget table */}
      <BudgetTable
        entries={entries}
        view={view}
        saving={saving}
        onSave={saveCell}
      />
    </div>
  )
}

// ─── Budget Table ─────────────────────────────────────────────────────────────

function BudgetTable({
  entries, view, saving, onSave,
}: {
  entries: Record<BudgetCategory, BudgetEntry | null>
  view: ViewMode
  saving: Set<BudgetCategory>
  onSave: (cat: BudgetCategory, field: 'budgeted' | 'actual', value: string) => void
}) {
  const multiplier = view === 'annual' ? 12 : 1

  let runningBudgetTotal = 0
  let runningActualTotal = 0

  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bg-border">
            <th className="px-4 py-3 text-left label">Category</th>
            <th className="px-4 py-3 text-right label">Budgeted</th>
            <th className="px-4 py-3 text-right label">Actual</th>
            <th className="px-4 py-3 text-right label">Variance</th>
            <th className="px-4 py-3 text-right label hidden sm:table-cell">% Used</th>
          </tr>
        </thead>
        <tbody>
          {BUDGET_CATEGORIES.map((cat) => {
            const entry = entries[cat]
            const budgeted = (entry?.budgeted ?? BUDGET_DEFAULTS[cat]) * multiplier
            const actual   = entry?.actual != null ? entry.actual * multiplier : null
            const variance = actual != null ? actual - budgeted : null
            const pctUsed  = actual != null && budgeted > 0 ? (actual / budgeted) * 100 : null

            runningBudgetTotal += budgeted
            if (actual != null) runningActualTotal += actual

            const isSaving = saving.has(cat)

            return (
              <tr key={cat} className="border-b border-bg-border/50 hover:bg-bg-raised/30 group">
                {/* Category */}
                <td className="px-4 py-2.5">
                  <span className="text-text-secondary">{BUDGET_CATEGORY_LABELS[cat]}</span>
                  {isSaving && <span className="ml-2 text-xs text-text-subtle">·</span>}
                </td>

                {/* Budgeted — editable */}
                <td className="px-4 py-2.5 text-right">
                  <EditableCell
                    value={budgeted / multiplier}
                    multiplier={multiplier}
                    className="text-text-secondary"
                    onBlur={(v) => onSave(cat, 'budgeted', v)}
                  />
                </td>

                {/* Actual — editable */}
                <td className="px-4 py-2.5 text-right">
                  <EditableCell
                    value={entry?.actual ?? null}
                    multiplier={multiplier}
                    placeholder="—"
                    className="text-text-secondary"
                    onBlur={(v) => onSave(cat, 'actual', v)}
                  />
                </td>

                {/* Variance */}
                <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${
                  variance === null ? 'text-text-subtle' :
                  variance <= 0    ? 'text-positive'    : 'text-negative'
                }`}>
                  {variance === null ? '—' : `${variance <= 0 ? '' : '+'}${formatCurrency(variance, true)}`}
                </td>

                {/* % Used */}
                <td className="px-4 py-2.5 text-right hidden sm:table-cell">
                  {pctUsed !== null ? (
                    <span className={`tabular-nums text-xs ${pctUsed > 100 ? 'text-negative' : pctUsed > 80 ? 'text-warning' : 'text-text-muted'}`}>
                      {pctUsed.toFixed(0)}%
                    </span>
                  ) : <span className="text-text-subtle">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>

        {/* Totals */}
        <tfoot>
          <tr className="border-t-2 border-bg-border font-semibold">
            <td className="px-4 py-3 text-text-primary">Total</td>
            <td className="px-4 py-3 text-right tabular-nums text-gold">
              {formatCurrency(runningBudgetTotal, true)}
            </td>
            <td className="px-4 py-3 text-right tabular-nums text-text-primary">
              {runningActualTotal > 0 ? formatCurrency(runningActualTotal, true) : '—'}
            </td>
            <td className={`px-4 py-3 text-right tabular-nums ${
              runningActualTotal === 0 ? 'text-text-subtle' :
              runningActualTotal <= runningBudgetTotal ? 'text-positive' : 'text-negative'
            }`}>
              {runningActualTotal > 0
                ? `${runningActualTotal <= runningBudgetTotal ? '' : '+'}${formatCurrency(runningActualTotal - runningBudgetTotal, true)}`
                : '—'}
            </td>
            <td className="hidden sm:table-cell" />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ─── Editable cell ────────────────────────────────────────────────────────────

function EditableCell({
  value, multiplier, placeholder = '0', className, onBlur,
}: {
  value: number | null
  multiplier: number
  placeholder?: string
  className?: string
  onBlur: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')

  const displayed = value != null ? (value * multiplier).toFixed(0) : ''

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        step="1"
        min="0"
        className="w-24 text-right bg-bg-raised border border-gold/50 rounded px-2 py-0.5 text-xs tabular-nums text-text-primary focus:outline-none"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => {
          setEditing(false)
          if (raw !== '') onBlur(String(parseFloat(raw) / multiplier))
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') { setEditing(false) }
        }}
      />
    )
  }

  return (
    <button
      onClick={() => { setRaw(displayed); setEditing(true) }}
      className={`tabular-nums hover:text-gold transition-colors cursor-text ${className}`}
    >
      {displayed ? formatCurrency(parseFloat(displayed), true) : (
        <span className="text-text-subtle">{placeholder}</span>
      )}
    </button>
  )
}
