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
}

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    total?: number;
    source?: string;
}
