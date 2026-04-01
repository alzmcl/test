import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Budget — Retirement Planner' }

// Budget module — monthly expense tracker with actual vs budget.
// Full implementation in Step 5.
export default function BudgetPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Budget</h1>
        <p className="text-sm text-text-muted mt-1">
          Monthly expense tracker — actual vs budget
        </p>
      </div>

      {/* Placeholder table */}
      <div className="card space-y-3">
        <div className="grid grid-cols-4 gap-4 pb-2 border-b border-bg-border">
          {['Category', 'Budgeted', 'Actual', 'Variance'].map((h) => (
            <span key={h} className="label">{h}</span>
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-4 bg-bg-raised rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
