-- Saved backtest runs
create table if not exists backtest_runs (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  config     jsonb       not null,
  stats      jsonb       not null,
  trades     jsonb       not null default '[]'::jsonb
);

-- Row-level security: authenticated users only
alter table backtest_runs enable row level security;

create policy "authenticated read/write"
  on backtest_runs for all
  using  (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
