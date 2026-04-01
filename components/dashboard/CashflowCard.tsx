'use client'

import type { ModellerResult } from '@/types'
import { formatCurrency } from '@/lib/calculations'

interface Props {
  result: ModellerResult
}

export default function CashflowCard({ result }: Props) {
  const positive = result.monthly_cashflow >= 0

  return (
    <div className="card space-y-1">
      <span className="label">Monthly Cashflow</span>
      <div
        className={`text-2xl font-semibold tabular-nums ${
          positive ? 'text-positive' : 'text-negative'
        }`}
      >
        {positive ? '+' : ''}{formatCurrency(result.monthly_cashflow)}
      </div>
      <div className="text-xs text-text-muted">
        Net: {formatCurrency(result.monthly_net_income)} − exp: {formatCurrency(result.monthly_expenses)}
      </div>
      {!positive && result.offset_runway_months !== null && (
        <div className="text-xs text-warning mt-0.5">
          Offset runway: {Math.floor(result.offset_runway_months)} months
        </div>
      )}
    </div>
  )
}
