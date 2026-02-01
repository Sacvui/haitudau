'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    TrendingUp,
    TrendingDown,
    ArrowUpDown,
    Star,
    Filter,
    RefreshCw,
    Coins,
    BarChart3,
    Target,
    ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { ScreenerSkeleton } from '@/components/ui/skeleton';

interface StockDividendData {
    symbol: string;
    name: string;
    currentPrice: number;
    dividendPerShare: number; // Total annual dividend per share
    dividendYield: number; // Percentage
    dividendHistory: { year: number; dividend: number; yield: number }[];
    stockDividendRatio: number; // e.g., 10% = 0.1
    payoutFrequency: string; // "Quarterly", "Annually", etc.
    sector: string;
    marketCap: number;
    consistencyScore: number; // 1-5 stars, based on dividend consistency
}

// VN30 Dividend Data - Updated 2024
const VN30_STOCKS: StockDividendData[] = [
    { symbol: 'GAS', name: 'PV GAS', currentPrice: 85000, dividendPerShare: 4000, dividendYield: 4.71, dividendHistory: [], stockDividendRatio: 0, payoutFrequency: 'Annually', sector: 'Dầu khí', marketCap: 165000e9, consistencyScore: 5 },
    { symbol: 'DGC', name: 'Hóa chất Đức Giang', currentPrice: 95000, dividendPerShare: 4000, dividendYield: 4.21, dividendHistory: [], stockDividendRatio: 0, payoutFrequency: 'Annually', sector: 'Hóa chất', marketCap: 45000e9, consistencyScore: 5 },
    { symbol: 'VNM', name: 'Vinamilk', currentPrice: 72000, dividendPerShare: 2900, dividendYield: 4.03, dividendHistory: [], stockDividendRatio: 0, payoutFrequency: 'Quarterly', sector: 'Tiêu dùng', marketCap: 145000e9, consistencyScore: 5 },
    { symbol: 'SAB', name: 'Sabeco', currentPrice: 65000, dividendPerShare: 1500, dividendYield: 2.31, dividendHistory: [], stockDividendRatio: 0, payoutFrequency: 'Annually', sector: 'Tiêu dùng', marketCap: 42000e9, consistencyScore: 5 },
    { symbol: 'PLX', name: 'Petrolimex', currentPrice: 44000, dividendPerShare: 1500, dividendYield: 3.41, dividendHistory: [], stockDividendRatio: 0, payoutFrequency: 'Annually', sector: 'Dầu khí', marketCap: 56000e9, consistencyScore: 4 },
    { symbol: 'PNJ', name: 'Vàng bạc Phú Nhuận', currentPrice: 115000, dividendPerShare: 1500, dividendYield: 1.30, dividendHistory: [], stockDividendRatio: 0.05, payoutFrequency: 'Annually', sector: 'Bán lẻ', marketCap: 35000e9, consistencyScore: 5 },
    { symbol: 'VHM', name: 'Vinhomes', currentPrice: 42000, dividendPerShare: 1000, dividendYield: 2.38, dividendHistory: [], stockDividendRatio: 0, payoutFrequency: 'Annually', sector: 'Bất động sản', marketCap: 185000e9, consistencyScore: 4 },
    { symbol: 'FPT', name: 'FPT Corporation', currentPrice: 145000, dividendPerShare: 2000, dividendYield: 1.38, dividendHistory: [], stockDividendRatio: 0.15, payoutFrequency: 'Semi-annually', sector: 'Công nghệ', marketCap: 150000e9, consistencyScore: 5 },
    { symbol: 'VCB', name: 'Vietcombank', currentPrice: 88000, dividendPerShare: 800, dividendYield: 0.91, dividendHistory: [], stockDividendRatio: 0.38, payoutFrequency: 'Annually', sector: 'Ngân hàng', marketCap: 450000e9, consistencyScore: 5 },
    { symbol: 'BID', name: 'BIDV', currentPrice: 48000, dividendPerShare: 800, dividendYield: 1.67, dividendHistory: [], stockDividendRatio: 0, payoutFrequency: 'Annually', sector: 'Ngân hàng', marketCap: 245000e9, consistencyScore: 5 },
    { symbol: 'CTG', name: 'VietinBank', currentPrice: 35000, dividendPerShare: 500, dividendYield: 1.43, dividendHistory: [], stockDividendRatio: 0.27, payoutFrequency: 'Annually', sector: 'Ngân hàng', marketCap: 175000e9, consistencyScore: 4 },
    { symbol: 'MBB', name: 'MB Bank', currentPrice: 25000, dividendPerShare: 0, dividendYield: 0, dividendHistory: [], stockDividendRatio: 0.15, payoutFrequency: 'Annually', sector: 'Ngân hàng', marketCap: 95000e9, consistencyScore: 4 },
    { symbol: 'ACB', name: 'ACB', currentPrice: 25500, dividendPerShare: 0, dividendYield: 0, dividendHistory: [], stockDividendRatio: 0.15, payoutFrequency: 'Annually', sector: 'Ngân hàng', marketCap: 88000e9, consistencyScore: 4 },
    { symbol: 'TCB', name: 'Techcombank', currentPrice: 52000, dividendPerShare: 0, dividendYield: 0, dividendHistory: [], stockDividendRatio: 0.15, payoutFrequency: 'Annually', sector: 'Ngân hàng', marketCap: 185000e9, consistencyScore: 4 },
    { symbol: 'VPB', name: 'VPBank', currentPrice: 21000, dividendPerShare: 0, dividendYield: 0, dividendHistory: [], stockDividendRatio: 0.10, payoutFrequency: 'Annually', sector: 'Ngân hàng', marketCap: 85000e9, consistencyScore: 3 },
    { symbol: 'HDB', name: 'HDBank', currentPrice: 25000, dividendPerShare: 0, dividendYield: 0, dividendHistory: [], stockDividendRatio: 0.10, payoutFrequency: 'Annually', sector: 'Ngân hàng', marketCap: 58000e9, consistencyScore: 4 },
    { symbol: 'SHB', name: 'SHB', currentPrice: 13500, dividendPerShare: 0, dividendYield: 0, dividendHistory: [], stockDividendRatio: 0.11, payoutFrequency: 'Annually', sector: 'Ngân hàng', marketCap: 42000e9, consistencyScore: 3 },
    { symbol: 'SSB', name: 'SeABank', currentPrice: 28000, dividendPerShare: 0, dividendYield: 0, dividendHistory: [], stockDividendRatio: 0.10, payoutFrequency: 'Annually', sector: 'Ngân hàng', marketCap: 35000e9, consistencyScore: 3 },
    { symbol: 'LPB', name: 'LienVietPostBank', currentPrice: 15000, dividendPerShare: 0, dividendYield: 0, dividendHistory: [], stockDividendRatio: 0.12, payoutFrequency: 'Annually', sector: 'Ngân hàng', marketCap: 28000e9, consistencyScore: 3 },
    { symbol: 'HPG', name: 'Hòa Phát', currentPrice: 27000, dividendPerShare: 0, dividendYield: 0, dividendHistory: [], stockDividendRatio: 0.10, payoutFrequency: 'Annually', sector: 'Thép', marketCap: 130000e9, consistencyScore: 3 },
    { symbol: 'MSN', name: 'Masan Group', currentPrice: 82000, dividendPerShare: 1000, dividendYield: 1.22, dividendHistory: [], stockDividendRatio: 0, payoutFrequency: 'Annually', sector: 'Tiêu dùng', marketCap: 115000e9, consistencyScore: 3 },
    { symbol: 'MWG', name: 'Thế Giới Di Động', currentPrice: 62000, dividendPerShare: 500, dividendYield: 0.81, dividendHistory: [], stockDividendRatio: 0, payoutFrequency: 'Annually', sector: 'Bán lẻ', marketCap: 92000e9, consistencyScore: 3 },
    { symbol: 'VIC', name: 'Vingroup', currentPrice: 42000, dividendPerShare: 500, dividendYield: 1.19, dividendHistory: [], stockDividendRatio: 0, payoutFrequency: 'Annually', sector: 'Bất động sản', marketCap: 180000e9, consistencyScore: 3 },
    { symbol: 'GVR', name: 'Cao su VN', currentPrice: 22000, dividendPerShare: 300, dividendYield: 1.36, dividendHistory: [], stockDividendRatio: 0, payoutFrequency: 'Annually', sector: 'Cao su', marketCap: 92000e9, consistencyScore: 4 },
    { symbol: 'POW', name: 'Điện lực Dầu khí', currentPrice: 13000, dividendPerShare: 700, dividendYield: 5.38, dividendHistory: [], stockDividendRatio: 0, payoutFrequency: 'Annually', sector: 'Điện', marketCap: 32000e9, consistencyScore: 4 },
    { symbol: 'BCM', name: 'Becamex IDC', currentPrice: 75000, dividendPerShare: 600, dividendYield: 0.80, dividendHistory: [], stockDividendRatio: 0, payoutFrequency: 'Annually', sector: 'Bất động sản', marketCap: 45000e9, consistencyScore: 3 },
    { symbol: 'SSI', name: 'SSI Securities', currentPrice: 35000, dividendPerShare: 1000, dividendYield: 2.86, dividendHistory: [], stockDividendRatio: 0.20, payoutFrequency: 'Annually', sector: 'Chứng khoán', marketCap: 48000e9, consistencyScore: 4 },
    { symbol: 'VRE', name: 'Vincom Retail', currentPrice: 24000, dividendPerShare: 300, dividendYield: 1.25, dividendHistory: [], stockDividendRatio: 0, payoutFrequency: 'Annually', sector: 'Bất động sản', marketCap: 56000e9, consistencyScore: 3 },
    { symbol: 'STB', name: 'Sacombank', currentPrice: 38000, dividendPerShare: 0, dividendYield: 0, dividendHistory: [], stockDividendRatio: 0.15, payoutFrequency: 'Annually', sector: 'Ngân hàng', marketCap: 75000e9, consistencyScore: 3 },
    { symbol: 'VJC', name: 'Vietjet Air', currentPrice: 98000, dividendPerShare: 1000, dividendYield: 1.02, dividendHistory: [], stockDividendRatio: 0, payoutFrequency: 'Annually', sector: 'Hàng không', marketCap: 52000e9, consistencyScore: 2 },
];

// Keep static fallback data
const VN30_STOCKS_STATIC: StockDividendData[] = [
    { symbol: 'GAS', name: 'PV GAS', currentPrice: 85000, dividendPerShare: 4000, dividendYield: 4.71, dividendHistory: [], stockDividendRatio: 0, payoutFrequency: 'Annually', sector: 'Dầu khí', marketCap: 165000e9, consistencyScore: 5 },
    // ... (rest of static data implied, we can keep using existing const if we didn't rename it, but let's just use the existing VN30_STOCKS as fallback)
];

type SortField = 'dividendYield' | 'consistencyScore' | 'stockDividendRatio' | 'marketCap' | 'symbol';

export default function DividendScreenerPage() {
    const [stocks, setStocks] = useState<StockDividendData[]>([]);
    const [sortField, setSortField] = useState<SortField>('dividendYield');
    const [sortAsc, setSortAsc] = useState(false);
    const [filter, setFilter] = useState({
        minYield: 0,
        sector: 'all',
        minConsistency: 0,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/stock/screener');
                const result = await res.json();

                if (result.success && result.data && result.data.length > 0) {
                    setStocks(result.data);
                } else {
                    setStocks(VN30_STOCKS); // Fallback to static
                }
            } catch (error) {
                console.error("Error fetching screener data:", error);
                setStocks(VN30_STOCKS); // Fallback
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const sectors = ['all', ...new Set((stocks.length > 0 ? stocks : VN30_STOCKS).map(s => s.sector))];

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(false);
        }
    };

    const filteredStocks = stocks
        .filter(s => {
            if (searchQuery && !s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) &&
                !s.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            if (filter.minYield > 0 && s.dividendYield < filter.minYield) return false;
            if (filter.sector !== 'all' && s.sector !== filter.sector) return false;
            if (filter.minConsistency > 0 && s.consistencyScore < filter.minConsistency) return false;
            return true;
        })
        .sort((a, b) => {
            const multiplier = sortAsc ? 1 : -1;
            return (a[sortField] > b[sortField] ? 1 : -1) * multiplier;
        });

    const formatCurrency = (val: number) => {
        if (val >= 1e12) return `${(val / 1e12).toFixed(1)}T`;
        if (val >= 1e9) return `${(val / 1e9).toFixed(0)}B`;
        return val.toLocaleString();
    };

    const renderStars = (count: number) => {
        return Array.from({ length: 5 }).map((_, i) => (
            <Star
                key={i}
                className={`w-3 h-3 ${i < count ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
            />
        ));
    };

    return (
        <div className="min-h-screen bg-[#0a0f1a] p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Coins className="w-8 h-8 text-amber-400" />
                            Dividend Yield Screener
                        </h1>
                        <p className="text-slate-400 mt-1">Tìm cổ phiếu có tỷ suất cổ tức hấp dẫn nhất</p>
                    </div>
                    <Link href="/">
                        <Button variant="outline" className="border-slate-700 text-slate-300">
                            ← Về Dashboard
                        </Button>
                    </Link>
                </div>

                {/* Filters */}
                <GlassCard className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs text-slate-400 uppercase mb-1 block">Tìm kiếm</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input
                                    placeholder="VIB, FPT..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-slate-800/50 border-slate-700"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 uppercase mb-1 block">Yield tối thiểu</label>
                            <select
                                className="w-full h-10 rounded-md bg-slate-800/50 border border-slate-700 text-white px-3"
                                value={filter.minYield}
                                onChange={e => setFilter(f => ({ ...f, minYield: Number(e.target.value) }))}
                            >
                                <option value="0">Tất cả</option>
                                <option value="2">≥ 2%</option>
                                <option value="3">≥ 3%</option>
                                <option value="5">≥ 5%</option>
                                <option value="7">≥ 7%</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 uppercase mb-1 block">Ngành</label>
                            <select
                                className="w-full h-10 rounded-md bg-slate-800/50 border border-slate-700 text-white px-3"
                                value={filter.sector}
                                onChange={e => setFilter(f => ({ ...f, sector: e.target.value }))}
                            >
                                <option value="all">Tất cả ngành</option>
                                {sectors.filter((s): s is string => s !== 'all').map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 uppercase mb-1 block">Độ ổn định</label>
                            <select
                                className="w-full h-10 rounded-md bg-slate-800/50 border border-slate-700 text-white px-3"
                                value={filter.minConsistency}
                                onChange={e => setFilter(f => ({ ...f, minConsistency: Number(e.target.value) }))}
                            >
                                <option value="0">Tất cả</option>
                                <option value="3">≥ 3 sao</option>
                                <option value="4">≥ 4 sao</option>
                                <option value="5">5 sao</option>
                            </select>
                        </div>
                    </div>
                </GlassCard>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <GlassCard className="p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase">Số mã lọc được</p>
                        <p className="text-2xl font-bold text-white">{filteredStocks.length}</p>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase">Yield cao nhất</p>
                        <p className="text-2xl font-bold text-emerald-400">
                            {filteredStocks.length > 0 ? Math.max(...filteredStocks.map(s => s.dividendYield)).toFixed(2) : 0}%
                        </p>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase">Yield trung bình</p>
                        <p className="text-2xl font-bold text-amber-400">
                            {filteredStocks.length > 0
                                ? (filteredStocks.reduce((s, x) => s + x.dividendYield, 0) / filteredStocks.length).toFixed(2)
                                : 0}%
                        </p>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase">5 sao</p>
                        <p className="text-2xl font-bold text-indigo-400">
                            {filteredStocks.filter(s => s.consistencyScore === 5).length} mã
                        </p>
                    </GlassCard>
                </div>

                {/* Table */}
                <GlassCard className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase">#</th>
                                    <th
                                        className="p-3 text-left text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-white"
                                        onClick={() => handleSort('symbol')}
                                    >
                                        <span className="flex items-center gap-1">
                                            Mã <ArrowUpDown className="w-3 h-3" />
                                        </span>
                                    </th>
                                    <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase">Tên</th>
                                    <th className="p-3 text-right text-xs font-bold text-slate-400 uppercase">Giá</th>
                                    <th
                                        className="p-3 text-right text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-white"
                                        onClick={() => handleSort('dividendYield')}
                                    >
                                        <span className="flex items-center justify-end gap-1">
                                            Yield <ArrowUpDown className="w-3 h-3" />
                                        </span>
                                    </th>
                                    <th
                                        className="p-3 text-right text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-white"
                                        onClick={() => handleSort('stockDividendRatio')}
                                    >
                                        <span className="flex items-center justify-end gap-1">
                                            CP Thưởng <ArrowUpDown className="w-3 h-3" />
                                        </span>
                                    </th>
                                    <th
                                        className="p-3 text-center text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-white"
                                        onClick={() => handleSort('consistencyScore')}
                                    >
                                        <span className="flex items-center justify-center gap-1">
                                            Ổn định <ArrowUpDown className="w-3 h-3" />
                                        </span>
                                    </th>
                                    <th className="p-3 text-right text-xs font-bold text-slate-400 uppercase">Ngành</th>
                                    <th className="p-3 text-center text-xs font-bold text-slate-400 uppercase">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredStocks.map((stock, idx) => (
                                    <tr key={stock.symbol} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-3 text-slate-500">{idx + 1}</td>
                                        <td className="p-3">
                                            <span className="font-bold text-white">{stock.symbol}</span>
                                        </td>
                                        <td className="p-3 text-slate-300 max-w-[200px] truncate">{stock.name}</td>
                                        <td className="p-3 text-right font-mono text-white">
                                            {(stock.currentPrice / 1000).toFixed(1)}K
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className={`font-bold font-mono ${stock.dividendYield >= 5 ? 'text-emerald-400' :
                                                stock.dividendYield >= 3 ? 'text-amber-400' : 'text-slate-300'
                                                }`}>
                                                {stock.dividendYield.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="p-3 text-right font-mono text-indigo-400">
                                            {stock.stockDividendRatio > 0 ? `${(stock.stockDividendRatio * 100).toFixed(0)}%` : '-'}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-center gap-0.5">
                                                {renderStars(stock.consistencyScore)}
                                            </div>
                                        </td>
                                        <td className="p-3 text-right text-slate-400 text-xs">{stock.sector}</td>
                                        <td className="p-3 text-center">
                                            <Link href={`/?symbol=${stock.symbol}`}>
                                                <Button size="sm" variant="ghost" className="text-indigo-400 hover:text-indigo-300">
                                                    Phân tích <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                {/* Legend */}
                <div className="flex flex-wrap gap-6 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-emerald-400"></span>
                        Yield ≥ 5%
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-amber-400"></span>
                        Yield 3-5%
                    </div>
                    <div className="flex items-center gap-2">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        Độ ổn định: Chia cổ tức đều đặn qua các năm
                    </div>
                </div>
            </div>
        </div>
    );
}
