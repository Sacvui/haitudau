import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json(
            { error: 'Missing required parameter: symbol' },
            { status: 400 }
        );
    }

    try {
        // Fetch dividend/adjustment history from CafeF
        const response = await axios.get('https://s.cafef.vn/Ajax/CongTy/DieuChinhGia.ashx', {
            params: {
                sym: symbol.toUpperCase(),
            },
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 15000,
        });

        if (response.data && Array.isArray(response.data)) {
            const dividends = response.data
                .filter((item: any) => item.NoiDung)
                .map((item: any) => {
                    const content = item.NoiDung || '';
                    let type: 'cash' | 'stock' = 'cash';
                    let value = 0;

                    // Parse dividend type and value from description
                    if (content.includes('Cổ tức bằng tiền') || content.includes('cổ tức tiền mặt')) {
                        type = 'cash';
                        // Extract cash value (VND per share)
                        const match = content.match(/(\d+(?:,\d+)?(?:\.\d+)?)/);
                        if (match) {
                            value = parseFloat(match[1].replace(/,/g, ''));
                        }
                    } else if (content.includes('Cổ tức bằng cổ phiếu') || content.includes('thưởng cổ phiếu') || content.includes('chia cổ phiếu')) {
                        type = 'stock';
                        // Extract percentage (e.g., 10% = 10:100)
                        const ratioMatch = content.match(/(\d+):(\d+)/);
                        if (ratioMatch) {
                            value = (parseFloat(ratioMatch[1]) / parseFloat(ratioMatch[2])) * 100;
                        } else {
                            const percentMatch = content.match(/(\d+(?:\.\d+)?)\s*%/);
                            if (percentMatch) {
                                value = parseFloat(percentMatch[1]);
                            }
                        }
                    }

                    return {
                        exDate: item.NgayGDKHQ,
                        recordDate: item.NgayDKCC || item.NgayGDKHQ,
                        paymentDate: item.NgayThanhToan || '',
                        type,
                        value,
                        description: content,
                        adjustmentRatio: parseFloat(item.TyLeGia) || 1,
                    };
                })
                .filter((d: any) => d.value > 0);

            return NextResponse.json({
                success: true,
                symbol: symbol.toUpperCase(),
                data: dividends,
                total: dividends.length,
            });
        }

        return NextResponse.json({
            success: true,
            symbol: symbol.toUpperCase(),
            data: [],
            total: 0,
        });
    } catch (error: any) {
        console.error('Dividend API Error:', error.message);
        return NextResponse.json(
            { error: 'Failed to fetch dividend data', details: error.message },
            { status: 500 }
        );
    }
}
