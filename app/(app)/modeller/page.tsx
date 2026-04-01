import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Modeller — Retirement Planner' }

// Modeller module — interactive sliders with bear/base/bull scenarios.
// Full implementation in Step 4.
export default function ModellerPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Modeller</h1>
        <p className="text-sm text-text-muted mt-1">
          Retirement projection — bear / base / bull scenarios
        </p>
      </div>

      {/* Scenario columns placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(['Bear', 'Base', 'Bull'] as const).map((label) => (
          <div key={label} className="card space-y-3">
            <span
              className={`label ${
                label === 'Bear'
                  ? 'text-negative'
                  : label === 'Base'
                  ? 'text-gold'
                  : 'text-positive'
              }`}
            >
              {label} Case
            </span>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-bg-raised rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
