import {
    StockDataPoint,
    DividendInfo,
    RotationConfig,
    RotationResult,
    RotationTransaction,
    InvestmentInput,
    InvestmentResult,
    TimelineEvent,
    MonthlyPerformance,
    YearlyPerformance,
    MonteCarloResult,
    DividendGrowth,
} from './types';

// Re-export types that consumers of this module need
export type { InvestmentInput, InvestmentResult, MonteCarloResult, DividendGrowth };

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

    // IMPORTANT: Calculate cumulative adjustment factor for each date
    // Stock dividends cause price adjustment. We need to "unadjust" the price
    // to get the real price at purchase time.
    // 
    // For each stock dividend event (e.g., 40%), prices BEFORE that date are
    // multiplied by 1/(1+0.40) = 0.714 in adjusted data.
    // To get unadjusted price: adjustedPrice * cumulativeAdjustmentFactor

    const stockDividends = sortedDividends.filter(d => d.type === 'stock');

    // Build adjustment factor map: for each date, what's the cumulative factor
    const getAdjustmentFactor = (date: Date): number => {
        let factor = 1.0;
        // For prices BEFORE a stock dividend, they were adjusted DOWN
        // So to get original price, we need to multiply by factor
        for (const sd of stockDividends) {
            const sdDate = new Date(sd.exDate);
            if (date < sdDate) {
                // This price was adjusted for this dividend
                factor *= (1 + sd.value / 100);
            }
        }
        return factor;
    };

    // 3. Find Start Index
    const firstPriceIdx = sortedPrices.findIndex(p => new Date(p.date) >= startDateObj);
    if (firstPriceIdx === -1) throw new Error('Không tìm thấy dữ liệu giá');

    // Calculate unadjusted prices for all data points
    const unadjustedPrices = sortedPrices.map(p => {
        const factor = getAdjustmentFactor(new Date(p.date));
        return {
            ...p,
            close: Math.round(p.close * factor), // Unadjust the price
            open: Math.round(p.open * factor),
            high: Math.round(p.high * factor),
            low: Math.round(p.low * factor),
        };
    });

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

    // 4. Initial Buy - Use unadjusted price
    const firstPrice = unadjustedPrices[firstPriceIdx];
    buyShares(firstPrice.date, firstPrice.close, cashBalance, "Mua lần đầu");

    // 5. Main Loop - Use unadjusted prices for all calculations
    for (let i = firstPriceIdx; i < unadjustedPrices.length; i++) {
        const price = unadjustedPrices[i];
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
                    shares: totalShares, // Số CP hiện có
                    pricePerShare: dividend.value * (1 - TAX_RATE_DIVIDEND), // Cổ tức/CP sau thuế
                    totalShares,
                    portfolioValue: (totalShares * price.close) + cashBalance,
                    cashBalance
                });

                if (shouldReinvest) {
                    buyShares(price.date, price.close, cashBalance, "Tái đầu tư cổ tức", 'reinvest');
                }

            } else {
                // Stock Dividend (Bonus Shares)
                // QUAN TRỌNG: SSI/DNSE API trả về adjusted price (đã điều chỉnh theo cổ tức cổ phiếu)
                // => KHÔNG cộng thêm cổ phiếu thưởng vào số lượng sở hữu
                // => Chỉ ghi nhận GIÁ TRỊ để hiển thị trong timeline

                const theoreticalBonusShares = Math.floor(totalShares * (dividend.value / 100));
                const bonusValue = theoreticalBonusShares * price.close;

                // Ghi nhận giá trị (không cộng vào totalShares)
                dividendsStockReceived += bonusValue;

                timeline.push({
                    date: price.date,
                    type: 'dividend_stock',
                    description: `Cổ tức CP ${dividend.value}% (≈${theoreticalBonusShares.toLocaleString()} CP - đã phản ánh trong giá)`,
                    shares: theoreticalBonusShares,
                    pricePerShare: price.close,
                    totalShares, // Giữ nguyên
                    portfolioValue: (totalShares * price.close) + cashBalance,
                    cashBalance
                });
            }
        }
    }

    // 6. Final Calculation - Use unadjusted prices
    const lastPrice = unadjustedPrices[Math.min(unadjustedPrices.length - 1, unadjustedPrices.findIndex(p => new Date(p.date) > endDateObj) === -1 ? unadjustedPrices.length - 1 : unadjustedPrices.findIndex(p => new Date(p.date) > endDateObj) - 1)];

    // Nếu lastPrice bị undefined do logic findIndex
    const finalPrice = lastPrice ? lastPrice : unadjustedPrices[unadjustedPrices.length - 1];

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

    // Calculate Max Drawdown from timeline
    let maxDrawdown = 0;
    let peak = 0;
    timeline.forEach(event => {
        if (event.portfolioValue > peak) {
            peak = event.portfolioValue;
        }
        if (peak > 0) {
            const drawdown = (event.portfolioValue - peak) / peak * 100;
            if (drawdown < maxDrawdown) {
                maxDrawdown = drawdown;
            }
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
        maxDrawdown,
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



/**
 * Run Monte Carlo Simulation for Investment Projection
 * Uses Geometric Brownian Motion (GBM) model
 * dS = S * (mu * dt + sigma * dW)
 */
export function runMonteCarloSimulation(
    initialAmount: number,
    monthlyContribution: number,
    years: number,
    expectedReturnRate = 0.12, // 12% annual return
    volatility = 0.20 // 20% standard deviation (VN-Index)
): MonteCarloResult[] {
    const numSimulations = 1000;
    const dt = 1 / 12; // Time step 1 month
    const totalSteps = years * 12;

    // Store final values for each year
    const yearlyResults: number[][] = Array.from({ length: years + 1 }, () => []);

    for (let sim = 0; sim < numSimulations; sim++) {
        let currentWealth = initialAmount;
        yearlyResults[0].push(currentWealth);

        for (let step = 1; step <= totalSteps; step++) {
            // Random shock (Gaussian distribution)
            // Box-Muller transform for normal distribution
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

            // Calculate monthly return
            // r = (mu - 0.5 * sigma^2) * dt + sigma * sqrt(dt) * Z
            const drift = (expectedReturnRate - 0.5 * volatility * volatility) * dt;
            const shock = volatility * Math.sqrt(dt) * z;
            const monthlyReturn = Math.exp(drift + shock);

            // Update wealth
            currentWealth = currentWealth * monthlyReturn + monthlyContribution;

            // Record at end of each year
            if (step % 12 === 0) {
                const yearIndex = step / 12;
                yearlyResults[yearIndex].push(currentWealth);
            }
        }
    }

    // Process results to find percentiles
    const results: MonteCarloResult[] = yearlyResults.map((values, yearIndex) => {
        values.sort((a, b) => a - b);
        const p10 = values[Math.floor(values.length * 0.10)] || 0;
        const p50 = values[Math.floor(values.length * 0.50)] || 0;
        const p90 = values[Math.floor(values.length * 0.90)] || 0;

        return {
            year: yearIndex,
            percentiles: { p10, p50, p90 },
            simulations: [] // Don't return raw data to save memory
        };
    });

    return results;
}



export function calculateDividendCAGR(dividends: DividendInfo[]): DividendGrowth {
    // 1. Group by Year
    const byYear = new Map<number, number>();
    dividends.forEach(d => {
        if (d.type === 'cash') {
            const year = new Date(d.exDate).getFullYear();
            const current = byYear.get(year) || 0;
            byYear.set(year, current + d.value);
        }
    });

    const sortedYears = Array.from(byYear.entries())
        .map(([year, totalDividend]) => ({ year, totalDividend }))
        .sort((a, b) => a.year - b.year);

    // Calculate YoY Growth
    const yearsWithGrowth = sortedYears.map((item, index) => {
        if (index === 0) return { ...item, growth: 0 };
        const prev = sortedYears[index - 1];
        const growth = prev.totalDividend > 0
            ? ((item.totalDividend - prev.totalDividend) / prev.totalDividend) * 100
            : 0;
        return { ...item, growth };
    });

    // Calculate CAGR
    // Formula: (End/Start)^(1/n) - 1
    const calculateCAGR = (periodYears: number) => {
        if (sortedYears.length < periodYears) return 0;

        const endIndex = sortedYears.length - 1;
        const startIndex = endIndex - (periodYears - 1);

        if (startIndex < 0) return 0;

        const startVal = sortedYears[startIndex].totalDividend;
        const endVal = sortedYears[endIndex].totalDividend;
        const n = sortedYears[endIndex].year - sortedYears[startIndex].year;

        if (startVal <= 0 || n === 0) return 0;

        return (Math.pow(endVal / startVal, 1 / n) - 1) * 100;
    };

    return {
        cagr3Year: calculateCAGR(3),
        cagr5Year: calculateCAGR(5),
        years: yearsWithGrowth
    };
}
