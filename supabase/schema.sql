-- Supabase Schema for Vietnam Stock Investment Analyzer
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stock Info Table
CREATE TABLE IF NOT EXISTS stock_info (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) UNIQUE NOT NULL,
  company_name TEXT,
  exchange VARCHAR(10),
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Prices Table (Partitioned by year for performance)
CREATE TABLE IF NOT EXISTS stock_prices (
  id SERIAL,
  symbol VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  open NUMERIC(15, 2),
  high NUMERIC(15, 2),
  low NUMERIC(15, 2),
  close NUMERIC(15, 2),
  volume BIGINT,
  adjusted_close NUMERIC(15, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, date),
  UNIQUE (symbol, date)
) PARTITION BY RANGE (date);

-- Create partitions for each year
CREATE TABLE IF NOT EXISTS stock_prices_2018 PARTITION OF stock_prices
  FOR VALUES FROM ('2018-01-01') TO ('2019-01-01');
CREATE TABLE IF NOT EXISTS stock_prices_2019 PARTITION OF stock_prices
  FOR VALUES FROM ('2019-01-01') TO ('2020-01-01');
CREATE TABLE IF NOT EXISTS stock_prices_2020 PARTITION OF stock_prices
  FOR VALUES FROM ('2020-01-01') TO ('2021-01-01');
CREATE TABLE IF NOT EXISTS stock_prices_2021 PARTITION OF stock_prices
  FOR VALUES FROM ('2021-01-01') TO ('2022-01-01');
CREATE TABLE IF NOT EXISTS stock_prices_2022 PARTITION OF stock_prices
  FOR VALUES FROM ('2022-01-01') TO ('2023-01-01');
CREATE TABLE IF NOT EXISTS stock_prices_2023 PARTITION OF stock_prices
  FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
CREATE TABLE IF NOT EXISTS stock_prices_2024 PARTITION OF stock_prices
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS stock_prices_2025 PARTITION OF stock_prices
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS stock_prices_2026 PARTITION OF stock_prices
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Dividend Events Table
CREATE TABLE IF NOT EXISTS dividend_events (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  ex_date DATE NOT NULL,
  record_date DATE,
  payment_date DATE,
  dividend_type VARCHAR(20) NOT NULL, -- 'cash' or 'stock'
  dividend_value NUMERIC(15, 4) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (symbol, ex_date, dividend_type)
);

-- User Portfolios Table (for saved analyses)
CREATE TABLE IF NOT EXISTS user_portfolios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  initial_investment NUMERIC(20, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  result_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Sync Log Table (for tracking updates)
CREATE TABLE IF NOT EXISTS data_sync_log (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL, -- 'prices', 'dividends', 'stock_list'
  symbol VARCHAR(20),
  start_date DATE,
  end_date DATE,
  records_synced INT DEFAULT 0,
  status VARCHAR(20) NOT NULL, -- 'pending', 'success', 'error'
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol ON stock_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_prices_date ON stock_prices(date);
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol_date ON stock_prices(symbol, date);
CREATE INDEX IF NOT EXISTS idx_dividend_events_symbol ON dividend_events(symbol);
CREATE INDEX IF NOT EXISTS idx_dividend_events_ex_date ON dividend_events(ex_date);
CREATE INDEX IF NOT EXISTS idx_user_portfolios_user ON user_portfolios(user_id);

-- Row Level Security
ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portfolios" ON user_portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolios" ON user_portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios" ON user_portfolios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios" ON user_portfolios
  FOR DELETE USING (auth.uid() = user_id);

-- Public read access for stock data
ALTER TABLE stock_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividend_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stock info" ON stock_info FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can view stock prices" ON stock_prices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can view dividends" ON dividend_events FOR SELECT TO anon, authenticated USING (true);

-- Service role can write data
CREATE POLICY "Service can insert stock info" ON stock_info FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service can update stock info" ON stock_info FOR UPDATE TO service_role USING (true);
CREATE POLICY "Service can insert prices" ON stock_prices FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service can insert dividends" ON dividend_events FOR INSERT TO service_role WITH CHECK (true);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_stock_info_updated_at
  BEFORE UPDATE ON stock_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_portfolios_updated_at
  BEFORE UPDATE ON user_portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
