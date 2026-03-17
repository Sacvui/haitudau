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
        const thirtyDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
        
        const toDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
        const fromDate = `${thirtyDaysAgo.getDate().toString().padStart(2, '0')}/${(thirtyDaysAgo.getMonth() + 1).toString().padStart(2, '0')}/${thirtyDaysAgo.getFullYear()}`;

        console.log(`[stock-api] Fetching foreign trades for ${symbol} (${fromDate} to ${toDate}) from SSI Statistics...`);
        
        try {
            // New Robust SSI Endpoint uncovered by exploration
            const response = await axios.get(`https://iboard-api.ssi.com.vn/statistics/company/ssmi/stock-info`, {
                params: {
                    symbol,
                    fromDate,
                    toDate,
                    page: 1,
                    pageSize: 50
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://iboard.ssi.com.vn/',
                    'Origin': 'https://iboard.ssi.com.vn',
                    'device-id': '530C8E53-D902-46B4-9ACC-406F881AFBDD', // Simulated device ID for session
                    'Accept': 'application/json, text/plain, */*'
                },
                timeout: 8000
            });

            if (response.data && response.data.data && response.data.data.length > 0) {
                return response.data.data.map((item: any) => {
                    const buyVal = Number(item.foreignBuyValTotal) || Number(item.totalBuyVal) || 0;
                    const sellVal = Number(item.foreignSellValTotal) || Number(item.totalSellVal) || 0;
                    const buyVol = Number(item.foreignBuyVolTotal) || Number(item.totalBuyVol) || 0;
                    const sellVol = Number(item.foreignSellVolTotal) || Number(item.totalSellVol) || 0;

                    return {
                        date: item.tradingDate,
                        buyVolume: buyVol,
                        sellVolume: sellVol,
                        buyValue: buyVal,
                        sellValue: sellVal,
                        netVolume: buyVol - sellVol,
                        netValue: buyVal - sellVal,
                    };
                });
            }
        } catch (ssiErr: any) {
            console.warn(`[stock-api] SSI Statistics API failed:`, ssiErr.message);
        }

        // Secondary Fallback: VNDirect (Legacy mapping)
        console.log(`[stock-api] SSI failing, trying VNDirect fallback for ${symbol}...`);
        try {
            const startDateVND = `${thirtyDaysAgo.getFullYear()}-${(thirtyDaysAgo.getMonth() + 1).toString().padStart(2, '0')}-${thirtyDaysAgo.getDate().toString().padStart(2, '0')}`;
            const vndRes = await axios.get(VNDIRECT_FOREIGN_API, {
                params: {
                    sort: 'date',
                    q: `code:${symbol}~date:gte:${startDateVND}`,
                    size: 50,
                    page: 1,
                },
                headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.vndirect.com.vn/' },
                timeout: 5000
            });
            if (vndRes.data && vndRes.data.data) {
                return vndRes.data.data.map((item: any) => ({
                    date: item.date,
                    buyVolume: Number(item.nmBuyVol) || 0,
                    sellVolume: Number(item.nmSellVol) || 0,
                    buyValue: Number(item.nmBuyVal) || 0,
                    sellValue: Number(item.nmSellVal) || 0,
                    netVolume: (Number(item.nmBuyVol) || 0) - (Number(item.nmSellVol) || 0),
                    netValue: (Number(item.nmBuyVal) || 0) - (Number(item.nmSellVal) || 0),
                }));
            }
        } catch (vndErr: any) {
            console.warn(`[stock-api] VNDirect fallback failed:`, vndErr.message);
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
