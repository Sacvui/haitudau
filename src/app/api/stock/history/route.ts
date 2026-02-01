import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// In-memory cache for stock history (5 minute TTL)
const historyCache = new Map<string, { data: StockDataPoint[]; timestamp: number; source: string }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
    // SSI uses seconds for timestamp
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
        timeout: 10000
    });

    const data = response.data;
    if (data.s === 'ok' && data.t && data.t.length > 0) {
        return data.t.map((time: number, i: number) => ({
            date: new Date(time * 1000).toISOString().split('T')[0],
            open: data.o[i] * 1000, // SSI returns raw price (e.g. 34.5), we need 34500
            high: data.h[i] * 1000,
            low: data.l[i] * 1000,
            close: data.c[i] * 1000,
            volume: data.v[i],
            adjustedClose: data.c[i] * 1000 // SSI usually provides adjusted close
        }));
    }
    throw new Error('SSI No Data');
}

// 2. DNSE Source (Backup - Good Availability)
async function fetchFromDNSE(symbol: string, startDate: string, endDate: string) {
    const response = await axios.get(`https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?symbol=${symbol}&from=${Math.floor(new Date(startDate).getTime() / 1000)}&to=${Math.floor(new Date(endDate).getTime() / 1000)}&resolution=1D`, {
        headers: {
            'User-Agent': 'Mozilla/5.0'
        },
        timeout: 10000
    });

    // DNSE returns: { t: [], o: [], ... } similar to TradingView
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


export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!symbol || !startDate || !endDate) {
        return NextResponse.json(
            { error: 'Missing required parameters' },
            { status: 400 }
        );
    }

    const startTs = new Date(startDate).getTime();
    const endTs = new Date(endDate).getTime();

    try {
        console.log(`Fetching history for ${symbol} from SSI...`);
        const data = await fetchFromSSI(symbol, startTs, endTs);
        return NextResponse.json({ success: true, symbol, data, total: data.length, source: 'SSI' });

    } catch (ssiError) {
        console.warn('SSI API failed, switching to DNSE...', (ssiError as Error).message);
        try {
            const data = await fetchFromDNSE(symbol, startDate, endDate);
            return NextResponse.json({ success: true, symbol, data, total: data.length, source: 'DNSE' });
        } catch (dnseError) {
            console.error('All data sources failed');
            return NextResponse.json(
                { error: 'Failed to fetch REAL stock data from all sources (SSI, DNSE). System will not use Mock Data.' },
                { status: 500 }
            );
        }
    }
}
