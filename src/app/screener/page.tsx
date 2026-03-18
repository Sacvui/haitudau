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
import { Logo } from '@/components/ui/Logo';
import { ScreenerSkeleton } from '@/components/ui/skeleton';
import dividendsData from '@/data/dividends.json';

// --- Shared Types & Data ---
interface StockDividendData {
    symbol: string;
    name: string;
    currentPrice: number;
    changePercent: number; // For short term rec
    volume: number;        // For short term rec
    volumeRatio: number;   // For Smart Money signal
    dividendPerShare: number;
    dividendYield: number;
    dividendHistory: { year: number; dividend: number; yield: number }[];
    stockDividendRatio: number;
    payoutFrequency: string;
    sector: string;
    marketCap: number;
    consistencyScore: number;
    intrinsicValue: number; // Long-term intrinsic value
    shortTermTarget: number; // Short-term relative target
}

interface DividendEvent {
    symbol: string;
    exDate: string;
    type: 'cash' | 'stock';
    value: number;
    description: string;
}

interface SectorStat {
    sector: string;
    totalVolume: number;
    averageChange: number;
    advancing: number;
    declining: number;
    averageVolumeRatio: number;
    count: number;
}

type SortField = 'dividendYield' | 'consistencyScore' | 'stockDividendRatio' | 'marketCap' | 'symbol' | 'shortTermRec' | 'longTermRec' | 'volumeRatio' | 'intrinsicValue';

// Recommendations Scoring Helpers (Multi-Factor, for sorting and display)
const getShortTermScore = (stock: StockDividendData) => {
    // Multi-factor: Momentum (30%) + Smart Flow (40%) + Intrinsic Margin (30%)
    const momentumPts = stock.changePercent >= 1.5 ? 3 : (stock.changePercent <= -1.5 ? 1 : 2);
    const flowPts = stock.volumeRatio >= 1.5 ? 3 : (stock.volumeRatio < 0.8 ? 1 : 2);
    const margin = stock.intrinsicValue > 0 && stock.currentPrice > 0
        ? ((stock.intrinsicValue - stock.currentPrice) / stock.currentPrice) * 100
        : 0;
    const marginPts = margin > 5 ? 3 : (margin < -10 ? 1 : 2);

    const score = momentumPts * 0.3 + flowPts * 0.4 + marginPts * 0.3;
    if (score >= 2.4) return 3; // TÍCH CỰC
    if (score <= 1.5) return 1; // TIÊU CỰC
    return 2; // TRUNG LẬP
};

const getLongTermScore = (stock: StockDividendData) => {
    // Multi-factor: Consistency (25%) + Yield (25%) + Sector Growth (25%) + Intrinsic Margin (25%)
    const consistencyPts = stock.consistencyScore >= 4 ? 3 : (stock.consistencyScore >= 2 ? 2 : 1);
    const yieldPts = stock.dividendYield >= 5 ? 3 : (stock.dividendYield >= 2 ? 2 : 1);

    const growthSectors = ['Công nghệ', 'Bán lẻ', 'Hóa chất', 'Thép'];
    const sectorPts = growthSectors.includes(stock.sector) ? 3 : 2;

    const margin = stock.intrinsicValue > 0 && stock.currentPrice > 0
        ? ((stock.intrinsicValue - stock.currentPrice) / stock.currentPrice) * 100
        : 0;
    const marginPts = margin > 5 ? 3 : (margin < -10 ? 1 : 2);

    const score = consistencyPts * 0.25 + yieldPts * 0.25 + sectorPts * 0.25 + marginPts * 0.25;
    if (score >= 2.5) return 3; // MUA
    if (score >= 1.8) return 2; // NẮM GIỮ
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
    const [selectedGroup, setSelectedGroup] = useState<'vn30' | 'vn100' | 'quality100' | 'top20'>('vn30');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authUsername, setAuthUsername] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [pendingGroup, setPendingGroup] = useState<'vn100' | 'quality100' | 'top20' | null>(null);
    const [loginLoading, setLoginLoading] = useState(false);
    const [userPermissions, setUserPermissions] = useState<{ vn100: boolean; quality100?: boolean; top20: boolean }>({ vn100: false, quality100: false, top20: false });
    const [userName, setUserName] = useState('');

    const [stocks, setStocks] = useState<StockDividendData[]>([]);
    const [sectorStats, setSectorStats] = useState<SectorStat[]>([]);
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
                if (result.sectorStats) {
                    setSectorStats(result.sectorStats);
                }
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

    // Check existing session on mount
    useEffect(() => {
        fetch('/api/auth/me').then(r => r.json()).then(data => {
            if (data.authenticated && data.user) {
                setIsAuthenticated(true);
                setUserPermissions(data.user.permissions || { vn100: false, top20: false });
                setUserName(data.user.displayName || data.user.username);
            }
        }).catch(() => { });
    }, []);

    const handleGroupChange = (group: 'vn30' | 'vn100' | 'quality100' | 'top20') => {
        if (group !== 'vn30') {
            if (!isAuthenticated) {
                setPendingGroup(group);
                setShowAuthModal(true);
                return;
            }
            // Check specific permission
            if (group === 'vn100' && !userPermissions.vn100) {
                setAuthError('Bạn không có quyền truy cập VN100. Liên hệ Admin.');
                setShowAuthModal(true);
                return;
            }
            if (group === 'quality100' && !userPermissions.quality100) {
                setAuthError('Bạn không có quyền truy cập 100 CP Tốt. Liên hệ Admin.');
                setShowAuthModal(true);
                return;
            }
            if (group === 'top20' && !userPermissions.top20) {
                setAuthError('Bạn không có quyền truy cập Top 20. Liên hệ Admin.');
                setShowAuthModal(true);
                return;
            }
        }
        setStocks([]); // clear old data to trigger loading UI
        setSelectedGroup(group);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        setAuthError('');
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: authUsername, password: authPassword }),
            });
            const data = await res.json();
            if (data.success && data.user) {
                setIsAuthenticated(true);
                setUserPermissions(data.user.permissions || { vn100: false, top20: false });
                setUserName(data.user.displayName || data.user.username);
                setShowAuthModal(false);
                setAuthError('');
                if (pendingGroup) {
                    const perm = pendingGroup === 'vn100' ? data.user.permissions?.vn100 : (pendingGroup === 'quality100' ? data.user.permissions?.quality100 : data.user.permissions?.top20);
                    if (perm) {
                        setSelectedGroup(pendingGroup);
                        setStocks([]);
                    } else {
                        setAuthError(`Bạn không có quyền truy cập ${pendingGroup === 'vn100' ? 'VN100' : 'Top 20'}. Liên hệ Admin.`);
                        setShowAuthModal(true);
                    }
                    setPendingGroup(null);
                }
            } else {
                setAuthError(data.error || 'Sai tên đăng nhập hoặc mật khẩu!');
            }
        } catch {
            setAuthError('Lỗi kết nối server');
        } finally {
            setLoginLoading(false);
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

    const getSmartFlowSignal = (stock: StockDividendData) => {
        if (!stock.volumeRatio) return { label: 'Tích Lũy', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30', icon: '➖' };

        if (stock.volumeRatio > 1.5) {
            if (stock.changePercent > 0) {
                return { label: 'Cá Mập Gom', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/50', icon: '🐋' };
            } else if (stock.changePercent < 0) {
                return { label: 'Xả Hàng', color: 'text-rose-400 bg-rose-500/20 border-rose-500/50', icon: '⚠️' };
            }
        }

        if (stock.volumeRatio > 1.2) {
            if (stock.changePercent > 0) {
                return { label: 'Dòng Tiền Vào', color: 'text-indigo-400 bg-indigo-500/20 border-indigo-500/50', icon: '🌊' };
            } else if (stock.changePercent < 0) {
                return { label: 'Cung Tăng', color: 'text-amber-400 bg-amber-500/20 border-amber-500/50', icon: '📉' };
            }
        }

        return { label: 'Tích Lũy', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30', icon: '➖' };
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
                    <Link href="/" className="block">
                        <Logo />
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
                                    className={selectedGroup === 'vn100' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                                >
                                    Tiêu Chuẩn (VN100)
                                </Button>
                                <Button
                                    variant={selectedGroup === 'quality100' ? 'default' : 'ghost'}
                                    onClick={() => handleGroupChange('quality100')}
                                    className={selectedGroup === 'quality100' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                                >
                                    ⭐ 100 CP Tốt
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

                        {/* Sector Heatmap (Sóng Ngành) - Premium Design */}
                        {sectorStats.length > 0 && (
                            <GlassCard className="p-0 border-slate-800 overflow-hidden">
                                {/* Header with gradient */}
                                <div className="relative px-5 py-4 bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-slate-900/10 border-b border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center backdrop-blur-sm">
                                                <PieChart className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-black text-white uppercase tracking-wider">Sóng Ngành</h2>
                                                <p className="text-[10px] text-slate-500">Sector Rotation • Dòng tiền theo ngành</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px]">
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Dẫn sóng</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Hồi phục</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Phân phối</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600" /> Tích lũy</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sector Cards Grid */}
                                <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                    {sectorStats.map((stat, idx) => {
                                        // Sector emoji mapping
                                        const sectorEmoji: Record<string, string> = {
                                            'Ngân hàng': '🏦', 'Bất động sản': '🏗️', 'Công nghệ': '💻',
                                            'Bán lẻ': '🛒', 'Thép': '⚙️', 'Tiêu dùng': '🧴',
                                            'Dầu khí': '⛽', 'Điện': '⚡', 'Hàng không': '✈️',
                                            'Bảo hiểm': '🛡️', 'Chứng khoán': '📈', 'Cao su': '🌳',
                                            'Hóa chất': '🧪', 'Khác': '📦'
                                        };
                                        const emoji = sectorEmoji[stat.sector] || '📦';

                                        // Status classification
                                        const isLeading = stat.averageVolumeRatio > 1.2 && stat.averageChange > 0.5;
                                        const isWeakening = stat.averageVolumeRatio > 1.2 && stat.averageChange < -0.5;
                                        const isRecovering = stat.averageVolumeRatio <= 1.2 && stat.averageChange > 0;

                                        let statusText = 'Tích lũy';
                                        let statusDot = 'bg-slate-500';
                                        let cardBorder = 'border-slate-800';
                                        let cardBg = 'bg-slate-900/30';
                                        let glowColor = '';

                                        if (isLeading) {
                                            statusText = '🔥 Dẫn sóng';
                                            statusDot = 'bg-emerald-500';
                                            cardBorder = 'border-emerald-500/40';
                                            cardBg = 'bg-gradient-to-br from-emerald-500/10 to-emerald-900/5';
                                            glowColor = 'shadow-[0_0_20px_rgba(16,185,129,0.1)]';
                                        } else if (isWeakening) {
                                            statusText = '📉 Phân phối';
                                            statusDot = 'bg-rose-500';
                                            cardBorder = 'border-rose-500/30';
                                            cardBg = 'bg-gradient-to-br from-rose-500/10 to-rose-900/5';
                                        } else if (isRecovering) {
                                            statusText = '📊 Hồi phục';
                                            statusDot = 'bg-indigo-500';
                                            cardBorder = 'border-indigo-500/30';
                                            cardBg = 'bg-gradient-to-br from-indigo-500/10 to-indigo-900/5';
                                        }

                                        // Breadth ratio
                                        const total = stat.advancing + stat.declining;
                                        const breadthPercent = total > 0 ? Math.round((stat.advancing / total) * 100) : 50;

                                        // Volume flow bar width (normalized to max)
                                        const maxVol = Math.max(...sectorStats.map(s => s.averageVolumeRatio));
                                        const volFlowPercent = maxVol > 0 ? Math.round((stat.averageVolumeRatio / maxVol) * 100) : 50;

                                        return (
                                            <div
                                                key={stat.sector}
                                                className={`relative p-4 rounded-xl cursor-pointer transition-all duration-300 border ${cardBorder} ${cardBg} ${glowColor} hover:scale-[1.02] hover:shadow-lg ${filter.sector === stat.sector
                                                        ? 'ring-2 ring-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                                                        : ''
                                                    }`}
                                                onClick={() => setFilter(f => ({ ...f, sector: filter.sector === stat.sector ? 'all' : stat.sector }))}
                                            >
                                                {/* Rank badge */}
                                                {idx < 3 && (
                                                    <div className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' :
                                                            idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-black' :
                                                                'bg-gradient-to-br from-amber-700 to-amber-900 text-amber-200'
                                                        }`}>
                                                        #{idx + 1}
                                                    </div>
                                                )}

                                                {/* Sector name + emoji */}
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-lg">{emoji}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-white truncate" title={stat.sector}>{stat.sector}</p>
                                                        <p className="text-[10px] text-slate-500">{stat.count} mã</p>
                                                    </div>
                                                </div>

                                                {/* Price change + Status */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className={`text-lg font-black font-mono ${stat.averageChange > 0 ? 'text-emerald-400' : stat.averageChange < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                                        {stat.averageChange > 0 ? '+' : ''}{stat.averageChange}%
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full">
                                                        {statusText}
                                                    </span>
                                                </div>

                                                {/* Volume Flow bar */}
                                                <div className="mb-2">
                                                    <div className="flex items-center justify-between text-[10px] mb-1">
                                                        <span className="text-slate-500">Dòng tiền</span>
                                                        <span className="text-indigo-400 font-bold">{stat.averageVolumeRatio}x</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${stat.averageVolumeRatio >= 1.5 ? 'bg-gradient-to-r from-indigo-500 to-purple-500' :
                                                                    stat.averageVolumeRatio >= 1.0 ? 'bg-gradient-to-r from-sky-500 to-indigo-500' :
                                                                        'bg-slate-600'
                                                                }`}
                                                            style={{ width: `${volFlowPercent}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Breadth ratio bar (Advancing vs Declining) */}
                                                <div>
                                                    <div className="flex items-center justify-between text-[10px] mb-1">
                                                        <span className="text-emerald-400/80">{stat.advancing} tăng</span>
                                                        <span className="text-rose-400/80">{stat.declining} giảm</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                                                        <div
                                                            className="h-full bg-emerald-500 transition-all duration-500"
                                                            style={{ width: `${breadthPercent}%` }}
                                                        />
                                                        <div
                                                            className="h-full bg-rose-500 transition-all duration-500"
                                                            style={{ width: `${100 - breadthPercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </GlassCard>
                        )}

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
                                                    onClick={() => handleSort('volumeRatio')}
                                                >
                                                    <span className="flex items-center justify-end gap-1">
                                                        Dòng Tiền <ArrowUpDown className={`w-3 h-3 ${sortField === 'volumeRatio' ? 'text-indigo-400' : ''}`} />
                                                    </span>
                                                </th>
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
                                                    className="p-3 text-right text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-white transition-colors"
                                                    onClick={() => handleSort('intrinsicValue')}
                                                >
                                                    <span className="flex items-center justify-end gap-1">
                                                        Giá Nội Tại <ArrowUpDown className={`w-3 h-3 ${sortField === 'intrinsicValue' ? 'text-indigo-400' : ''}`} />
                                                    </span>
                                                </th>
                                                <th className="p-3 text-right text-xs font-bold text-slate-400 uppercase">
                                                    Mục tiêu
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
                                                <tr><td colSpan={11}><ScreenerSkeleton /></td></tr>
                                            ) : filteredStocks.length === 0 ? (
                                                <tr>
                                                    <td colSpan={11} className="p-8 text-center text-slate-500">
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
                                                            <span title={`Khối lượng: ${(stock.volume / 1000).toFixed(0)}K (Tỷ lệ: ${stock.volumeRatio}x)`} className={`inline-flex items-center gap-1 font-bold font-mono px-2 py-1 rounded text-xs border ${getSmartFlowSignal(stock).color}`}>
                                                                {getSmartFlowSignal(stock).icon} {getSmartFlowSignal(stock).label}
                                                            </span>
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
                                                        <td className="p-3 text-right font-mono">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-white font-bold">{(stock.intrinsicValue / 1000).toFixed(1)}K</span>
                                                                {(() => {
                                                                    const margin = (stock.intrinsicValue - stock.currentPrice) / stock.currentPrice * 100;
                                                                    const isValid = stock.intrinsicValue > 0;
                                                                    if (!isValid) return <span className="text-[10px] text-slate-500">N/A</span>;

                                                                    if (margin >= 15) return <span className="text-[10px] text-emerald-400">Rẻ ({margin.toFixed(0)}%)</span>;
                                                                    if (margin >= -10) return <span className="text-[10px] text-amber-400">Hợp lý</span>;
                                                                    return <span className="text-[10px] text-rose-400">Đắt</span>;
                                                                })()}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-right font-mono">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-amber-400 font-bold">
                                                                    {stock.shortTermTarget > 0 ? `${(stock.shortTermTarget / 1000).toFixed(1)}K` : 'N/A'}
                                                                </span>
                                                                <span className="text-[10px] text-slate-500">Kỳ vọng</span>
                                                            </div>
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
