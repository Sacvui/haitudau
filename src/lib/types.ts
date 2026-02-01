// Shared types for the Stock Analyzer application

export interface FormDataType {
    symbol: string;
    startDate: string;
    endDate: string;
    initialAmount: number;
    monthlyInvestment: number;
    reinvestDividends: boolean;
}

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

export interface InvestmentResultData {
    symbol: string;
    initialInvestment: number;
    totalInvested: number;
    currentValue: number;
    cashBalance: number;
    totalShares: number;
    averageCostPerShare: number;
    currentPrice: number;
    absoluteReturn: number;
    percentageReturn: number;
    annualizedReturn: number;
    dividendsCashReceived: number;
    dividendsStockReceived: number;
    dividendsReinvested: number;
    timeline: TimelineEvent[];
    monthlyPerformance: MonthlyPerformance[];
    yearlyPerformance: YearlyPerformance[];
    bestMonthToBuy: { month: number; averageReturn: number }[];
}

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
    cashBalance: number;
}

export interface YearlyPerformance {
    year: number;
    startValue: number;
    endValue: number;
    return: number;
    dividends: number;
}

export interface Stock {
    symbol: string;
    name: string;
    exchange: string;
    sector?: string; // e.g. 'Bank', 'Tech', 'Steel'
}

// API Response types
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
