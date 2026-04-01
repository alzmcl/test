'use client'

import { useState } from 'react'
import type { HouseholdSettings, SuperContribution } from '@/types'
import { formatCurrency, daysToFyEnd } from '@/lib/calculations'
import { COMBINED_SUPER_CAP, PER_MEMBER_SUPER_CAP } from '@/lib/constants'
import { createClient } from '@/lib/supabase'

interface Props {
  contributions: SuperContribution[]
  currentFY: string
  settings: HouseholdSettings
}

export default function SuperProgressSection({ contributions, currentFY, settings }: Props) {
  const [entries, setEntries] = useState(contributions)
  const [showModal, setShowModal] = useState(false)

  const husbandTotal = entries
    .filter((c) => c.member === 'husband')
    .reduce((s, c) => s + c.amount, 0)

  const wifeTotal = entries
    .filter((c) => c.member === 'wife')
    .reduce((s, c) => s + c.amount, 0)

  const combinedTotal = husbandTotal + wifeTotal
  const combinedPct = Math.min(100, (combinedTotal / COMBINED_SUPER_CAP) * 100)
  const daysLeft = daysToFyEnd()

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium text-text-primary">
            FY Super Contributions — {currentFY}
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            {daysLeft} days to 30 June · concessional cap ${COMBINED_SUPER_CAP.toLocaleString()} combined
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-ghost text-sm px-3 py-1.5 border border-bg-border"
        >
          + Add
        </button>
      </div>

      {/* Combined progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">Combined</span>
          <span className={`font-medium tabular-nums ${combinedTotal >= COMBINED_SUPER_CAP ? 'text-positive' : 'text-gold'}`}>
            {formatCurrency(combinedTotal)} / {formatCurrency(COMBINED_SUPER_CAP)}
            {combinedTotal >= COMBINED_SUPER_CAP && ' ✓'}
          </span>
        </div>
        <div className="h-3 bg-bg-raised rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              combinedTotal >= COMBINED_SUPER_CAP ? 'bg-positive' : 'bg-gold'
            }`}
            style={{ width: `${combinedPct}%` }}
          />
        </div>
      </div>

      {/* Per-member bars */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { member: 'husband', total: husbandTotal },
          { member: 'wife',    total: wifeTotal },
        ].map(({ member, total }) => {
          const pct = Math.min(100, (total / PER_MEMBER_SUPER_CAP) * 100)
          const done = total >= PER_MEMBER_SUPER_CAP
          return (
            <div key={member} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted capitalize">{member}</span>
                <span className={`tabular-nums font-medium ${done ? 'text-positive' : 'text-text-secondary'}`}>
                  {formatCurrency(total, true)} {done ? '✓' : `/ ${formatCurrency(PER_MEMBER_SUPER_CAP, true)}`}
                </span>
              </div>
              <div className="h-2 bg-bg-raised rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-positive' : 'bg-teal'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Remaining */}
      {combinedTotal < COMBINED_SUPER_CAP && (
        <p className="text-xs text-text-muted">
          {formatCurrency(COMBINED_SUPER_CAP - combinedTotal)} remaining ·{' '}
          {daysLeft > 0
            ? `${formatCurrency((COMBINED_SUPER_CAP - combinedTotal) / daysLeft * 30, true)}/month needed`
            : 'FY closed'}
        </p>
      )}

      {showModal && (
        <AddContributionModal
          currentFY={currentFY}
          onAdded={(c) => { setEntries((e) => [...e, c]); setShowModal(false) }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

// ─── Add contribution modal ───────────────────────────────────────────────────

function AddContributionModal({
  currentFY,
  onAdded,
  onClose,
}: {
  currentFY: string
  onAdded: (c: SuperContribution) => void
  onClose: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [member, setMember] = useState<'husband' | 'wife'>('husband')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { data: user } = await supabase.auth.getUser()

    const { data, error: err } = await supabase
      .from('super_contributions')
      .insert({
        financial_year: currentFY,
        member,
        amount: parseFloat(amount),
        contribution_date: date,
        notes: notes.trim() || null,
        updated_by: user.user?.id ?? null,
      })
      .select()
      .single()

    if (err) { setError(err.message); setSaving(false); return }
    onAdded(data as SuperContribution)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-card border border-bg-border rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-bg-border">
          <h2 className="font-semibold text-text-primary">Add Contribution</h2>
          <button onClick={onClose} className="text-text-muted text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {(['husband', 'wife'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMember(m)}
                className={`py-2 rounded-lg border font-medium text-sm capitalize transition-colors ${
                  member === m
                    ? 'bg-navy border-gold text-gold'
                    : 'bg-bg-raised border-bg-border text-text-muted'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <label className="label">Amount ($)</label>
            <input type="number" required min="1" step="1" value={amount} onChange={e => setAmount(e.target.value)} className="input-field w-full" placeholder="30000" />
          </div>
          <div className="space-y-1">
            <label className="label">Date</label>
            <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="input-field w-full" />
          </div>
          <div className="space-y-1">
            <label className="label">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input-field w-full" placeholder="e.g. Employer SG" />
          </div>
          {error && <p className="text-negative text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
