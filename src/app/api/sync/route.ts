import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// This API will be called by Vercel Cron or external scheduler
// to sync stock data daily

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Popular stocks to sync automatically
const POPULAR_STOCKS = [
    'VIB', 'VNM', 'FPT', 'VIC', 'VHM', 'VCB', 'BID', 'CTG', 'HPG', 'MSN',
    'MWG', 'VPB', 'TCB', 'MBB', 'ACB', 'STB', 'VRE', 'PLX', 'GAS', 'SAB',
    'NVL', 'VJC', 'HDB', 'POW', 'PNJ', 'REE', 'SSI', 'VND', 'HCM', 'DIG'
];

interface SyncResult {
    symbol: string;
    status: 'success' | 'error';
    recordsSynced: number;
    error?: string;
}

async function fetchAndSyncStock(
    supabase: any,
    symbol: string
): Promise<SyncResult> {
    try {
        // Get last synced date
        const { data: lastRecord } = await supabase
            .from('stock_prices')
            .select('date')
            .eq('symbol', symbol)
            .order('date', { ascending: false })
            .limit(1)
            .single();

        const startDate = lastRecord
            ? new Date(new Date(lastRecord.date).getTime() + 86400000).toISOString().split('T')[0]
            : '2018-01-01';

        const endDate = new Date().toISOString().split('T')[0];

        // Skip if already up to date
        if (startDate >= endDate) {
            return { symbol, status: 'success', recordsSynced: 0 };
        }

        // Fetch from VNDirect
        const response = await axios.get('https://finfo-api.vndirect.com.vn/v4/stock_prices', {
            params: {
                sort: 'date',
                q: `code:${symbol}~date:gte:${startDate}~date:lte:${endDate}`,
                size: 10000,
                page: 1,
            },
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0',
            },
            timeout: 30000,
        });

        if (!response.data?.data?.length) {
            return { symbol, status: 'success', recordsSynced: 0 };
        }

        // Transform and insert data
        const prices = response.data.data.map((item: any) => ({
            symbol: symbol,
            date: item.date,
            open: item.open * 1000,
            high: item.high * 1000,
            low: item.low * 1000,
            close: item.close * 1000,
            volume: item.nmVolume || item.ptVolume || 0,
            adjusted_close: (item.adClose || item.close) * 1000,
        }));

        // Upsert to database
        const { error } = await supabase
            .from('stock_prices')
            .upsert(prices, { onConflict: 'symbol,date' });

        if (error) throw error;

        return { symbol, status: 'success', recordsSynced: prices.length };
    } catch (error: any) {
        return {
            symbol,
            status: 'error',
            recordsSynced: 0,
            error: error.message,
        };
    }
}

async function syncDividends(supabase: any, symbol: string): Promise<SyncResult> {
    try {
        const response = await axios.get('https://s.cafef.vn/Ajax/CongTy/DieuChinhGia.ashx', {
            params: { sym: symbol },
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000,
        });

        if (!response.data || !Array.isArray(response.data)) {
            return { symbol, status: 'success', recordsSynced: 0 };
        }

        const dividends = response.data
            .filter((item: any) => item.NoiDung)
            .map((item: any) => {
                const content = item.NoiDung || '';
                let type: 'cash' | 'stock' = 'cash';
                let value = 0;

                if (content.includes('Cổ tức bằng tiền') || content.includes('tiền mặt')) {
                    type = 'cash';
                    const match = content.match(/(\d+(?:,\d+)?(?:\.\d+)?)/);
                    if (match) value = parseFloat(match[1].replace(/,/g, ''));
                } else if (content.includes('cổ phiếu') || content.includes('thưởng')) {
                    type = 'stock';
                    const ratioMatch = content.match(/(\d+):(\d+)/);
                    if (ratioMatch) {
                        value = (parseFloat(ratioMatch[1]) / parseFloat(ratioMatch[2])) * 100;
                    }
                }

                return {
                    symbol,
                    ex_date: item.NgayGDKHQ,
                    record_date: item.NgayDKCC,
                    payment_date: item.NgayThanhToan,
                    dividend_type: type,
                    dividend_value: value,
                    description: content,
                };
            })
            .filter((d: any) => d.dividend_value > 0);

        if (dividends.length === 0) {
            return { symbol, status: 'success', recordsSynced: 0 };
        }

        const { error } = await supabase
            .from('dividend_events')
            .upsert(dividends, { onConflict: 'symbol,ex_date,dividend_type' });

        if (error) throw error;

        return { symbol, status: 'success', recordsSynced: dividends.length };
    } catch (error: any) {
        return {
            symbol,
            status: 'error',
            recordsSynced: 0,
            error: error.message,
        };
    }
}

export async function GET(request: NextRequest) {
    // Verify cron secret (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json(
            { error: 'Supabase not configured' },
            { status: 500 }
        );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get symbol from query or sync all popular stocks
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const syncType = searchParams.get('type') || 'all'; // 'prices', 'dividends', 'all'

    const stocksToSync = symbol ? [symbol.toUpperCase()] : POPULAR_STOCKS;
    const results: SyncResult[] = [];

    // Log sync start
    const { data: syncLog } = await supabase
        .from('data_sync_log')
        .insert({
            sync_type: syncType,
            symbol: symbol || 'ALL',
            status: 'pending',
            started_at: new Date().toISOString(),
        })
        .select()
        .single();

    try {
        for (const stock of stocksToSync) {
            if (syncType === 'all' || syncType === 'prices') {
                const priceResult = await fetchAndSyncStock(supabase, stock);
                results.push({ ...priceResult, symbol: `${stock}_prices` });
            }

            if (syncType === 'all' || syncType === 'dividends') {
                const dividendResult = await syncDividends(supabase, stock);
                results.push({ ...dividendResult, symbol: `${stock}_dividends` });
            }

            // Rate limiting - wait between stocks
            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        const totalSynced = results.reduce((sum, r) => sum + r.recordsSynced, 0);
        const errors = results.filter((r) => r.status === 'error');

        // Update sync log
        if (syncLog) {
            await supabase
                .from('data_sync_log')
                .update({
                    status: errors.length > 0 ? 'partial' : 'success',
                    records_synced: totalSynced,
                    error_message: errors.length > 0 ? JSON.stringify(errors) : null,
                    completed_at: new Date().toISOString(),
                })
                .eq('id', syncLog.id);
        }

        return NextResponse.json({
            success: true,
            message: `Synced ${stocksToSync.length} stocks`,
            totalRecords: totalSynced,
            results,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error: any) {
        // Update sync log on error
        if (syncLog) {
            await supabase
                .from('data_sync_log')
                .update({
                    status: 'error',
                    error_message: error.message,
                    completed_at: new Date().toISOString(),
                })
                .eq('id', syncLog.id);
        }

        return NextResponse.json(
            { error: 'Sync failed', details: error.message },
            { status: 500 }
        );
    }
}

// POST to trigger manual sync
export async function POST(request: NextRequest) {
    return GET(request);
}
