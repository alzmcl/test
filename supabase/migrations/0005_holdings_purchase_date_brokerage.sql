-- Migration: 0005_holdings_purchase_date_brokerage.sql
-- Adds purchase_date and brokerage_aud to portfolio_holdings (used for stocks).

ALTER TABLE portfolio_holdings
  ADD COLUMN IF NOT EXISTS purchase_date  DATE    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS brokerage_aud  NUMERIC DEFAULT NULL;
