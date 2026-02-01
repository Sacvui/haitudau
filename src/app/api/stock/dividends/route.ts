import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Fallback data to ensure demo works
const MOCK_DIVIDENDS: Record<string, any[]> = {
    'FPT': [
        { exDate: '2024-06-12', type: 'cash', value: 1000, description: 'Trả cổ tức đợt 2/2023 bằng tiền, 1,000 đồng/CP' },
        { exDate: '2024-06-12', type: 'stock', value: 15, description: 'Phát hành cổ phiếu để tăng vốn cổ phần từ nguồn vốn chủ sở hữu, tỷ lệ 20:3' },
        { exDate: '2023-07-05', type: 'cash', value: 1000, description: 'Trả cổ tức đợt 1/2023 bằng tiền, 1,000 đồng/CP' },
        { exDate: '2023-06-01', type: 'stock', value: 15, description: 'Trả cổ tức năm 2022 bằng tiền, 1,000 đồng/CP' }, // Note: check data accuracy, simplifying for demo
        { exDate: '2022-06-20', type: 'stock', value: 20, description: 'Trả cổ tức bằng cổ phiếu tỷ lệ 20%' },
        { exDate: '2022-06-20', type: 'cash', value: 1000, description: 'Trả cổ tức bằng tiền tỷ lệ 10%' },
    ],
    'VIB': [
        { exDate: '2024-05-15', type: 'cash', value: 650, description: 'Tạm ứng cổ tức tiền mặt 6.5%' },
        { exDate: '2024-02-20', type: 'cash', value: 600, description: 'Tạm ứng cổ tức năm 2023 bằng tiền tỷ lệ 6%' },
        { exDate: '2023-06-23', type: 'stock', value: 20, description: 'Thưởng cổ phiếu tỷ lệ 20%' },
        { exDate: '2023-02-09', type: 'cash', value: 1000, description: 'Tạm ứng cổ tức tiền mặt 10%' },
    ],
    'HPG': [
        { exDate: '2024-05-23', type: 'stock', value: 10, description: 'Trả cổ tức năm 2023 bằng cổ phiếu tỷ lệ 10%' },
        { exDate: '2022-06-20', type: 'cash', value: 500, description: 'Trả cổ tức bằng tiền tỷ lệ 5%' },
        { exDate: '2022-06-20', type: 'stock', value: 30, description: 'Trả cổ tức bằng cổ phiếu tỷ lệ 30%' },
    ],
    'VNM': [
        { exDate: '2024-04-18', type: 'cash', value: 900, description: 'Cổ tức đợt 3/2023' },
        { exDate: '2023-12-27', type: 'cash', value: 500, description: 'Cổ tức đợt 2/2023' },
        { exDate: '2023-08-03', type: 'cash', value: 1500, description: 'Cổ tức đợt 1/2023' },
    ]
};

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
        console.log(`Fetching dividends for ${symbol}...`);

        // Fetch dividend/adjustment history from CafeF
        const response = await axios.get('https://s.cafef.vn/Ajax/CongTy/DieuChinhGia.ashx', {
            params: { sym: symbol },
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://s.cafef.vn',
            },
            timeout: 8000,
        });

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            const dividends = response.data
                .filter((item: any) => item.NoiDung)
                .map((item: any) => {
                    const content = item.NoiDung || '';
                    let type: 'cash' | 'stock' = 'cash';
                    let value = 0;

                    // Parse dividend type and value from description
                    // Logic cải tiến để bắt được nhiều case hơn
                    const lowerContent = content.toLowerCase();
                    if (lowerContent.includes('tiền') || lowerContent.includes('tm')) {
                        type = 'cash';
                        const match = content.match(/(\d+(?:,\d+)?(?:\.\d+)?)/);
                        if (match) value = parseFloat(match[1].replace(/,/g, ''));
                        // Chuẩn hóa về VNĐ nếu Cafef ghi % (ví dụ 10% = 1000đ)
                        if (value < 100 && content.includes('%')) value = value * 100;
                    }
                    else if (lowerContent.includes('cổ phiếu') || lowerContent.includes('cp') || lowerContent.includes('thưởng')) {
                        type = 'stock';
                        const ratioMatch = content.match(/(\d+):(\d+)/);
                        if (ratioMatch) {
                            value = (parseFloat(ratioMatch[1]) / parseFloat(ratioMatch[2])) * 100;
                        } else {
                            const percentMatch = content.match(/(\d+(?:\.\d+)?)\s*%/);
                            if (percentMatch) value = parseFloat(percentMatch[1]);
                        }
                    }

                    return {
                        exDate: item.NgayGDKHQ,
                        recordDate: item.NgayDKCC || item.NgayGDKHQ,
                        type,
                        value,
                        description: content,
                    };
                })
                .filter((d: any) => d.value > 0);

            if (dividends.length > 0) {
                return NextResponse.json({
                    success: true,
                    symbol,
                    data: dividends,
                    total: dividends.length,
                    source: 'cafef'
                });
            }
        }

        // Fallback if CafeF returns no data
        if (MOCK_DIVIDENDS[symbol]) {
            console.log(`Using mock data for ${symbol}`);
            return NextResponse.json({
                success: true,
                symbol,
                data: MOCK_DIVIDENDS[symbol],
                total: MOCK_DIVIDENDS[symbol].length,
                source: 'mock'
            });
        }

        return NextResponse.json({
            success: true,
            symbol,
            data: [],
            total: 0,
        });

    } catch (error: any) {
        console.error('Dividend API Error:', error.message);

        // Error Fallback
        if (MOCK_DIVIDENDS[symbol]) {
            return NextResponse.json({
                success: true,
                symbol,
                data: MOCK_DIVIDENDS[symbol],
                total: MOCK_DIVIDENDS[symbol].length,
                source: 'mock-error-fallback'
            });
        }

        return NextResponse.json(
            { error: 'Failed to fetch dividend data', details: error.message },
            { status: 500 }
        );
    }
}
