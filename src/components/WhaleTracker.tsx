'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, TrendingUp, TrendingDown, Users, Loader2, Info, Landmark, RefreshCw, AlertTriangle, Target } from 'lucide-react';

interface WhaleData {
    success: boolean;
    symbol: string;
    metrics: {
        netValueTotal: number;
        buyValueTotal: number;
        sellValueTotal: number;
        recentNetValue: number;
        avgDailyNetValue: number;
    };
    status: 'ACCUMULATING' | 'DISTRIBUTING' | 'HUNTING' | 'NEUTRAL';
    sentiment: string;
    color: string;
    action: string;
    history: any[];
}

export default function WhaleTracker({ initialSymbol = 'VIB' }: { initialSymbol?: string }) {
    const [symbol, setSymbol] = useState(initialSymbol);
    const [searchInput, setSearchInput] = useState('');
    const [data, setData] = useState<WhaleData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchWhaleData(symbol);
    }, [symbol]);

    const fetchWhaleData = async (targetSymbol: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/stock/whale-tracker?symbol=${targetSymbol}`);
            const result = await res.json();
            if (result.success) {
                setData(result);
            } else {
                setError(result.message || 'Không tìm thấy dữ liệu.');
            }
        } catch (err) {
            setError('Lỗi kết nối máy chủ.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchInput.trim()) {
            setSymbol(searchInput.toUpperCase());
        }
    };

    const formatVND = (value: number) => {
        const billion = value / 1000000000;
        return `${billion.toFixed(2)} tỷ`;
    };

    return (
        <Card className="bg-[#111827] border-slate-800 shadow-2xl relative overflow-hidden group">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-all duration-700"></div>

            <CardHeader className="pb-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl font-black text-white flex items-center gap-2">
                            <Landmark className="w-5 h-5 text-indigo-400" />
                            WHALE TRACKER
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Theo dõi dòng tiền Khối ngoại & Tự doanh
                        </CardDescription>
                    </div>

                </div>
            </CardHeader>

            <CardContent className="pt-4">
                {/* Data status message */}
                {data && !data.success && (
                    <div className="mb-4 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[10px] text-amber-200">Dữ liệu hiện đang được bảo trì hoặc quá tải.</span>
                    </div>
                )}

                {data && (data as any).message && (
                    <div className="mb-4 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center gap-2">
                        <Info className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] text-indigo-200">{(data as any).message}</span>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                        <p className="text-xs text-slate-500 animate-pulse uppercase tracking-widest font-bold">Đang soi lệnh cá mập...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <Landmark className="w-12 h-12 text-slate-700 mx-auto mb-3 opacity-20" />
                        <p className="text-slate-500 text-sm">{error}</p>
                    </div>
                ) : data && (
                    <div className="space-y-6">
                        {/* Status Banner */}
                        <div className={`p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-between`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700`}>
                                    <span className="text-lg font-black text-white">{data.symbol}</span>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Trạng thái dòng tiền</p>
                                    <p className={`text-lg font-black ${data.color} tracking-tight uppercase`}>{data.sentiment}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">30 Phiên</p>
                                <p className={`text-sm font-bold ${data.metrics.netValueTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {data.metrics.netValueTotal >= 0 ? '+' : ''}{formatVND(data.metrics.netValueTotal)}
                                </p>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-900/20 p-3 rounded-xl border border-slate-800/50">
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Mua ròng (5D)</span>
                                </div>
                                <p className="text-lg font-black text-white truncate">
                                    {formatVND(data.metrics.recentNetValue)}
                                </p>
                            </div>
                            <div className="bg-slate-900/20 p-3 rounded-xl border border-slate-800/50">
                                <div className="flex items-center gap-2 mb-1">
                                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Tầm nhìn 2026</span>
                                </div>
                                <p className="text-lg font-black text-white uppercase tracking-tight">
                                    {data.symbol === 'VIB' ? 'CHIẾN LƯỢC' : 'TĂNG TRƯỞNG'}
                                </p>
                            </div>
                        </div>

                        {/* Actionable Advice */}
                        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-4 rounded-xl flex gap-3 items-start shadow-inner">
                            <Target className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    Gợi ý hành động từ hệ thống
                                </h4>
                                <p className="text-[13px] text-indigo-50/90 leading-relaxed font-medium">
                                    {data.action}
                                </p>
                            </div>
                        </div>

                        {/* Mini History */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <TrendingUp className="w-3 h-3" /> Chi tiết giao dịch
                                </h4>
                                <span className="text-[10px] text-slate-600">(5 phiên gần nhất)</span>
                            </div>
                            <div className="space-y-1">
                                {data.history.slice(0, 5).map((day, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-[11px] p-2 hover:bg-slate-800/30 rounded-lg transition-colors border-b border-slate-800/30 last:border-0">
                                        <span className="text-slate-500 font-medium">{day.date}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-slate-400">{formatVND(day.buyValue)}</span>
                                            <span className={day.netValue >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                                {day.netValue >= 0 ? '+' : ''}{formatVND(day.netValue)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
