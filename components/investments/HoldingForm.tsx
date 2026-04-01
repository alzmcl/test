'use client'

import { useState, useEffect } from 'react'
import type { PortfolioHolding, AssetType, HoldingMember } from '@/types'
import { ASSET_TYPE_LABELS } from '@/types'
import { COMMON_SYMBOLS, nativeCurrencyForSymbol } from '@/lib/eodhd'
import { formatCurrency } from '@/lib/calculations'
import { createClient } from '@/lib/supabase'

interface Props {
  holding?: PortfolioHolding | null
  onSave: (holding: PortfolioHolding) => void
  onClose: () => void
}

const BLANK: Omit<PortfolioHolding, 'id' | 'created_at' | 'updated_at' | 'updated_by'> = {
  symbol: '',
  name: '',
  asset_type: 'stock',
  units: 0,
  avg_buy_price_aud: 0,
  price_currency: 'AUD',
  is_in_smsf: false,
  member: null,
  notes: null,
  is_active: true,
}

export default function HoldingForm({ holding, onSave, onClose }: Props) {
  const isEdit = !!holding
  const [form, setForm] = useState({ ...BLANK, ...holding })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lookupPrice, setLookupPrice] = useState<number | null>(null)
  const [lookingUp, setLookingUp] = useState(false)

  // When a common symbol is selected, auto-fill name and currency
  function applyCommonSymbol(symbol: string) {
    const preset = COMMON_SYMBOLS.find((s) => s.symbol === symbol)
    setForm((f) => ({
      ...f,
      symbol,
      name: preset?.name ?? f.name,
      asset_type: (preset?.asset_type as AssetType) ?? f.asset_type,
      price_currency: preset?.price_currency ?? nativeCurrencyForSymbol(symbol),
    }))
  }

  function applyCashCurrency(currency: 'AUD' | 'USD') {
    setForm((f) => ({
      ...f,
      symbol: `CASH_${currency}`,
      price_currency: currency,
      name: f.name === 'Cash (AUD)' || f.name === 'Cash (USD)' || f.name === ''
        ? `Cash (${currency})`
        : f.name,
    }))
  }

  const isCash = form.asset_type === 'cash' || form.symbol === 'CASH' || form.symbol.startsWith('CASH_')
  const cashCurrency = (form.price_currency === 'USD' ? 'USD' : 'AUD') as 'AUD' | 'USD'

  async function lookupCurrentPrice() {
    if (!form.symbol || isCash) return
    setLookingUp(true)
    setLookupPrice(null)
    try {
      const res = await fetch(`/api/asset-price?symbols=${encodeURIComponent(form.symbol)}`)
      const data = await res.json()
      const quote = data?.quotes?.[0]
      if (quote) setLookupPrice(quote.price)
    } catch {
      // silently ignore
    } finally {
      setLookingUp(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const supabase = createClient()
    const { data: user } = await supabase.auth.getUser()

    const payload = {
      symbol: isCash ? `CASH_${form.price_currency}` : form.symbol.trim().toUpperCase(),
      name: form.name.trim(),
      asset_type: form.asset_type,
      units: Number(form.units),
      avg_buy_price_aud: Number(form.avg_buy_price_aud),
      price_currency: form.price_currency || nativeCurrencyForSymbol(form.symbol),
      is_in_smsf: form.is_in_smsf,
      member: form.member || null,
      notes: form.notes?.trim() || null,
      is_active: true,
      updated_by: user.user?.id ?? null,
    }

    let result
    if (isEdit && holding) {
      const { data, error: err } = await supabase
        .from('portfolio_holdings')
        .update(payload)
        .eq('id', holding.id)
        .select()
        .single()
      result = { data, error: err }
    } else {
      const { data, error: err } = await supabase
        .from('portfolio_holdings')
        .insert(payload)
        .select()
        .single()
      result = { data, error: err }
    }

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    onSave(result.data as PortfolioHolding)
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-card border border-bg-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-bg-border">
          <h2 className="font-semibold text-text-primary">
            {isEdit ? 'Edit Holding' : 'Add Holding'}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Asset type selector — always shown */}
          <div className="space-y-1">
            <label className="label">Type *</label>
            <select
              className="input-field w-full"
              value={form.asset_type}
              onChange={(e) => {
                const newType = e.target.value as AssetType
                if (newType === 'cash') {
                  setForm((f) => ({
                    ...f,
                    asset_type: 'cash',
                    symbol: 'CASH_AUD',
                    price_currency: 'AUD',
                    name: f.name || 'Cash (AUD)',
                    avg_buy_price_aud: 0,
                  }))
                } else {
                  setForm((f) => ({
                    ...f,
                    asset_type: newType,
                    symbol: f.symbol.startsWith('CASH_') ? '' : f.symbol,
                    name: f.name === 'Cash (AUD)' || f.name === 'Cash (USD)' ? '' : f.name,
                  }))
                }
              }}
            >
              {Object.entries(ASSET_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {isCash ? (
            /* ── Cash simplified form ── */
            <>
              {/* Currency toggle */}
              <div className="space-y-1">
                <label className="label">Currency</label>
                <div className="flex rounded-lg border border-bg-border overflow-hidden text-sm">
                  {(['AUD', 'USD'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => applyCashCurrency(c)}
                      className={`flex-1 py-2 text-sm transition-colors ${
                        cashCurrency === c ? 'bg-navy text-gold' : 'text-text-muted hover:bg-bg-raised'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="label">Amount ({cashCurrency}) *</label>
                <input
                  required
                  type="number"
                  step="any"
                  min="0"
                  className="input-field w-full"
                  placeholder="0"
                  value={form.units || ''}
                  onChange={(e) => setForm((f) => ({ ...f, units: parseFloat(e.target.value) || 0 }))}
                />
                {cashCurrency === 'USD' && (
                  <p className="text-xs text-text-subtle">Converted to AUD at settlement using live FX rate</p>
                )}
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="label">Name *</label>
                <input
                  required
                  className="input-field w-full"
                  placeholder="e.g. Cash (AUD)"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
            </>
          ) : (
            /* ── Standard asset form ── */
            <>
              {/* Common symbol picker */}
              <div className="space-y-1">
                <label className="label">Quick-pick symbol</label>
                <select
                  className="input-field w-full"
                  value=""
                  onChange={(e) => applyCommonSymbol(e.target.value)}
                >
                  <option value="">— select a common asset —</option>
                  {COMMON_SYMBOLS.map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Symbol + lookup */}
              <div className="space-y-1">
                <label className="label">EODHD Symbol *</label>
                <div className="flex gap-2">
                  <input
                    required
                    className="input-field flex-1"
                    placeholder="e.g. BTC-USD.CC  VAS.AU  AAPL.US"
                    value={form.symbol}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        symbol: e.target.value,
                        price_currency: nativeCurrencyForSymbol(e.target.value),
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={lookupCurrentPrice}
                    disabled={lookingUp || !form.symbol}
                    className="btn-ghost px-3 text-xs border border-bg-border shrink-0"
                  >
                    {lookingUp ? '…' : 'Lookup'}
                  </button>
                </div>
                {lookupPrice !== null && (
                  <p className="text-xs text-teal">
                    Current price: {form.price_currency} {lookupPrice.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="label">Name *</label>
                <input
                  required
                  className="input-field w-full"
                  placeholder="e.g. Bitcoin, Vanguard Aus Shares"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              {/* Currency */}
              <div className="space-y-1">
                <label className="label">Price Currency</label>
                <select
                  className="input-field w-full"
                  value={form.price_currency}
                  onChange={(e) => setForm((f) => ({ ...f, price_currency: e.target.value }))}
                >
                  {['AUD', 'USD', 'GBP', 'EUR', 'CAD', 'JPY', 'HKD'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Units + avg buy price row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="label">Units *</label>
                  <input
                    required
                    type="number"
                    step="any"
                    min="0"
                    className="input-field w-full"
                    placeholder="0"
                    value={form.units || ''}
                    onChange={(e) => setForm((f) => ({ ...f, units: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="label">Avg Buy Price (AUD) *</label>
                  <input
                    required
                    type="number"
                    step="any"
                    min="0"
                    className="input-field w-full"
                    placeholder="0.00"
                    value={form.avg_buy_price_aud || ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, avg_buy_price_aud: parseFloat(e.target.value) || 0 }))
                    }
                  />
                  {lookupPrice !== null && (
                    <button
                      type="button"
                      className="text-xs text-gold underline"
                      onClick={() => setForm((f) => ({ ...f, avg_buy_price_aud: lookupPrice }))}
                    >
                      Use current price
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Cost basis preview — only for non-cash */}
          {!isCash && form.units > 0 && form.avg_buy_price_aud > 0 && (
            <p className="text-xs text-text-muted">
              Cost basis:{' '}
              <span className="text-gold font-medium">
                {formatCurrency(form.units * form.avg_buy_price_aud)}
              </span>
            </p>
          )}

          {/* SMSF + member */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="label">Member</label>
              <select
                className="input-field w-full"
                value={form.member ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, member: (e.target.value || null) as HoldingMember | null }))
                }
              >
                <option value="">Joint / unassigned</option>
                <option value="husband">Husband</option>
                <option value="wife">Wife</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="label">Held in SMSF?</label>
              <div className="flex items-center h-10 gap-2">
                <input
                  id="is_in_smsf"
                  type="checkbox"
                  checked={form.is_in_smsf}
                  onChange={(e) => setForm((f) => ({ ...f, is_in_smsf: e.target.checked }))}
                  className="w-4 h-4 accent-gold"
                />
                <label htmlFor="is_in_smsf" className="text-sm text-text-secondary cursor-pointer">
                  Yes, in SMSF
                </label>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="label">Notes</label>
            <textarea
              className="input-field w-full resize-none"
              rows={2}
              placeholder="Optional notes…"
              value={form.notes ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
            />
          </div>

          {error && <p className="text-negative text-sm">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Holding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
