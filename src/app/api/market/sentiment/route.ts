import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// VN30 Symbols as of 2024
const VN30_SYMBOLS = [
    'ACB', 'BCM', 'BID', 'BVH', 'CTG', 'FPT', 'GAS', 'GVR', 'HDB', 'HPG',
    'MBB', 'MSN', 'MWG', 'PLX', 'POW', 'SAB', 'SHB', 'SSB', 'SSI', 'STB',
    'TCB', 'TPB', 'VCB', 'VHM', 'VIB', 'VIC', 'VJC', 'VNM', 'VPB', 'VRE'
];

export async function GET(request: NextRequest) {
    try {
        const toTs = Math.floor(Date.now() / 1000);
        const fromTs = toTs - 180 * 24 * 60 * 60; // 6 months of data

        // 1. Fetch VN30 Index History (Symbol: VN30) from VNDirect
        const indexRes = await axios.get('https://dchart-api.vndirect.com.vn/dchart/history', {
            params: { resolution: 'D', symbol: 'VN30', from: fromTs, to: toTs },
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000
        });

        const history = indexRes.data;
        if (history.s !== 'ok' || !history.c) {
            throw new Error('Failed to fetch VN30 history');
        }

        const closes = history.c;
        const volumes = history.v;
        const latestPrice = closes[closes.length - 1];

        // --- Factors ---

        // A. RSI (14)
        const rsi = calculateRSI(closes);
        const rsiScore = rsi > 70 ? 100 : rsi < 30 ? 0 : (rsi - 30) * 2.5;

        // B. Momentum (Price vs MA125)
        const ma125 = calculateMA(closes, 125);
        const momentumRatio = (latestPrice / ma125) - 1;
        // Normalize: +10% above MA125 is extreme greed (100), -10% is extreme fear (0)
        const momentumScore = Math.min(100, Math.max(0, (momentumRatio + 0.1) * 500));

        // C. Volume Trend (Current Vol vs 20-day Avg)
        const currentVol = volumes[volumes.length - 1];
        const avgVol20 = calculateMA(volumes, 20);
        const volRatio = currentVol / avgVol20;
        // High volume in uptrend = greed, high volume in downtrend = fear. 
        // Simple proxy: if price > ma20, high vol is greed.
        const ma20 = calculateMA(closes, 20);
        const isUptrend = latestPrice > ma20;
        const volScore = isUptrend
            ? Math.min(100, (volRatio / 2) * 100)
            : 100 - Math.min(100, (volRatio / 2) * 100);

        // --- Weighted Final Score ---
        // RSI (40%), Momentum (40%), Volume (20%)
        // (Skipping breadth for now to keep it fast/reliable with single request)
        const finalScore = Math.round(rsiScore * 0.4 + momentumScore * 0.4 + volScore * 0.2);

        let label = 'Trung Tính';
        let color = '#94a3b8'; // slate-400

        if (finalScore <= 25) {
            label = 'Sợ Hãi Tột Độ';
            color = '#ef4444'; // red-500
        } else if (finalScore <= 45) {
            label = 'Sợ Hãi';
            color = '#f97316'; // orange-500
        } else if (finalScore <= 55) {
            label = 'Trung Tính';
            color = '#94a3b8';
        } else if (finalScore <= 75) {
            label = 'Tham Lam';
            color = '#22c55e'; // green-500
        } else {
            label = 'Tham Lam Tột Độ';
            color = '#10b981'; // emerald-500
        }

        return NextResponse.json({
            success: true,
            score: finalScore,
            label,
            color,
            breakdown: {
                rsi: Math.round(rsi),
                momentum: (momentumRatio * 100).toFixed(1) + '%',
                volRatio: volRatio.toFixed(2),
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('Sentiment API Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// --- Helpers ---

function calculateMA(data: number[], period: number): number {
    const subset = data.slice(-period);
    if (subset.length === 0) return 0;
    return subset.reduce((a, b) => a + b, 0) / subset.length;
}

function calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length <= period) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}
