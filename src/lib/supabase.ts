import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export interface StockPrice {
  id?: number;
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjusted_close: number;
  created_at?: string;
}

export interface DividendEvent {
  id?: number;
  symbol: string;
  ex_date: string;
  record_date: string;
  payment_date: string;
  dividend_type: 'cash' | 'stock'; // tiền mặt hoặc cổ phiếu
  dividend_value: number; // % hoặc VND
  description?: string;
  created_at?: string;
}

export interface StockInfo {
  id?: number;
  symbol: string;
  company_name: string;
  exchange: string; // HOSE, HNX, UPCOM
  industry: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserPortfolio {
  id?: string;
  user_id: string;
  symbol: string;
  initial_investment: number;
  start_date: string;
  end_date?: string;
  created_at?: string;
}

export interface DailyReport {
  id?: string;
  report_date: string;
  symbol_1: string;
  symbol_2: string;
  market_summary?: string;
  analysis_1: string;
  analysis_2: string;
  signal_1?: string;
  signal_2?: string;
  raw_data?: any;
  created_at?: string;
}
