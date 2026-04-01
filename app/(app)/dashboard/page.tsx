import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard — Retirement Planner' }

// Dashboard module — live snapshot of where we are today.
// Full implementation in Step 3.
export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">
          Live snapshot — today&apos;s position
        </p>
      </div>

      {/* Placeholder grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          'SMSF Balance',
          'Offset Balance',
          'Mortgage Balance',
          'BTC Price (AUD)',
          'Days to Age 60',
          'Super Contributions FY',
          'Monthly Cashflow',
        ].map((label) => (
          <div key={label} className="card flex flex-col gap-2">
            <span className="label">{label}</span>
            <div className="h-6 w-32 bg-bg-raised rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
