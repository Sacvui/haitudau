'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '@/components/ui/glass';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Unlock, Plus, Trash2, Edit2, Save, X, Eye, EyeOff, History, Calendar } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { createBrowserClient } from '@supabase/ssr';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface PortfolioItem {
    id: string;
    symbol: string;
    shares: number;
    avgPrice: number;
    note: string;
    date: string;
}

interface StockPrice {
    symbol: string;
    price: number;
    change: number;
}

interface ResultData {
    percentageReturn?: number;
    currentValue?: number;
}

interface SavedAnalysis {
    id: string;
    symbol: string;
    initial_investment: number;
    start_date: string;
    end_date: string;
    result_data: ResultData;
    created_at: string;
}

function createSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        return null;
    }

    return createBrowserClient(url, key);
}

export default function PrivatePortfolioPage() {
    // Parent Auth & Context
    const { user } = useAuth();
    const supabase = useMemo(() => createSupabaseClient(), []);

    // Auth State (Local Vault)
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');

    // Tab State
    const [activeTab, setActiveTab] = useState<'holdings' | 'history'>('holdings');

    // Data State (Holdings)
    const [items, setItems] = useState<PortfolioItem[]>([]);
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);

    // Data State (History)
    const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);

    // Edit/Add State (Holdings)
    const [isAdding, setIsAdding] = useState(false);
    const [newItem, setNewItem] = useState({ symbol: '', shares: '', avgPrice: '', note: '' });

    // 1. Check Vault Session & Fetch Initial Data
    useEffect(() => {
        const vaultAuth = sessionStorage.getItem('private_auth');
        if (vaultAuth === 'true') {
            setIsAuthenticated(true);
            fetchPortfolio();
        }

        if (user) {
            loadAnalyses();
        }
    }, [user]);

    const loadAnalyses = async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from('user_portfolios')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAnalyses(data || []);
        } catch (error) {
            console.error('Error loading analyses:', error);
        }
    };

    const deleteAnalysis = async (id: string) => {
        if (!supabase) return;
        if (!confirm('Bạn có chắc muốn xóa điểm lưu mô phỏng này?')) return;

        try {
            const { error } = await supabase
                .from('user_portfolios')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setAnalyses(prev => prev.filter((a) => a.id !== id));
            toast.success('Đã xóa dữ liệu mô phỏng');
        } catch (error) {
            console.error('Error deleting analysis:', error);
            toast.error('Lỗi khi xóa mô phỏng');
        }
    };

    const formatCurrency = (value: number) => {
        if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)} tỷ`;
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)} tr`;
        return value.toLocaleString('vi-VN');
    };

    // 2. Fetch Portfolio & Prices (Holdings)
    const fetchPortfolio = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/portfolio');
            const result = await res.json();
            if (result.success) {
                setItems(result.data);
                // Fetch prices for these symbols
                const symbols = [...new Set(result.data.map((i: any) => i.symbol))];
                if (symbols.length > 0) {
                    fetchPrices(symbols as string[]);
                }
            }
        } catch (e) {
            toast.error('Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const fetchPrices = async (symbols: string[]) => {
        // Reuse screener API or history API logic. Here we create ad-hoc fetch
        // For MVP, we can reuse /api/stock/screener if it supports query? 
        // Actually /api/stock/screener fetches all VN30. 
        // Let's assume we can use the realtime API we built.
        try {
            const res = await fetch('/api/stock/screener');
            const result = await res.json();
            if (result.success && result.data) {
                const priceMap: Record<string, number> = {};
                result.data.forEach((s: any) => {
                    priceMap[s.symbol] = s.price;
                });
                setPrices(priceMap);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // 3. Handle Login
    const handleUnlock = () => {
        if (password === '11223344') {
            setIsAuthenticated(true);
            sessionStorage.setItem('private_auth', 'true');
            toast.success('Chào mừng quay trở lại, Boss!');
            fetchPortfolio();
        } else {
            toast.error('Mật khẩu sai! Đừng thử nếu không phải chủ nhân.');
        }
    };

    // 4. Handle CRUD
    const handleAdd = async () => {
        if (!newItem.symbol || !newItem.shares || !newItem.avgPrice) {
            toast.warning('Vui lòng nhập đủ thông tin');
            return;
        }

        try {
            const payload = {
                symbol: newItem.symbol.toUpperCase(),
                shares: Number(newItem.shares),
                avgPrice: Number(newItem.avgPrice),
                note: newItem.note
            };

            const res = await fetch('/api/portfolio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add', item: payload })
            });

            const result = await res.json();
            if (result.success) {
                setItems(result.data);
                setIsAdding(false);
                setNewItem({ symbol: '', shares: '', avgPrice: '', note: '' });
                toast.success('Đã thêm vào két sắt');
                // Refresh prices
                fetchPrices([...new Set([...items.map(i => i.symbol), payload.symbol])]);
            }
        } catch (e) {
            toast.error('Lỗi khi lưu');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn chắc chắn muốn xóa?')) return;
        try {
            const res = await fetch('/api/portfolio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id })
            });
            const result = await res.json();
            if (result.success) {
                setItems(result.data);
                toast.success('Đã xóa');
            }
        } catch (e) {
            toast.error('Lỗi xóa');
        }
    };

    // Calculate Totals
    const totalInvested = items.reduce((sum, item) => sum + (item.shares * item.avgPrice), 0);
    const currentMarketValue = items.reduce((sum, item) => {
        const price = prices[item.symbol] || item.avgPrice; // Fallback to avgPrice if no market data
        return sum + (item.shares * price);
    }, 0);
    const totalProfit = currentMarketValue - totalInvested;
    const totalProfitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    // --- RENDER LOCKED ---
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/30 animate-pulse">
                            <Lock className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-wider">SECURE VAULT</h1>
                        <p className="text-slate-500 text-sm mt-2">Khu vực riêng tư. Vui lòng nhập mật mã.</p>
                    </div>

                    <GlassCard className="p-8 backdrop-blur-xl border-indigo-500/20">
                        <div className="space-y-4">
                            <Input
                                type="password"
                                placeholder="Passcode..."
                                className="bg-black/50 border-slate-700 text-center text-2xl tracking-[0.5em] h-14 font-mono text-white focus:border-indigo-500 transition-colors"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                                autoFocus
                            />
                            <Button
                                className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
                                onClick={handleUnlock}
                            >
                                <Unlock className="w-4 h-4 mr-2" /> MỞ KÉT
                            </Button>
                        </div>
                    </GlassCard>
                </div>
            </div>
        );
    }

    // --- RENDER UNLOCKED ---
    return (
        <div className="min-h-screen bg-[#0b1121] p-6 pb-20">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <span className="text-emerald-400">●</span> Private Vault
                        </h1>
                        <p className="text-slate-400 mt-1 font-mono text-sm">/root/user/assets/tracking</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => {
                            setIsAuthenticated(false);
                            sessionStorage.removeItem('private_auth');
                        }}>
                            Khóa Lại
                        </Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={() => setIsAdding(true)}>
                            <Plus className="w-4 h-4 mr-2" /> Thêm Giao Dịch
                        </Button>
                    </div>
                </div>

                {/* Dashboard Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassCard className="p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Lock className="w-24 h-24 text-white" />
                        </div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Tổng vốn đầu tư</p>
                        <p className="text-3xl font-mono text-white font-bold">
                            {(totalInvested / 1e6).toFixed(1)} <span className="text-sm text-slate-500">tr</span>
                        </p>
                    </GlassCard>

                    <GlassCard className="p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Eye className="w-24 h-24 text-emerald-400" />
                        </div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Giá trị hiện tại</p>
                        <p className={`text-3xl font-mono font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {(currentMarketValue / 1e6).toFixed(1)} <span className="text-sm text-slate-500">tr</span>
                        </p>
                    </GlassCard>

                    <GlassCard className="p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Unlock className="w-24 h-24 text-amber-400" />
                        </div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Lãi/Lỗ tạm tính</p>
                        <div className="flex items-baseline gap-2">
                            <p className={`text-3xl font-mono font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {totalProfit >= 0 ? '+' : ''}{(totalProfit / 1e6).toFixed(1)} <span className="text-sm text-slate-500 opacity-70">tr</span>
                            </p>
                            <span className={`text-sm font-bold px-2 py-0.5 rounded ${totalProfit >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {totalProfitPercent.toFixed(2)}%
                            </span>
                        </div>
                    </GlassCard>
                </div>

                {/* Add Form */}
                {isAdding && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                        <GlassCard className="p-6 border-indigo-500/30">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Edit2 className="w-4 h-4 text-indigo-400" /> Ghi Chép Giao Dịch Mới
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                <div className="md:col-span-1">
                                    <label className="text-xs text-slate-400 block mb-1">Mã CP</label>
                                    <Input
                                        placeholder="VNM"
                                        className="uppercase font-mono bg-black/30 border-slate-700 text-white"
                                        value={newItem.symbol}
                                        onChange={e => setNewItem({ ...newItem, symbol: e.target.value })}
                                        autoFocus
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-xs text-slate-400 block mb-1">Số Lượng</label>
                                    <Input
                                        type="number"
                                        placeholder="1000"
                                        className="font-mono bg-black/30 border-slate-700 text-white"
                                        value={newItem.shares}
                                        onChange={e => setNewItem({ ...newItem, shares: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-xs text-slate-400 block mb-1">Giá Vốn (VND)</label>
                                    <Input
                                        type="number"
                                        placeholder="65000"
                                        className="font-mono bg-black/30 border-slate-700 text-white"
                                        value={newItem.avgPrice}
                                        onChange={e => setNewItem({ ...newItem, avgPrice: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-xs text-slate-400 block mb-1">Ghi chú</label>
                                    <Input
                                        placeholder="Mua tích sản tháng 2..."
                                        className="bg-black/30 border-slate-700 text-white"
                                        value={newItem.note}
                                        onChange={e => setNewItem({ ...newItem, note: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white" onClick={handleAdd}>
                                        <Save className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" className="px-3 hover:bg-white/10 text-white" onClick={() => setIsAdding(false)}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* Portfolio Content */}
                <div className="mt-8">
                    {/* Simplified Tabs without complex Headless UI for fast MVP */}
                    <div className="flex border-b border-white/10 mb-6 gap-2">
                        <button
                            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'holdings' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                            onClick={() => setActiveTab('holdings')}
                        >
                            Tài Sản Nắm Giữ
                        </button>
                        <button
                            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'history' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                            onClick={() => setActiveTab('history')}
                        >
                            Lịch Sử Mô Phỏng
                        </button>
                    </div>

                    {activeTab === 'holdings' && (
                        <div className="animate-in fade-in duration-300">
                            <GlassCard className="overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                                <th className="p-4 text-left font-bold text-slate-400 uppercase text-xs">Mã Assets</th>
                                                <th className="p-4 text-right font-bold text-slate-400 uppercase text-xs">Số Lượng</th>
                                                <th className="p-4 text-right font-bold text-slate-400 uppercase text-xs">Giá Vốn</th>
                                                <th className="p-4 text-right font-bold text-slate-400 uppercase text-xs">Thị Giá</th>
                                                <th className="p-4 text-right font-bold text-slate-400 uppercase text-xs">Tổng Giá Trị</th>
                                                <th className="p-4 text-right font-bold text-slate-400 uppercase text-xs">Lãi/Lỗ</th>
                                                <th className="p-4 text-left font-bold text-slate-400 uppercase text-xs">Note</th>
                                                <th className="p-4 text-center font-bold text-slate-400 uppercase text-xs">Xóa</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {items.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="p-8 text-center text-slate-500">
                                                        Két sắt đang trống. Hãy ghi chép tài sản đầu tư vững bền!
                                                    </td>
                                                </tr>
                                            ) : (
                                                items.map(item => {
                                                    const currentPrice = prices[item.symbol] || item.avgPrice; // Use avgPrice if no realtime data
                                                    const marketValue = item.shares * currentPrice;
                                                    const costValue = item.shares * item.avgPrice;
                                                    const profit = marketValue - costValue;
                                                    const profitPercent = (profit / costValue) * 100;

                                                    return (
                                                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                                            <td className="p-4 font-bold text-white text-base">{item.symbol}</td>
                                                            <td className="p-4 text-right font-mono text-slate-300">{item.shares.toLocaleString()}</td>
                                                            <td className="p-4 text-right font-mono text-slate-400">{item.avgPrice.toLocaleString()}</td>
                                                            <td className="p-4 text-right font-mono text-white font-medium">{currentPrice.toLocaleString()}</td>
                                                            <td className="p-4 text-right font-mono text-white font-bold">{(marketValue / 1e6).toFixed(1)} <span className="text-slate-600 text-xs">M</span></td>
                                                            <td className="p-4 text-right">
                                                                <div className={`font-mono font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                    {profit >= 0 ? '+' : ''}{(profit / 1e6).toFixed(1)} M
                                                                </div>
                                                                <div className={`text-[10px] ${profit >= 0 ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                                                                    {profitPercent.toFixed(1)}%
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-slate-500 italic max-w-xs truncate">{item.note}</td>
                                                            <td className="p-4 text-center">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                                                    onClick={() => handleDelete(item.id)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="animate-in fade-in duration-300">
                            {user ? (
                                analyses.length === 0 ? (
                                    <GlassCard className="p-12 text-center border-dashed border-slate-700 bg-transparent">
                                        <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4 border border-slate-700">
                                            <History className="w-8 h-8 text-slate-500" />
                                        </div>
                                        <h2 className="text-lg font-medium text-slate-300 mb-2">Chưa có phân tích nào</h2>
                                        <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                                            Bắt đầu lưu các điểm mô phỏng Monte Carlo để xem lại chiến lược đầu tư.
                                        </p>
                                    </GlassCard>
                                ) : (
                                    <div className="space-y-4">
                                        {analyses.map((analysis) => {
                                            const result = analysis.result_data;
                                            const isProfit = (result?.percentageReturn ?? 0) >= 0;

                                            return (
                                                <GlassCard
                                                    key={analysis.id}
                                                    className="p-5 hover:border-indigo-500/30 transition-colors bg-slate-900/40"
                                                >
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center">
                                                                <span className="text-lg font-bold text-indigo-400">
                                                                    {analysis.symbol}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <h3 className="font-semibold text-white">{analysis.symbol}</h3>
                                                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    <span>
                                                                        {format(new Date(analysis.start_date), 'dd/MM/yyyy')}
                                                                        <span className="mx-2 text-slate-600">→</span>
                                                                        {format(new Date(analysis.end_date), 'dd/MM/yyyy')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-6 bg-black/20 p-3 rounded-lg border border-white/5">
                                                            <div>
                                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Vốn Ban Đầu</p>
                                                                <p className="font-mono text-sm text-slate-200">
                                                                    {formatCurrency(analysis.initial_investment)}
                                                                </p>
                                                            </div>
                                                            {result && (
                                                                <>
                                                                    <div className="w-px h-8 bg-slate-800"></div>
                                                                    <div>
                                                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Kết Quả Cuối</p>
                                                                        <p className="font-mono text-sm text-white font-medium">
                                                                            {formatCurrency(result.currentValue ?? 0)}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Tỷ Suất</p>
                                                                        <p
                                                                            className={`font-mono text-sm font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}
                                                                        >
                                                                            {isProfit ? '+' : ''}
                                                                            {result.percentageReturn?.toFixed(2)}%
                                                                        </p>
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div className="flex items-center gap-1 ml-2">
                                                                <a
                                                                    href={`/wealth-journey?symbol=${analysis.symbol}&start=${analysis.start_date}&end=${analysis.end_date}&amount=${analysis.initial_investment}`}
                                                                    className="p-2 rounded-lg hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-colors"
                                                                    title="Xem lại biểu đồ Monte Carlo"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </a>
                                                                <button
                                                                    onClick={() => deleteAnalysis(analysis.id)}
                                                                    className="p-2 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                                                                    title="Xóa phân tích"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 pt-3 border-t border-slate-800/50 text-[10px] text-slate-600 flex justify-end">
                                                        Đã lưu lúc: {format(new Date(analysis.created_at), "HH:mm, dd/MM/yyyy", { locale: vi })}
                                                    </div>
                                                </GlassCard>
                                            );
                                        })}
                                    </div>
                                )
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                        <Lock className="w-8 h-8 text-slate-500" />
                                    </div>
                                    <p className="text-slate-400">Đang đồng bộ dữ liệu Supabase...</p>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
