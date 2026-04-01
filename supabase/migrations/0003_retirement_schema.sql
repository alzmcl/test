-- ─── Retirement Planning App — Core Schema ───────────────────────────────────
-- Migration: 0003_retirement_schema.sql

-- ─── Profiles ────────────────────────────────────────────────────────────────
-- One row per authenticated user. Both household members share all data.

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  role       TEXT        NOT NULL CHECK (role IN ('husband', 'wife')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: authenticated read all"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles: insert own"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ─── Household Settings ───────────────────────────────────────────────────────
-- Singleton row (enforced via PRIMARY KEY on a boolean column).
-- Both users read and write to the same row.

CREATE TABLE IF NOT EXISTS household_settings (
  -- Singleton guard
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  CONSTRAINT single_row CHECK (id = TRUE),

  -- Member ages (used to compute years to retirement)
  age_husband              INTEGER  NOT NULL DEFAULT 58,
  age_wife                 INTEGER  NOT NULL DEFAULT 56,
  target_retirement_age    INTEGER  NOT NULL DEFAULT 63,

  -- SMSF current state
  smsf_cash_investments    NUMERIC  NOT NULL DEFAULT 2300000,
  smsf_btc_holdings        NUMERIC  NOT NULL DEFAULT 1.7,

  -- Mortgage
  mortgage_balance         NUMERIC  NOT NULL DEFAULT 1200000,
  mortgage_rate_pct        NUMERIC  NOT NULL DEFAULT 6.5,
  mortgage_monthly_io      NUMERIC  NOT NULL DEFAULT 5150,
  mortgage_monthly_pi      NUMERIC  NOT NULL DEFAULT 13000,
  use_io_repayments        BOOLEAN  NOT NULL DEFAULT TRUE,

  -- Offset account
  offset_balance           NUMERIC  NOT NULL DEFAULT 250000,

  -- Property / downsize plan
  home_value               NUMERIC  NOT NULL DEFAULT 3200000,
  downsize_year            INTEGER  NOT NULL DEFAULT 5,
  target_new_home_price    NUMERIC  NOT NULL DEFAULT 2000000,
  downsizer_contribution   NUMERIC  NOT NULL DEFAULT 300000,

  -- Living costs
  monthly_living_costs        NUMERIC  NOT NULL DEFAULT 10000,
  school_fees_annual          NUMERIC  NOT NULL DEFAULT 35000,
  school_fees_years_remaining INTEGER  NOT NULL DEFAULT 2,

  -- Super contributions
  annual_super_concessional   NUMERIC  NOT NULL DEFAULT 60000,

  -- FX
  aud_usd_rate             NUMERIC  NOT NULL DEFAULT 0.65,

  -- ── Bear scenario ─────────────────────────────────────────────────────────
  bear_gross_income        NUMERIC  NOT NULL DEFAULT 100000,
  bear_smsf_cagr_pct       NUMERIC  NOT NULL DEFAULT 5.0,
  bear_btc_price_usd       NUMERIC  NOT NULL DEFAULT 75000,

  -- ── Base scenario ─────────────────────────────────────────────────────────
  base_gross_income        NUMERIC  NOT NULL DEFAULT 200000,
  base_smsf_cagr_pct       NUMERIC  NOT NULL DEFAULT 8.0,
  base_btc_price_usd       NUMERIC  NOT NULL DEFAULT 150000,

  -- ── Bull scenario ─────────────────────────────────────────────────────────
  bull_gross_income        NUMERIC  NOT NULL DEFAULT 300000,
  bull_smsf_cagr_pct       NUMERIC  NOT NULL DEFAULT 12.0,
  bull_btc_price_usd       NUMERIC  NOT NULL DEFAULT 250000,

  -- Meta
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID        REFERENCES profiles(id)
);

ALTER TABLE household_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings: authenticated read"
  ON household_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "settings: authenticated insert"
  ON household_settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "settings: authenticated update"
  ON household_settings FOR UPDATE TO authenticated USING (true);

-- Seed the single settings row with all defaults
INSERT INTO household_settings (id) VALUES (TRUE) ON CONFLICT DO NOTHING;

-- ─── Manual Balances ──────────────────────────────────────────────────────────
-- Timestamped snapshots when a user manually updates live balances.
-- Dashboard always shows the most recent row.

CREATE TABLE IF NOT EXISTS manual_balances (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  smsf_balance     NUMERIC     NOT NULL,
  offset_balance   NUMERIC     NOT NULL,
  mortgage_balance NUMERIC     NOT NULL,
  notes            TEXT,
  recorded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by      UUID        REFERENCES profiles(id)
);

ALTER TABLE manual_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "balances: authenticated read"
  ON manual_balances FOR SELECT TO authenticated USING (true);

CREATE POLICY "balances: authenticated insert"
  ON manual_balances FOR INSERT TO authenticated WITH CHECK (true);

-- ─── Budget Entries ───────────────────────────────────────────────────────────
-- One row per (year, month, category). Stores both budgeted and actual amounts.
-- The sum of `budgeted` for the current month feeds into the Modeller
-- as the living cost assumption.

CREATE TABLE IF NOT EXISTS budget_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  year        INTEGER     NOT NULL,
  month       INTEGER     NOT NULL CHECK (month BETWEEN 1 AND 12),
  category    TEXT        NOT NULL CHECK (category IN (
                'mortgage_rent', 'school_fees', 'groceries', 'utilities',
                'insurance', 'transport', 'dining_out', 'golf', 'travel',
                'kids', 'medical', 'subscriptions', 'other'
              )),
  budgeted    NUMERIC     NOT NULL DEFAULT 0,
  actual      NUMERIC,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID        REFERENCES profiles(id),
  UNIQUE (year, month, category)
);

ALTER TABLE budget_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget: authenticated read"
  ON budget_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "budget: authenticated insert"
  ON budget_entries FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "budget: authenticated update"
  ON budget_entries FOR UPDATE TO authenticated USING (true);

CREATE POLICY "budget: authenticated delete"
  ON budget_entries FOR DELETE TO authenticated USING (true);

-- ─── Super Contributions ─────────────────────────────────────────────────────
-- Track concessional contributions per member per Australian financial year.
-- Used by Dashboard to show progress toward the $60K combined cap.

CREATE TABLE IF NOT EXISTS super_contributions (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_year    TEXT    NOT NULL,  -- e.g. '2025-26'
  member            TEXT    NOT NULL CHECK (member IN ('husband', 'wife')),
  amount            NUMERIC NOT NULL DEFAULT 0,
  contribution_date DATE    NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID    REFERENCES profiles(id)
);

ALTER TABLE super_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contributions: authenticated read"
  ON super_contributions FOR SELECT TO authenticated USING (true);

CREATE POLICY "contributions: authenticated insert"
  ON super_contributions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "contributions: authenticated update"
  ON super_contributions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "contributions: authenticated delete"
  ON super_contributions FOR DELETE TO authenticated USING (true);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER budget_entries_updated_at
  BEFORE UPDATE ON budget_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER household_settings_updated_at
  BEFORE UPDATE ON household_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
