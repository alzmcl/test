'use client'

import { useState } from 'react'
import type { HouseholdSettings, ManualBalance } from '@/types'
import { formatCurrency } from '@/lib/calculations'
import { createClient } from '@/lib/supabase'

interface Props {
  settings: HouseholdSettings
  balance: ManualBalance | null
  smsfTotalAud: number
  smsfBtcValueAud: number
  onBalanceUpdated: (b: ManualBalance) => void
}

export default function BalancesSection({
  settings,
  balance,
  smsfTotalAud,
  smsfBtcValueAud,
  onBalanceUpdated,
}: Props) {
  const [showModal, setShowModal] = useState(false)

  const offsetBal = balance?.offset_balance ?? settings.offset_balance
  const mortgageBal = balance?.mortgage_balance ?? settings.mortgage_balance
  const netEquity = smsfTotalAud + offsetBal - mortgageBal

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* SMSF */}
        <div className="card space-y-1">
          <div className="flex items-center justify-between">
            <span className="label">SMSF Total</span>
            <span className="text-xs text-teal font-medium">incl. BTC</span>
          </div>
          <div className="text-2xl font-semibold text-gold tabular-nums">
            {formatCurrency(smsfTotalAud, true)}
          </div>
          <div className="text-xs text-text-muted">
            Cash: {formatCurrency(smsfTotalAud - smsfBtcValueAud, true)}
            {' '}·{' '}
            BTC: {formatCurrency(smsfBtcValueAud, true)}
          </div>
          {balance && (
            <div className="text-xs text-text-subtle">
              Updated {new Date(balance.recorded_at).toLocaleDateString('en-AU')}
            </div>
          )}
        </div>

        {/* Offset */}
        <div className="card space-y-1">
          <span className="label">Offset Account</span>
          <div className="text-2xl font-semibold text-teal tabular-nums">
            {formatCurrency(offsetBal, true)}
          </div>
          <div className="text-xs text-text-muted">
            Effective mortgage: {formatCurrency(Math.max(0, mortgageBal - offsetBal), true)}
          </div>
        </div>

        {/* Mortgage */}
        <div className="card space-y-1">
          <div className="flex items-center justify-between">
            <span className="label">Mortgage Balance</span>
            <span className={`text-xs font-medium ${settings.use_io_repayments ? 'text-warning' : 'text-text-muted'}`}>
              {settings.use_io_repayments ? 'IO' : 'P&I'}
            </span>
          </div>
          <div className="text-2xl font-semibold text-text-primary tabular-nums">
            {formatCurrency(mortgageBal, true)}
          </div>
          <div className="text-xs text-text-muted">
            {settings.use_io_repayments
              ? `IO: ${formatCurrency(settings.mortgage_monthly_io)}/mo`
              : `P&I: ${formatCurrency(settings.mortgage_monthly_pi)}/mo`}
            {' '}· {settings.mortgage_rate_pct}% p.a.
          </div>
        </div>
      </div>

      {/* Net equity + update button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-text-muted">
          Net financial position:{' '}
          <span className="font-semibold text-gold">
            {formatCurrency(netEquity, true)}
          </span>
          <span className="text-text-subtle ml-1">(SMSF + offset − mortgage)</span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-ghost text-sm px-3 py-1.5 border border-bg-border"
        >
          Update balances
        </button>
      </div>

      {showModal && (
        <UpdateBalancesModal
          settings={settings}
          current={balance}
          onSaved={onBalanceUpdated}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

// ─── Update balances modal ────────────────────────────────────────────────────

function UpdateBalancesModal({
  settings,
  current,
  onSaved,
  onClose,
}: {
  settings: HouseholdSettings
  current: ManualBalance | null
  onSaved: (b: ManualBalance) => void
  onClose: () => void
}) {
  const [smsf, setSmsf] = useState(String(current?.smsf_balance ?? settings.smsf_cash_investments))
  const [offset, setOffset] = useState(String(current?.offset_balance ?? settings.offset_balance))
  const [mortgage, setMortgage] = useState(String(current?.mortgage_balance ?? settings.mortgage_balance))
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
      .from('manual_balances')
      .insert({
        smsf_balance: parseFloat(smsf),
        offset_balance: parseFloat(offset),
        mortgage_balance: parseFloat(mortgage),
        notes: notes.trim() || null,
        recorded_by: user.user?.id ?? null,
      })
      .select()
      .single()

    if (err) { setError(err.message); setSaving(false); return }
    onSaved(data as ManualBalance)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-card border border-bg-border rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-bg-border">
          <h2 className="font-semibold text-text-primary">Update Balances</h2>
          <button onClick={onClose} className="text-text-muted text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-text-muted">
            Log a snapshot of today's balances. This doesn't affect the mortgage balance in the database — just this view.
          </p>
          {[
            { label: 'SMSF (cash + investments, excl. BTC)', value: smsf, set: setSmsf },
            { label: 'Offset Account Balance', value: offset, set: setOffset },
            { label: 'Mortgage Balance', value: mortgage, set: setMortgage },
          ].map(({ label, value, set }) => (
            <div key={label} className="space-y-1">
              <label className="label">{label}</label>
              <input
                type="number"
                step="1"
                min="0"
                required
                className="input-field w-full"
                value={value}
                onChange={(e) => set(e.target.value)}
              />
            </div>
          ))}
          <div className="space-y-1">
            <label className="label">Notes (optional)</label>
            <input
              type="text"
              className="input-field w-full"
              placeholder="e.g. After June dividend"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error && <p className="text-negative text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Save snapshot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
