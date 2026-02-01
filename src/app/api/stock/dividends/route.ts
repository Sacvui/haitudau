import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();

    if (!symbol) {
        return NextResponse.json(
            { error: 'Missing required parameter: symbol' },
            { status: 400 }
        );
    }

    try {
        console.log(`Fetching real dividend data for ${symbol} from SSI...`);

        // SSI API Time range (Last 10 years to Future)
        const from = Math.floor(new Date('2015-01-01').getTime() / 1000);
        const to = Math.floor(new Date().getTime() / 1000) + 31536000; // +1 year

        // 1. Fetch from SSI iBoard (Trustworthy Source)
        const ssiResponse = await axios.get('https://iboard.ssi.com.vn/dchart/api/1.1/corporate-actions', {
            params: {
                symbol: symbol,
                from: from,
                to: to,
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });

        if (ssiResponse.data && Array.isArray(ssiResponse.data.data)) {
            const rawEvents = ssiResponse.data.data;

            // Filter and Map SSI Data
            const dividends = rawEvents
                .filter((e: any) => e.action === 'cash_dividend' || e.action === 'stock_dividend' || e.action === 'bonus_share') // D: Dividend, S: Split/Bonus? - SSI uses specific codes
                // SSI codes: 
                // dividend_cash (Cổ tức tiền)
                // dividend_stock (Cổ tức CP)
                // bonus_share (Cổ phiếu thưởng)
                // split (Chia tách)
                // We need to check 'actionType' or similar fields.
                // Let's rely on mapping logic based on actual response structure inspection.
                // Based on standard SSI response:
                // action: "cash_dividend" | "stock_dividend" | "bonus_share" | "rights"

                .map((e: any) => {
                    let type: 'cash' | 'stock' | null = null;
                    let value = 0;

                    // SSI Format Parsing
                    // e.eventName often contains Vietnamese text
                    // e.ratio: "100:10" or e.value: "1000"

                    if (e.action === 'cash_dividend') {
                        type = 'cash';
                        value = parseFloat(e.value); // Usually raw VND, e.g. 1000
                    } else if (e.action === 'stock_dividend' || e.action === 'bonus_share') {
                        type = 'stock';
                        // Parse ratio "20:3" or "100:15"
                        // SSI might provide 'ratio' string "20:3"
                        const ratioStr = e.ratio || "";
                        const parts = ratioStr.split(':');
                        if (parts.length === 2) {
                            value = (parseFloat(parts[1]) / parseFloat(parts[0])) * 100;
                        } else {
                            // Sometimes ratio is just a percentage number? Check 'value'
                            value = parseFloat(e.value) || 0;
                        }
                    }

                    if (!type || value === 0) return null;

                    // ExDate Format from SSI: "03/06/2024" or ISO? 
                    // SSI usually returns "dd/MM/yyyy" or timestamp.
                    // Checking implementation: SSI corporate-actions returns unix timestamp in 'exRightDate' usually?
                    // Or string "2024-06-03 00:00:00"

                    // Safe Date Parsing
                    let exDate = e.exRightDate;
                    if (typeof exDate === 'string' && exDate.includes('/')) {
                        // Convert dd/mm/yyyy -> yyyy-mm-dd
                        const [d, m, y] = exDate.split('/');
                        exDate = `${y}-${m}-${d}`;
                    } else if (typeof exDate === 'string' && exDate.includes('T')) {
                        exDate = exDate.split('T')[0];
                    }

                    return {
                        exDate: exDate,
                        type: type,
                        value: value,
                        description: e.description || e.eventName || (type === 'cash' ? `Cổ tức tiền ${value}đ` : `Cổ tức cổ phiếu ${value.toFixed(1)}%`),
                        source: 'ssi'
                    };
                })
                .filter((d: any) => d !== null);

            if (dividends.length > 0) {
                return NextResponse.json({
                    success: true,
                    symbol,
                    data: dividends,
                    total: dividends.length,
                    source: 'ssi'
                });
            }
        }

        // Retry with CafeF if SSI return empty (Fallback to REAL data source #2)
        // ... (Keep existing CafeF logic just in case, WITHOUT MOCK) ...
        const cafeRes = await axios.get('https://s.cafef.vn/Ajax/CongTy/DieuChinhGia.ashx', {
            params: { sym: symbol },
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        // ... (Simple CafeF parsing logic reused here for compactness) ...
        if (cafeRes.data && Array.isArray(cafeRes.data) && cafeRes.data.length > 0) {
            const cfDividends = cafeRes.data
                .filter((item: any) => item.NoiDung)
                .map((item: any) => {
                    const content = item.NoiDung || '';
                    let type = 'cash';
                    let value = 0;
                    if (content.toLowerCase().includes('tiền')) {
                        const match = content.match(/(\d+(?:,\d+)?(?:\.\d+)?)/);
                        if (match) value = parseFloat(match[1].replace(/,/g, ''));
                        // Fix Cafef Unit: if value < 100 it's likely %, convert to VND if context implies? 
                        // Actually CafeF text usually "1000 đồng/CP" or "10%"
                        // If "10%" cash -> 10% par value (10,000) = 1000 VND.
                        if (value <= 100 && content.includes('%')) value = value * 100;
                    } else if (content.toLowerCase().includes('cổ phiếu')) {
                        type = 'stock';
                        const match = content.match(/(\d+):(\d+)/);
                        if (match) value = (parseFloat(match[1]) / parseFloat(match[2])) * 100;
                    }
                    return {
                        exDate: item.NgayGDKHQ,
                        type,
                        value,
                        description: content,
                        source: 'cafef'
                    };
                })
                .filter((d: any) => d.value > 0);

            return NextResponse.json({ success: true, symbol, data: cfDividends, source: 'cafef' });
        }


        return NextResponse.json({
            success: true,
            symbol,
            data: [],
            total: 0,
            message: "No dividend data found from SSI or CafeF"
        });

    } catch (error: any) {
        console.error('Real API Error:', error.message);
        return NextResponse.json(
            { error: 'Failed to fetch real data', details: error.message },
            { status: 500 }
        );
    }
}
