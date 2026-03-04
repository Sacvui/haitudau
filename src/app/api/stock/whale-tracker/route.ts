import { NextResponse } from 'next/server';
import { fetchForeignTrades, fetchStockHistory } from '@/lib/stock-api';
import { getWithCache } from '@/lib/cache';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();
    const verdict = searchParams.get('verdict')?.toUpperCase(); // CHEAP, FAIR, EXPENSIVE

    // BYOK: User's own Gemini key takes priority over server env
    const userGeminiKey = request.headers.get('x-gemini-key');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        const hasUserKey = !!userGeminiKey;
        const cacheKey = `whale_tracker_v2_${symbol}_${verdict || 'NONE'}${hasUserKey ? '_user' : ''}`;
        const trackerData = await getWithCache(cacheKey, async () => {
            const trades = await fetchForeignTrades(symbol);

            if (!trades || trades.length === 0) {
                throw new Error(`No data found for ${symbol}`);
            }

            // Fetch price history for context
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const priceHistory = await fetchStockHistory({
                symbol,
                startDate: thirtyDaysAgo.toLocaleDateString('vi-VN'),
                endDate: now.toLocaleDateString('vi-VN')
            });

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
            let action = 'Cổ phiếu chưa thu hút được dòng tiền lớn. Khuyến nghị quan sát thêm.';

            // Flow Classification
            if (recentNetValue > 0 && netValueTotal > 0) {
                status = 'ACCUMULATING';
                sentiment = 'DỒN DẬP GOM HÀNG';
                color = 'text-emerald-400';
            } else if (recentNetValue < 0 && netValueTotal < 0) {
                status = 'DISTRIBUTING';
                sentiment = 'DẤU HIỆU XẢ HÀNG';
                color = 'text-rose-400';
            } else if (recentNetValue > 0) {
                status = 'HUNTING';
                sentiment = 'BẮT ĐẦU QUAN TÂM';
                color = 'text-indigo-400';
            } else if (recentNetValue < 0) {
                status = 'EXITING';
                sentiment = 'RỤC RỊCH THOÁT HÀNG';
                color = 'text-orange-400';
            }

            // AI Insight Generation
            let aiInsight = '';
            const apiKey = userGeminiKey || process.env.GEMINI_API_KEY;
            if (apiKey) {
                try {
                    const recentPrices = priceHistory.slice(0, 10).map(h => `${h.date}: ${h.close.toLocaleString()}đ (Vol: ${(h.volume / 1000).toFixed(0)}K)`).join('\n');
                    const recentWhales = trades.slice(0, 10).map(t => `${t.date}: Net ${(t.netValue / 1000000).toFixed(1)}M`).join('\n');

                    const prompt = `Bạn là chuyên gia phân tích dòng tiền Cá mập. Phân tích mã ${symbol}:
Định giá hiện tại: ${verdict || 'Chưa xác định'}
Diễn biến giá/vol 10 ngày:
${recentPrices}
Dòng tiền ngoại 10 ngày:
${recentWhales}

Yêu cầu: Viết 1 nhận định CHIẾN LƯỢC cực ngắn (tối đa 2 câu, khoảng 40 từ). Tập trung vào sự tương quan giữa Giá và Dòng tiền (ví dụ: đè gom, kéo xả, hay cạn cung). Trả lời trực tiếp bằng tiếng Việt, không chào hỏi.`;

                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                    const result = await model.generateContent(prompt);
                    aiInsight = result.response.text().trim();
                } catch (aiErr) {
                    console.error('AI Insight Error:', aiErr);
                    aiInsight = 'Hệ thống AI đang bận phân tích tương quan. Vui lòng quay lại sau.';
                }
            }

            // Comprehensive Recommendation Matrix
            if (isVIB) {
                action = '🔎 CHIẾN LƯỢC VIB: Cá mập đang bảo vệ chặt chẽ vùng 16.5-17.0. Định giá thực tế còn rất rẻ so với triển vọng Game thoái vốn CBA & IPO Kafi. KHUYẾN NGHỊ: Tiếp tục tích lũy mạnh cho mục tiêu 2x.';
            } else {
                switch (status) {
                    case 'ACCUMULATING':
                        if (verdict === 'CHEAP') action = '💎 CƠ HỘI VÀNG: Định giá RẺ kết hợp Cá mập GOM HÀNG mạnh. Khuyến nghị GIẢI NGÂN MẠNH TAY hoặc full vị thế.';
                        else if (verdict === 'EXPENSIVE') action = '⚠️ CẢNH BÁO KÉO XẢ: Cá mập gom nhưng giá đã quá ĐẮT. Rất dễ là bẫy thanh khoản. Tuyệt đối KHÔNG mua đuổi vùng này.';
                        else action = '✅ MUA TÍCH LŨY: Dòng tiền ủng hộ, định giá hợp lý. Phù hợp gia tăng số lượng cổ phiếu cho mục tiêu trung hạn.';
                        break;
                    case 'DISTRIBUTING':
                        if (verdict === 'CHEAP') action = '🚩 TẠM DỪNG: Dù định giá rẻ nhưng áp lực bán của Cá mập rất lớn. Chưa nên bắt đáy ngay, chờ cổ phiếu ngừng rơi và tạo nền.';
                        else if (verdict === 'EXPENSIVE') action = '🚫 THOÁT VỊ THẾ: Double rủi ro: Định giá ĐẮT + Cá mập XẢ HÀNG. Nên bán quyết liệt để bảo toàn vốn và chờ chiết khấu sâu.';
                        else action = '📉 GIẢM TỶ TRỌNG: Áp lực thoát hàng rõ rệt. Nên chốt lời hoặc hạ margin để đưa tài khoản về trạng thái an toàn.';
                        break;
                    case 'HUNTING':
                        if (verdict === 'CHEAP' || verdict === 'FAIR') action = '🎯 MUA THĂM DÒ: Dòng tiền bắt đầu chú ý đến mã có cơ bản tốt. Có thể giải ngân trước 10-20% lấy vị thế.';
                        else action = '🚫 BỎ QUA: Định giá không còn hấp dẫn để mạo hiểm với dòng tiền mới nhen nhóm.';
                        break;
                    case 'EXITING':
                        action = '⚠️ THẬN TRỌNG: Dòng tiền lớn có dấu hiệu rút ra ngắn hạn. Tạm ngưng mua mới và quan sát kỹ vùng hỗ trợ gần nhất.';
                        break;
                    default: // NEUTRAL
                        if (verdict === 'CHEAP') action = '📦 TÍCH TRỮ DÀI HẠN: Cổ phiếu định giá RẺ nhưng đang bị lãng quên. Phù hợp cho nhà đầu tư kiên nhẫn gom dần.';
                        else if (verdict === 'EXPENSIVE') action = '⚠️ RỦI RO GIẢM GIÁ: Định giá ĐẮT nhưng thiếu dòng tiền đỡ giá. Khả năng cao sẽ có nhịp điều chỉnh kỹ thuật.';
                        else action = '⚖️ THEO DÕI: Cổ phiếu đang đi ngang tích lũy. Nắm giữ trạng thái hiện tại, chưa cần hành động gấp.';
                }
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
                aiInsight,
                isLive: true,
                history: trades.slice(0, 10)
            };
        }, 15 * 60 * 1000); // 15 minutes cache for AI enhanced results

        return NextResponse.json(trackerData);
    } catch (error: any) {
        console.error('Whale Tracker API Error:', error.message);

        // Fallback data for VIB or others if API fails
        const isVIB = symbol.toUpperCase() === 'VIB';
        const fallbackNet = isVIB ? 45000000000 : 5000000000;

        let fallbackAction = isVIB
            ? 'Cá mập đang bảo vệ vùng giá 16.5-17.0. Có game thoái vốn CBA và IPO Kafi, rất thích hợp gia tăng tỷ trọng.'
            : 'Vận động dòng tiền ổn định. Tuy nhiên cần đối chiếu thêm với tab Định giá để ra quyết định an toàn nhất.';

        if (verdict === 'EXPENSIVE') {
            fallbackAction = `Thận trọng. Mặc dù dòng tiền ổn định nhưng ${symbol} đang ở vùng định giá đắt. Ưu tiên quan sát nhịp chỉnh.`;
        }

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
            color: isVIB ? 'text-emerald-400' : 'text-slate-400',
            action: fallbackAction,
            aiInsight: 'Kết nối máy chủ AI thất bại. Đang hiển thị dữ liệu kỹ thuật thuần bản.',
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
