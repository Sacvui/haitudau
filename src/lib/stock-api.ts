import axios from 'axios';
import { StockHistoryParams, StockDataPoint, DividendInfo } from './types';

// API endpoints for Vietnamese stock data
const CAFEF_API = 'https://s.cafef.vn/Ajax/PageNew/DataHistory/PriceHistory.ashx';
const VNDIRECT_API = 'https://finfo-api.vndirect.com.vn/v4/stock_prices';
const VNDIRECT_FOREIGN_API = 'https://finfo-api.vndirect.com.vn/v4/foreign_trades';

// Fetch stock history from CafeF
export async function fetchStockHistory(params: StockHistoryParams): Promise<StockDataPoint[]> {
    try {
        // Use VNDirect API as primary source
        const response = await axios.get(VNDIRECT_API, {
            params: {
                sort: 'date',
                q: `code:${params.symbol}~date:gte:${formatDateForVND(params.startDate)}~date:lte:${formatDateForVND(params.endDate)}`,
                size: 10000,
                page: 1,
            },
            headers: {
                'Accept': 'application/json',
            },
        });

        if (response.data && response.data.data) {
            return response.data.data.map((item: Record<string, number | string>) => ({
                date: item.date as string,
                open: (item.open as number) * 1000,
                high: (item.high as number) * 1000,
                low: (item.low as number) * 1000,
                close: (item.close as number) * 1000,
                volume: item.nmVolume as number,
                adjustedClose: (item.adClose as number) * 1000,
            }));
        }
        return [];
    } catch (error) {
        console.error('Error fetching stock history:', error);
        return [];
    }
}

// Fetch foreign trading history
export async function fetchForeignTrades(symbol: string): Promise<any[]> {
    try {
        const now = new Date();
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        
        const toDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
        const fromDate = `${sixtyDaysAgo.getDate().toString().padStart(2, '0')}/${(sixtyDaysAgo.getMonth() + 1).toString().padStart(2, '0')}/${sixtyDaysAgo.getFullYear()}`;

        console.log(`[stock-api] Fetching foreign trades for ${symbol} (${fromDate} to ${toDate})`);
        
        // 1. Primary: SSI Statistics API
        try {
            const response = await axios.get(`https://iboard-api.ssi.com.vn/statistics/company/ssmi/stock-info`, {
                params: {
                    symbol,
                    fromDate,
                    toDate,
                    page: 1,
                    pageSize: 100
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://iboard.ssi.com.vn/',
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            if (response.data && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
                return response.data.data.map((item: any) => {
                    const closePrice = Number(item.close) || 0;
                    const netVal = Number(item.netBuySellVal);
                    const buyVol = Number(item.foreignBuyVolTotal) || 0;
                    const sellVol = Number(item.foreignSellVolTotal) || 0;
                    
                    return {
                        date: item.tradingDate,
                        buyVolume: buyVol,
                        sellVolume: sellVol,
                        buyValue: Number(item.foreignBuyValTotal) || (buyVol * closePrice),
                        sellValue: Number(item.foreignSellValTotal) || (sellVol * closePrice),
                        netVolume: buyVol - sellVol,
                        netValue: !isNaN(netVal) ? netVal : (buyVol - sellVol) * closePrice,
                        close: closePrice,
                    };
                });
            }
        } catch (ssiErr: any) {
            console.warn(`[stock-api] SSI Statistics API failed:`, ssiErr.message);
        }

        // 2. Secondary: VNDirect Fallback
        try {
            const startDateVND = `${sixtyDaysAgo.getFullYear()}-${(sixtyDaysAgo.getMonth() + 1).toString().padStart(2, '0')}-${sixtyDaysAgo.getDate().toString().padStart(2, '0')}`;
            const vndRes = await axios.get(VNDIRECT_FOREIGN_API, {
                params: {
                    sort: 'date',
                    q: `code:${symbol}~date:gte:${startDateVND}`,
                    size: 100,
                    page: 1,
                },
                headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.vndirect.com.vn/' },
                timeout: 8000
            });
            if (vndRes.data && vndRes.data.data && Array.isArray(vndRes.data.data) && vndRes.data.data.length > 0) {
                return vndRes.data.data.map((item: any) => ({
                    date: item.date,
                    buyVolume: Number(item.nmBuyVol) || 0,
                    sellVolume: Number(item.nmSellVol) || 0,
                    buyValue: Number(item.nmBuyVal) || 0,
                    sellValue: Number(item.nmSellVal) || 0,
                    netVolume: (Number(item.nmBuyVol) || 0) - (Number(item.nmSellVol) || 0),
                    netValue: (Number(item.nmBuyVal) || 0) - (Number(item.nmSellVal) || 0),
                    close: Number(item.close) || 0
                }));
            }
        } catch (vndErr: any) {
            console.warn(`[stock-api] VNDirect fallback failed:`, vndErr.message);
        }

        // 3. Last Resort: SSI Live Quote API (Ensure VIB always shows numbers)
        try {
             const quoteRes = await axios.get(`https://iboard-api.ssi.com.vn/statistics/api/v1/stock/quote`, {
                 params: { symbol },
                 headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://iboard.ssi.com.vn/' }
             });
             if (quoteRes.data && quoteRes.data.data) {
                 const q = quoteRes.data.data;
                 const buyVol = Number(q.foreignBuyVol) || 0;
                 const sellVol = Number(q.foreignSellVol) || 0;
                 if (buyVol > 0 || sellVol > 0) {
                     return [{
                         date: now.toLocaleDateString('vi-VN'),
                         buyVolume: buyVol,
                         sellVolume: sellVol,
                         buyValue: buyVol * (Number(q.priceClose) || 0),
                         sellValue: sellVol * (Number(q.priceClose) || 0),
                         netVolume: buyVol - sellVol,
                         netValue: (buyVol - sellVol) * (Number(q.priceClose) || 0),
                         close: Number(q.priceClose) || 0
                     }];
                 }
             }
        } catch (quoteErr) {
            console.warn(`[stock-api] SSI Quote fallback failed`);
        }

        return [];
    } catch (error: any) {
        console.error('Global Error fetching foreign trades:', error.message);
        return [];
    }
}

// Fetch dividend history
export async function fetchDividendHistory(symbol: string): Promise<DividendInfo[]> {
    try {
        // CafeF dividend API
        const response = await axios.get(`https://s.cafef.vn/Ajax/CongTy/DieuChinhGia.ashx`, {
            params: {
                sym: symbol,
            },
        });

        if (response.data && Array.isArray(response.data)) {
            return response.data.map((item: Record<string, string>) => ({
                exDate: item.NgayGDKHQ,
                type: item.LoaiDieuChinh?.includes('Cổ tức bằng tiền') ? 'cash' as const : 'stock' as const,
                value: parseFloat(item.GiaTriDieuChinh) || 0,
                description: item.NoiDung || '',
            }));
        }
        return [];
    } catch (error) {
        console.error('Error fetching dividend history:', error);
        return [];
    }
}

// Fetch real-time price for a single symbol
export async function fetchRealtimeQuote(symbol: string): Promise<any> {
    try {
        // Try SSI iBoard Statistics as primary (very fast for VN30)
        const response = await axios.get(`https://iboard-api.ssi.com.vn/statistics/api/v1/stock/quote`, {
            params: { symbol },
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://iboard.ssi.com.vn/' },
            timeout: 5000
        });

        if (response.data && response.data.data) {
            const q = response.data.data;
            return {
                symbol: q.symbol,
                price: Number(q.priceClose) || 0,
                high: Number(q.priceHigh) || 0,
                low: Number(q.priceLow) || 0,
                open: Number(q.priceOpen) || 0,
                change: Number(q.change) || 0,
                pctChange: Number(q.pctChange) || 0
            };
        }

        return null;
    } catch (error) {
        console.error(`Error fetching realtime quote for ${symbol}:`, error);
        return null;
    }
}

// Fetch batch quotes (useful for Screener)
export async function fetchLiveQuotes(symbols: string[]): Promise<Record<string, number>> {
    try {
        // FinanceID batch API
        const response = await axios.get('https://financeid.vn/api/v2/market/trading-all', {
            params: { exchange: 'HOSE' },
            timeout: 10000
        });

        const quotes: Record<string, number> = {};
        if (response.data && Array.isArray(response.data)) {
            response.data.forEach((item: any) => {
                if (symbols.includes(item.symbol)) {
                    quotes[item.symbol] = Number(item.price) || 0;
                }
            });
        }
        return quotes;
    } catch (error) {
        console.error('Error fetching batch quotes:', error);
        return {};
    }
}

// Get list of all stocks
export async function fetchStockList(): Promise<{ symbol: string; name: string; exchange: string }[]> {
    try {
        const response = await axios.get('https://finfo-api.vndirect.com.vn/v4/stocks', {
            params: {
                q: 'type:stock~status:listed',
                size: 2000,
                page: 1,
            },
        });

        if (response.data && response.data.data) {
            return response.data.data.map((item: Record<string, string>) => ({
                symbol: item.code,
                name: item.companyName,
                exchange: item.exchange,
            }));
        }
        return [];
    } catch (error) {
        console.error('Error fetching stock list:', error);
        return [];
    }
}

// Helper functions
function formatDateForVND(dateStr: string): string {
    // Convert DD/MM/YYYY to YYYY-MM-DD
    const parts = dateStr.split('/');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export function formatDateDisplay(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatPercent(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value / 100);
}
