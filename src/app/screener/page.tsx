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
    Loader2,
    Calendar,
    ChevronLeft,
    Gift,
    ArrowRight,
    ArrowLeft,
    PieChart,
    Lock,
    Unlock,
    X
} from 'lucide-react';
import Link from 'next/link';
import { ScreenerSkeleton } from '@/components/ui/skeleton';
import dividendsData from '@/data/dividends.json';

// --- Shared Types & Data ---
interface StockDividendData {
    symbol: string;
    name: string;
    currentPrice: number;
    changePercent: number; // For short term rec
    volume: number;        // For short term rec
    dividendPerShare: number;
    dividendYield: number;
    dividendHistory: { year: number; dividend: number; yield: number }[];
    stockDividendRatio: number;
    payoutFrequency: string;
    sector: string;
    marketCap: number;
    consistencyScore: number;
}

interface DividendEvent {
    symbol: string;
    exDate: string;
    type: 'cash' | 'stock';
    value: number;
    description: string;
}

type SortField = 'dividendYield' | 'consistencyScore' | 'stockDividendRatio' | 'marketCap' | 'symbol' | 'shortTermRec' | 'longTermRec';

// Recommendations Scoring Helpers (for sorting)
const getShortTermScore = (stock: StockDividendData) => {
    if (stock.changePercent >= 1.5) return 3; // TÍCH CỰC
    if (stock.changePercent <= -1.5) return 1; // TIÊU CỰC
    return 2; // TRUNG LẬP
};

const getLongTermScore = (stock: StockDividendData) => {
    if (stock.consistencyScore >= 4 && stock.dividendYield >= 5) return 3; // MUA
    if (stock.consistencyScore >= 3 || stock.dividendYield >= 3) return 2; // NẮM GIỮ
    return 1; // ĐỨNG NGOÀI
};

// Parse calendar data from JSON
const ALL_DIVIDENDS: DividendEvent[] = Object.entries(dividendsData).flatMap(([symbol, events]) =>
    (events as any[]).map(e => ({
        symbol,
        exDate: e.exDate,
        type: e.type as 'cash' | 'stock',
        value: e.value,
        description: e.description
    }))
).sort((a, b) => new Date(b.exDate).getTime() - new Date(a.exDate).getTime());

const groupByMonth = (events: DividendEvent[]) => {
    const groups: Record<string, DividendEvent[]> = {};
    events.forEach(e => {
        const month = e.exDate.substring(0, 7); // YYYY-MM
        if (!groups[month]) groups[month] = [];
        groups[month].push(e);
    });
    return groups;
};

// --- Main Page Component ---
export default function DividendScreenerPage() {
    // Top-Level UI State
    const [activeTab, setActiveTab] = useState<'screener' | 'calendar'>('screener');

    // === SCREENER STATE === //
    const [selectedGroup, setSelectedGroup] = useState<'vn30' | 'vn100' | 'top20'>('vn30');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authUsername, setAuthUsername] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [pendingGroup, setPendingGroup] = useState<'vn100' | 'top20' | null>(null);

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
        if (activeTab === 'calendar') return; // Skip fetch if only viewing calendar

        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/stock/screener?group=' + selectedGroup);
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
    }, [activeTab, selectedGroup]);

    useEffect(() => {
        if (activeTab === 'screener' && stocks.length === 0) {
            fetchData();
        }
    }, [activeTab, selectedGroup, fetchData, stocks.length]);

    const handleGroupChange = (group: 'vn30' | 'vn100' | 'top20') => {
        if (group !== 'vn30' && !isAuthenticated) {
            setPendingGroup(group);
            setShowAuthModal(true);
            return;
        }
        setStocks([]); // clear old data to trigger loading UI
        setSelectedGroup(group);
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (authUsername === 'HaiLP' && authPassword === 'DautuTudau') {
            setIsAuthenticated(true);
            setShowAuthModal(false);
            setAuthError('');
            if (pendingGroup) {
                setSelectedGroup(pendingGroup);
                setStocks([]);
                setPendingGroup(null);
            }
        } else {
            setAuthError('Sai tên đăng nhập hoặc mật khẩu!');
        }
    };

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
                if (sortField === 'shortTermRec') return (getShortTermScore(a) > getShortTermScore(b) ? 1 : -1) * multiplier;
                if (sortField === 'longTermRec') return (getLongTermScore(a) > getLongTermScore(b) ? 1 : -1) * multiplier;
                return ((a[sortField as keyof StockDividendData] ?? 0) > (b[sortField as keyof StockDividendData] ?? 0) ? 1 : -1) * multiplier;
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

    const getShortTermRec = (stock: StockDividendData) => {
        if (stock.changePercent >= 1.5) return { label: 'TÍCH CỰC', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
        if (stock.changePercent <= -1.5) return { label: 'TIÊU CỰC', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
        return { label: 'TRUNG LẬP', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
    };

    const getLongTermRec = (stock: StockDividendData) => {
        if (stock.consistencyScore >= 4 && stock.dividendYield >= 5) return { label: 'MUA', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
        if (stock.consistencyScore >= 3 || stock.dividendYield >= 3) return { label: 'NẮM GIỮ', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
        return { label: 'ĐỨNG NGOÀI', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
    };

    const stats = useMemo(() => {
        if (filteredStocks.length === 0) return { count: 0, maxYield: 0, avgYield: 0, fiveStarCount: 0 };
        return {
            count: filteredStocks.length,
            maxYield: Math.max(...filteredStocks.map(s => s.dividendYield)),
            avgYield: filteredStocks.reduce((s, x) => s + x.dividendYield, 0) / filteredStocks.length,
            fiveStarCount: filteredStocks.filter(s => s.consistencyScore === 5).length,
        };
    }, [filteredStocks]);

    // === CALENDAR STATE === //
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedType, setSelectedType] = useState<'all' | 'cash' | 'stock'>('all');

    const yearDividends = useMemo(() => {
        return ALL_DIVIDENDS.filter(d => {
            const year = new Date(d.exDate).getFullYear();
            if (year !== selectedYear) return false;
            if (selectedType !== 'all' && d.type !== selectedType) return false;
            return true;
        });
    }, [selectedYear, selectedType]);

    const monthlyGroups = useMemo(() => groupByMonth(yearDividends), [yearDividends]);

    const calStats = useMemo(() => {
        const cash = yearDividends.filter(d => d.type === 'cash');
        const stock = yearDividends.filter(d => d.type === 'stock');
        const uniqueSymbols = new Set(yearDividends.map(d => d.symbol));
        return {
            total: yearDividends.length,
            cashCount: cash.length,
            stockCount: stock.length,
            companiesCount: uniqueSymbols.size,
        };
    }, [yearDividends]);

    const months = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];

    const formatValue = (type: 'cash' | 'stock', value: number) => {
        if (type === 'cash') {
            return `${value.toLocaleString()}đ/CP`;
        }
        return `${value}%`;
    };

    return (
        <div className="min-h-screen bg-[#0a0f1a] p-4 md:p-6 custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Navigation Header */}
                <div className="flex items-center justify-between mb-2">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/25 transition-all">
                            <PieChart className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                            HẢI TỰ ĐẦU
                        </span>
                    </Link>
                    <Link href="/">
                        <Button variant="ghost" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Về Trang Chủ
                        </Button>
                    </Link>
                </div>

                {/* Unified Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Target className="w-8 h-8 text-indigo-400" />
                            Bộ Lọc Cổ Phiếu
                        </h1>
                        <p className="text-slate-400 mt-1 flex items-center gap-2">
                            Khám phá và phân tích cơ hội đầu tư trên thị trường
                        </p>
                    </div>
                </div>

                {/* Unified Tabs */}
                <div className="flex border-b border-slate-800">
                    <button
                        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'screener' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                        onClick={() => setActiveTab('screener')}
                    >
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Bộ Lọc Cơ Hội
                        </div>
                    </button>
                    <button
                        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'calendar' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                        onClick={() => setActiveTab('calendar')}
                    >
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Lịch Cổ Tức
                        </div>
                    </button>
                </div>

                {/* =========================================
                    TAB 1 content: SCREENER 
                ========================================= */}
                {activeTab === 'screener' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Group Selection Tabs */}
                        <GlassCard className="p-2 border-slate-800 backdrop-blur-md">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant={selectedGroup === 'vn30' ? 'default' : 'ghost'}
                                    onClick={() => handleGroupChange('vn30')}
                                    className={selectedGroup === 'vn30' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                                >
                                    Cơ Bản (VN30)
                                </Button>
                                <Button
                                    variant={selectedGroup === 'vn100' ? 'default' : 'ghost'}
                                    onClick={() => handleGroupChange('vn100')}
                                    className={selectedGroup === 'vn100' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                                >
                                    {isAuthenticated ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                                    Nâng Cao (VN100)
                                </Button>
                                <Button
                                    variant={selectedGroup === 'top20' ? 'default' : 'ghost'}
                                    onClick={() => handleGroupChange('top20')}
                                    className={selectedGroup === 'top20' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-emerald-400'}
                                >
                                    {isAuthenticated ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                                    Top 20 Khuyến Nghị
                                </Button>
                            </div>
                        </GlassCard>

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
                                <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Danh Sách Lọc</h3>
                                        {dataSource === 'realtime' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                ● LIVE
                                            </span>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-400 hover:text-white"
                                        onClick={fetchData}
                                        disabled={loading}
                                    >
                                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                        Cập nhật
                                    </Button>
                                </div>
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
                                                <th
                                                    className="p-3 text-center text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-white transition-colors"
                                                    onClick={() => handleSort('shortTermRec')}
                                                >
                                                    <span className="flex items-center justify-center gap-1">
                                                        KN Ngắn Hạn <ArrowUpDown className={`w-3 h-3 ${sortField === 'shortTermRec' ? 'text-indigo-400' : ''}`} />
                                                    </span>
                                                </th>
                                                <th
                                                    className="p-3 text-center text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-white transition-colors"
                                                    onClick={() => handleSort('longTermRec')}
                                                >
                                                    <span className="flex items-center justify-center gap-1">
                                                        KN Dài Hạn <ArrowUpDown className={`w-3 h-3 ${sortField === 'longTermRec' ? 'text-indigo-400' : ''}`} />
                                                    </span>
                                                </th>
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
                                                        <td className="p-3 text-center">
                                                            <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold border ${getShortTermRec(stock).color}`}>
                                                                {getShortTermRec(stock).label}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold border ${getLongTermRec(stock).color}`}>
                                                                {getLongTermRec(stock).label}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Link href={`/valuation?symbol=${stock.symbol}`}>
                                                                <Button size="sm" variant="ghost" className="text-indigo-400 hover:text-indigo-300">
                                                                    Định giá <ChevronRight className="w-4 h-4" />
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
                )}

                {/* =========================================
                    TAB 2 content: CALENDAR
                ========================================= */}
                {activeTab === 'calendar' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Year Selector & Filters */}
                        <GlassCard className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Year Navigation */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedYear(y => y - 1)}
                                        className="text-slate-400 hover:text-white"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </Button>
                                    <span className="text-2xl font-bold text-white min-w-[80px] text-center">
                                        {selectedYear}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedYear(y => y + 1)}
                                        className="text-slate-400 hover:text-white"
                                        disabled={selectedYear >= new Date().getFullYear() + 1}
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </Button>
                                </div>

                                {/* Type Filter */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant={selectedType === 'all' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSelectedType('all')}
                                        className={selectedType === 'all' ? 'bg-indigo-600' : 'border-slate-700 text-slate-300'}
                                    >
                                        Tất cả
                                    </Button>
                                    <Button
                                        variant={selectedType === 'cash' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSelectedType('cash')}
                                        className={selectedType === 'cash' ? 'bg-amber-600' : 'border-slate-700 text-slate-300'}
                                    >
                                        <Coins className="w-4 h-4 mr-1" />
                                        Tiền mặt
                                    </Button>
                                    <Button
                                        variant={selectedType === 'stock' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSelectedType('stock')}
                                        className={selectedType === 'stock' ? 'bg-purple-600' : 'border-slate-700 text-slate-300'}
                                    >
                                        <Gift className="w-4 h-4 mr-1" />
                                        Cổ phiếu
                                    </Button>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Calendar Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <GlassCard className="p-4 text-center">
                                <p className="text-xs text-slate-500 uppercase">Tổng sự kiện</p>
                                <p className="text-2xl font-bold text-white">{calStats.total}</p>
                            </GlassCard>
                            <GlassCard className="p-4 text-center">
                                <p className="text-xs text-slate-500 uppercase">Tiền mặt</p>
                                <p className="text-2xl font-bold text-amber-400">{calStats.cashCount}</p>
                            </GlassCard>
                            <GlassCard className="p-4 text-center">
                                <p className="text-xs text-slate-500 uppercase">Cổ phiếu</p>
                                <p className="text-2xl font-bold text-purple-400">{calStats.stockCount}</p>
                            </GlassCard>
                            <GlassCard className="p-4 text-center">
                                <p className="text-xs text-slate-500 uppercase">Số công ty</p>
                                <p className="text-2xl font-bold text-emerald-400">{calStats.companiesCount}</p>
                            </GlassCard>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {months.map((monthName, idx) => {
                                const monthKey = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
                                const events = monthlyGroups[monthKey] || [];
                                const hasEvents = events.length > 0;

                                return (
                                    <GlassCard
                                        key={monthKey}
                                        className={`p-4 ${hasEvents ? '' : 'opacity-40'}`}
                                    >
                                        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                                            <h3 className="font-bold text-slate-200">{monthName}</h3>
                                            {hasEvents && (
                                                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                                    {events.length} LỊCH
                                                </span>
                                            )}
                                        </div>

                                        {hasEvents ? (
                                            <div className="space-y-2 max-h-[200px] overflow-y-auto px-1 custom-scrollbar">
                                                {events.map((event, i) => (
                                                    <Link
                                                        key={i}
                                                        href={`/?symbol=${event.symbol}`}
                                                        className="block"
                                                    >
                                                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-slate-700 transition-colors group">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-1.5 rounded-md ${event.type === 'cash' ? 'bg-amber-500/10 text-amber-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                                                    {event.type === 'cash' ? (
                                                                        <Coins className="w-3.5 h-3.5" />
                                                                    ) : (
                                                                        <Gift className="w-3.5 h-3.5" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-white text-sm leading-tight">{event.symbol}</p>
                                                                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                                                        {new Date(event.exDate).toLocaleDateString('vi-VN')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right flex items-center gap-2">
                                                                <p className={`text-sm font-mono font-bold ${event.type === 'cash' ? 'text-amber-400' : 'text-purple-400'}`}>
                                                                    {formatValue(event.type, event.value)}
                                                                </p>
                                                                <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100" />
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-6 text-slate-600">
                                                <Calendar className="w-6 h-6 mb-2 opacity-50" />
                                                <p className="text-xs uppercase tracking-wider">Không có lịch</p>
                                            </div>
                                        )}
                                    </GlassCard>
                                );
                            })}
                        </div>

                        {/* Calendar Legend */}
                        <div className="flex flex-wrap gap-6 text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                                <Coins className="w-4 h-4 text-amber-400" />
                                Thưởng bằng Tiền mặt (VND/cổ phiếu)
                            </div>
                            <div className="flex items-center gap-2">
                                <Gift className="w-4 h-4 text-purple-400" />
                                Thưởng bằng Cổ phiếu (% tỷ lệ)
                            </div>
                        </div>
                    </div>
                )}

                {/* Auth Modal */}
                {showAuthModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f1a]/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                        <GlassCard className="w-full max-w-md p-6 relative shadow-2xl shadow-indigo-500/10 border-indigo-500/20">
                            <button
                                onClick={() => setShowAuthModal(false)}
                                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="text-center mb-6">
                                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-3">
                                    <Lock className="w-6 h-6 text-indigo-400" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">
                                    Xác Thực Thành Viên
                                </h2>
                                <p className="text-sm text-slate-400">
                                    Gói Dữ liệu Nâng Cao và Khuyến nghị Chuyên sâu chỉ dành riêng cho khách hàng VIP.
                                </p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Tên Đăng Nhập</label>
                                    <Input
                                        type="text"
                                        value={authUsername}
                                        onChange={(e) => setAuthUsername(e.target.value)}
                                        className="bg-slate-900/50 border-slate-700/50 text-white h-11 focus-visible:ring-indigo-500/50"
                                        placeholder="Nhập tên đăng nhập"
                                        required
                                        autoComplete="off"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Mật Khẩu</label>
                                    <Input
                                        type="password"
                                        value={authPassword}
                                        onChange={(e) => setAuthPassword(e.target.value)}
                                        className="bg-slate-900/50 border-slate-700/50 text-white h-11 focus-visible:ring-indigo-500/50"
                                        placeholder="Nhập mật khẩu"
                                        required
                                    />
                                </div>

                                {authError && (
                                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center">
                                        {authError}
                                    </div>
                                )}

                                <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-wide mt-2">
                                    <Unlock className="w-4 h-4 mr-2" /> ĐĂNG NHẬP
                                </Button>
                            </form>
                        </GlassCard>
                    </div>
                )}
            </div>
        </div>
    );
}
