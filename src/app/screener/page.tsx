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

// Sample data - In production, this would come from API
const SAMPLE_STOCKS: StockDividendData[] = [
    {
        symbol: 'VIB',
        name: 'Ngân hàng TMCP Quốc tế',
        currentPrice: 24500,
        dividendPerShare: 500,
        dividendYield: 2.04,
        dividendHistory: [
            { year: 2023, dividend: 500, yield: 2.1 },
            { year: 2022, dividend: 400, yield: 1.8 },
            { year: 2021, dividend: 300, yield: 1.5 },
        ],
        stockDividendRatio: 0.15,
        payoutFrequency: 'Annually',
        sector: 'Ngân hàng',
        marketCap: 55000e9,
        consistencyScore: 4,
    },
    {
        symbol: 'FPT',
        name: 'Tập đoàn FPT',
        currentPrice: 125000,
        dividendPerShare: 2500,
        dividendYield: 2.0,
        dividendHistory: [
            { year: 2023, dividend: 2500, yield: 2.1 },
            { year: 2022, dividend: 2000, yield: 1.9 },
            { year: 2021, dividend: 1800, yield: 1.7 },
        ],
        stockDividendRatio: 0.10,
        payoutFrequency: 'Semi-annually',
        sector: 'Công nghệ',
        marketCap: 150000e9,
        consistencyScore: 5,
    },
    {
        symbol: 'VNM',
        name: 'Vinamilk',
        currentPrice: 72000,
        dividendPerShare: 3500,
        dividendYield: 4.86,
        dividendHistory: [
            { year: 2023, dividend: 3500, yield: 4.9 },
            { year: 2022, dividend: 3800, yield: 5.2 },
            { year: 2021, dividend: 4000, yield: 5.5 },
        ],
        stockDividendRatio: 0,
        payoutFrequency: 'Quarterly',
        sector: 'Tiêu dùng',
        marketCap: 145000e9,
        consistencyScore: 5,
    },
    {
        symbol: 'HPG',
        name: 'Tập đoàn Hòa Phát',
        currentPrice: 28000,
        dividendPerShare: 500,
        dividendYield: 1.78,
        dividendHistory: [
            { year: 2023, dividend: 500, yield: 1.8 },
            { year: 2022, dividend: 1000, yield: 3.2 },
            { year: 2021, dividend: 2500, yield: 5.0 },
        ],
        stockDividendRatio: 0.05,
        payoutFrequency: 'Annually',
        sector: 'Thép',
        marketCap: 130000e9,
        consistencyScore: 3,
    },
    {
        symbol: 'MBB',
        name: 'Ngân hàng Quân đội',
        currentPrice: 21500,
        dividendPerShare: 800,
        dividendYield: 3.72,
        dividendHistory: [
            { year: 2023, dividend: 800, yield: 3.7 },
            { year: 2022, dividend: 600, yield: 2.9 },
            { year: 2021, dividend: 500, yield: 2.5 },
        ],
        stockDividendRatio: 0.20,
        payoutFrequency: 'Annually',
        sector: 'Ngân hàng',
        marketCap: 95000e9,
        consistencyScore: 4,
    },
    {
        symbol: 'VCB',
        name: 'Vietcombank',
        currentPrice: 92000,
        dividendPerShare: 1800,
        dividendYield: 1.96,
        dividendHistory: [
            { year: 2023, dividend: 1800, yield: 2.0 },
            { year: 2022, dividend: 1500, yield: 1.7 },
            { year: 2021, dividend: 1200, yield: 1.4 },
        ],
        stockDividendRatio: 0.30,
        payoutFrequency: 'Annually',
        sector: 'Ngân hàng',
        marketCap: 450000e9,
        consistencyScore: 5,
    },
    {
        symbol: 'DGC',
        name: 'Hóa chất Đức Giang',
        currentPrice: 85000,
        dividendPerShare: 6000,
        dividendYield: 7.06,
        dividendHistory: [
            { year: 2023, dividend: 6000, yield: 7.1 },
            { year: 2022, dividend: 8000, yield: 9.0 },
            { year: 2021, dividend: 4000, yield: 5.0 },
        ],
        stockDividendRatio: 0,
        payoutFrequency: 'Semi-annually',
        sector: 'Hóa chất',
        marketCap: 45000e9,
        consistencyScore: 4,
    },
    {
        symbol: 'PNJ',
        name: 'Vàng bạc đá quý Phú Nhuận',
        currentPrice: 105000,
        dividendPerShare: 3000,
        dividendYield: 2.86,
        dividendHistory: [
            { year: 2023, dividend: 3000, yield: 2.9 },
            { year: 2022, dividend: 2800, yield: 2.7 },
            { year: 2021, dividend: 2500, yield: 2.5 },
        ],
        stockDividendRatio: 0.05,
        payoutFrequency: 'Annually',
        sector: 'Bán lẻ',
        marketCap: 35000e9,
        consistencyScore: 5,
    },
];

type SortField = 'dividendYield' | 'consistencyScore' | 'stockDividendRatio' | 'marketCap' | 'symbol';

export default function DividendScreenerPage() {
    const [stocks, setStocks] = useState<StockDividendData[]>(SAMPLE_STOCKS);
    const [sortField, setSortField] = useState<SortField>('dividendYield');
    const [sortAsc, setSortAsc] = useState(false);
    const [filter, setFilter] = useState({
        minYield: 0,
        sector: 'all',
        minConsistency: 0,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const sectors = ['all', ...new Set(SAMPLE_STOCKS.map(s => s.sector))];

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
                                {sectors.filter(s => s !== 'all').map(s => (
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
