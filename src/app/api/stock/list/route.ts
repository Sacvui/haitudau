import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Cache stock list for 24 hours
let stockListCache: any[] | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const FALLBACK_STOCKS = [
    { symbol: 'VNM', name: 'Công ty Cổ phần Sữa Việt Nam', exchange: 'HOSE' },
    { symbol: 'FPT', name: 'Công ty Cổ phần FPT', exchange: 'HOSE' },
    { symbol: 'HPG', name: 'Công ty Cổ phần Tập đoàn Hòa Phát', exchange: 'HOSE' },
    { symbol: 'VCB', name: 'Ngân hàng TMCP Ngoại thương Việt Nam', exchange: 'HOSE' },
    { symbol: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam', exchange: 'HOSE' },
    { symbol: 'TCB', name: 'Ngân hàng TMCP Kỹ thương Việt Nam', exchange: 'HOSE' },
    { symbol: 'MWG', name: 'Công ty Cổ phần Đầu tư Thế giới Di động', exchange: 'HOSE' },
    { symbol: 'ACB', name: 'Ngân hàng TMCP Á Châu', exchange: 'HOSE' },
    { symbol: 'VPB', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', exchange: 'HOSE' },
    { symbol: 'MBB', name: 'Ngân hàng TMCP Quân đội', exchange: 'HOSE' },
];

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toUpperCase() || '';

    try {
        // [Existing Cache Logic]...
        // Check cache
        if (stockListCache && Date.now() - cacheTime < CACHE_DURATION) {
            const filtered = search
                ? stockListCache.filter(
                    s => s.symbol.includes(search) || s.name.toUpperCase().includes(search)
                )
                : stockListCache;
            return NextResponse.json({ success: true, data: filtered.slice(0, 50), total: filtered.length });
        }

        // Fetch fresh data
        const response = await axios.get('https://finfo-api.vndirect.com.vn/v4/stocks', {
            params: { q: 'type:stock~status:listed', size: 2000, page: 1 },
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000, // Reduced timeout for fallback speed
        });

        if (response.data?.data) {
            stockListCache = response.data.data.map((item: any) => ({
                symbol: item.code,
                name: item.companyName || item.shortName || '',
                exchange: item.exchange || 'UNKNOWN',
                industry: item.industry || '',
            }));
            cacheTime = Date.now();

            const list = stockListCache || [];
            const filtered = search
                ? list.filter(s => s.symbol.includes(search) || s.name.toUpperCase().includes(search))
                : list;

            return NextResponse.json({ success: true, data: filtered.slice(0, 50), total: filtered.length });
        }

        throw new Error("No data from API");

    } catch (error: any) {
        console.warn('Stock API failed, using fallback:', error.message);
        // Fallback Logic
        const filteredFallback = search
            ? FALLBACK_STOCKS.filter(s => s.symbol.includes(search))
            : FALLBACK_STOCKS;

        return NextResponse.json({
            success: true,
            data: filteredFallback,
            total: filteredFallback.length,
            source: 'fallback'
        });
    }
}
