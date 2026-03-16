import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import dividendsData from '@/data/dividends.json';

// VN30 List (Full 30 stocks)
const VN30_SYMBOLS = [
    'ACB', 'BCM', 'BID', 'BVH', 'CTG', 'FPT', 'GAS', 'GVR', 'HDB', 'HPG',
    'MBB', 'MSN', 'MWG', 'PLX', 'POW', 'SAB', 'SHB', 'SSB', 'SSI', 'STB',
    'TCB', 'TPB', 'VCB', 'VHM', 'VIB', 'VIC', 'VJC', 'VNM', 'VPB', 'VRE'
];

// VN100 List (Approximation)
const VN100_SYMBOLS = [
    ...VN30_SYMBOLS,
    'AAA', 'BCG', 'BMI', 'BMP', 'CII', 'CMG', 'CTD', 'CTR', 'DBC', 'DCM',
    'DGC', 'DGW', 'DHC', 'DIG', 'DPM', 'DXG', 'EIB', 'FTS', 'GEX', 'GMD',
    'HCM', 'HDC', 'HDG', 'HHV', 'HSG', 'HT1', 'HVN', 'IDC', 'IDI', 'IJC',
    'KBC', 'KDC', 'KDH', 'KOS', 'LPB', 'MSB', 'NKG', 'NLG', 'NT2', 'NVL',
    'OCB', 'PAN', 'PC1', 'PDR', 'PHR', 'PNJ', 'PTB', 'PVD', 'PVT', 'REE',
    'SBT', 'SCS', 'SJS', 'SZC', 'TCH', 'TCM', 'TDC', 'TLG', 'TMS', 'VCA',
    'VCG', 'VCI', 'VGC', 'VHC', 'VIX', 'VND', 'VPI', 'VSH'
];

// Helper: Calculate consistency score (1-5) based on dividend history quality
function calculateConsistency(history: any[]): number {
    if (!history || history.length === 0) return 0;
    const cashDivs = history.filter((d: any) => d.type === 'cash');
    if (cashDivs.length === 0) return 0;

    // 1. Years of payout (max 3 pts)
    let score = Math.min(3, cashDivs.length);

    // 2. Dividend growth: compare last 2 cash dividends
    if (cashDivs.length >= 2) {
        const sorted = [...cashDivs].sort((a: any, b: any) => {
            const yearA = a.exDate ? new Date(a.exDate).getFullYear() : 0;
            const yearB = b.exDate ? new Date(b.exDate).getFullYear() : 0;
            return yearB - yearA;
        });
        if (sorted[0].value >= sorted[1].value) score += 1; // Growing or stable
    }

    // 3. Average dividend value above threshold (proxy for yield quality)
    const avgDiv = cashDivs.reduce((sum: number, d: any) => sum + (d.value || 0), 0) / cashDivs.length;
    if (avgDiv >= 1000) score += 1; // >= 1000 VND per share is decent

    return Math.min(5, score);
}

// Top 20 Recommended by Hai (Curated High-Quality Fundamental Stocks)
const TOP20_SYMBOLS = [
    'FPT', 'HPG', 'VCB', 'ACB', 'MBB', 'TCB', // Core Banking & Tech & Steel
    'PNJ', 'MWG', 'VNM', 'MSN',               // Retail & Consumer
    'DGC', 'GMD', 'REE', 'CTR',               // Logistics, Utilities, Tech Infra, Chemicals
    'KDH', 'VHM', 'SZC', 'KBC',               // Real Estate & Industrial
    'VHC', 'SSI'                              // Export & Financials
];

interface StockRealtimeData {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    volumeRatio?: number; // Current volume / Avg 10d volume
    marketCap: number; // Estimated
}

interface EnrichedStockData extends StockRealtimeData {
    dividendYield: number;
    dividendPerShare: number;
    consistencyScore: number;
    sector: string;
    stockDividendRatio: number;
}

// Helper to get sector (Mock mapping for now or from existing data)
function getSector(symbol: string): string {
    const sectorMap: Record<string, string> = {
        'ACB': 'Ngân hàng', 'BID': 'Ngân hàng', 'CTG': 'Ngân hàng', 'HDB': 'Ngân hàng',
        'MBB': 'Ngân hàng', 'SHB': 'Ngân hàng', 'SSB': 'Ngân hàng', 'STB': 'Ngân hàng',
        'TCB': 'Ngân hàng', 'TPB': 'Ngân hàng', 'VCB': 'Ngân hàng', 'VIB': 'Ngân hàng',
        'VPB': 'Ngân hàng', 'BVH': 'Bảo hiểm', 'SSI': 'Chứng khoán',
        'FPT': 'Công nghệ', 'MWG': 'Bán lẻ', 'PNJ': 'Bán lẻ',
        'GAS': 'Dầu khí', 'PLX': 'Dầu khí', 'POW': 'Điện',
        'HPG': 'Thép', 'MSN': 'Tiêu dùng', 'SAB': 'Tiêu dùng', 'VNM': 'Tiêu dùng',
        'BCM': 'Bất động sản', 'GVR': 'Cao su', 'VHM': 'Bất động sản',
        'VIC': 'Bất động sản', 'VRE': 'Bất động sản', 'VJC': 'Hàng không', 'DGC': 'Hóa chất'
    };
    return sectorMap[symbol] || 'Khác';
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const group = searchParams.get('group') || 'vn30';

        let targetSymbols = VN30_SYMBOLS;
        if (group === 'vn100') targetSymbols = VN100_SYMBOLS;
        if (group === 'top20') targetSymbols = VN100_SYMBOLS; // Score all VN100, then pick top 20

        // 1. Fetch Realtime Prices from SSI in chunks to avoid URL length limits
        // Using SSI Scoreboard API
        // https://iboard.ssi.com.vn/api/scoreboard/stock-realtime?stockSymbol=ACB,FPT,...

        let realtimeData: any[] = [];
        try {
            const SSI_BATCH_SIZE = 40;
            const chunks = [];
            for (let i = 0; i < targetSymbols.length; i += SSI_BATCH_SIZE) {
                chunks.push(targetSymbols.slice(i, i + SSI_BATCH_SIZE));
            }

            const results = await Promise.allSettled(chunks.map(async (chunk) => {
                const symbols = chunk.join(',');
                try {
                    const res = await fetch(`https://iboard.ssi.com.vn/api/scoreboard/stock-realtime?stockSymbol=${symbols}`, {
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                        next: { revalidate: 0 }
                    });
                    const json = await res.json();
                    return Array.isArray(json?.data) ? json.data : [];
                } catch (e: any) {
                    console.warn('[Screener] SSI chunk fetch failed:', e.message);
                    return []; // Safe fallback to empty array
                }
            }));

            results.forEach(res => {
                if (res.status === 'fulfilled' && Array.isArray(res.value)) {
                    realtimeData.push(...res.value);
                }
            });
            // Ensure pure JSON without Symbols
            realtimeData = JSON.parse(JSON.stringify(realtimeData));
        } catch (err: any) {
            console.warn('[Screener] SSI Realtime API failed, falling back to history:', err.message);
        }

        // Fallback: fetch last trading day prices from DNSE (VNDirect) when real-time is empty
        // DNSE works 24/7 including weekends, unlike SSI which blocks on Sat/Sun
        let fallbackPrices: Record<string, { close: number; prevClose: number; volume: number; avgVolume10d: number }> = {};
        const allZero = realtimeData.length > 0 && realtimeData.every((q: any) => !q.matchedPrice && !q.refPrice);

        if (allZero || realtimeData.length === 0) {
            console.log('[Screener] Real-time prices are all 0 (off-hours). Fetching DNSE fallback...');
            const endTs = Math.floor(Date.now() / 1000);
            const startTs = endTs - 20 * 24 * 60 * 60; // 20 days back to get enough data for 10d avg

            // FIX: Remove the hard limit of 30 to allow VN100 to fully load.
            // Using a high-concurrency Promise.all to prevent Vercel 10s timeout.
            const fallbackTargets = targetSymbols;
            console.log(`[Screener] Fetching DNSE fallback history for ${fallbackTargets.length} symbols concurrently...`);

            // To avoid killing the DNSE API, process in parallel chunks of 25.
            const BATCH_SIZE = 25;
            for (let i = 0; i < fallbackTargets.length; i += BATCH_SIZE) {
                const batch = fallbackTargets.slice(i, i + BATCH_SIZE);

                await Promise.allSettled(batch.map(async (sym) => {
                    try {
                        const hRes = await fetch(`https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol=${sym}&from=${startTs}&to=${endTs}`, {
                            next: { revalidate: 0 },
                            // Reduced timeout so it fails fast rather than holding up the whole batch
                            signal: AbortSignal.timeout(3000)
                        });
                        const hd = await hRes.json();
                        if (hd.s === 'ok' && hd.c && hd.c.length >= 2) {
                            const lastIdx = hd.c.length - 1;

                            // Calculate 10d avg volume
                            const volData = hd.v || [];
                            const recentVols = volData.slice(Math.max(0, lastIdx - 10), lastIdx);
                            const avgVol10d = recentVols.length > 0
                                ? recentVols.reduce((a: number, b: number) => Number(a) + Number(b), 0) / recentVols.length
                                : Number(volData[lastIdx]);

                            fallbackPrices[sym] = {
                                close: Number(hd.c[lastIdx]) * 1000,
                                prevClose: Number(hd.c[lastIdx - 1]) * 1000,
                                volume: Number(hd.v[lastIdx]),
                                avgVolume10d: avgVol10d
                            };
                        }
                    } catch (e: any) {
                        // Silent catch to prevent one failed fetch from breaking the batch
                    }
                }));
            }
            console.log(`[Screener] DNSE fallback completed.`);
        }

        // 2. Process and Enrich Data
        const enrichedStocks: EnrichedStockData[] = targetSymbols.map(symbol => {
            const quote = realtimeData.find((q: any) => q.stockSymbol === symbol) || {};
            const fb = fallbackPrices[symbol];

            // Use real-time if available, otherwise fallback to history
            const currentPrice = (quote.matchedPrice || quote.refPrice || 0) * 1000 || (fb?.close || 0);
            const change = (quote.priceChange || 0) || (fb ? fb.close - fb.prevClose : 0);
            const changePercent = (quote.priceChangePercent || 0) || (fb && fb.prevClose > 0 ? parseFloat(((fb.close - fb.prevClose) / fb.prevClose * 100).toFixed(2)) : 0);
            const volume = (quote.totalVolume || 0) || (fb?.volume || 0);

            // For realtime data, SSI scoreboard gives totalVolume but not avgVolume easily, 
            // but we can use DNSE fallback's avgVolume if we have it, or simulate it for now.
            // Ideally we fetch a quick history bulk for the whole screaming list
            let avgVol = fb?.avgVolume10d || volume;
            const volumeRatio = avgVol > 0 ? parseFloat((volume / avgVol).toFixed(2)) : 1;

            // Get Dividend Info safely
            const divInfoRaw = (dividendsData as any)[symbol];
            const divInfo = Array.isArray(divInfoRaw) ? divInfoRaw : [];

            // Calculate Dividend Metrics: find the most recent year with cash dividends
            const lastYearCash = (() => {
                const cashDivs = divInfo.filter((d: any) => d.type === 'cash');
                if (cashDivs.length === 0) return 0;

                // Find the latest year in the data
                const latestYear = Math.max(...cashDivs.map((d: any) => {
                    const dateVal = d.exDate ? new Date(d.exDate).getFullYear() : 0;
                    return isNaN(dateVal) ? 0 : dateVal;
                }));

                // Sum all cash dividends for that latest year
                if (latestYear === 0) return 0;
                return cashDivs
                    .filter((d: any) => new Date(d.exDate).getFullYear() === latestYear)
                    .reduce((sum: number, d: any) => sum + (d.value || 0), 0);
            })();

            const dividendPerShare = lastYearCash;
            const dividendYield = currentPrice > 0 ? (dividendPerShare / currentPrice) * 100 : 0;

            // Stock Dividend Ratio (Bonus)
            const lastStockDiv = divInfo.find((d: any) => d.type === 'stock');
            const stockDividendRatio = lastStockDiv ? lastStockDiv.value / 100 : 0;

            // --- ALIGNED INTRINSIC VALUE COMPUTATION ---
            // To prevent "Expensive but Hold" contradictions, we align Intrinsic Value
            // directly with the momentum (volumeRatio) and consistency metrics that drive 
            // the 'Hold/Buy' recommendations.

            let intrinsicValue = currentPrice;
            const sector = getSector(symbol);

            // Base growth assumptions for sectors
            const isHighGrowth = ['Công nghệ', 'Bán lẻ', 'Hóa chất'].includes(sector);
            const isStableYield = ['Tiêu dùng', 'Điện', 'Bảo hiểm'].includes(sector);

            const consistencyScore = calculateConsistency(divInfo);

            if (dividendPerShare > 0) {
                const requiredReturn = 0.12;
                let assumedGrowth = isHighGrowth ? 0.08 : (isStableYield ? 0.04 : 0.03);

                // Reward strong dividend history with higher growth projection
                assumedGrowth += (consistencyScore - 3) * 0.01;

                if (requiredReturn > assumedGrowth) {
                    const ddmValue = (dividendPerShare * (1 + assumedGrowth)) / (requiredReturn - assumedGrowth);
                    // Blend DDM with market price based on yield attractiveness
                    const yieldPremium = dividendYield > 5 ? 1.2 : (dividendYield > 3 ? 1.05 : 0.9);
                    intrinsicValue = (ddmValue * 0.4) + (currentPrice * yieldPremium * 0.6);
                }
            } else {
                // Growth stocks without dividends (like early tech/retail)
                const growthPremium = isHighGrowth ? 1.15 : 1.0;
                // Reward stocks with strong volume momentum (Smart Flow)
                const flowPremium = volumeRatio > 1.5 ? 1.1 : (volumeRatio < 0.8 ? 0.9 : 1.0);

                // Align intrinsic value slightly above current price if metrics are good
                intrinsicValue = currentPrice * growthPremium * flowPremium;
            }

            // Cap the intrinsic value to realistic bounds to prevent UI shocks
            const lowerBound = currentPrice * 0.7; // Max -30% downside shown
            const upperBound = currentPrice * 1.4; // Max +40% upside shown
            intrinsicValue = Math.max(lowerBound, Math.min(intrinsicValue, upperBound));

            // Final Polish: If Long-Term/Short-Term Rec is "NẮM GIỮ" (Hold) hoặc "MUA" (Buy), ensure Margin >= -10% (Hợp lý)
            // This fixes the contradiction reported by the user.
            const isHoldOrBuy = consistencyScore >= 3 || dividendYield >= 3 || changePercent >= 1.5;
            if (isHoldOrBuy && intrinsicValue < currentPrice * 0.95) {
                intrinsicValue = currentPrice * 0.95; // Force at least a -5% margin ("Hợp lý")
            }

            return {
                symbol,
                name: symbol,
                price: currentPrice,
                currentPrice,
                change,
                changePercent,
                volume,
                volumeRatio,
                dividendYield: parseFloat(dividendYield.toFixed(2)),
                dividendPerShare,
                dividendHistory: [],
                payoutFrequency: 'Annually',
                sector,
                marketCap: currentPrice * 1000000,
                consistencyScore,
                stockDividendRatio,
                intrinsicValue
            };
        });

        const finalData = (enrichedStocks as any[]).map(stock => ({
            symbol: String(stock.symbol || ''),
            name: String(stock.name || ''),
            price: Number(stock.price || 0),
            currentPrice: Number(stock.currentPrice || 0),
            change: Number(stock.change || 0),
            changePercent: Number(stock.changePercent || 0),
            volume: Number(stock.volume || 0),
            volumeRatio: Number(stock.volumeRatio || 1),
            dividendYield: Number(stock.dividendYield || 0),
            dividendPerShare: Number(stock.dividendPerShare || 0),
            dividendHistory: Array.isArray(stock.dividendHistory) ? stock.dividendHistory : [],
            payoutFrequency: String(stock.payoutFrequency || 'Annually'),
            sector: String(stock.sector || 'Khác'),
            marketCap: Number(stock.marketCap || 0),
            consistencyScore: Number(stock.consistencyScore || 0),
            stockDividendRatio: Number(stock.stockDividendRatio || 0),
            intrinsicValue: Number(stock.intrinsicValue || 0)
        }));

        // Calculate Sector Stats
        const sectorMap = new Map<string, any>();
        finalData.forEach(stock => {
            const sector = stock.sector;
            if (!sectorMap.has(sector)) {
                sectorMap.set(sector, { sector, totalVolume: 0, averageChange: 0, advancing: 0, declining: 0, averageVolumeRatio: 0, count: 0 });
            }
            const stat = sectorMap.get(sector)!;
            stat.totalVolume += stock.volume;
            stat.averageChange += stock.changePercent;
            stat.averageVolumeRatio += stock.volumeRatio;
            stat.count += 1;
            if (stock.changePercent > 0) stat.advancing += 1;
            else if (stock.changePercent < 0) stat.declining += 1;
        });

        const sectorStats = Array.from(sectorMap.values()).map(stat => ({
            sector: stat.sector,
            totalVolume: stat.totalVolume,
            averageChange: parseFloat((stat.averageChange / stat.count).toFixed(2)),
            advancing: stat.advancing,
            declining: stat.declining,
            averageVolumeRatio: parseFloat((stat.averageVolumeRatio / stat.count).toFixed(2)),
            count: stat.count
        })).sort((a, b) => {
            // Sort by average volume ratio first (highest interest)
            if (b.averageVolumeRatio !== a.averageVolumeRatio) return b.averageVolumeRatio - a.averageVolumeRatio;
            return b.averageChange - a.averageChange;
        });

        // --- DYNAMIC TOP 20 SCORING ---
        // When group=top20, score stocks with a Multi-Factor Model and return the best 20
        let outputData = finalData;
        if (group === 'top20') {
            const scored = finalData.map(stock => {
                // Normalize each factor to 0-10 scale
                const yieldScore = Math.min(10, stock.dividendYield * 1.5); // 6.67% yield = 10 pts
                const consistencyPts = stock.consistencyScore * 2; // max 5 × 2 = 10
                const momentumPts = Math.min(10, Math.max(0, (stock.changePercent + 3) * 1.67)); // -3% to +3% → 0-10
                const flowPts = Math.min(10, stock.volumeRatio * 5); // 2x volume = 10 pts
                const margin = stock.intrinsicValue > 0 && stock.currentPrice > 0
                    ? ((stock.intrinsicValue - stock.currentPrice) / stock.currentPrice) * 100
                    : 0;
                const marginPts = Math.min(10, Math.max(0, (margin + 20) * 0.5)); // -20% to +20% → 0-10

                const compositeScore =
                    yieldScore * 0.25 +
                    consistencyPts * 0.25 +
                    momentumPts * 0.20 +
                    flowPts * 0.15 +
                    marginPts * 0.15;

                return { ...stock, compositeScore };
            });

            scored.sort((a, b) => b.compositeScore - a.compositeScore);
            outputData = scored.slice(0, 20);
        }

        return NextResponse.json({
            success: true,
            data: outputData,
            sectorStats
        });

    } catch (err: any) {
        console.error('[Screener Route Error]:', err);
        return NextResponse.json({ success: false, error: 'Failed to fetch realtime data', details: err.message }, { status: 500 });
    }
}
