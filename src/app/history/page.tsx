'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createBrowserClient } from '@supabase/ssr';
import { History, Trash2, Eye, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

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

export default function HistoryPage() {
    const { user, loading: authLoading, isConfigured } = useAuth();
    const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = useMemo(() => createSupabaseClient(), []);

    useEffect(() => {
        if (user) {
            loadAnalyses();
        } else {
            setLoading(false);
        }
    }, [user]);

    const loadAnalyses = async () => {
        if (!supabase) {
            setLoading(false);
            return;
        }
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
        } finally {
            setLoading(false);
        }
    };

    const deleteAnalysis = async (id: string) => {
        if (!supabase) return;
        if (!confirm('Bạn có chắc muốn xóa phân tích này?')) return;

        try {
            const { error } = await supabase
                .from('user_portfolios')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setAnalyses(analyses.filter((a) => a.id !== id));
        } catch (error) {
            console.error('Error deleting analysis:', error);
        }
    };

    const formatCurrency = (value: number) => {
        if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)} tỷ`;
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)} tr`;
        return value.toLocaleString('vi-VN');
    };

    if (authLoading || loading) {
        return (
            <main className="min-h-screen gradient-bg flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </main>
        );
    }

    if (!user) {
        return (
            <main className="min-h-screen gradient-bg">
                <div className="container mx-auto px-4 py-20">
                    <div className="max-w-md mx-auto text-center glass-card p-8">
                        <History className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-4">Đăng nhập để xem lịch sử</h1>
                        <p className="text-slate-400 mb-6">
                            Bạn cần đăng nhập để lưu và xem lại các phân tích đầu tư của mình.
                        </p>
                        <a href="/" className="btn-primary inline-flex items-center gap-2">
                            Về trang chủ
                        </a>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen gradient-bg">
            <div className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <History className="w-8 h-8 text-indigo-400" />
                        Lịch sử phân tích
                    </h1>
                    <p className="text-slate-400 mb-8">
                        Các phân tích đầu tư bạn đã thực hiện
                    </p>

                    {analyses.length === 0 ? (
                        <div className="glass-card p-12 text-center">
                            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                <History className="w-10 h-10 text-slate-600" />
                            </div>
                            <h2 className="text-xl font-medium mb-2">Chưa có phân tích nào</h2>
                            <p className="text-slate-400 mb-6">
                                Bắt đầu phân tích cổ phiếu để lưu lại lịch sử
                            </p>
                            <a href="/" className="btn-primary inline-flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                Phân tích ngay
                            </a>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {analyses.map((analysis) => {
                                const result = analysis.result_data;
                                const isProfit = (result?.percentageReturn ?? 0) >= 0;

                                return (
                                    <div
                                        key={analysis.id}
                                        className="glass-card p-6 hover:border-indigo-500/30 transition-colors"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                                                    <span className="text-xl font-bold text-indigo-400">
                                                        {analysis.symbol}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-lg">{analysis.symbol}</h3>
                                                    <div className="flex items-center gap-4 text-sm text-slate-400">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-4 h-4" />
                                                            {format(new Date(analysis.start_date), 'dd/MM/yyyy')} -{' '}
                                                            {format(new Date(analysis.end_date), 'dd/MM/yyyy')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-6">
                                                <div>
                                                    <p className="text-xs text-slate-500">Đầu tư</p>
                                                    <p className="font-medium">
                                                        {formatCurrency(analysis.initial_investment)}
                                                    </p>
                                                </div>
                                                {result && (
                                                    <>
                                                        <div>
                                                            <p className="text-xs text-slate-500">Giá trị hiện tại</p>
                                                            <p className="font-medium">
                                                                {formatCurrency(result.currentValue ?? 0)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-500">Lợi nhuận</p>
                                                            <p
                                                                className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'
                                                                    }`}
                                                            >
                                                                {isProfit ? '+' : ''}
                                                                {result.percentageReturn?.toFixed(2)}%
                                                            </p>
                                                        </div>
                                                    </>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={`/?symbol=${analysis.symbol}&start=${analysis.start_date}&end=${analysis.end_date}&amount=${analysis.initial_investment}`}
                                                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                                        title="Xem lại"
                                                    >
                                                        <Eye className="w-5 h-5 text-indigo-400" />
                                                    </a>
                                                    <button
                                                        onClick={() => deleteAnalysis(analysis.id)}
                                                        className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="w-5 h-5 text-red-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-500">
                                            Phân tích lúc{' '}
                                            {format(new Date(analysis.created_at), "HH:mm 'ngày' dd/MM/yyyy", {
                                                locale: vi,
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
