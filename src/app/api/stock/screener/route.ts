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
        const response = await axios.get(`https://iboard.ssi.com.vn/api/scoreboard/stock-realtime`, {
            params: { stockSymbol: symbols },
            headers: {
                'User-Agent': 'Mozilla/5.0'
            },
            timeout: 5000
        });

        const realtimeData = response.data?.data || [];

        // 2. Process and Enrich Data
        const enrichedStocks: EnrichedStockData[] = VN30_SYMBOLS.map(symbol => {
            const quote = realtimeData.find((q: any) => q.stockSymbol === symbol) || {};

            // SSI provides price in 1000 VND unit for some fields, check format
            // usually matchedPrice is the current price
            // Default 0 if not found

            // Fields from SSI response typically:
            // matchedPrice: current price
            // priceChange: change value
            // priceChangePercent: change %
            // totalVolume: volume

            const currentPrice = (quote.matchedPrice || quote.refPrice || 0) * 1000;

            // Get Dividend Info
            const divInfo = (dividendsData as any)[symbol] || [];

            // Calculate Dividend Metrics
            // Get latest cash dividend year
            const currentYear = new Date().getFullYear();
            const lastYearCash = divInfo
                .filter((d: any) => d.type === 'cash' && new Date(d.exDate).getFullYear() >= currentYear - 1)
                .reduce((sum: number, d: any) => sum + d.value, 0);

            // Estimate forward yield based on last year history or generic
            // For simplicity, use sum of dividends in last 12 months
            const dividendPerShare = lastYearCash;
            const dividendYield = currentPrice > 0 ? (dividendPerShare / currentPrice) * 100 : 0;

            // Stock Dividend Ratio (Bonus)
            const lastStockDiv = divInfo.find((d: any) => d.type === 'stock' && new Date(d.exDate).getFullYear() >= currentYear - 1);
            const stockDividendRatio = lastStockDiv ? lastStockDiv.value / 100 : 0;

            return {
                symbol,
                name: symbol, // Could add full name map if needed
                price: currentPrice, // Fix: Map to price
                currentPrice,
                change: quote.priceChange || 0,
                changePercent: quote.priceChangePercent || 0,
                volume: quote.totalVolume || 0,
                dividendYield: parseFloat(dividendYield.toFixed(2)),
                dividendPerShare,
                dividendHistory: [], // Keeping simple for table
                payoutFrequency: 'Annually', // Approximation
                sector: getSector(symbol),
                marketCap: (quote.matchedPrice || 0) * 1000 * 1000000, // Very rough estimate placeholder, real mcap needs shares
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
