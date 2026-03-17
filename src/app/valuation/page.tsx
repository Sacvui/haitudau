'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import MarketSentimentGauge from '@/components/MarketSentimentGauge';
import WhaleTracker from '@/components/WhaleTracker';
import ApiKeySettings from '@/components/ApiKeySettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
    Calculator, Search, TrendingUp, TrendingDown, Minus,
    Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Loader2, Menu, ChevronDown, ChevronUp, BarChart2, Target
} from 'lucide-react';
import {
    runFullValuation,
    generateSensitivityTable,
    calculateReverseDCF,
    type ValuationInput,
    type ValuationSummary,
    type ValuationResult
} from '@/lib/valuation-engine';

interface FundamentalsData {
    symbol: string;
    currentPrice: number;
    eps: number;
    pe: number;
    bvps: number;
    pb: number;
    roe: number;
    dividendYield: number;
    lastDividend: number;
    dividendGrowth5Y: number;
    industryPE: number;
    marketCap: number;
    revenue: number;
    netIncome: number;
    industry: string;
    companyName: string;
    debtToEquity: number;
    currentRatio: number;
    profitGrowth: number;
    planCompletion: number;
    historicalReturn5Y: number;
}

// Verdict styling
const VERDICT_CONFIG = {
    CHEAP: { label: 'RẺ — MUA', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-500/30', icon: CheckCircle, gradient: 'from-emerald-500/20 to-emerald-600/5' },
    FAIR: { label: 'HỢP LÝ', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-500/30', icon: Minus, gradient: 'from-amber-500/20 to-amber-600/5' },
    EXPENSIVE: { label: 'ĐẮT — THẬN TRỌNG', color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-500/30', icon: XCircle, gradient: 'from-rose-500/20 to-rose-600/5' },
    'N/A': { label: 'N/A', color: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-500/30', icon: Minus, gradient: 'from-slate-500/20 to-slate-600/5' },
};

export default function ValuationPage() {
    const [symbol, setSymbol] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fundamentals, setFundamentals] = useState<FundamentalsData | null>(null);
    const [valuation, setValuation] = useState<ValuationSummary | null>(null);
    const [sensitivity, setSensitivity] = useState<ReturnType<typeof generateSensitivityTable> | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Reverse DCF State
    const [activeTab, setActiveTab] = useState<'intrinsic' | 'reverse' | 'peBand' | 'recommendation'>('intrinsic');
    const [impliedGrowth, setImpliedGrowth] = useState<number | null>(null);

    // Custom params
    const [requiredReturn, setRequiredReturn] = useState(12);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [sentiment, setSentiment] = useState<{ score: number; label: string; color: string; breakdown: any } | null>(null);

    // Smart Entry Signal
    const [entrySignal, setEntrySignal] = useState<any>(null);
    const [entryLoading, setEntryLoading] = useState(false);

    // Fetch Market Sentiment on mount
    useEffect(() => {
        const fetchSentiment = async () => {
            try {
                const res = await fetch('/api/market/sentiment');
                const data = await res.json();
                if (data.success) {
                    setSentiment(data);
                }
            } catch (e) {
                console.error('Failed to fetch sentiment:', e);
            }
        };
        fetchSentiment();
    }, []);

    const handleValuate = useCallback(async () => {
        if (!symbol.trim()) return;
        setLoading(true);
        setError(null);
        setValuation(null);
        setFundamentals(null);
        setSensitivity(null);
        setImpliedGrowth(null);

        try {
            const res = await fetch(`/api/stock/fundamentals?symbol=${symbol.trim().toUpperCase()}`);
            const json = await res.json();

            if (!json.success || !json.data) {
                throw new Error(json.error || 'Không thể lấy dữ liệu');
            }

            const data: FundamentalsData = json.data;
            setFundamentals(data);

            // Run valuation
            const input: ValuationInput = {
                currentPrice: data.currentPrice,
                eps: data.eps,
                pe: data.pe,
                bvps: data.bvps,
                pb: data.pb,
                roe: data.roe,
                lastDividend: data.lastDividend,
                dividendGrowth: data.dividendGrowth5Y,
                industryPE: data.industryPE || 15,
                dividendYield: data.dividendYield,
                industry: data.industry
            };

            const sentimentScore = sentiment?.score || 50;

            const result = runFullValuation(input, {
                requiredReturn: requiredReturn,
                projectionYears: 10,
                marketSentimentScore: sentimentScore
            });
            setValuation(result);

            const projectionYears = 10;
            const sensitivity = generateSensitivityTable(
                data.eps,
                Math.min(data.roe * 0.6, 25) / 100, // Matching default logic
                requiredReturn / 100,
                projectionYears
            );
            setSensitivity(sensitivity); // Changed sensTable to sensitivity

            // Reverse DCF calculation
            const impliedG = calculateReverseDCF(data.currentPrice, data.eps, requiredReturn / 100, 10, 0.03);
            setImpliedGrowth(impliedG);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi');
        } finally {
            setLoading(false);
        }

        // Fetch Smart Entry Signal in background (non-blocking)
        setEntryLoading(true);
        fetch(`/api/stock/entry-signal?symbol=${symbol.trim().toUpperCase()}`)
            .then(r => r.json())
            .then(j => { if (j.success) setEntrySignal(j); })
            .catch(() => { })
            .finally(() => setEntryLoading(false));

    }, [symbol, requiredReturn, sentiment]);

    // Auto-load from URL params (when navigating from homepage search)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlSymbol = params.get('symbol')?.toUpperCase();
        if (urlSymbol && urlSymbol.length >= 2) {
            setSymbol(urlSymbol);
            // Trigger valuation after state update
            setTimeout(() => {
                const btn = document.getElementById('btn-valuate');
                if (btn) btn.click();
            }, 300);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="flex h-screen w-full bg-[#030712] overflow-hidden font-sans text-slate-100">
            {/* Mobile menu */}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-lg">
                <Menu className="w-5 h-5" />
            </button>

            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-40 h-full w-64 transition-transform duration-300`}>
                <Sidebar />
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto p-6 space-y-6">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                <Calculator className="w-7 h-7 text-indigo-400" />
                                ĐỊNH GIÁ CỔ PHIẾU
                            </h1>
                            <p className="text-sm text-slate-500 mt-1">4 phương pháp chuyên nghiệp • Tính giá trị nội tại • Biên an toàn</p>
                        </div>
                    </div>

                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row gap-6 mb-8">
                        {/* Search Card */}
                        <Card className="flex-1 bg-[#111827] border-slate-800 shadow-xl overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 z-0" />
                            <CardHeader className="relative z-10 pb-2">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Mã Cổ Phiếu</p>
                                <div className="flex gap-3">
                                    <div className="relative flex-1 group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                        <input
                                            type="text"
                                            value={symbol}
                                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => e.key === 'Enter' && handleValuate()}
                                            placeholder="VD: FPT, VNM, HPG..."
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-bold placeholder:text-slate-600"
                                        />
                                    </div>
                                    <Button
                                        id="btn-valuate"
                                        onClick={handleValuate}
                                        disabled={loading || !symbol}
                                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-8 rounded-xl h-auto shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5 mr-2" />}
                                        ĐỊNH GIÁ
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="relative z-10 pt-0">
                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors px-3 py-3"
                                >
                                    {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    Tùy chỉnh
                                </button>

                                {showAdvanced && (
                                    <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Lãi suất yêu cầu (%)</label>
                                            <input
                                                type="number"
                                                value={requiredReturn}
                                                onChange={(e) => setRequiredReturn(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
                                                min={5} max={25} step={0.5}
                                            />
                                        </div>
                                        <div className="sm:col-span-2 flex items-end">
                                            <p className="text-xs text-slate-500">
                                                💡 Lãi suất yêu cầu (r) là mức sinh lời tối thiểu bạn mong đợi. 12% là mức phổ biến tại VN.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Market Sentiment Gauge */}
                        <div className="lg:w-80">
                            {sentiment ? (
                                <MarketSentimentGauge
                                    score={sentiment.score}
                                    label={sentiment.label}
                                    color={sentiment.color}
                                    breakdown={sentiment.breakdown}
                                />
                            ) : (
                                <Card className="h-full bg-[#111827] border-slate-800 flex items-center justify-center p-6">
                                    <Loader2 className="w-8 h-8 text-indigo-500/30 animate-spin" />
                                </Card>
                            )}
                        </div>

                        {/* Whale Tracker */}
                        <div className="lg:w-80 space-y-3">
                            <div className="flex justify-end">
                                <ApiKeySettings />
                            </div>
                            <WhaleTracker
                                key={fundamentals?.symbol || symbol}
                                initialSymbol={fundamentals?.symbol || symbol || 'VIB'}
                                valuationVerdict={valuation?.overallVerdict}
                            />
                        </div>
                    </div>

                    {/* Smart Entry Signal Panel */}
                    {(entrySignal || entryLoading) && (
                        <div className="mt-4">
                            <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                                            <Target className="w-5 h-5 text-cyan-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-sm">ĐIỂM VÀO LỆNH THÔNG MINH</h3>
                                            <p className="text-[10px] text-slate-500">Volume Spike × Support Zone × Intrinsic Margin</p>
                                        </div>
                                    </div>
                                    {entrySignal && (
                                        <div className={`px-4 py-2 rounded-xl font-black text-sm ${entrySignal.compositeScore >= 8 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                            entrySignal.compositeScore >= 6 ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                                                entrySignal.compositeScore >= 4 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                    'bg-red-500/20 text-red-400 border border-red-500/30'
                                            }`}>
                                            {entrySignal.verdictEmoji} {entrySignal.verdict}
                                        </div>
                                    )}
                                </div>
                                {entryLoading ? (
                                    <div className="p-8 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-cyan-500/50 animate-spin" />
                                        <span className="ml-3 text-slate-500 text-sm">Đang phân tích tín hiệu...</span>
                                    </div>
                                ) : entrySignal ? (
                                    <div className="p-6">
                                        {/* Score Gauge */}
                                        <div className="flex items-center gap-6 mb-6">
                                            <div className="relative w-24 h-24 flex-shrink-0">
                                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                                    <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="8" />
                                                    <circle cx="50" cy="50" r="42" fill="none"
                                                        stroke={entrySignal.compositeScore >= 8 ? '#10b981' : entrySignal.compositeScore >= 6 ? '#0ea5e9' : entrySignal.compositeScore >= 4 ? '#f59e0b' : '#ef4444'}
                                                        strokeWidth="8" strokeLinecap="round"
                                                        strokeDasharray={`${entrySignal.compositeScore * 26.4} 264`}
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-2xl font-black text-white">{entrySignal.compositeScore}</span>
                                                    <span className="text-[9px] text-slate-500 font-bold">/10</span>
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-white font-bold">{entrySignal.symbol} — {entrySignal.verdict}</p>
                                                <p className="text-slate-400 text-xs mt-1">Giá hiện tại: <span className="text-white font-bold">{Math.round(entrySignal.currentPrice).toLocaleString()}đ</span></p>
                                                {entrySignal.context?.sma20 && (
                                                    <p className="text-slate-500 text-xs">SMA20: {entrySignal.context.sma20.toLocaleString()}đ • Đáy 20P: {entrySignal.context.low20.toLocaleString()}đ</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* 3 Signal Breakdown */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {[{
                                                title: '📊 Volume Spike',
                                                signal: entrySignal.signals.volume,
                                                color: entrySignal.signals.volume.score >= 6 ? 'emerald' : entrySignal.signals.volume.score >= 4 ? 'amber' : 'red'
                                            }, {
                                                title: '🛡️ Support Zone',
                                                signal: entrySignal.signals.support,
                                                color: entrySignal.signals.support.score >= 6 ? 'emerald' : entrySignal.signals.support.score >= 4 ? 'amber' : 'red'
                                            }, {
                                                title: '💎 Intrinsic Margin',
                                                signal: entrySignal.signals.margin,
                                                color: entrySignal.signals.margin.score >= 6 ? 'emerald' : entrySignal.signals.margin.score >= 4 ? 'amber' : 'red'
                                            }].map((item, idx) => (
                                                <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-bold text-slate-300">{item.title}</span>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                                                            item.color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                                                                'bg-red-500/20 text-red-400'
                                                            }`}>
                                                            {item.signal.score}/10
                                                        </span>
                                                    </div>
                                                    <p className={`text-sm font-bold mb-1 ${item.color === 'emerald' ? 'text-emerald-400' :
                                                        item.color === 'amber' ? 'text-amber-400' :
                                                            'text-red-400'
                                                        }`}>{item.signal.label}</p>
                                                    <p className="text-[11px] text-slate-500 leading-relaxed">{item.signal.description}</p>
                                                    <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all ${item.color === 'emerald' ? 'bg-emerald-500' :
                                                            item.color === 'amber' ? 'bg-amber-500' :
                                                                'bg-red-500'
                                                            }`}
                                                            style={{ width: `${item.signal.score * 10}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-[9px] text-slate-600 mt-1">Trọng số: {item.signal.weight}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <Card className="bg-rose-500/10 border-rose-500/30">
                            <CardContent className="p-4 flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-rose-400" />
                                <span className="text-rose-300">{error}</span>
                                <Button onClick={handleValuate} variant="outline" size="sm" className="ml-auto border-rose-500/30 text-rose-300">
                                    <RefreshCw className="w-3 h-3 mr-1" /> Thử lại
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Tabs */}
                    {valuation && fundamentals && (
                        <div className="flex border-b border-slate-800 mt-6">
                            <button
                                onClick={() => setActiveTab('intrinsic')}
                                className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'intrinsic'
                                    ? 'border-indigo-500 text-indigo-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                <Calculator className="w-4 h-4" /> Giá Trị Nội Tại (Dài Hạn)
                            </button>
                            <button
                                onClick={() => setActiveTab('reverse')}
                                className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'reverse'
                                    ? 'border-purple-500 text-purple-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                <Shield className="w-4 h-4" /> Máy Tính Niềm Tin
                            </button>
                            <button
                                onClick={() => setActiveTab('peBand')}
                                className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'peBand'
                                    ? 'border-amber-500 text-amber-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                <BarChart2 className="w-4 h-4" /> P/E Band
                            </button>
                            <button
                                onClick={() => setActiveTab('recommendation')}
                                className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'recommendation'
                                    ? 'border-emerald-500 text-emerald-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                <Target className="w-4 h-4" /> Giá Mục Tiêu (Ngắn Hạn)
                            </button>
                        </div>
                    )}

                    {/* Results - Intrinsic */}
                    {valuation && fundamentals && activeTab === 'intrinsic' && (
                        <ErrorBoundary>
                            <SummaryCard valuation={valuation} fundamentals={fundamentals} />

                            <div className="mt-6">
                                <ConvictionDashboard data={fundamentals} />
                            </div>

                            <div className="mt-6">
                                <FundamentalsGrid fundamentals={fundamentals} />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                                {valuation.results.map((result) => (
                                    <MethodCard key={result.methodKey} result={result} currentPrice={fundamentals.currentPrice} />
                                ))}
                            </div>

                            {sensitivity && fundamentals.eps > 0 && (
                                <div className="mt-6">
                                    <SensitivityTable data={sensitivity} currentPrice={fundamentals.currentPrice} />
                                </div>
                            )}
                        </ErrorBoundary>
                    )}

                    {/* Results - Reverse DCF */}
                    {valuation && fundamentals && activeTab === 'reverse' && (
                        <ErrorBoundary>
                            <Card className="bg-[#111827] border-slate-800 mt-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-32 bg-purple-500/5 blur-3xl rounded-full mix-blend-screen pointer-events-none"></div>
                                <CardContent className="p-8 text-center relative z-10">
                                    <h2 className="text-xl font-bold text-slate-200 mb-2">Mức Tăng Trưởng Kỳ Vọng (Reverse DCF)</h2>
                                    <p className="text-sm text-slate-400 max-w-2xl mx-auto mb-6">
                                        Với mức giá thị trường <strong className="text-white">{fundamentals.currentPrice.toLocaleString()}đ</strong>
                                        {' '}và lãi suất chiết khấu <strong className="text-white">{requiredReturn}%</strong>,
                                        thị trường đang ngầm kỳ vọng doanh nghiệp phải duy trì mức tăng trưởng lợi nhuận là:
                                    </p>

                                    <div className="flex justify-center mb-8">
                                        <div className="px-12 py-6 bg-slate-900/50 border border-slate-700/80 rounded-3xl inline-flex flex-col items-center shadow-lg shadow-black/20">
                                            <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 drop-shadow-sm">
                                                {impliedGrowth !== null ? (impliedGrowth * 100).toFixed(1) + '%' : 'N/A'}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase mt-3">Tăng trưởng kép mỗi năm (10 năm tới)</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto text-left">
                                        <div className="p-5 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                                            <p className="text-[11px] text-slate-400 font-bold uppercase mb-2">Tăng trưởng LN 5 năm qua</p>
                                            <p className="text-2xl font-bold text-slate-200">{fundamentals.profitGrowth.toFixed(1)}%</p>
                                            <p className="text-xs text-slate-500 mt-1">Dữ liệu lịch sử thực tế</p>
                                        </div>
                                        <div className="p-5 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                                            <p className="text-[11px] text-slate-400 font-bold uppercase mb-2">Tỷ suất lợi nhuận (ROE)</p>
                                            <p className="text-2xl font-bold text-slate-200">{fundamentals.roe.toFixed(1)}%</p>
                                            <p className="text-xs text-slate-500 mt-1">Khả năng sinh lời hiện tại</p>
                                        </div>
                                        <div className="p-5 bg-slate-800/40 rounded-2xl border border-slate-700/50 flex flex-col justify-center">
                                            <p className="text-[11px] text-slate-400 font-bold uppercase mb-2">Nhận Định Niềm Tin</p>
                                            {impliedGrowth !== null && (impliedGrowth * 100) > fundamentals.profitGrowth ? (
                                                <div>
                                                    <p className="text-sm font-bold text-rose-400 flex items-center gap-1">
                                                        <AlertTriangle className="w-4 h-4" /> KỲ VỌNG CAO
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                        Thị trường đòi hỏi mức tăng trưởng cao hơn những gì lịch sử làm được. Có rủi ro.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                                                        <CheckCircle className="w-4 h-4" /> BI QUAN / THẾ THƯỢNG PHONG
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                        Chỉ cần tiếp tục giữ phong độ lịch sử là nhà đầu tư đã dễ dàng có lãi.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-8 text-left max-w-4xl mx-auto bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                                        <h3 className="text-sm font-bold text-indigo-300 mb-1 flex items-center gap-2">
                                            <Shield className="w-4 h-4" /> Reverse DCF là gì?
                                        </h3>
                                        <p className="text-xs text-indigo-200/70 leading-relaxed">
                                            Thay vì dự đoán tương lai để tìm ra giá trị nội tại (rất dễ sai lầm), Reverse DCF đảo ngược phương trình: dùng giá trị thật trên sàn để tìm ra <strong>Thị trường đang dự đoán gì?</strong> Nếu bạn tin rằng doanh nghiệp có thể tăng trưởng cao hơn mức kỳ vọng này, cổ phiếu đó đang rẻ.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </ErrorBoundary>
                    )}

                    {/* Results - P/E Band */}
                    {valuation && fundamentals && activeTab === 'peBand' && (
                        <ErrorBoundary>
                            <Card className="bg-[#111827] border-slate-800 mt-6 relative overflow-hidden">
                                <div className="absolute bottom-0 left-0 p-32 bg-amber-500/5 blur-3xl rounded-full mix-blend-screen pointer-events-none"></div>
                                <CardContent className="p-8 relative z-10">
                                    <h2 className="text-xl font-bold text-slate-200 mb-2 text-center">Khung Định Giá P/E Band</h2>
                                    <p className="text-sm text-slate-400 max-w-2xl mx-auto mb-8 text-center">
                                        So sánh giá hiện tại <strong className="text-white">{fundamentals.currentPrice.toLocaleString()}đ</strong> với các mức giá tương ứng khi P/E ở ngưỡng Rẻ, Hợp lý, Đắt, và Bong bóng.
                                    </p>

                                    {fundamentals.eps > 0 ? (() => {
                                        const eps = fundamentals.eps;
                                        const currentPE = fundamentals.pe;
                                        const price = fundamentals.currentPrice;
                                        const bands = [
                                            { label: 'Rẻ (P/E 8)', pe: 8, color: 'emerald', value: eps * 8 },
                                            { label: 'Hợp lý (P/E 12)', pe: 12, color: 'sky', value: eps * 12 },
                                            { label: 'Trung bình (P/E 15)', pe: 15, color: 'amber', value: eps * 15 },
                                            { label: 'Đắt (P/E 20)', pe: 20, color: 'orange', value: eps * 20 },
                                            { label: 'Bong bóng (P/E 25)', pe: 25, color: 'rose', value: eps * 25 },
                                        ];
                                        const maxVal = Math.max(...bands.map(b => b.value), price);

                                        return (
                                            <div className="space-y-4">
                                                {bands.map(band => {
                                                    const pct = (band.value / maxVal) * 100;
                                                    const pricePct = (price / maxVal) * 100;
                                                    const isAbove = price > band.value;
                                                    const colorMap: Record<string, string> = {
                                                        emerald: 'bg-emerald-500', sky: 'bg-sky-500', amber: 'bg-amber-500', orange: 'bg-orange-500', rose: 'bg-rose-500',
                                                    };
                                                    const textColorMap: Record<string, string> = {
                                                        emerald: 'text-emerald-400', sky: 'text-sky-400', amber: 'text-amber-400', orange: 'text-orange-400', rose: 'text-rose-400',
                                                    };
                                                    return (
                                                        <div key={band.label}>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className={`text-xs font-bold ${textColorMap[band.color]}`}>{band.label}</span>
                                                                <span className="text-xs text-slate-400 font-mono">{band.value.toLocaleString()}đ</span>
                                                            </div>
                                                            <div className="relative h-6 bg-slate-800/80 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${colorMap[band.color]}/30 rounded-full transition-all duration-500`}
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                                {/* Current price marker */}
                                                                <div
                                                                    className="absolute top-0 h-full w-0.5 bg-white/80 shadow-lg shadow-white/30"
                                                                    style={{ left: `${Math.min(pricePct, 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {/* Legend */}
                                                <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400">
                                                    <div className="w-4 h-0.5 bg-white/80"></div>
                                                    <span>Giá hiện tại ({price.toLocaleString()}đ · P/E {currentPE.toFixed(1)}x)</span>
                                                </div>

                                                {/* Interpretation */}
                                                <div className="mt-4 bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                                                    <p className="text-sm text-slate-300">
                                                        {currentPE <= 10 && '🟢 Cổ phiếu đang ở vùng GIÁ RẺ. Phù hợp cho chiến lược Value Investing tích lũy dài hạn.'}
                                                        {currentPE > 10 && currentPE <= 15 && '🟡 Cổ phiếu đang ở vùng GIÁ HỢP LÝ. Có thể cân nhắc mua nếu kỳ vọng tăng trưởng tốt.'}
                                                        {currentPE > 15 && currentPE <= 22 && '🟠 Cổ phiếu đang ở vùng GIÁ CAO. Cẩn trọng — chỉ nên mua nếu đây là cổ phiếu tăng trưởng với ROE cao.'}
                                                        {currentPE > 22 && '🔴 Cổ phiếu đang ở vùng BONG BÓNG. Rủi ro điều chỉnh rất cao. Nên xem xét chốt lời hoặc đợi giá điều chỉnh.'}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })() : (
                                        <div className="text-center py-12 text-slate-500">
                                            <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-50" />
                                            <p className="text-sm">Không thể hiển thị P/E Band — EPS không hợp lệ (âm hoặc bằng 0).</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </ErrorBoundary>
                    )}

                    {/* Results - Recommendation (Khuyến Nghị Định Giá) */}
                    {valuation && fundamentals && activeTab === 'recommendation' && (
                        <ErrorBoundary>
                            <Card className="bg-[#111827] border-slate-800 mt-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 blur-3xl rounded-full mix-blend-screen pointer-events-none"></div>
                                <CardContent className="p-8 relative z-10">
                                    <h2 className="text-xl font-bold text-slate-200 mb-2 text-center">🎯 Giá Mục Tiêu Bằng PP Tương Đối (Ngắn/Trung Hạn)</h2>
                                    <p className="text-sm text-slate-400 max-w-2xl mx-auto mb-8 text-center">
                                        Giá mục tiêu kỳ vọng dựa trên so sánh P/B, P/E trung bình ngành và tốc độ Tăng Trường (PEG). Khác với Giá Trị Nội Tại (Dài hạn), mức giá này phản ánh kỳ vọng của dòng tiền trên thị trường hiện tại.
                                    </p>

                                    {(() => {
                                        const price = fundamentals.currentPrice;
                                        const eps = fundamentals.eps;
                                        const bvps = fundamentals.bvps;
                                        const roe = fundamentals.roe; // already percentage (e.g. 15)
                                        const pe = fundamentals.pe;
                                        const pb = fundamentals.pb;
                                        const growth = fundamentals.profitGrowth; // already percentage (e.g. 20)

                                        // Method 1: P/B × BVPS — target P/B = max(1.5, ROE/10)
                                        const isBank = fundamentals.industry === 'Ngân hàng';
                                        let fairPB = Math.max(1.5, roe / 10);
                                        if (isBank) fairPB = Math.min(1.6, fairPB); // Bank PB rarely exceeds 1.6x in VN
                                        const targetPB = bvps * fairPB;

                                        // Method 2: P/E × EPS — Blend industry average and projected growth
                                        const basePE = fundamentals.industryPE || 15;
                                        let targetPE_ratio = growth > 0 ? Math.max(10, Math.min(basePE * 1.5, (basePE + growth) / 2)) : basePE;
                                        if (isBank) targetPE_ratio = Math.min(10, targetPE_ratio); // Bank PE typically caps at 10x
                                        const targetPE = eps * targetPE_ratio;

                                        // Method 3: PEG-adjusted — Premium expansion for tech/growth sectors
                                        const peg = growth > 0 ? pe / growth : 2;
                                        const fairPEG = (basePE >= 20 || isBank) ? 1.0 : 1.0;
                                        let targetPEG = growth > 0 ? eps * growth * fairPEG : targetPE;
                                        if (isBank) targetPEG = Math.min(targetPEG, eps * 11); // Cap Bank PEG price at P/E 11x

                                        // Smart Sector Weighting for final target
                                        let weightPB = 1 / 3, weightPE = 1 / 3, weightPEG = 1 / 3;
                                        if (isBank) {
                                            // Banking/Financials: P/B is paramount
                                            weightPB = 0.60;
                                            weightPE = 0.30;
                                            weightPEG = 0.10;
                                        } else if (basePE >= 20 || roe >= 20 || pb >= 4) {
                                            // Asset-light / Tech / High Growth: Downweight P/B heavily
                                            weightPB = 0.10;
                                            weightPE = 0.45;
                                            weightPEG = 0.45;
                                        } else if (basePE <= 12 && pb <= 2) {
                                            // Banks / Heavy Industry / Deep Value: P/B is highly relevant
                                            weightPB = 0.50;
                                            weightPE = 0.30;
                                            weightPEG = 0.20;
                                        }

                                        const targets = [targetPB, targetPE, targetPEG].filter(t => t > 0 && isFinite(t));
                                        const avgTarget = (targetPB * weightPB) + (targetPE * weightPE) + (targetPEG * weightPEG);
                                        const lowTarget = Math.min(...targets);
                                        const highTarget = Math.max(...targets);
                                        const upside = avgTarget > 0 ? ((avgTarget - price) / price * 100) : 0;

                                        // Verdict
                                        let verdict = 'GIỮ';
                                        let verdictColor = 'text-amber-400';
                                        let verdictBg = 'bg-amber-500/10 border-amber-500/30';
                                        let verdictEmoji = '🟡';
                                        if (upside >= 20) { verdict = 'MUA MẠNH'; verdictColor = 'text-emerald-400'; verdictBg = 'bg-emerald-500/10 border-emerald-500/30'; verdictEmoji = '🟢'; }
                                        else if (upside >= 10) { verdict = 'MUA'; verdictColor = 'text-emerald-300'; verdictBg = 'bg-emerald-500/10 border-emerald-500/20'; verdictEmoji = '🟢'; }
                                        else if (upside <= -15) { verdict = 'BÁN'; verdictColor = 'text-rose-400'; verdictBg = 'bg-rose-500/10 border-rose-500/30'; verdictEmoji = '🔴'; }
                                        else if (upside <= -5) { verdict = 'GIẢM TỶ TRỌNG'; verdictColor = 'text-orange-400'; verdictBg = 'bg-orange-500/10 border-orange-500/30'; verdictEmoji = '🟠'; }

                                        return (
                                            <div className="space-y-6">
                                                {/* Big Verdict */}
                                                <div className={`rounded-2xl border p-6 text-center ${verdictBg}`}>
                                                    <p className="text-4xl font-black mb-2">{verdictEmoji}</p>
                                                    <p className={`text-2xl font-black ${verdictColor}`}>{verdict}</p>
                                                    <p className="text-sm text-slate-400 mt-2">
                                                        Giá hiện tại <strong className="text-white">{price.toLocaleString()}đ</strong> → Mục tiêu <strong className={verdictColor}>{avgTarget > 0 ? `${Math.round(avgTarget).toLocaleString()}đ` : 'N/A'}</strong>
                                                    </p>
                                                    <p className={`text-lg font-bold mt-1 ${upside >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {upside >= 0 ? '▲' : '▼'} {Math.abs(upside).toFixed(1)}% {upside >= 0 ? 'tiềm năng tăng' : 'rủi ro giảm'}
                                                    </p>
                                                    {targets.length >= 2 && (
                                                        <p className="text-xs text-slate-500 mt-2">
                                                            Vùng giá mục tiêu: {Math.round(lowTarget).toLocaleString()}đ — {Math.round(highTarget).toLocaleString()}đ
                                                        </p>
                                                    )}
                                                </div>

                                                {/* 3 Methods Breakdown */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {/* P/B Method */}
                                                    <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                                                        <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">📘 P/B × Giá Trị Sổ Sách</p>
                                                        <p className="text-2xl font-black text-white">{targetPB > 0 ? `${Math.round(targetPB).toLocaleString()}đ` : 'N/A'}</p>
                                                        <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
                                                            <p>BVPS: {bvps.toLocaleString()}đ</p>
                                                            <p>P/B hiện tại: {pb.toFixed(1)}x → hợp lý: {fairPB.toFixed(1)}x</p>
                                                            <p>ROE: {roe.toFixed(1)}%</p>
                                                        </div>
                                                    </div>

                                                    {/* P/E Method */}
                                                    <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                                                        <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">📊 P/E × Thu Nhập</p>
                                                        <p className="text-2xl font-black text-white">{targetPE > 0 ? `${Math.round(targetPE).toLocaleString()}đ` : 'N/A'}</p>
                                                        <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
                                                            <p>EPS: {eps.toLocaleString()}đ</p>
                                                            <p>P/E hiện tại: {pe.toFixed(1)}x → hợp lý: {targetPE_ratio.toFixed(1)}x</p>
                                                            <p>Ngành: {fundamentals.industryPE?.toFixed(1) || 'N/A'}x</p>
                                                        </div>
                                                    </div>

                                                    {/* PEG Method */}
                                                    <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                                                        <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">🚀 PEG × Tăng Trưởng</p>
                                                        <p className="text-2xl font-black text-white">{targetPEG > 0 ? `${Math.round(targetPEG).toLocaleString()}đ` : 'N/A'}</p>
                                                        <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
                                                            <p>Tăng trưởng LN: {growth.toFixed(1)}%</p>
                                                            <p>PEG hiện tại: {peg.toFixed(2)}x → hợp lý: 1.0x</p>
                                                            <p>{peg < 1 ? '✅ P/E rẻ so với tăng trưởng' : peg > 2 ? '❌ P/E đắt so với tăng trưởng' : '⚠️ P/E hợp lý'}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Summary Text */}
                                                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                                                    <p className="text-xs text-slate-400 leading-relaxed">
                                                        💡 <strong className="text-slate-300">Cách đọc:</strong> Giá mục tiêu được tính bằng trung bình 3 phương pháp.
                                                        P/B dùng cho cổ phiếu ngân hàng/tài chính. P/E phù hợp đa ngành.
                                                        PEG đánh giá mức giá so với tốc độ tăng trưởng lợi nhuận.
                                                        <br /><br />
                                                        ⚠️ Đây là tham khảo dựa trên dữ liệu tài chính. Luôn kết hợp với phân tích kỹ thuật và tin tức trước khi ra quyết định.
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </CardContent>
                            </Card>
                        </ErrorBoundary>
                    )}

                    {/* Empty State */}
                    {!valuation && !loading && !error && (
                        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
                            <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                <Calculator className="w-10 h-10 text-indigo-400" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-300">Nhập mã cổ phiếu để định giá</h2>
                            <p className="text-sm text-slate-500 max-w-md">
                                Hệ thống sẽ tự động lấy dữ liệu tài chính và áp dụng 4 phương pháp định giá chuyên nghiệp:
                                Gordon Growth, P/E tương đối, Graham Number, và DCF.
                            </p>
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
}

// ==================== SUB-COMPONENTS ====================

function SummaryCard({ valuation, fundamentals }: { valuation: ValuationSummary; fundamentals: FundamentalsData }) {
    const config = VERDICT_CONFIG[valuation.overallVerdict];
    const VerdictIcon = config.icon;

    return (
        <Card className={`bg-gradient-to-r ${config.gradient} border ${config.bg.split(' ')[1]} shadow-xl overflow-hidden`}>
            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Định giá nội tại (Dài Hạn)</p>
                        <h2 className="text-3xl font-black text-white flex items-center gap-3">
                            {fundamentals.symbol}
                            <Badge className={`${config.bg} ${config.color} text-sm font-bold px-3 py-1`}>
                                <VerdictIcon className="w-4 h-4 mr-1" />
                                {config.label}
                            </Badge>
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">{fundamentals.companyName} • {fundamentals.industry}</p>
                    </div>

                    <div className="flex gap-6">
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Giá hiện tại</p>
                            <p className="text-xl font-bold text-white font-mono">{(valuation.currentPrice / 1000).toFixed(1)}k</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Giá nội tại TB</p>
                            <p className={`text-xl font-bold font-mono ${config.color}`}>
                                {valuation.averageIntrinsic > 0 ? `${(valuation.averageIntrinsic / 1000).toFixed(1)}k` : 'N/A'}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Biên an toàn</p>
                            <p className={`text-xl font-bold font-mono flex items-center gap-1 ${valuation.overallMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {valuation.overallMargin >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                {valuation.overallMargin.toFixed(1)}%
                            </p>
                        </div>
                        <div className="text-center pl-6 border-l border-white/10">
                            <p className="text-[10px] text-slate-500 uppercase font-bold text-left mb-1">Độ tin cậy & Hiệu chuẩn</p>
                            <div className="flex items-center gap-2">
                                <span className={`text-xl font-black ${
                                    valuation.convictionScore >= 80 ? 'text-emerald-400' :
                                    valuation.convictionScore >= 60 ? 'text-sky-400' :
                                    valuation.convictionScore >= 40 ? 'text-amber-400' :
                                    'text-rose-400'
                                }`}>
                                    {valuation.convictionScore}%
                                </span>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-inner shadow-black/40 ${
                                    valuation.convergenceGrade === 'S' ? 'bg-amber-400 text-black' :
                                    valuation.convergenceGrade === 'A' ? 'bg-emerald-500 text-white' :
                                    valuation.convergenceGrade === 'B' ? 'bg-sky-500 text-white' :
                                    'bg-slate-700 text-slate-300'
                                }`}>
                                    {valuation.convergenceGrade}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sector Calibration Banner */}
                {valuation.sectorCalibration && (
                    <div className="mt-4 px-4 py-2 bg-black/40 border border-white/5 rounded-2xl flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                        <span className="text-[11px] font-medium text-slate-400 tracking-wide uppercase">{valuation.sectorCalibration}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function FundamentalsGrid({ fundamentals }: { fundamentals: FundamentalsData }) {
    const items = [
        { label: 'EPS', value: `${fundamentals.eps.toLocaleString()} đ`, sub: 'Lợi nhuận/CP' },
        { label: 'P/E', value: `${fundamentals.pe.toFixed(1)}x`, sub: `Ngành: ${fundamentals.industryPE.toFixed(1)}x` },
        { label: 'P/B', value: `${fundamentals.pb.toFixed(1)}x`, sub: `BVPS: ${fundamentals.bvps.toLocaleString()} đ` },
        { label: 'ROE', value: `${fundamentals.roe.toFixed(1)}%`, sub: 'Hiệu suất vốn' },
        { label: 'Cổ tức/năm', value: `${fundamentals.lastDividend.toLocaleString()} đ`, sub: `Yield: ${fundamentals.dividendYield.toFixed(1)}%` },
        { label: 'Tăng trưởng CT', value: `${fundamentals.dividendGrowth5Y.toFixed(1)}%`, sub: 'CAGR 5 năm' },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {items.map(({ label, value, sub }) => (
                <Card key={label} className="bg-[#111827] border-slate-800">
                    <CardContent className="p-3 text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">{label}</p>
                        <p className="text-lg font-bold text-white font-mono mt-1">{value}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function MethodCard({ result, currentPrice }: { result: ValuationResult; currentPrice: number }) {
    const config = VERDICT_CONFIG[result.verdict];
    const VerdictIcon = config.icon;
    const isValid = result.intrinsicValue > 0 && result.confidence > 20;

    return (
        <Card className={`bg-[#111827] border-slate-800 shadow-lg overflow-hidden transition-all duration-300 hover:border-slate-700 ${!isValid ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-indigo-400" />
                            {result.method}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500 mt-1 font-mono">{result.formula}</CardDescription>
                    </div>
                    <Badge className={`${config.bg} ${config.color} text-xs font-bold px-2 py-0.5`}>
                        <VerdictIcon className="w-3 h-3 mr-1" />
                        {config.label}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {/* Values */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Giá nội tại</p>
                        <p className={`text-2xl font-black ${isValid ? config.color + ' font-mono' : 'text-slate-600 text-lg'}`}>
                            {isValid ? `${(result.intrinsicValue / 1000).toFixed(1)}k` : result.method.includes('Gordon') ? 'Không áp dụng' : 'N/A'}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Biên an toàn</p>
                        <p className={`text-lg font-bold font-mono ${result.marginOfSafety >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isValid ? `${result.marginOfSafety.toFixed(1)}%` : '—'}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Độ tin cậy</p>
                        <div className="flex items-center gap-1 mt-1">
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                    style={{ width: `${result.confidence}%` }}
                                />
                            </div>
                            <span className="text-xs text-slate-400 font-mono">{result.confidence}%</span>
                        </div>
                    </div>
                </div>

                {/* Visual bar: price vs intrinsic */}
                {isValid && (
                    <div className="relative h-8 bg-slate-900 rounded-lg overflow-hidden">
                        <div
                            className={`absolute top-0 left-0 h-full rounded-lg ${result.marginOfSafety >= 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}
                            style={{ width: `${Math.min(100, (currentPrice / result.intrinsicValue) * 100)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-mono">
                            <span className="text-white">Giá: {(currentPrice / 1000).toFixed(1)}k</span>
                            <span className={config.color}>Nội tại: {(result.intrinsicValue / 1000).toFixed(1)}k</span>
                        </div>
                    </div>
                )}

                {/* Inputs used */}
                <div className="space-y-1 pt-2 border-t border-slate-800/50">
                    {Object.entries(result.inputs).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                            <span className="text-slate-500">{key}</span>
                            <span className="text-slate-300 font-mono">{isValid ? value : '0 đ'}</span>
                        </div>
                    ))}
                </div>

                {/* Note */}
                <p className={`text-[10px] italic pt-1 ${!isValid && result.method.includes('Gordon') ? 'text-amber-500/80 font-medium' : 'text-slate-500'}`}>
                    {!isValid && result.method.includes('Gordon') ? '⚠️ Không áp dụng: Cổ phiếu không trả cổ tức tiền mặt đều đặn.' : result.notes}
                </p>
            </CardContent>
        </Card>
    );
}

function SensitivityTable({ data, currentPrice }: { data: ReturnType<typeof generateSensitivityTable>; currentPrice: number }) {
    return (
        <Card className="bg-[#111827] border-slate-800">
            <CardHeader className="pb-2 border-b border-slate-800 bg-slate-900/50">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-200">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    BẢNG ĐỘ NHẠY — DCF
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                    Giá trị nội tại thay đổi theo tốc độ tăng trưởng EPS và tỷ lệ chiết khấu (nghìn VND)
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
                <table className="w-full text-xs font-mono">
                    <thead>
                        <tr>
                            <th className="text-slate-500 font-bold p-2 text-left">WACC ↓ / g →</th>
                            {data.growthRates.map((g, i) => (
                                <th key={i} className="text-indigo-400 font-bold p-2 text-center">{(g * 100).toFixed(0)}%</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.discountRates.map((dr, ri) => (
                            <tr key={ri} className="border-t border-slate-800/50">
                                <td className="text-amber-400 font-bold p-2">{(dr * 100).toFixed(0)}%</td>
                                {data.values[ri].map((val, ci) => {
                                    const isUndervalued = val > currentPrice;
                                    return (
                                        <td key={ci} className={`p-2 text-center font-bold ${isUndervalued ? 'text-emerald-400 bg-emerald-500/5' : 'text-rose-400 bg-rose-500/5'} rounded`}>
                                            {(val / 1000).toFixed(1)}k
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="text-[10px] text-slate-500 mt-3 text-center">
                    <span className="text-emerald-400">■</span> Xanh = Giá nội tại {'>'} giá hiện tại ({(currentPrice / 1000).toFixed(1)}k) — CỔ PHIẾU RẺ &nbsp;&nbsp;
                    <span className="text-rose-400">■</span> Đỏ = Giá nội tại {'<'} giá hiện tại — CỔ PHIẾU ĐẮT
                </p>
            </CardContent>
        </Card>
    );
}

// ==================== NEW COMPONENT: CONVICTION DASHBOARD ====================
function ConvictionDashboard({ data }: { data: FundamentalsData }) {
    // Health logic
    const isDebtSafe = data.debtToEquity < 1.5;
    const isLiquiditySafe = data.currentRatio > 1.2;
    const isGrowing = data.profitGrowth > 0;
    const isPlanOnTrack = data.planCompletion >= 80;

    return (
        <Card className="bg-[#111827] border-slate-800 shadow-lg overflow-hidden relative">
            {/* Background subtle gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 z-0" />

            <CardHeader className="pb-3 border-b border-slate-800/50 bg-slate-900/30 relative z-10">
                <CardTitle className="text-sm font-bold text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-indigo-400" />
                        ĐÁNH GIÁ ĐỊNH TÍNH & VĨ MÔ
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-300 border-indigo-500/20">
                        Cơ sở ra quyết định đầu tư
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* 1. Sức Khỏe Tài Chính */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            Mức Độ Rủi Ro (Tài Chính)
                        </h4>

                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-300">Nợ / Vốn chủ sở hữu (D/E)</span>
                                <span className={`font-mono font-bold ${isDebtSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {data.debtToEquity.toFixed(1)}x
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${isDebtSafe ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                    style={{ width: `${Math.min((data.debtToEquity / 3) * 100, 100)}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                                {isDebtSafe ? 'An toàn / Chuẩn mực (< 1.5x)' : 'Cảnh báo đòn bẩy cao (> 1.5x)'}
                            </p>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-300">Thanh toán hiện hành (CR)</span>
                                <span className={`font-mono font-bold ${isLiquiditySafe ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {data.currentRatio.toFixed(1)}x
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${isLiquiditySafe ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    style={{ width: `${Math.min((data.currentRatio / 3) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. Động lực tăng trưởng */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            Kế Hoạch & Tăng Trưởng
                        </h4>

                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-300">Tăng trưởng Lợi nhuận (YoY)</span>
                                <span className={`font-mono font-bold flex items-center gap-1 ${isGrowing ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {isGrowing ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {data.profitGrowth > 0 ? '+' : ''}{data.profitGrowth.toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full flex items-center overflow-hidden">
                                {/* Base middle line at 0% */}
                                <div className={`h-full ${isGrowing ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                    style={{ width: `${Math.min(Math.abs(data.profitGrowth), 100)}%` }} />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-300">Hoàn thành KH năm</span>
                                <span className={`font-mono font-bold ${isPlanOnTrack ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {data.planCompletion.toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${isPlanOnTrack ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    style={{ width: `${Math.min(data.planCompletion, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. Tích sản */}
                    <div className="space-y-4 flex flex-col justify-between h-full border-l-0 md:border-l border-slate-800 md:pl-6">
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Hiệu Suất Đầu Tư (5 Năm)
                            </h4>
                            <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                                Mức sinh lời kép (CAGR) phản ánh chất lượng ban lãnh đạo và giá trị nắm giữ dài hạn.
                            </p>
                        </div>

                        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800 flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-300">CAGR 5N</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-2xl font-black font-mono tracking-tighter ${data.historicalReturn5Y > 10 ? 'text-indigo-400' : data.historicalReturn5Y > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {data.historicalReturn5Y > 0 ? '+' : ''}{data.historicalReturn5Y.toFixed(1)}%
                                </span>
                                <span className="text-[10px] text-slate-500 mt-1">/năm</span>
                            </div>
                        </div>
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}
