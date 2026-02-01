import { StockDataPoint, DividendInfo } from './stock-api';

export interface InvestmentInput {
    symbol: string;
    initialAmount: number;
    monthlyInvestment?: number; // DCA amount
    startDate: string;
    endDate: string;
    reinvestDividends?: boolean; // Tái đầu tư cổ tức?
}

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

// CONSTANTS
const TAX_RATE_DIVIDEND = 0.05; // 5% thuế cổ tức tiền mặt
const FEE_TRANSACTION = 0.0015; // 0.15% phí giao dịch

export function calculateInvestment(
    input: InvestmentInput,
    priceHistory: StockDataPoint[],
    dividendHistory: DividendInfo[]
): InvestmentResult {
    // 1. Sort Data
    const sortedPrices = [...priceHistory].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const sortedDividends = [...dividendHistory].sort(
        (a, b) => new Date(a.exDate).getTime() - new Date(b.exDate).getTime()
    );

    // 2. Initialize State
    let totalShares = 0;
    let cashBalance = input.initialAmount; // Bắt đầu với số vốn ban đầu
    let totalInvested = input.initialAmount;

    let dividendsCashReceived = 0;
    let dividendsStockReceived = 0;
    let dividendsReinvested = 0;

    const timeline: TimelineEvent[] = [];
    const monthlyData: Map<string, StockDataPoint[]> = new Map();
    const yearlyData: Map<number, { dividends: number; prices: StockDataPoint[] }> = new Map();

    const startDateObj = new Date(input.startDate);
    const endDateObj = new Date(input.endDate);

    // Config
    const monthlyDCA = input.monthlyInvestment || 0;
    const shouldReinvest = input.reinvestDividends !== false; // Default true

    // 3. Find Start Index
    const firstPriceIdx = sortedPrices.findIndex(p => new Date(p.date) >= startDateObj);
    if (firstPriceIdx === -1) throw new Error('Không tìm thấy dữ liệu giá');

    let lastMonth = -1;

    // Helper: Buy Shares Function
    const buyShares = (date: string, price: number, amount: number, desc: string, type: 'buy' | 'reinvest' = 'buy') => {
        const fee = amount * FEE_TRANSACTION;
        const netAmount = amount - fee;

        if (netAmount < price) return; // Không đủ tiền mua 1 cổ

        const sharesToBuy = Math.floor(netAmount / price);
        const costStr = (sharesToBuy * price).toLocaleString();

        const cost = sharesToBuy * price;
        const totalCost = cost + (cost * FEE_TRANSACTION);

        if (sharesToBuy > 0 && cashBalance >= totalCost) {
            totalShares += sharesToBuy;
            cashBalance -= totalCost;

            if (type === 'reinvest') {
                dividendsReinvested += cost;
            }

            timeline.push({
                date,
                type,
                description: `${desc} (${sharesToBuy.toLocaleString()} CP giá ${price.toLocaleString()})`,
                shares: sharesToBuy,
                pricePerShare: price,
                totalShares,
                portfolioValue: (totalShares * price) + cashBalance,
                cashBalance
            });
        }
    };

    // 4. Initial Buy
    const firstPrice = sortedPrices[firstPriceIdx];
    buyShares(firstPrice.date, firstPrice.close, cashBalance, "Mua lần đầu");

    // 5. Main Loop
    for (let i = firstPriceIdx; i < sortedPrices.length; i++) {
        const price = sortedPrices[i];
        const priceDate = new Date(price.date);

        if (priceDate > endDateObj) break;

        // --- Monthly & Yearly Tracking ---
        const monthKey = `${priceDate.getFullYear()}-${String(priceDate.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData.has(monthKey)) monthlyData.set(monthKey, []);
        monthlyData.get(monthKey)!.push(price);

        const year = priceDate.getFullYear();
        if (!yearlyData.has(year)) yearlyData.set(year, { dividends: 0, prices: [] });
        yearlyData.get(year)!.prices.push(price);

        // --- DCA Application (First trading day of month) ---
        if (monthlyDCA > 0 && priceDate.getMonth() !== lastMonth && i > firstPriceIdx) {
            // New month detected -> Deposit & Invest
            totalInvested += monthlyDCA;
            cashBalance += monthlyDCA;

            timeline.push({
                date: price.date,
                type: 'deposit',
                description: `Nạp định kỳ: ${monthlyDCA.toLocaleString()} VND`,
                shares: 0,
                pricePerShare: 0,
                totalShares,
                portfolioValue: (totalShares * price.close) + cashBalance,
                cashBalance
            });

            buyShares(price.date, price.close, cashBalance, "Mua tích sản");
        }
        lastMonth = priceDate.getMonth();

        // --- Dividends Processing ---
        const dividend = sortedDividends.find(d => d.exDate === price.date);
        if (dividend && totalShares > 0) {
            if (dividend.type === 'cash') {
                const grossAmount = totalShares * dividend.value;
                const netAmount = grossAmount * (1 - TAX_RATE_DIVIDEND); // Trừ 5% thuế

                dividendsCashReceived += netAmount;
                cashBalance += netAmount;

                yearlyData.get(year)!.dividends += netAmount;

                let desc = `Nhận cổ tức tiền: ${netAmount.toLocaleString()} (Sau thuế)`;

                timeline.push({
                    date: price.date,
                    type: 'dividend_cash',
                    description: desc,
                    shares: 0,
                    pricePerShare: 0,
                    totalShares,
                    portfolioValue: (totalShares * price.close) + cashBalance,
                    cashBalance
                });

                if (shouldReinvest) {
                    buyShares(price.date, price.close, cashBalance, "Tái đầu tư cổ tức", 'reinvest');
                }

            } else {
                // Stock Dividend (Bonus Shares)
                // Cổ phiếu thưởng thường không bị thuế ngay lúc nhận (chỉ bị khi bán - chưa tính ở đây)
                const bonusShares = Math.floor(totalShares * (dividend.value / 100));
                if (bonusShares > 0) {
                    totalShares += bonusShares;
                    dividendsStockReceived += bonusShares;

                    timeline.push({
                        date: price.date,
                        type: 'dividend_stock',
                        description: `Cổ tức cổ phiếu ${dividend.value}% (+${bonusShares.toLocaleString()} CP)`,
                        shares: bonusShares,
                        pricePerShare: 0,
                        totalShares,
                        portfolioValue: (totalShares * price.close) + cashBalance,
                        cashBalance
                    });
                }
            }
        }
    }

    // 6. Final Calculation
    const lastPrice = sortedPrices[Math.min(sortedPrices.length - 1, sortedPrices.findIndex(p => new Date(p.date) > endDateObj) === -1 ? sortedPrices.length - 1 : sortedPrices.findIndex(p => new Date(p.date) > endDateObj) - 1)];

    // Nếu lastPrice bị undefined do logic findIndex
    const finalPrice = lastPrice ? lastPrice : sortedPrices[sortedPrices.length - 1];

    const finalPortfolioValue = (totalShares * finalPrice.close) + cashBalance;
    const absoluteReturn = finalPortfolioValue - totalInvested;
    const percentageReturn = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;

    // Annualized Return (CAGR)
    const daysDiff = Math.max(1, (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    const years = daysDiff / 365;
    // CAGR for irregular cashflows (DCA) is complex (XIRR). 
    // Here we use a simplified approximation: End / TotalInvested ^ (1/years) - 1
    // Note: This is not strictly accurate for DCA but gives a ballpark. 
    // For DCA, TWRR (Time-Weighted) or MWRR (Money-Weighted) is better ideally.
    // We will keep simple CAGR based on TotalInvested for now as requested.
    const annualizedReturn = totalInvested > 0 ? ((Math.pow(finalPortfolioValue / totalInvested, 1 / Math.max(0.5, years)) - 1) * 100) : 0;

    // --- Performance Stats Compiling ---
    const monthlyPerformance: MonthlyPerformance[] = [];
    monthlyData.forEach((prices, month) => {
        const first = prices[0];
        const last = prices[prices.length - 1];
        if (first && last) {
            monthlyPerformance.push({
                month,
                open: first.open,
                close: last.close,
                high: Math.max(...prices.map(p => p.high)),
                low: Math.min(...prices.map(p => p.low)),
                return: ((last.close - first.open) / first.open) * 100,
                portfolioValue: 0 // Placeholder, handled in UI
            });
        }
    });

    const yearlyPerformance: YearlyPerformance[] = [];
    yearlyData.forEach((data, year) => {
        if (data.prices.length > 0) {
            const first = data.prices[0];
            const last = data.prices[data.prices.length - 1];
            yearlyPerformance.push({
                year,
                startValue: 0, // Placeholder
                endValue: 0,
                return: ((last.close - first.open) / first.open) * 100,
                dividends: data.dividends
            });
        }
    });

    return {
        symbol: input.symbol,
        initialInvestment: input.initialAmount,
        totalInvested,
        currentValue: finalPortfolioValue,
        cashBalance,
        totalShares,
        averageCostPerShare: totalInvested / totalShares,
        currentPrice: finalPrice.close,
        absoluteReturn,
        percentageReturn,
        annualizedReturn,
        dividendsCashReceived,
        dividendsStockReceived,
        dividendsReinvested,
        timeline,
        monthlyPerformance,
        yearlyPerformance,
        bestMonthToBuy: [] // Simplified
    };
}

// ... analyzeOptimalTiming function remains same ...
export function analyzeOptimalTiming(priceHistory: StockDataPoint[]) {
    // (Keep existing logic or copy from previous version)
    const dayOfWeekReturns: Map<number, number[]> = new Map();
    const dayOfMonthReturns: Map<number, number[]> = new Map();
    const quarterReturns: Map<number, number[]> = new Map();

    for (let i = 1; i < priceHistory.length; i++) {
        const prev = priceHistory[i - 1];
        const curr = priceHistory[i];
        const dailyReturn = ((curr.close - prev.close) / prev.close) * 100;
        const currDate = new Date(curr.date);

        const dow = currDate.getDay();
        if (!dayOfWeekReturns.has(dow)) dayOfWeekReturns.set(dow, []);
        dayOfWeekReturns.get(dow)!.push(dailyReturn);

        const dom = currDate.getDate();
        if (!dayOfMonthReturns.has(dom)) dayOfMonthReturns.set(dom, []);
        dayOfMonthReturns.get(dom)!.push(dailyReturn);

        const quarter = Math.floor(currDate.getMonth() / 3) + 1;
        if (!quarterReturns.has(quarter)) quarterReturns.set(quarter, []);
        quarterReturns.get(quarter)!.push(dailyReturn);
    }

    const avgReturns = (map: Map<number, number[]>) =>
        Array.from(map.entries())
            .map(([key, values]) => ({
                key,
                avg: values.reduce((a, b) => a + b, 0) / values.length,
            }))
            .sort((a, b) => b.avg - a.avg);

    return {
        bestDayOfWeek: avgReturns(dayOfWeekReturns).map(r => ({
            day: r.key,
            avgReturn: r.avg,
        })),
        bestDayOfMonth: avgReturns(dayOfMonthReturns).map(r => ({
            day: r.key,
            avgReturn: r.avg,
        })),
        seasonality: avgReturns(quarterReturns).map(r => ({
            quarter: r.key,
            avgReturn: r.avg,
        })),
    };
}
