import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { runSimpleValuation, VN30_BASE_RATIOS } from '@/lib/valuation-engine';

/**
 * Smart Entry Signal API
 * Combines 3 signals to produce a composite "Entry Readiness" score (1-10):
 *  1. Volume Spike — Is volume surging compared to 20-day average?
 *  2. Support Zone — Is price near a recent support level (20-day low or SMA)?
 *  3. Intrinsic Margin — Is price below estimated fair value?
 *
 * Also returns a breakdown of each signal for the UI.
 */

interface OHLCVBar {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// Fetch 60-day daily OHLCV from SSI iBoard (fastest, most reliable)
async function fetchHistory(symbol: string): Promise<OHLCVBar[]> {
    const endTs = Math.floor(Date.now() / 1000);
    const startTs = endTs - 90 * 24 * 60 * 60; // 90 days back to ensure 60 trading days

    const sources = [
        async () => {
            const res = await axios.get('https://iboard.ssi.com.vn/dchart/api/history', {
                params: { resolution: 'D', symbol, from: startTs, to: endTs },
                headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://iboard.ssi.com.vn/' },
                timeout: 6000
            });
            const d = res.data;
            if (d.s === 'ok' && d.t?.length > 0) {
                return d.t.map((t: number, i: number) => ({
                    date: new Date(t * 1000).toISOString().split('T')[0],
                    open: d.o[i] * 1000, high: d.h[i] * 1000,
                    low: d.l[i] * 1000, close: d.c[i] * 1000,
                    volume: d.v[i]
                }));
            }
            throw new Error('SSI no data');
        },
        async () => {
            const res = await axios.get(`https://dchart-api.vndirect.com.vn/dchart/history`, {
                params: { resolution: 'D', symbol, from: startTs, to: endTs },
                timeout: 6000
            });
            const d = res.data;
            if (d.s === 'ok' && d.c?.length > 0) {
                return d.t.map((t: number, i: number) => ({
                    date: new Date(t * 1000).toISOString().split('T')[0],
                    open: d.o[i] * 1000, high: d.h[i] * 1000,
                    low: d.l[i] * 1000, close: d.c[i] * 1000,
                    volume: d.v[i]
                }));
            }
            throw new Error('VNDirect no data');
        }
    ];

    for (const src of sources) {
        try {
            const data = await src();
            if (data && data.length > 0) return data;
        } catch { /* try next */ }
    }
    return [];
}

// Fetch intrinsic value from our own fundamentals + valuation engine
async function fetchIntrinsicValue(symbol: string, baseUrl: string): Promise<{ intrinsicValue: number; currentPrice: number } | null> {
    try {
        const res = await fetch(`${baseUrl}/api/stock/fundamentals?symbol=${symbol}`, {
            headers: { 'User-Agent': 'internal' },
            signal: AbortSignal.timeout(8000)
        });
        const json = await res.json();
        
        if (json.success && json.data) {
            const d = json.data;
            // Use the averageIntrinsic already calculated by the engine in the fundamentals API
            // This ensures 100% consistency.
            return { 
                intrinsicValue: d.intrinsicValue || d.currentPrice, // The fundamentals API now includes this in its response
                currentPrice: d.currentPrice 
            };
        }

        // Fallback: If fundamentals API is slow/fails, use the simple engine locally with baseline ratios
        const base = VN30_BASE_RATIOS[symbol] || { pe: 12, pb: 1.5, roe: 15 };
        const mockPrice = 20000; // default if everything fails
        const valuation = runSimpleValuation(
            symbol,
            mockPrice,
            mockPrice / base.pe,
            base.roe,
            mockPrice / base.pb,
            base.pe
        );
        return { intrinsicValue: valuation.averageIntrinsic, currentPrice: mockPrice };

    } catch { /* silent */ }
    return null;
}

// ===================== SIGNAL CALCULATIONS =====================

function calcVolumeSignal(bars: OHLCVBar[]): { score: number; ratio: number; label: string; description: string } {
    if (bars.length < 5) return { score: 1, ratio: 1, label: 'Không đủ dữ liệu', description: 'Cần ít nhất 5 phiên' };

    const latest = bars[bars.length - 1];
    const prev20 = bars.slice(Math.max(0, bars.length - 21), bars.length - 1);
    const avgVol20 = prev20.reduce((s, b) => s + b.volume, 0) / prev20.length;
    const ratio = avgVol20 > 0 ? latest.volume / avgVol20 : 1;

    // Also check 3-day volume trend (accumulation pattern)
    const last3 = bars.slice(-3);
    const vol3Avg = last3.reduce((s, b) => s + b.volume, 0) / 3;
    const vol3Ratio = avgVol20 > 0 ? vol3Avg / avgVol20 : 1;

    let score: number;
    let label: string;
    let description: string;

    if (ratio >= 3.0) {
        score = 10; label = 'Đột biến cực mạnh';
        description = `KL phiên hiện tại gấp ${ratio.toFixed(1)}x trung bình 20 phiên. Có dấu hiệu Smart Money vào lệnh mạnh.`;
    } else if (ratio >= 2.0) {
        score = 8; label = 'Đột biến mạnh';
        description = `KL gấp ${ratio.toFixed(1)}x TB20. Dòng tiền đang tập trung đổ vào mã này.`;
    } else if (ratio >= 1.5 || vol3Ratio >= 1.5) {
        score = 6; label = 'Khối lượng tăng rõ';
        description = `KL gấp ${ratio.toFixed(1)}x TB20. KL 3 phiên gấp ${vol3Ratio.toFixed(1)}x — tín hiệu tích lũy.`;
    } else if (ratio >= 1.0) {
        score = 4; label = 'Bình thường';
        description = `KL ngang bằng trung bình. Chưa có tín hiệu đột biến rõ.`;
    } else {
        score = 2; label = 'Thanh khoản yếu';
        description = `KL chỉ bằng ${(ratio * 100).toFixed(0)}% trung bình. Dòng tiền chưa quan tâm.`;
    }

    return { score, ratio: parseFloat(ratio.toFixed(2)), label, description };
}

function calcSupportSignal(bars: OHLCVBar[]): { score: number; supportLevel: number; distancePercent: number; label: string; description: string } {
    if (bars.length < 10) return { score: 1, supportLevel: 0, distancePercent: 0, label: 'Không đủ dữ liệu', description: 'Cần ít nhất 10 phiên' };

    const latest = bars[bars.length - 1];
    const currentPrice = latest.close;

    // Calculate support levels
    const last20 = bars.slice(-20);
    const last60 = bars.slice(-60);

    // Support 1: 20-day Low
    const low20 = Math.min(...last20.map(b => b.low));
    // Support 2: SMA20
    const sma20 = last20.reduce((s, b) => s + b.close, 0) / last20.length;
    // Support 3: 60-day Low
    const low60 = Math.min(...last60.map(b => b.low));

    // Pick the nearest support below current price
    const supports = [
        { level: sma20, name: 'SMA20' },
        { level: low20, name: 'Đáy 20 phiên' },
        { level: low60, name: 'Đáy 60 phiên' },
    ].filter(s => s.level <= currentPrice * 1.05) // Within 5% above current
        .sort((a, b) => b.level - a.level); // Closest first

    const nearestSupport = supports[0] || { level: low20, name: 'Đáy 20 phiên' };
    const distancePercent = ((currentPrice - nearestSupport.level) / nearestSupport.level) * 100;

    let score: number;
    let label: string;
    let description: string;

    if (distancePercent <= 2) {
        score = 10; label = 'Sát vùng hỗ trợ';
        description = `Giá chỉ cách ${nearestSupport.name} (${Math.round(nearestSupport.level).toLocaleString()}đ) ${distancePercent.toFixed(1)}%. Vùng vào lệnh lý tưởng.`;
    } else if (distancePercent <= 5) {
        score = 8; label = 'Gần hỗ trợ';
        description = `Giá cách ${nearestSupport.name} ${distancePercent.toFixed(1)}%. Đang tiệm cận vùng cầu mạnh.`;
    } else if (distancePercent <= 10) {
        score = 6; label = 'Vùng hỗ trợ gần';
        description = `Giá cách ${nearestSupport.name} ${distancePercent.toFixed(1)}%. Có biên an toàn hợp lý nếu vào lệnh.`;
    } else if (distancePercent <= 20) {
        score = 4; label = 'Xa hỗ trợ';
        description = `Giá cách hỗ trợ ${distancePercent.toFixed(1)}%. Rủi ro cắt lỗ lớn nếu vào lệnh ở vùng giá hiện tại.`;
    } else {
        score = 2; label = 'Quá xa hỗ trợ';
        description = `Giá cách hỗ trợ ${distancePercent.toFixed(1)}%. Nên chờ giá điều chỉnh trước khi vào lệnh.`;
    }

    return {
        score,
        supportLevel: Math.round(nearestSupport.level),
        distancePercent: parseFloat(distancePercent.toFixed(1)),
        label,
        description
    };
}

function calcMarginSignal(intrinsicValue: number, currentPrice: number): { score: number; marginPercent: number; label: string; description: string } {
    if (intrinsicValue <= 0 || currentPrice <= 0) {
        return { score: 5, marginPercent: 0, label: 'Chưa định giá', description: 'Không đủ dữ liệu để tính biên an toàn.' };
    }

    const marginPercent = ((intrinsicValue - currentPrice) / currentPrice) * 100;

    let score: number;
    let label: string;
    let description: string;

    if (marginPercent >= 30) {
        score = 10; label = 'Rẻ cực kỳ';
        description = `Giá hiện tại thấp hơn giá trị nội tại ${marginPercent.toFixed(1)}%. Cơ hội hiếm có.`;
    } else if (marginPercent >= 15) {
        score = 8; label = 'Chiết khấu tốt';
        description = `Biên an toàn +${marginPercent.toFixed(1)}%. Giá hấp dẫn để tích lũy dài hạn.`;
    } else if (marginPercent >= 5) {
        score = 6; label = 'Hợp lý thiên rẻ';
        description = `Margin +${marginPercent.toFixed(1)}%. Vùng giá chấp nhận được để vào lệnh.`;
    } else if (marginPercent >= -5) {
        score = 5; label = 'Hợp lý';
        description = `Giá quanh vùng giá trị hợp lý (margin ${marginPercent.toFixed(1)}%).`;
    } else if (marginPercent >= -15) {
        score = 3; label = 'Thiên đắt';
        description = `Giá cao hơn giá trị nội tại ${Math.abs(marginPercent).toFixed(1)}%. Cân nhắc chờ điều chỉnh.`;
    } else {
        score = 1; label = 'Đắt';
        description = `Giá vượt giá trị nội tại ${Math.abs(marginPercent).toFixed(1)}%. Không phải thời điểm vào lệnh.`;
    }

    return { score, marginPercent: parseFloat(marginPercent.toFixed(1)), label, description };
}

// ===================== API HANDLER =====================

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();

    if (!symbol) {
        return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
    }

    try {
        // Fetch history and fundamentals in parallel
        const baseUrl = request.nextUrl.origin;
        const [bars, valuationData] = await Promise.all([
            fetchHistory(symbol),
            fetchIntrinsicValue(symbol, baseUrl)
        ]);

        if (!bars || bars.length < 5) {
            return NextResponse.json({
                success: false,
                error: `Không đủ dữ liệu lịch sử cho ${symbol}`
            }, { status: 404 });
        }

        // Calculate all 3 signals
        const volumeSignal = calcVolumeSignal(bars);
        const supportSignal = calcSupportSignal(bars);
        const marginSignal = calcMarginSignal(
            valuationData?.intrinsicValue || 0,
            valuationData?.currentPrice || bars[bars.length - 1].close
        );

        // Composite Score (weighted average)
        // Volume Spike 35% + Support Zone 35% + Intrinsic Margin 30%
        const compositeRaw = volumeSignal.score * 0.35 + supportSignal.score * 0.35 + marginSignal.score * 0.30;
        const compositeScore = Math.round(Math.min(10, Math.max(1, compositeRaw)));

        // Generate verdict
        let verdict: string;
        let verdictColor: string;
        let verdictEmoji: string;
        if (compositeScore >= 8) {
            verdict = 'VÀO LỆNH'; verdictColor = 'emerald'; verdictEmoji = '🟢';
        } else if (compositeScore >= 6) {
            verdict = 'SẴN SÀNG'; verdictColor = 'sky'; verdictEmoji = '🔵';
        } else if (compositeScore >= 4) {
            verdict = 'CHỜ ĐỢI'; verdictColor = 'amber'; verdictEmoji = '🟡';
        } else {
            verdict = 'TRÁNH'; verdictColor = 'red'; verdictEmoji = '🔴';
        }

        // Recent price info for UI context
        const latestBar = bars[bars.length - 1];
        const prevBar = bars[bars.length - 2];
        const priceChange = latestBar.close - prevBar.close;
        const priceChangePercent = (priceChange / prevBar.close) * 100;

        return NextResponse.json({
            success: true,
            symbol,
            currentPrice: latestBar.close,
            priceChange: Math.round(priceChange),
            priceChangePercent: parseFloat(priceChangePercent.toFixed(2)),
            latestDate: latestBar.date,

            compositeScore,
            verdict,
            verdictColor,
            verdictEmoji,

            signals: {
                volume: {
                    weight: '35%',
                    ...volumeSignal
                },
                support: {
                    weight: '35%',
                    ...supportSignal
                },
                margin: {
                    weight: '30%',
                    ...marginSignal
                }
            },

            // Extra context for advanced users
            context: {
                sma20: Math.round(bars.slice(-20).reduce((s, b) => s + b.close, 0) / Math.min(20, bars.length)),
                low20: Math.round(Math.min(...bars.slice(-20).map(b => b.low))),
                high20: Math.round(Math.max(...bars.slice(-20).map(b => b.high))),
                avgVolume20: Math.round(bars.slice(-20).reduce((s, b) => s + b.volume, 0) / Math.min(20, bars.length)),
                intrinsicValue: valuationData?.intrinsicValue ? Math.round(valuationData.intrinsicValue) : null
            }
        });

    } catch (err: any) {
        console.error('[EntrySignal Error]', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
