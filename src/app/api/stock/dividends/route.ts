import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import dividendsData from '@/data/dividends.json';

// Type for local dividend data
const LOCAL_DIVIDENDS: Record<string, any[]> = dividendsData;

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
        console.log(`Fetching dividend data for ${symbol}...`);

        // Strategy 1: Try VCI API (vnstock source)
        try {
            const vciRes = await axios.get(`https://mt.vietcap.com.vn/api/price/symbols/${symbol}/company-events`, {
                params: { type: 'dividend' },
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 8000
            });

            if (vciRes.data && Array.isArray(vciRes.data) && vciRes.data.length > 0) {
                const dividends = vciRes.data.map((e: any) => ({
                    exDate: e.exDate || e.recordDate,
                    type: e.cashValue > 0 ? 'cash' : 'stock',
                    value: e.cashValue > 0 ? e.cashValue : (e.ratio ? parseFloat(e.ratio) * 100 : 0),
                    description: e.description || e.content || '',
                    source: 'vci'
                })).filter((d: any) => d.value > 0);

                if (dividends.length > 0) {
                    return NextResponse.json({
                        success: true,
                        symbol,
                        data: dividends,
                        total: dividends.length,
                        source: 'vci'
                    });
                }
            }
        } catch (vciError) {
            console.log('VCI API unavailable, trying fallback...');
        }

        // Strategy 2: Try TCBS API
        try {
            const tcbsRes = await axios.get(`https://apipubaws.tcbs.com.vn/tcanalysis/v1/company/${symbol}/dividend-payment-histories`, {
                params: { page: 0, size: 50 },
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 8000
            });

            if (tcbsRes.data && tcbsRes.data.listDividendPaymentHis && tcbsRes.data.listDividendPaymentHis.length > 0) {
                const dividends = tcbsRes.data.listDividendPaymentHis.map((e: any) => ({
                    exDate: e.exerciseDate,
                    type: e.issueMethod === 'cash' ? 'cash' : 'stock',
                    value: e.issueMethod === 'cash' ? e.cashDividendPercentage * 100 : e.stockDividendPercentage * 100,
                    description: e.title || '',
                    source: 'tcbs'
                })).filter((d: any) => d.value > 0);

                if (dividends.length > 0) {
                    return NextResponse.json({
                        success: true,
                        symbol,
                        data: dividends,
                        total: dividends.length,
                        source: 'tcbs'
                    });
                }
            }
        } catch (tcbsError) {
            console.log('TCBS API unavailable, trying fallback...');
        }

        // Strategy 3: Use verified local data (from official annual reports)
        if (LOCAL_DIVIDENDS[symbol]) {
            console.log(`Using verified local data for ${symbol}`);
            return NextResponse.json({
                success: true,
                symbol,
                data: LOCAL_DIVIDENDS[symbol],
                total: LOCAL_DIVIDENDS[symbol].length,
                source: 'local-verified'
            });
        }

        // No data available
        return NextResponse.json({
            success: true,
            symbol,
            data: [],
            total: 0,
            message: `No dividend data available for ${symbol}. Consider adding to local database.`
        });

    } catch (error: any) {
        console.error('Dividend API Error:', error.message);

        // Final fallback to local data on any error
        if (LOCAL_DIVIDENDS[symbol]) {
            return NextResponse.json({
                success: true,
                symbol,
                data: LOCAL_DIVIDENDS[symbol],
                total: LOCAL_DIVIDENDS[symbol].length,
                source: 'local-fallback'
            });
        }

        return NextResponse.json(
            { error: 'Failed to fetch dividend data', details: error.message },
            { status: 500 }
        );
    }
}
