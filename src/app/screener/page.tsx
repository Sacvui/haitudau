'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    ChevronRight,
    AlertCircle,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import { ScreenerSkeleton } from '@/components/ui/skeleton';

interface StockDividendData {
    symbol: string;
    name: string;
    currentPrice: number;
    dividendPerShare: number;
    dividendYield: number;
    dividendHistory: { year: number; dividend: number; yield: number }[];
    stockDividendRatio: number;
    payoutFrequency: string;
    sector: string;
    marketCap: number;
    consistencyScore: number;
}

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
    const [error, setError] = useState<string | null>(null);
    const [dataSource, setDataSource] = useState<string>('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/stock/screener');
            const result = await res.json();

            if (result.success && result.data && result.data.length > 0) {
                setStocks(result.data);
                setDataSource('realtime');
            } else {
                throw new Error(result.error || 'Không có dữ liệu từ API');
            }
        } catch (err) {
            console.error("Error fetching screener data:", err);
            setError('Không thể tải dữ liệu realtime. Vui lòng thử lại.');
            setStocks([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const sectors = useMemo(() => {
        if (stocks.length === 0) return ['all'];
        return ['all', ...new Set(stocks.map(s => s.sector))];
    }, [stocks]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(false);
        }
    };

    const filteredStocks = useMemo(() => {
        return stocks
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
    }, [stocks, searchQuery, filter, sortField, sortAsc]);

    const renderStars = (count: number) => {
        return Array.from({ length: 5 }).map((_, i) => (
            <Star
                key={i}
                className={`w-3 h-3 ${i < count ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
            />
        ));
    };

    const getSafetyStatus = (stock: StockDividendData) => {
        if (stock.dividendYield > 12) {
            return { label: 'Cảnh Báo', color: 'bg-rose-500/20 text-rose-400 border-rose-500/50', icon: '☢️' };
        }
        if (stock.consistencyScore >= 4 && stock.dividendYield >= 1 && stock.dividendYield <= 10) {
            return { label: 'An Toàn', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50', icon: '🛡️' };
        }
        if (stock.consistencyScore <= 2) {
            return { label: 'Bấp Bênh', color: 'bg-orange-500/20 text-orange-400 border-orange-500/50', icon: '⚠️' };
        }
        return { label: 'Trung Bình', color: 'bg-slate-500/20 text-slate-400 border-slate-500/50', icon: '➖' };
    };

    // Stats
    const stats = useMemo(() => {
        if (filteredStocks.length === 0) return { count: 0, maxYield: 0, avgYield: 0, fiveStarCount: 0 };
        return {
            count: filteredStocks.length,
            maxYield: Math.max(...filteredStocks.map(s => s.dividendYield)),
            avgYield: filteredStocks.reduce((s, x) => s + x.dividendYield, 0) / filteredStocks.length,
            fiveStarCount: filteredStocks.filter(s => s.consistencyScore === 5).length,
        };
    }, [filteredStocks]);

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
                        <p className="text-slate-400 mt-1 flex items-center gap-2">
                            Tìm cổ phiếu có tỷ suất cổ tức hấp dẫn nhất
                            {dataSource === 'realtime' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    ● LIVE
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="border-slate-700 text-slate-300 hover:text-white"
                            onClick={fetchData}
                            disabled={loading}
                            title="Làm mới dữ liệu"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Link href="/">
                            <Button variant="outline" className="border-slate-700 text-slate-300">
                                ← Về Dashboard
                            </Button>
                        </Link>
                    </div>
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
                        <p className="text-2xl font-bold text-white">{stats.count}</p>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase">Yield cao nhất</p>
                        <p className="text-2xl font-bold text-emerald-400">{stats.maxYield.toFixed(2)}%</p>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase">Yield trung bình</p>
                        <p className="text-2xl font-bold text-amber-400">{stats.avgYield.toFixed(2)}%</p>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase">5 sao</p>
                        <p className="text-2xl font-bold text-indigo-400">{stats.fiveStarCount} mã</p>
                    </GlassCard>
                </div>

                {/* Error State */}
                {error && !loading && (
                    <GlassCard className="p-8 text-center">
                        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                        <p className="text-red-300 font-medium mb-1">{error}</p>
                        <p className="text-xs text-slate-500 mb-4">Dữ liệu lấy từ SSI iBoard API. API có thể tạm thời không phản hồi.</p>
                        <Button
                            onClick={fetchData}
                            className="bg-indigo-600 hover:bg-indigo-500"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" /> Thử lại
                        </Button>
                    </GlassCard>
                )}

                {/* Table */}
                {(!error || stocks.length > 0) && (
                    <GlassCard className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase">#</th>
                                        <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase">An Toàn</th>
                                        <th
                                            className="p-3 text-left text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('symbol')}
                                        >
                                            <span className="flex items-center gap-1">
                                                Mã <ArrowUpDown className={`w-3 h-3 ${sortField === 'symbol' ? 'text-indigo-400' : ''}`} />
                                            </span>
                                        </th>
                                        <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase">Tên</th>
                                        <th className="p-3 text-right text-xs font-bold text-slate-400 uppercase">Giá</th>
                                        <th
                                            className="p-3 text-right text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('dividendYield')}
                                        >
                                            <span className="flex items-center justify-end gap-1">
                                                Yield <ArrowUpDown className={`w-3 h-3 ${sortField === 'dividendYield' ? 'text-indigo-400' : ''}`} />
                                            </span>
                                        </th>
                                        <th
                                            className="p-3 text-right text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('stockDividendRatio')}
                                        >
                                            <span className="flex items-center justify-end gap-1">
                                                CP Thưởng <ArrowUpDown className={`w-3 h-3 ${sortField === 'stockDividendRatio' ? 'text-indigo-400' : ''}`} />
                                            </span>
                                        </th>
                                        <th
                                            className="p-3 text-center text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('consistencyScore')}
                                        >
                                            <span className="flex items-center justify-center gap-1">
                                                Ổn định <ArrowUpDown className={`w-3 h-3 ${sortField === 'consistencyScore' ? 'text-indigo-400' : ''}`} />
                                            </span>
                                        </th>
                                        <th className="p-3 text-right text-xs font-bold text-slate-400 uppercase">Ngành</th>
                                        <th className="p-3 text-center text-xs font-bold text-slate-400 uppercase">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        <tr><td colSpan={10}><ScreenerSkeleton /></td></tr>
                                    ) : filteredStocks.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="p-8 text-center text-slate-500">
                                                Không tìm thấy cổ phiếu phù hợp với bộ lọc.
                                            </td>
                                        </tr>
                                    ) : filteredStocks.map((stock, idx) => {
                                        const safety = getSafetyStatus(stock);
                                        return (
                                            <tr key={stock.symbol} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="p-3 text-slate-500">{idx + 1}</td>
                                                <td className="p-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${safety.color}`}>
                                                        {safety.icon} {safety.label}
                                                    </span>
                                                </td>
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
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                )}

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
