'use client';

interface Stats {
  total: number;
  gains: number;
  drops: number;
  avgSwing: number;
  biggestGain: number;
  biggestDrop: number;
  days: number;
}

export default function StatCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'Total 5%+ Swings', value: stats.total, unit: 'events', color: '#f59e0b' },
    { label: 'Up Swings',        value: stats.gains,  unit: 'days',   color: '#4ade80' },
    { label: 'Down Swings',      value: stats.drops,  unit: 'days',   color: '#f87171' },
    { label: 'Avg Swing Size',   value: stats.avgSwing.toFixed(1), unit: '%', color: '#38bdf8' },
    {
      label: 'Biggest Gain',
      value: '+' + (stats.biggestGain * 100).toFixed(1),
      unit: '%',
      color: '#4ade80',
    },
    {
      label: 'Biggest Drop',
      value: (stats.biggestDrop * 100).toFixed(1),
      unit: '%',
      color: '#f87171',
    },
  ];

  return (
    <div
      className="grid gap-3 px-8 pt-7"
      style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}
    >
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl px-5 py-5 transition-colors"
          style={{
            background: '#0c1626',
            border: '1px solid #1e293b',
          }}
        >
          <p
            className="text-xs font-mono uppercase tracking-wide mb-2"
            style={{ color: '#475569' }}
          >
            {c.label}
          </p>
          <p
            className="text-2xl font-bold"
            style={{ color: c.color, letterSpacing: '-0.04em' }}
          >
            {c.value}
            <span className="text-xs font-normal ml-1" style={{ color: '#475569' }}>
              {c.unit}
            </span>
          </p>
        </div>
      ))}
    </div>
  );
}
