import { NextResponse } from 'next/server';
import { fetchForeignTrades } from '@/lib/stock-api';
import { getWithCache } from '@/lib/cache';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        const cacheKey = `whale_tracker_${symbol}`;
        const trackerData = await getWithCache(cacheKey, async () => {
            const trades = await fetchForeignTrades(symbol);

            if (!trades || trades.length === 0) {
                throw new Error(`No data found for ${symbol}`);
            }

            // Calculate summary metrics
            const netValueTotal = trades.reduce((acc, t) => acc + t.netValue, 0);
            const buyValueTotal = trades.reduce((acc, t) => acc + t.buyValue, 0);
            const sellValueTotal = trades.reduce((acc, t) => acc + t.sellValue, 0);

            // Calculate recent momentum (last 5 days vs 30 days)
            const recentTrades = trades.slice(0, 5);
            const recentNetValue = recentTrades.reduce((acc, t) => acc + t.netValue, 0);

            let status = 'NEUTRAL';
            let sentiment = 'TRUNG TÍNH';
            let color = 'text-slate-400';
            const isVIB = symbol === 'VIB';
            const isFPT = symbol === 'FPT';
            let action = 'Cổ phiếu chưa thu hút được dòng tiền lớn. Khuyến nghị quan sát thêm.';

            if (recentNetValue > 0 && netValueTotal > 0) {
                status = 'ACCUMULATING';
                sentiment = 'DỒN DẬP GOM HÀNG';
                color = 'text-emerald-400';

                if (isVIB) {
                    action = 'Cá mập đang bảo vệ vùng giá 16.5-17.0. Rất thích hợp để gia tăng tỷ trọng cho mục tiêu dài hạn 2x.';
                } else if (isFPT) {
                    action = 'Về kỹ thuật: Cá mập đang gom hàng mạnh. Tuy nhiên về định giá: FPT đang ở vùng giá cao (Overvalued). KHÔNG nên mua đuổi, chỉ nên canh giải ngân khi có nhịp điều chỉnh về vùng 8x-9x.';
                } else {
                    action = 'Dòng tiền cá mập đang vào mạnh. Tuy nhiên hãy kiểm tra tab "Định giá" để đảm bảo biên an toàn > 15% trước khi giải ngân.';
                }
            } else if (recentNetValue < 0 && netValueTotal < 0) {
                status = 'DISTRIBUTING';
                sentiment = 'DẤU HIỆU XẢ HÀNG';
                color = 'text-rose-400';
                action = 'Cá mập đang thoát hàng. Hạn chế mua mới, nên hạ bớt tỷ trọng nếu đang sử dụng margin cao.';
            } else if (recentNetValue > 0) {
                status = 'HUNTING';
                sentiment = 'BẮT ĐẦU QUAN TÂM';
                color = 'text-indigo-400';
                action = 'Dòng tiền có dấu hiệu quay lại. Có thể mở vị thế thăm dò 10-20% tài khoản nếu định giá còn rẻ.';
            }

            return {
                success: true,
                symbol: symbol,
                metrics: {
                    netValueTotal,
                    buyValueTotal,
                    sellValueTotal,
                    recentNetValue,
                    avgDailyNetValue: netValueTotal / trades.length
                },
                status,
                sentiment,
                color,
                action,
                isLive: true,
                history: trades.slice(0, 10)
            };
        }, 5 * 60 * 1000); // 5 minutes cache

        return NextResponse.json(trackerData);
    } catch (error: any) {
        console.error('Whale Tracker API Error:', error.message);

        // Fallback data for VIB or others if API fails
        const isVIB = symbol.toUpperCase() === 'VIB';
        const fallbackNet = isVIB ? 45000000000 : 5000000000;

        const fallbackAction = isVIB
            ? 'Cá mập đang bảo vệ vùng giá 16.5-17.0. Có game thoái vốn CBA và IPO Kafi, rất thích hợp gia tăng tỷ trọng.'
            : 'Mã này duy trì vận động ổn định, xu hướng dòng tiền tích cực. Có thể tiếp tục nắm giữ.';

        return NextResponse.json({
            success: true,
            symbol: symbol.toUpperCase(),
            metrics: {
                netValueTotal: fallbackNet,
                buyValueTotal: Math.abs(fallbackNet) * 2,
                sellValueTotal: Math.abs(fallbackNet),
                recentNetValue: fallbackNet / 6,
                avgDailyNetValue: fallbackNet / 30
            },
            status: 'ACCUMULATING',
            sentiment: isVIB ? 'DỒN DẬP GOM HÀNG (SIM)' : 'ĐANG THEO DÕI (SIM)',
            color: 'text-emerald-400',
            action: fallbackAction,
            isLive: false,
            message: 'Đang hiển thị dữ liệu mô phỏng do lỗi kết nối máy chủ dữ liệu.',
            history: Array.from({ length: 10 }).map((_, i) => ({
                date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                buyValue: 10000000000 + Math.random() * 5000000000,
                netValue: 2000000000 + Math.random() * 3000000000
            }))
        });
    }
}
