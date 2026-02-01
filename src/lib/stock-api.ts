import axios from 'axios';

// API endpoints for Vietnamese stock data
const CAFEF_API = 'https://s.cafef.vn/Ajax/PageNew/DataHistory/PriceHistory.ashx';
const VNDIRECT_API = 'https://finfo-api.vndirect.com.vn/v4/stock_prices';

export interface StockHistoryParams {
    symbol: string;
    startDate: string; // DD/MM/YYYY
    endDate: string;   // DD/MM/YYYY
}

export interface StockDataPoint {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    adjustedClose: number;
}

export interface DividendInfo {
    exDate: string;
    type: 'cash' | 'stock';
    value: number;
    description: string;
}

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
            return response.data.data.map((item: any) => ({
                date: item.date,
                open: item.open * 1000,
                high: item.high * 1000,
                low: item.low * 1000,
                close: item.close * 1000,
                volume: item.nmVolume,
                adjustedClose: item.adClose * 1000,
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
            return response.data.map((item: any) => ({
                exDate: item.NgayGDKHQ,
                type: item.LoaiDieuChinh?.includes('Cổ tức bằng tiền') ? 'cash' : 'stock',
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
            return response.data.data.map((item: any) => ({
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
