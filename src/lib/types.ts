// Shared types for the Stock Analyzer application

// --- FORM & INPUT TYPES ---

export interface FormDataType {
    symbol: string;
    startDate: string;
    endDate: string;
    initialAmount: number;
    monthlyInvestment: number;
    reinvestDividends: boolean;
}

export interface StockHistoryParams {
    symbol: string;
    startDate: string; // DD/MM/YYYY
    endDate: string;   // DD/MM/YYYY
}

export interface InvestmentInput {
    symbol: string;
    initialAmount: number;
    monthlyInvestment?: number; // DCA amount
    startDate: string;
    endDate: string;
    reinvestDividends?: boolean; // Tái đầu tư cổ tức?
}

// --- STOCK DATA TYPES ---

export interface StockDataPoint {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    adjustedClose: number;
}

export interface DividendInfo {
    exDate: string;
    type: 'cash' | 'stock';
    value: number;
    description: string;
}

export interface Stock {
    symbol: string;
    name: string;
    exchange: string;
    sector?: string; // e.g. 'Bank', 'Tech', 'Steel'
}

// --- INVESTMENT RESULT TYPES ---

export interface InvestmentResult {
    symbol: string;
    initialInvestment: number;
    totalInvested: number;
    currentValue: number;
    cashBalance: number; // Tiền mặt còn dư
    totalShares: number;
    averageCostPerShare: number;
    currentPrice: number;
    absoluteReturn: number;
    percentageReturn: number;
    annualizedReturn: number;
    maxDrawdown: number; // Max Drawdown percentage (negative)
    dividendsCashReceived: number;
    dividendsStockReceived: number;
    dividendsReinvested: number;
    timeline: TimelineEvent[];
    monthlyPerformance: MonthlyPerformance[];
    yearlyPerformance: YearlyPerformance[];
    bestMonthToBuy: { month: number; averageReturn: number }[];
}

/** @deprecated Use InvestmentResult instead */
export type InvestmentResultData = InvestmentResult;

export interface TimelineEvent {
    date: string;
    type: 'buy' | 'sell' | 'dividend_cash' | 'dividend_stock' | 'reinvest' | 'deposit';
    description: string;
    shares: number;
    pricePerShare: number;
    totalShares: number;
    portfolioValue: number;
    cashBalance: number;
}

export interface MonthlyPerformance {
    month: string;
    open: number;
    close: number;
    high: number;
    low: number;
    return: number;
    portfolioValue: number;
    cashBalance?: number;
}

export interface YearlyPerformance {
    year: number;
    startValue: number;
    endValue: number;
    return: number;
    dividends: number;
}

// --- CHART DATA TYPES ---

export interface PriceDataPoint {
    date: string;
    close: number;
    savingsValue: number;
    compareClose?: number;
}

export interface DividendEvent {
    date: string;
    type: 'cash' | 'stock';
    value: number;
    description?: string;
}

// --- MONTE CARLO TYPES ---

export interface MonteCarloResult {
    year: number;
    percentiles: {
        p10: number; // Worst case (10%)
        p50: number; // Base case (Median)
        p90: number; // Best case (90%)
    };
    simulations: number[][]; // (Optional) Raw data for scatter plot
}

export interface DividendGrowth {
    cagr3Year: number;
    cagr5Year: number;
    years: { year: number; totalDividend: number; growth: number }[];
}

// --- API RESPONSE TYPES ---

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    total?: number;
    source?: string;
}

// --- ROTATION STRATEGY TYPES ---

export interface RotationConfig {
    initialCapital: number;
    startDate: string;
    endDate: string;
    monthlyInvestment: number;
    strategyType: 'MUSCLE' | 'CONSUMER'; // MUSCLE: VIB-FPT-HPG, CONSUMER: VIB-FPT-MSN
}

export interface RotationTransaction {
    date: string;
    type: 'SWITCH_BUY' | 'SWITCH_SELL' | 'DIVIDEND' | 'DEPOSIT';
    symbol: string;
    price: number;
    quantity: number;
    value: number;
    fee: number;
    cashBalanceAfter: number;
    note: string; // e.g. "Chuyển sang FPT (Mùa Công Nghệ)"
}

export interface RotationResult {
    config: RotationConfig;
    finalValue: number;
    totalProfit: number;
    percentageReturn: number;
    cagr: number;
    history: RotationTransaction[];
    chartData: {
        date: string;
        value: number;
        symbol: string; // Current active symbol
        note?: string; // Marker for chart
    }[];
    breakdown: {
        priceAppreciation: number;
        cashDividends: number;
        stockDividendsValue: number;
    };
}
