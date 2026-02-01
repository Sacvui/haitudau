import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// In-memory cache for stock history (30 minute TTL)
const historyCache = new Map<string, { data: StockDataPoint[]; timestamp: number; source: string }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface StockDataPoint {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    adjustedClose: number;
}

// 1. SSI iBoard Source (Primary - Best Accuracy)
async function fetchFromSSI(symbol: string, startTs: number, endTs: number) {
    const response = await axios.get('https://iboard.ssi.com.vn/dchart/api/history', {
        params: {
            resolution: 'D',
            symbol: symbol,
            from: Math.floor(startTs / 1000),
            to: Math.floor(endTs / 1000)
        },
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://iboard.ssi.com.vn/'
        },
        timeout: 8000
    });

    const data = response.data;
    if (data.s === 'ok' && data.t && data.t.length > 0) {
        return data.t.map((time: number, i: number) => ({
            date: new Date(time * 1000).toISOString().split('T')[0],
            open: data.o[i] * 1000,
            high: data.h[i] * 1000,
            low: data.l[i] * 1000,
            close: data.c[i] * 1000,
            volume: data.v[i],
            adjustedClose: data.c[i] * 1000
        }));
    }
    throw new Error('SSI No Data');
}

// 2. DNSE/Entrade Source (Backup)
async function fetchFromDNSE(symbol: string, startTs: number, endTs: number) {
    const response = await axios.get(
        `https://services.entrade.com.vn/chart-api/v2/ohlcs/stock`, {
        params: {
            symbol: symbol,
            from: Math.floor(startTs / 1000),
            to: Math.floor(endTs / 1000),
            resolution: '1D'
        },
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 8000
    });

    const data = response.data;
    if (data && data.t && data.t.length > 0) {
        return data.t.map((time: number, i: number) => ({
            date: new Date(time * 1000).toISOString().split('T')[0],
            open: data.o[i] * 1000,
            high: data.h[i] * 1000,
            low: data.l[i] * 1000,
            close: data.c[i] * 1000,
            volume: data.v[i],
            adjustedClose: data.c[i] * 1000
        }));
    }
    throw new Error('DNSE No Data');
}

// 3. Fireant Source (Alternative)
async function fetchFromFireant(symbol: string, startDate: string, endDate: string) {
    const response = await axios.get(
        `https://restv2.fireant.vn/symbols/${symbol}/historical-quotes`, {
        params: {
            startDate: startDate,
            endDate: endDate,
            offset: 0,
            limit: 2000
        },
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json'
        },
        timeout: 8000
    });

    const data = response.data;
    if (data && Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
            date: item.date.split('T')[0],
            open: item.priceOpen * 1000,
            high: item.priceHigh * 1000,
            low: item.priceLow * 1000,
            close: item.priceClose * 1000,
            volume: item.totalVolume || item.dealVolume || 0,
            adjustedClose: (item.priceClose || item.priceAverage) * 1000
        })).reverse(); // Fireant returns newest first
    }
    throw new Error('Fireant No Data');
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!symbol || !startDate || !endDate) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Check cache first
    const cacheKey = `${symbol}_${startDate}_${endDate}`;
    const cached = historyCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log(`Cache hit for ${symbol}`);
        return NextResponse.json({
            success: true,
            symbol,
            data: cached.data,
            total: cached.data.length,
            source: `${cached.source} (cached)`
        });
    }

    const startTs = new Date(startDate).getTime();
    const endTs = new Date(endDate).getTime();

    // Try sources in parallel with race
    const sources = [
        { name: 'SSI', fn: () => fetchFromSSI(symbol, startTs, endTs) },
        { name: 'DNSE', fn: () => fetchFromDNSE(symbol, startTs, endTs) },
        { name: 'Fireant', fn: () => fetchFromFireant(symbol, startDate, endDate) },
    ];

    // Try each source sequentially with faster timeout
    for (const source of sources) {
        try {
            console.log(`Trying ${source.name} for ${symbol}...`);
            const data = await source.fn();
            if (data && data.length > 0) {
                // Cache the result
                historyCache.set(cacheKey, { data, timestamp: Date.now(), source: source.name });
                console.log(`✓ ${source.name} success: ${data.length} records`);
                return NextResponse.json({
                    success: true,
                    symbol,
                    data,
                    total: data.length,
                    source: source.name
                });
            }
        } catch (err) {
            console.warn(`✗ ${source.name} failed:`, (err as Error).message);
        }
    }

    return NextResponse.json(
        { error: `Không tìm thấy dữ liệu cho mã ${symbol}. Vui lòng kiểm tra mã cổ phiếu.` },
        { status: 404 }
    );
}
