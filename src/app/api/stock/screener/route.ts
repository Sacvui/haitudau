import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import dividendsData from '@/data/dividends.json';

// VN30 List (Full 30 stocks)
const VN30_SYMBOLS = [
    'ACB', 'BCM', 'BID', 'BVH', 'CTG', 'FPT', 'GAS', 'GVR', 'HDB', 'HPG',
    'MBB', 'MSN', 'MWG', 'PLX', 'POW', 'SAB', 'SHB', 'SSB', 'SSI', 'STB',
    'TCB', 'TPB', 'VCB', 'VHM', 'VIB', 'VIC', 'VJC', 'VNM', 'VPB', 'VRE'
];

interface StockRealtimeData {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
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

// Calculate consistency score (1-5) based on dividend history
function calculateConsistency(history: any[]): number {
    if (!history || history.length === 0) return 0;
    const years = history.length;
    let score = Math.min(5, years);
    // Reduce if gaps? For now simple count
    return score;
}

export async function GET(request: NextRequest) {
    try {
        // 1. Fetch Realtime Prices from SSI
        // Using SSI Scoreboard API
        // https://iboard.ssi.com.vn/api/scoreboard/stock-realtime?stockSymbol=ACB,FPT,...

        const symbols = VN30_SYMBOLS.join(',');
        let realtimeData: any[] = [];
        try {
            const response = await axios.get(`https://iboard.ssi.com.vn/api/scoreboard/stock-realtime`, {
                params: { stockSymbol: symbols },
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                },
                timeout: 5000
            });
            realtimeData = response.data?.data || [];
        } catch (err: any) {
            console.warn('[Screener] SSI Realtime API failed, falling back to history:', err.message);
        }

        // Check if all prices are 0 (weekend/off-hours)
        const allZero = realtimeData.every((q: any) => !q.matchedPrice && !q.refPrice);

        // Fallback: fetch last trading day prices from DNSE (VNDirect) when real-time is empty
        // DNSE works 24/7 including weekends, unlike SSI which blocks on Sat/Sun
        let fallbackPrices: Record<string, { close: number; prevClose: number; volume: number }> = {};
        if (allZero || realtimeData.length === 0) {
            console.log('[Screener] Real-time prices are all 0 (off-hours). Fetching DNSE fallback...');
            const endTs = Math.floor(Date.now() / 1000);
            const startTs = endTs - 10 * 24 * 60 * 60; // 10 days back

            const BATCH_SIZE = 5;
            for (let i = 0; i < VN30_SYMBOLS.length; i += BATCH_SIZE) {
                const batch = VN30_SYMBOLS.slice(i, i + BATCH_SIZE);
                await Promise.allSettled(batch.map(async (sym) => {
                    try {
                        const hRes = await axios.get('https://dchart-api.vndirect.com.vn/dchart/history', {
                            params: { resolution: 'D', symbol: sym, from: startTs, to: endTs },
                            timeout: 5000
                        });
                        const hd = hRes.data;
                        if (hd.s === 'ok' && hd.c && hd.c.length >= 2) {
                            const lastIdx = hd.c.length - 1;
                            fallbackPrices[sym] = {
                                close: hd.c[lastIdx] * 1000, // DNSE returns in 1000 VND
                                prevClose: hd.c[lastIdx - 1] * 1000,
                                volume: hd.v[lastIdx]
                            };
                        }
                    } catch (e: any) {
                        console.warn(`[Screener] Failed to fetch fallback data for ${sym}:`, e.message);
                    }
                }));
                // Tạm nghỉ 300ms giữa các batch để tránh bị Rate Limit (429) từ VNDirect
                if (i + BATCH_SIZE < VN30_SYMBOLS.length) {
                    await new Promise(r => setTimeout(r, 300));
                }
            }
            console.log(`[Screener] DNSE fallback: ${Object.keys(fallbackPrices).length}/${VN30_SYMBOLS.length} stocks`);
        }

        // 2. Process and Enrich Data
        const enrichedStocks: EnrichedStockData[] = VN30_SYMBOLS.map(symbol => {
            const quote = realtimeData.find((q: any) => q.stockSymbol === symbol) || {};
            const fb = fallbackPrices[symbol];

            // Use real-time if available, otherwise fallback to history
            const currentPrice = (quote.matchedPrice || quote.refPrice || 0) * 1000 || (fb?.close || 0);
            const change = (quote.priceChange || 0) || (fb ? fb.close - fb.prevClose : 0);
            const changePercent = (quote.priceChangePercent || 0) || (fb && fb.prevClose > 0 ? parseFloat(((fb.close - fb.prevClose) / fb.prevClose * 100).toFixed(2)) : 0);
            const volume = (quote.totalVolume || 0) || (fb?.volume || 0);

            // Get Dividend Info
            const divInfo = (dividendsData as any)[symbol] || [];

            // Calculate Dividend Metrics: find the most recent year with cash dividends
            const lastYearCash = (() => {
                const cashDivs = divInfo.filter((d: any) => d.type === 'cash');
                if (cashDivs.length === 0) return 0;

                // Find the latest year in the data
                const latestYear = Math.max(...cashDivs.map((d: any) => new Date(d.exDate).getFullYear()));

                // Sum all cash dividends for that latest year
                return cashDivs
                    .filter((d: any) => new Date(d.exDate).getFullYear() === latestYear)
                    .reduce((sum: number, d: any) => sum + d.value, 0);
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

        return NextResponse.json({
            success: true,
            count: enrichedStocks.length,
            data: enrichedStocks
        });

    } catch (error) {
        console.error('Realtime Screener Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch realtime data' }, { status: 500 });
    }
}
