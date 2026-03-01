import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/*
 * ===================================
 * DAILY REPORT — "KHUYẾN NGHỊ SÁNG"
 * ===================================
 * Called by Vercel Cron at 0:00 UTC (7:00 AM VN)
 * 1. Fetch VN30 closing data from yesterday
 * 2. Score & pick 2 most notable stocks
 * 3. Call Google Gemini to write analysis
 * 4. Store the report in Supabase
 */

const VN30 = [
    'ACB', 'BCM', 'BID', 'BVH', 'CTG', 'FPT', 'GAS', 'GVR', 'HDB', 'HPG',
    'MBB', 'MSN', 'MWG', 'PLX', 'POW', 'SAB', 'SHB', 'SSB', 'SSI', 'STB',
    'TCB', 'TPB', 'VCB', 'VHM', 'VIB', 'VIC', 'VJC', 'VNM', 'VPB', 'VRE'
];

interface StockSnapshot {
    symbol: string;
    price: number;
    change: number;
    changePct: number;
    volume: number;
    avgVolume20: number;
    rsi14: number;
    ma20: number;
    score: number;
    signal: 'BUY' | 'SELL' | 'HOLD';
}

// ── Calculate RSI-14 ──
function computeRSI(closes: number[], period = 14): number {
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
}

// ── Fetch 30 days of data for a single stock ──
async function fetchHistory(symbol: string): Promise<{ closes: number[]; volumes: number[] } | null> {
    try {
        const endTs = Math.floor(Date.now() / 1000);
        const startTs = endTs - 40 * 24 * 60 * 60; // 40 days back
        const res = await axios.get('https://iboard.ssi.com.vn/dchart/api/history', {
            params: { resolution: 'D', symbol, from: startTs, to: endTs },
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://iboard.ssi.com.vn/' },
            timeout: 6000
        });
        const d = res.data;
        if (d.s === 'ok' && d.c && d.c.length >= 15) {
            return {
                closes: d.c.map((v: number) => v * 1000),
                volumes: d.v
            };
        }
    } catch { }
    return null;
}

// ── Score & rank all VN30 ──
async function rankVN30(): Promise<StockSnapshot[]> {
    const results: StockSnapshot[] = [];

    // Fetch all in parallel (batches of 10 to avoid rate-limiting)
    for (let batch = 0; batch < VN30.length; batch += 10) {
        const slice = VN30.slice(batch, batch + 10);
        const batchResults = await Promise.allSettled(
            slice.map(async (symbol) => {
                const hist = await fetchHistory(symbol);
                if (!hist || hist.closes.length < 21) return null;

                const closes = hist.closes;
                const volumes = hist.volumes;
                const latestPrice = closes[closes.length - 1];
                const prevPrice = closes[closes.length - 2];
                const change = latestPrice - prevPrice;
                const changePct = (change / prevPrice) * 100;

                // MA-20
                const ma20Slice = closes.slice(-20);
                const ma20 = ma20Slice.reduce((a, b) => a + b, 0) / 20;

                // Average Volume 20 days
                const vol20Slice = volumes.slice(-20);
                const avgVol20 = vol20Slice.reduce((a, b) => a + b, 0) / 20;
                const latestVol = volumes[volumes.length - 1];
                const volumeSpike = avgVol20 > 0 ? latestVol / avgVol20 : 1;

                // RSI-14
                const rsi = computeRSI(closes);

                // Signal
                let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
                if (rsi < 35 && latestPrice < ma20) signal = 'BUY'; // oversold + below MA
                else if (rsi > 70 && latestPrice > ma20 * 1.05) signal = 'SELL'; // overbought
                else if (latestPrice > ma20 && changePct > 0 && volumeSpike > 1.3) signal = 'BUY';
                else if (latestPrice < ma20 && changePct < -1) signal = 'SELL';

                // Scoring (higher = more notable)
                const score =
                    Math.abs(changePct) * 2 +
                    (volumeSpike > 1.5 ? volumeSpike * 1.5 : 0) +
                    (rsi < 30 || rsi > 70 ? 3 : 0) +
                    (Math.abs(latestPrice - ma20) / ma20 * 50);

                return {
                    symbol,
                    price: latestPrice,
                    change,
                    changePct: parseFloat(changePct.toFixed(2)),
                    volume: latestVol,
                    avgVolume20: Math.round(avgVol20),
                    rsi14: parseFloat(rsi.toFixed(1)),
                    ma20: Math.round(ma20),
                    score: parseFloat(score.toFixed(2)),
                    signal
                } as StockSnapshot;
            })
        );
        for (const r of batchResults) {
            if (r.status === 'fulfilled' && r.value) results.push(r.value);
        }
    }

    return results.sort((a, b) => b.score - a.score);
}

// ── Call Gemini API ──
async function generateAnalysis(
    stock1: StockSnapshot,
    stock2: StockSnapshot,
    allStocks: StockSnapshot[]
): Promise<{ market_summary: string; analysis_1: string; analysis_2: string }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const top5Summary = allStocks.slice(0, 5).map(s =>
        `${s.symbol}: ${s.changePct > 0 ? '+' : ''}${s.changePct}%, RSI=${s.rsi14}, Vol=${(s.volume / 1000000).toFixed(1)}M`
    ).join('\n');

    const prompt = `Bạn là "Hải" — chuyên gia phân tích cổ phiếu Việt Nam. Hôm nay là ${today}.

### DỮ LIỆU THỊ TRƯỜNG:
Top 5 biến động VN30:
${top5Summary}

### PHÂN TÍCH CỔ PHIẾU 1: ${stock1.symbol}
- Giá: ${stock1.price.toLocaleString()}đ (${stock1.changePct > 0 ? '+' : ''}${stock1.changePct}%)
- RSI-14: ${stock1.rsi14}
- MA-20: ${stock1.ma20.toLocaleString()}đ (${stock1.price > stock1.ma20 ? 'TRÊN' : 'DƯỚI'} MA20)
- Volume: ${(stock1.volume / 1000000).toFixed(1)}M (TB 20 ngày: ${(stock1.avgVolume20 / 1000000).toFixed(1)}M)
- Tín hiệu kỹ thuật: ${stock1.signal}

### PHÂN TÍCH CỔ PHIẾU 2: ${stock2.symbol}
- Giá: ${stock2.price.toLocaleString()}đ (${stock2.changePct > 0 ? '+' : ''}${stock2.changePct}%)
- RSI-14: ${stock2.rsi14}
- MA-20: ${stock2.ma20.toLocaleString()}đ (${stock2.price > stock2.ma20 ? 'TRÊN' : 'DƯỚI'} MA20)
- Volume: ${(stock2.volume / 1000000).toFixed(1)}M (TB 20 ngày: ${(stock2.avgVolume20 / 1000000).toFixed(1)}M)
- Tín hiệu kỹ thuật: ${stock2.signal}

### YÊU CẦU:
Viết báo cáo "Khuyến Nghị Sáng" cho nhà đầu tư cá nhân bằng tiếng Việt, gồm 3 phần:

1. **market_summary** (100-150 từ): Tóm tắt thị trường VN30 đêm qua. Đề cập diễn biến giá, thanh khoản chung, các chỉ số quốc tế ảnh hưởng.

2. **analysis_1** (200-300 từ): Phân tích chuyên sâu ${stock1.symbol}:
   - Xu hướng giá ngắn hạn (dựa trên MA20, RSI)
   - Thanh khoản (volume spike?)
   - Mức hỗ trợ/kháng cự gần nhất
   - Khuyến nghị cụ thể: MUA/BÁN/GIỮ + mức giá vào/ra
   - Rủi ro cần lưu ý

3. **analysis_2** (200-300 từ): Tương tự cho ${stock2.symbol}

Trả lời ĐÚNG format JSON:
{
  "market_summary": "...",
  "analysis_1": "...",
  "analysis_2": "..."
}
KHÔNG viết gì khác ngoài JSON.`;

    const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            }
        },
        { timeout: 30000 }
    );

    const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Gemini did not return valid JSON');

    return JSON.parse(jsonMatch[0]);
}

// ── Store to Supabase ──
async function storeReport(
    stock1: StockSnapshot,
    stock2: StockSnapshot,
    analysis: { market_summary: string; analysis_1: string; analysis_2: string },
    allStocks: StockSnapshot[]
) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase not configured, skipping storage');
        return null;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('daily_reports')
        .upsert({
            report_date: today,
            symbol_1: stock1.symbol,
            symbol_2: stock2.symbol,
            market_summary: analysis.market_summary,
            analysis_1: analysis.analysis_1,
            analysis_2: analysis.analysis_2,
            signal_1: stock1.signal,
            signal_2: stock2.signal,
            raw_data: {
                stock1,
                stock2,
                top10: allStocks.slice(0, 10),
                generated_at: new Date().toISOString()
            }
        }, { onConflict: 'report_date' })
        .select();

    if (error) {
        console.error('Supabase write error:', error.message);
        return null;
    }
    return data;
}

// ── MAIN HANDLER ──
export async function GET(request: NextRequest) {
    // Security: only allow Vercel Cron or manual trigger with key
    const authHeader = request.headers.get('authorization');
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isManualTrigger = request.nextUrl.searchParams.get('key') === process.env.GEMINI_API_KEY?.slice(0, 10);

    // Allow in development or with proper auth
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev && !isVercelCron && !isManualTrigger) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('[DailyReport] Starting VN30 analysis pipeline...');

        // Step 1: Rank all VN30 stocks
        const ranked = await rankVN30();
        if (ranked.length < 2) {
            return NextResponse.json({ error: 'Not enough data from VN30' }, { status: 500 });
        }

        console.log(`[DailyReport] Ranked ${ranked.length} stocks. Top: ${ranked[0].symbol} (${ranked[0].score}), ${ranked[1].symbol} (${ranked[1].score})`);

        // Step 2: Pick 2 (try 1 BUY + 1 SELL, or top 2 if no signal diversity)
        let pick1 = ranked[0];
        let pick2 = ranked[1];

        // Try to get signal diversity
        const buyPick = ranked.find(s => s.signal === 'BUY');
        const sellPick = ranked.find(s => s.signal === 'SELL');
        if (buyPick && sellPick && buyPick.symbol !== sellPick.symbol) {
            pick1 = buyPick;
            pick2 = sellPick;
        }

        console.log(`[DailyReport] Selected: ${pick1.symbol} (${pick1.signal}) & ${pick2.symbol} (${pick2.signal})`);

        // Step 3: Generate AI analysis
        console.log('[DailyReport] Calling Gemini AI...');
        const analysis = await generateAnalysis(pick1, pick2, ranked);
        console.log('[DailyReport] Gemini analysis complete.');

        // Step 4: Store to Supabase
        const stored = await storeReport(pick1, pick2, analysis, ranked);
        console.log(`[DailyReport] Stored to Supabase: ${stored ? 'OK' : 'SKIPPED'}`);

        return NextResponse.json({
            success: true,
            date: new Date().toISOString().split('T')[0],
            picks: { symbol_1: pick1.symbol, signal_1: pick1.signal, symbol_2: pick2.symbol, signal_2: pick2.signal },
            market_summary: analysis.market_summary,
            analysis_1: analysis.analysis_1,
            analysis_2: analysis.analysis_2,
            raw: { stock1: pick1, stock2: pick2, top5: ranked.slice(0, 5) }
        });

    } catch (error: any) {
        console.error('[DailyReport] Pipeline failed:', error.message);
        return NextResponse.json({ error: error.message || 'Pipeline failed' }, { status: 500 });
    }
}
