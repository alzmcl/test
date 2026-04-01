-- Migration: 0006_holdings_asset_type_update.sql
-- Add stock_au and stock_us as valid asset_type values.

ALTER TABLE portfolio_holdings
  DROP CONSTRAINT IF EXISTS portfolio_holdings_asset_type_check;

ALTER TABLE portfolio_holdings
  ADD CONSTRAINT portfolio_holdings_asset_type_check
  CHECK (asset_type IN ('crypto', 'stock_au', 'stock_us', 'stock', 'etf', 'cash', 'bond', 'property', 'other'));
