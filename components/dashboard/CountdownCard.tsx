'use client'

import { daysUntilAge60 } from '@/lib/calculations'

interface Props {
  label: string
  ageNow: number
  memberLabel: string
}

export default function CountdownCard({ label, ageNow, memberLabel }: Props) {
  const days = daysUntilAge60(ageNow)
  const years = Math.floor(days / 365)
  const remainingDays = days % 365
  const alreadyPast = days === 0

  return (
    <div className="card space-y-1">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="text-xs text-text-subtle">{memberLabel}</span>
      </div>

      {alreadyPast ? (
        <div className="text-2xl font-semibold text-positive">Reached ✓</div>
      ) : (
        <>
          <div className="text-2xl font-semibold text-teal tabular-nums">
            {days.toLocaleString()}
          </div>
          <div className="text-xs text-text-muted">
            {years > 0 && `${years}y `}{remainingDays}d · age {ageNow} now
          </div>
        </>
      )}

      {/* Progress bar: age 55 → 60 */}
      <div className="mt-1">
        <div className="h-1 bg-bg-raised rounded-full overflow-hidden">
          <div
            className="h-full bg-teal rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, ((ageNow - 55) / 5) * 100))}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-text-subtle mt-0.5">
          <span>55</span>
          <span>60</span>
        </div>
      </div>
    </div>
  )
}
