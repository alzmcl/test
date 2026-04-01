-- ─── Portfolio Tracking Schema ───────────────────────────────────────────────
-- Migration: 0004_portfolio_schema.sql

-- ─── Portfolio Holdings ───────────────────────────────────────────────────────
-- One row per position. Stores current state; transactions provide history.
-- avg_buy_price_aud is maintained by the app on each transaction.

CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Asset identification
  symbol              TEXT        NOT NULL,  -- EODHD symbol: 'BTC-USD.CC', 'VAS.AU', 'AAPL.US', 'CASH'
  name                TEXT        NOT NULL,  -- Display name: 'Bitcoin', 'Vanguard Aus Shares'
  asset_type          TEXT        NOT NULL CHECK (asset_type IN (
                        'crypto', 'stock', 'etf', 'cash', 'bond', 'property', 'other'
                      )),

  -- Position
  units               NUMERIC     NOT NULL DEFAULT 0,         -- shares / coins / units
  avg_buy_price_aud   NUMERIC     NOT NULL DEFAULT 0,         -- weighted avg cost in AUD

  -- Currency metadata (EODHD returns prices in the native exchange currency)
  price_currency      TEXT        NOT NULL DEFAULT 'AUD',     -- native price currency

  -- Ownership
  is_in_smsf          BOOLEAN     NOT NULL DEFAULT FALSE,
  member              TEXT        CHECK (member IN ('husband', 'wife', 'joint')),

  notes               TEXT,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by          UUID        REFERENCES profiles(id)
);

ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "holdings: authenticated read"
  ON portfolio_holdings FOR SELECT TO authenticated USING (true);

CREATE POLICY "holdings: authenticated insert"
  ON portfolio_holdings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "holdings: authenticated update"
  ON portfolio_holdings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "holdings: authenticated delete"
  ON portfolio_holdings FOR DELETE TO authenticated USING (true);

-- ─── Portfolio Transactions ───────────────────────────────────────────────────
-- Full buy/sell/dividend history. Updating a holding cascades-deletes its txns.

CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_id          UUID        NOT NULL REFERENCES portfolio_holdings(id) ON DELETE CASCADE,
  symbol              TEXT        NOT NULL,

  transaction_type    TEXT        NOT NULL CHECK (transaction_type IN (
                        'buy', 'sell', 'dividend', 'transfer_in', 'transfer_out', 'adjustment'
                      )),

  units               NUMERIC     NOT NULL,             -- + for buy/in, − for sell/out
  price_per_unit_aud  NUMERIC     NOT NULL,             -- AUD at time of transaction
  fees_aud            NUMERIC     NOT NULL DEFAULT 0,
  total_aud           NUMERIC     GENERATED ALWAYS AS (units * price_per_unit_aud + fees_aud) STORED,

  transaction_date    DATE        NOT NULL,
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by          UUID        REFERENCES profiles(id)
);

ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions: authenticated read"
  ON portfolio_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "transactions: authenticated insert"
  ON portfolio_transactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "transactions: authenticated update"
  ON portfolio_transactions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "transactions: authenticated delete"
  ON portfolio_transactions FOR DELETE TO authenticated USING (true);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE TRIGGER portfolio_holdings_updated_at
  BEFORE UPDATE ON portfolio_holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Helpful view: portfolio summary per holding ─────────────────────────────

CREATE OR REPLACE VIEW portfolio_cost_basis AS
  SELECT
    h.id,
    h.symbol,
    h.name,
    h.asset_type,
    h.units,
    h.avg_buy_price_aud,
    (h.units * h.avg_buy_price_aud)   AS cost_basis_aud,
    h.is_in_smsf,
    h.member,
    h.price_currency,
    h.is_active
  FROM portfolio_holdings h
  WHERE h.is_active = TRUE;
