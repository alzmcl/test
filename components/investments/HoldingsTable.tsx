'use client'

import { useState } from 'react'
import type { HoldingWithPrice, PortfolioHolding } from '@/types'
import { ASSET_TYPE_LABELS } from '@/types'
import { formatCurrency } from '@/lib/calculations'
import { createClient } from '@/lib/supabase'
import HoldingForm from './HoldingForm'

interface Props {
  holdings: HoldingWithPrice[]
  loading: boolean
  onHoldingsChange: (updated: PortfolioHolding[]) => void
}

const ASSET_TYPE_COLOURS: Record<string, string> = {
  crypto:   'text-yellow-400 bg-yellow-400/10',
  stock:    'text-blue-400 bg-blue-400/10',
  etf:      'text-teal bg-teal/10',
  cash:     'text-green-400 bg-green-400/10',
  bond:     'text-purple-400 bg-purple-400/10',
  property: 'text-orange-400 bg-orange-400/10',
  other:    'text-text-muted bg-bg-raised',
}

export default function HoldingsTable({ holdings, loading, onHoldingsChange }: Props) {
  const [editingHolding, setEditingHolding] = useState<PortfolioHolding | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleSave(saved: PortfolioHolding) {
    const isNew = !holdings.find((h) => h.id === saved.id)
    const updated: PortfolioHolding[] = isNew
      ? [...holdings, saved]
      : holdings.map((h) => (h.id === saved.id ? { ...h, ...saved } : h))
    onHoldingsChange(updated)
    setShowForm(false)
    setEditingHolding(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Archive this holding?')) return
    setDeletingId(id)
    const supabase = createClient()
    await supabase
      .from('portfolio_holdings')
      .update({ is_active: false })
      .eq('id', id)
    onHoldingsChange(holdings.filter((h) => h.id !== id))
    setDeletingId(null)
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium text-text-primary">Holdings</h2>
        <button
          className="btn-primary text-sm px-3 py-1.5"
          onClick={() => { setEditingHolding(null); setShowForm(true) }}
        >
          + Add
        </button>
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border">
              {['Asset', 'Type', 'Units', 'Avg Buy', 'Price', 'Value', 'P&L', 'P&L %', 'SMSF', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left label font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holdings.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-text-muted text-sm">
                  No holdings yet — click <strong>+ Add</strong> to get started.
                </td>
              </tr>
            )}
            {holdings.map((h) => {
              const pnlPos = (h.unrealised_pnl_aud ?? 0) >= 0
              return (
                <tr
                  key={h.id}
                  className="border-b border-bg-border/50 hover:bg-bg-raised/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-primary">{h.name}</div>
                    <div className="text-xs text-text-subtle">{h.symbol}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ASSET_TYPE_COLOURS[h.asset_type] ?? ASSET_TYPE_COLOURS.other}`}>
                      {ASSET_TYPE_LABELS[h.asset_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-secondary">
                    {h.asset_type === 'cash' ? '—' : h.units.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-secondary">
                    {h.asset_type === 'cash' ? '—' : formatCurrency(h.avg_buy_price_aud)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-secondary">
                    {loading ? (
                      <div className="h-4 w-20 bg-bg-raised rounded animate-pulse" />
                    ) : h.current_price_aud !== null ? (
                      <div>
                        <div>{formatCurrency(h.current_price_aud)}</div>
                        {h.price_change_24h_pct !== null && (
                          <div className={`text-xs ${Number(h.price_change_24h_pct) >= 0 ? 'text-positive' : 'text-negative'}`}>
                            {Number(h.price_change_24h_pct) >= 0 ? '+' : ''}{Number(h.price_change_24h_pct).toFixed(2)}%
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-subtle">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium text-gold">
                    {loading ? (
                      <div className="h-4 w-24 bg-bg-raised rounded animate-pulse" />
                    ) : h.market_value_aud !== null ? (
                      formatCurrency(h.market_value_aud, true)
                    ) : (
                      formatCurrency(h.cost_basis_aud, true)
                    )}
                  </td>
                  <td className={`px-4 py-3 tabular-nums ${pnlPos ? 'text-positive' : 'text-negative'}`}>
                    {loading || h.unrealised_pnl_aud === null ? (
                      <div className="h-4 w-20 bg-bg-raised rounded animate-pulse" />
                    ) : (
                      `${pnlPos ? '+' : ''}${formatCurrency(h.unrealised_pnl_aud, true)}`
                    )}
                  </td>
                  <td className={`px-4 py-3 tabular-nums ${pnlPos ? 'text-positive' : 'text-negative'}`}>
                    {loading || h.unrealised_pnl_pct === null ? (
                      <div className="h-4 w-14 bg-bg-raised rounded animate-pulse" />
                    ) : (
                      `${pnlPos ? '+' : ''}${Number(h.unrealised_pnl_pct).toFixed(2)}%`
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {h.is_in_smsf ? (
                      <span className="text-xs text-teal font-medium">SMSF</span>
                    ) : (
                      <span className="text-xs text-text-subtle">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingHolding(h); setShowForm(true) }}
                        className="text-xs text-text-muted hover:text-gold px-2 py-1 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(h.id)}
                        disabled={deletingId === h.id}
                        className="text-xs text-text-muted hover:text-negative px-2 py-1 rounded"
                      >
                        {deletingId === h.id ? '…' : 'Del'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {holdings.length === 0 && (
          <div className="card text-center text-sm text-text-muted py-8">
            No holdings yet — tap <strong>+ Add</strong> to start.
          </div>
        )}
        {holdings.map((h) => {
          const pnlPos = (h.unrealised_pnl_aud ?? 0) >= 0
          return (
            <div key={h.id} className="card space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-text-primary">{h.name}</div>
                  <div className="text-xs text-text-subtle">{h.symbol}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ASSET_TYPE_COLOURS[h.asset_type]}`}>
                  {ASSET_TYPE_LABELS[h.asset_type]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {h.asset_type !== 'cash' && (
                  <>
                    <Cell label="Units" value={h.units.toLocaleString(undefined, { maximumFractionDigits: 6 })} />
                    <Cell label="Avg Buy" value={formatCurrency(h.avg_buy_price_aud)} />
                  </>
                )}
                <Cell label="Value" value={h.market_value_aud != null ? formatCurrency(h.market_value_aud, true) : formatCurrency(h.cost_basis_aud, true)} highlight />
                {h.unrealised_pnl_aud !== null && (
                  <Cell
                    label="P&L"
                    value={`${pnlPos ? '+' : ''}${formatCurrency(h.unrealised_pnl_aud, true)} (${pnlPos ? '+' : ''}${Number(h.unrealised_pnl_pct).toFixed(2)}%)`}
                    positive={pnlPos}
                    negative={!pnlPos}
                  />
                )}
              </div>
              <div className="flex items-center justify-between">
                {h.is_in_smsf && <span className="text-xs text-teal font-medium">SMSF</span>}
                <div className="flex gap-2 ml-auto">
                  <button onClick={() => { setEditingHolding(h); setShowForm(true) }} className="text-xs text-text-muted hover:text-gold">Edit</button>
                  <button onClick={() => handleDelete(h.id)} className="text-xs text-text-muted hover:text-negative">Delete</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Form modal */}
      {showForm && (
        <HoldingForm
          holding={editingHolding}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingHolding(null) }}
        />
      )}
    </>
  )
}

function Cell({
  label, value, highlight, positive, negative,
}: {
  label: string; value: string; highlight?: boolean; positive?: boolean; negative?: boolean
}) {
  return (
    <div>
      <span className="text-xs text-text-subtle">{label}</span>
      <div className={`font-medium tabular-nums ${highlight ? 'text-gold' : positive ? 'text-positive' : negative ? 'text-negative' : 'text-text-secondary'}`}>
        {value}
      </div>
    </div>
  )
}