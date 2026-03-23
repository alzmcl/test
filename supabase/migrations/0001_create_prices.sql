-- BTC daily price cache
-- Seeded by a cron job or the Next.js API route on first request.
create table if not exists btc_prices (
  id         bigint generated always as identity primary key,
  date       date        not null unique,
  close      numeric     not null,
  created_at timestamptz not null default now()
);

-- Speed up range queries
create index if not exists btc_prices_date_idx on btc_prices (date desc);

-- Row-level security: public read, no public writes
alter table btc_prices enable row level security;

create policy "public read prices"
  on btc_prices for select
  using (true);
