'use client'

import type { BtcPriceData } from '@/types'
import { formatCurrency } from '@/lib/calculations'

interface Props {
  btc: BtcPriceData | null
  loading: boolean
}

export default function BtcPriceCard({ btc, loading }: Props) {
  const change = btc?.change_24h_pct ?? 0
  const positive = change >= 0

  return (
    <div className="card space-y-1">
      <div className="flex items-center justify-between">
        <span className="label">BTC Price</span>
        {btc && !loading && (
          <span className={`text-xs font-medium ${positive ? 'text-positive' : 'text-negative'}`}>
            {positive ? '+' : ''}{change.toFixed(2)}% 24h
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-1.5">
          <div className="h-7 w-32 bg-bg-raised rounded animate-pulse" />
          <div className="h-4 w-24 bg-bg-raised rounded animate-pulse" />
        </div>
      ) : btc ? (
        <>
          <div className="text-2xl font-semibold text-gold tabular-nums">
            {formatCurrency(btc.price_aud, true)}
          </div>
          <div className="text-xs text-text-muted tabular-nums">
            USD ${btc.price_usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
        </>
      ) : (
        <div className="text-sm text-text-subtle">Price unavailable</div>
      )}
    </div>
  )
}
