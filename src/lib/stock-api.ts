import axios from 'axios';
import { StockHistoryParams, StockDataPoint, DividendInfo } from './types';

// API endpoints for Vietnamese stock data
const CAFEF_API = 'https://s.cafef.vn/Ajax/PageNew/DataHistory/PriceHistory.ashx';
const VNDIRECT_API = 'https://finfo-api.vndirect.com.vn/v4/stock_prices';

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
