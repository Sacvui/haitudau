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

// Helper: Calculate consistency score (1-5) based on dividend history
function calculateConsistency(history: any[]): number {
    if (!history || history.length === 0) return 0;
    const years = history.length;
    let score = Math.min(5, years);
    return score;
}

// Generate Top 20 dynamically based on dividend consistency and history from dividendsData
const generateTop20 = () => {
    const allSymbols = Object.keys(dividendsData);
    const scoredSymbols = allSymbols.map(sym => {
        const divInfo = (dividendsData as any)[sym] || [];
        const consistency = calculateConsistency(divInfo);

        // Sum of all dividends as a tie-breaker
        const totalDivs = divInfo.reduce((sum: number, d: any) => sum + (d.value || 0), 0);

        return { symbol: sym, consistency, totalDivs };
    });

    // Sort by consistency (desc), then total dividends (desc)
    scoredSymbols.sort((a, b) => {
        if (b.consistency !== a.consistency) return b.consistency - a.consistency;
        return b.totalDivs - a.totalDivs;
    });

    return scoredSymbols.slice(0, 20).map(s => s.symbol);
};

// Top 20 Recommended by Hai (Dynamically Ranked)
const TOP20_SYMBOLS = generateTop20();

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
        if (group === 'top20') targetSymbols = TOP20_SYMBOLS;

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

            // CRITICAL FIX: Limit fallback requests to max 30 symbols to prevent Vercel 10s timeout
            const fallbackTargets = targetSymbols.slice(0, 30);
            console.log(`[Screener] Restricting fallback history to ${fallbackTargets.length} symbols...`);

            const BATCH_SIZE = 15;
            for (let i = 0; i < fallbackTargets.length; i += BATCH_SIZE) {
                const batch = fallbackTargets.slice(i, i + BATCH_SIZE);
                for (const sym of batch) {
                    try {
                        const hRes = await fetch(`https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol=${sym}&from=${startTs}&to=${endTs}`, {
                            next: { revalidate: 0 }
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
                        console.warn(`[Screener] Failed to fetch fallback data for ${sym}:`, e.message);
                    }
                }
                // Tạm nghỉ 50ms giữa các batch để tránh bị Rate Limit (429) từ VNDirect
                if (i + BATCH_SIZE < fallbackTargets.length) {
                    await new Promise(r => setTimeout(r, 50));
                }
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
                sector: getSector(symbol),
                marketCap: currentPrice * 1000000,
                consistencyScore: calculateConsistency(divInfo),
                stockDividendRatio
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
            stockDividendRatio: Number(stock.stockDividendRatio || 0)
        }));

        return NextResponse.json({
            success: true,
            data: finalData
        });

    } catch (err: any) {
        console.error('[Screener Route Error]:', err);
        return NextResponse.json({ success: false, error: 'Failed to fetch realtime data', details: err.message }, { status: 500 });
    }
}
