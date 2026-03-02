'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import {
    TrendingUp, TrendingDown, Calendar, Shield, AlertTriangle,
    CheckCircle, Loader2, Menu, Newspaper, BarChart3, RefreshCw,
    ArrowUp, ArrowDown, Minus, Clock, Sparkles
} from 'lucide-react';

interface DailyReport {
    report_date: string;
    symbol_1: string;
    symbol_2: string;
    market_summary: string;
    analysis_1: string;
    analysis_2: string;
    signal_1: string;
    signal_2: string;
    raw_data: any;
    created_at: string;
}

const SIGNAL_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    BUY: { label: 'MUA', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: ArrowUp },
    SELL: { label: 'BÁN', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', icon: ArrowDown },
    HOLD: { label: 'GIỮ', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: Minus },
    NEUTRAL: { label: 'TRUNG TÍNH', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30', icon: Minus },
};

export default function AnalysisPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [report, setReport] = useState<DailyReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch latest report from Supabase
    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        setError(null);
        try {
            // Try to fetch from Supabase
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            if (supabaseUrl && supabaseKey) {
                const res = await fetch(
                    `${supabaseUrl}/rest/v1/daily_reports?order=report_date.desc&limit=1`,
                    {
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                        }
                    }
                );
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        setReport(data[0]);
                        setLoading(false);
                        return;
                    }
                }
            }
            setError('Chưa có báo cáo nào. Bấm "Tạo Báo Cáo" để khởi chạy phân tích AI.');
        } catch (err) {
            setError('Không thể tải báo cáo. Kiểm tra kết nối.');
        } finally {
            setLoading(false);
        }
    };

    // Manually trigger report generation
    const generateReport = async () => {
        setGenerating(true);
        setError(null);
        try {
            const res = await fetch('/api/daily-report?key=' + (process.env.NEXT_PUBLIC_GEMINI_KEY_PREFIX || ''));
            const data = await res.json();

            if (res.ok && !data.error) {
                // Convert API response to DailyReport DB format for UI consistency
                setReport({
                    report_date: new Date().toISOString().split('T')[0],
                    symbol_1: data.raw?.stock1?.symbol || data.top5?.[0]?.symbol || '',
                    symbol_2: data.raw?.stock2?.symbol || data.top5?.[1]?.symbol || '',
                    market_summary: data.market_summary || 'Không có dữ liệu',
                    analysis_1: data.analysis_1 || 'Không có dữ liệu',
                    analysis_2: data.analysis_2 || 'Không có dữ liệu',
                    signal_1: data.raw?.stock1?.signal || 'HOLD',
                    signal_2: data.raw?.stock2?.signal || 'HOLD',
                    raw_data: data.raw || { stock1: data.top5?.[0], stock2: data.top5?.[1] },
                    created_at: new Date().toISOString(),
                });
            } else {
                setError(data.error || 'Server trả về lỗi không xác định.');
            }
        } catch (err: any) {
            setError(err.message || 'Lỗi khi kết nối đến AI Server.');
        } finally {
            setGenerating(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    return (
        <div className="flex h-screen w-full bg-[#030712] overflow-hidden font-sans text-slate-100">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden fixed top-16 left-4 z-50 p-2 bg-slate-800 rounded-lg">
                <Menu className="w-5 h-5" />
            </button>
            <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-40 h-full w-64 transition-transform duration-300`}>
                <Sidebar />
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                <Newspaper className="w-7 h-7 text-purple-400" />
                                KHUYẾN NGHỊ SÁNG
                            </h1>
                            <p className="text-sm text-slate-500 mt-1">
                                Phân tích AI chuyên sâu • 2 cổ phiếu VN30 nổi bật mỗi sáng 7:00 AM
                            </p>
                        </div>
                        <button
                            onClick={generateReport}
                            disabled={generating}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all text-sm disabled:opacity-50"
                        >
                            {generating ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Đang phân tích...</>
                            ) : (
                                <><Sparkles className="w-4 h-4" /> Tạo Báo Cáo Ngay</>
                            )}
                        </button>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                        </div>
                    )}

                    {/* Error / Empty */}
                    {error && !loading && (
                        <Card className="bg-slate-900/50 border-slate-800">
                            <CardContent className="p-8 text-center">
                                <Newspaper className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <p className="text-slate-400 mb-4">{error}</p>
                                <button
                                    onClick={generateReport}
                                    disabled={generating}
                                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all inline-flex items-center gap-2 disabled:opacity-50"
                                >
                                    {generating ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
                                    ) : (
                                        <><Sparkles className="w-4 h-4" /> Tạo Báo Cáo Đầu Tiên</>
                                    )}
                                </button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Report Content */}
                    {report && !loading && (
                        <>
                            {/* Date Banner */}
                            <div className="flex items-center gap-3 text-sm text-slate-400">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(report.report_date)}</span>
                                <span className="text-slate-600">•</span>
                                <Clock className="w-3 h-3" />
                                <span>Cập nhật lúc {new Date(report.created_at).toLocaleTimeString('vi-VN')}</span>
                            </div>

                            {/* Market Summary */}
                            <Card className="bg-gradient-to-br from-slate-900 to-indigo-950/30 border-slate-800 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>
                                <CardContent className="p-6 relative z-10">
                                    <h2 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4" /> Tổng Quan Thị Trường
                                    </h2>
                                    <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-line">
                                        {report.market_summary}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* 2 Stock Analysis Cards */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {[
                                    { symbol: report.symbol_1, signal: report.signal_1, analysis: report.analysis_1, raw: report.raw_data?.stock1 },
                                    { symbol: report.symbol_2, signal: report.signal_2, analysis: report.analysis_2, raw: report.raw_data?.stock2 },
                                ].map((item, idx) => {
                                    const signalCfg = SIGNAL_CONFIG[item.signal] || SIGNAL_CONFIG.NEUTRAL;
                                    const SignalIcon = signalCfg.icon;
                                    return (
                                        <Card key={idx} className={`border ${signalCfg.bg} relative overflow-hidden`}>
                                            <div className="absolute top-0 right-0 w-32 h-32 opacity-10 blur-2xl rounded-full pointer-events-none"
                                                style={{ background: item.signal === 'BUY' ? '#10b981' : item.signal === 'SELL' ? '#ef4444' : '#f59e0b' }}></div>
                                            <CardContent className="p-6 relative z-10">
                                                {/* Header */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center">
                                                            <span className="text-lg font-black text-white">{item.symbol?.slice(0, 2)}</span>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xl font-black text-white">{item.symbol}</h3>
                                                            {item.raw && (
                                                                <p className="text-xs text-slate-400">
                                                                    {item.raw.price?.toLocaleString()}đ
                                                                    <span className={item.raw.changePct >= 0 ? 'text-emerald-400 ml-2' : 'text-rose-400 ml-2'}>
                                                                        {item.raw.changePct >= 0 ? '+' : ''}{item.raw.changePct}%
                                                                    </span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-bold text-xs ${signalCfg.bg} ${signalCfg.color}`}>
                                                        <SignalIcon className="w-3.5 h-3.5" />
                                                        {signalCfg.label}
                                                    </div>
                                                </div>

                                                {/* Metrics Row */}
                                                {item.raw && (
                                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                                                            <p className="text-[10px] text-slate-500 font-bold">RSI-14</p>
                                                            <p className={`text-sm font-bold ${item.raw.rsi14 < 30 ? 'text-emerald-400' : item.raw.rsi14 > 70 ? 'text-rose-400' : 'text-slate-200'}`}>
                                                                {item.raw.rsi14}
                                                            </p>
                                                        </div>
                                                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                                                            <p className="text-[10px] text-slate-500 font-bold">MA-20</p>
                                                            <p className="text-sm font-bold text-slate-200">{(item.raw.ma20 / 1000).toFixed(1)}k</p>
                                                        </div>
                                                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                                                            <p className="text-[10px] text-slate-500 font-bold">Volume</p>
                                                            <p className="text-sm font-bold text-slate-200">{(item.raw.volume / 1000000).toFixed(1)}M</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Analysis Text */}
                                                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                                                    {item.analysis}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* Disclaimer */}
                            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 text-center">
                                <p className="text-[10px] text-slate-600 leading-relaxed max-w-2xl mx-auto">
                                    ⚠️ Bài phân tích được tạo bởi AI (Google Gemini) kết hợp dữ liệu kỹ thuật thực tế.
                                    Đây KHÔNG phải lời khuyến nghị đầu tư chính thức. Mọi quyết định đầu tư là trách nhiệm cá nhân của bạn.
                                    Luôn tham khảo thêm nhiều nguồn trước khi ra quyết định.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
