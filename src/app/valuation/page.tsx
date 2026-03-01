'use client';

import React, { useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
    Calculator, Search, TrendingUp, TrendingDown, Minus,
    Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Loader2, Menu, ChevronDown, ChevronUp
} from 'lucide-react';
import {
    runFullValuation,
    generateSensitivityTable,
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

    // Custom params
    const [requiredReturn, setRequiredReturn] = useState(12);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleValuate = useCallback(async () => {
        if (!symbol.trim()) return;
        setLoading(true);
        setError(null);
        setValuation(null);
        setFundamentals(null);
        setSensitivity(null);

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
                roe: data.roe,
                lastDividend: data.lastDividend,
                dividendGrowth: data.dividendGrowth5Y,
                industryPE: data.industryPE,
                dividendYield: data.dividendYield,
            };

            const result = runFullValuation(input, { requiredReturn });
            setValuation(result);

            // Generate sensitivity table
            const epsGrowth = Math.min(data.roe * 0.6, 25) / 100;
            const sensTable = generateSensitivityTable(data.eps, epsGrowth, requiredReturn / 100);
            setSensitivity(sensTable);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi');
        } finally {
            setLoading(false);
        }
    }, [symbol, requiredReturn]);

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

                    {/* Input Bar */}
                    <Card className="bg-[#111827] border-slate-800">
                        <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row gap-3 items-end">
                                <div className="flex-1">
                                    <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Mã cổ phiếu</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="text"
                                            value={symbol}
                                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => e.key === 'Enter' && handleValuate()}
                                            placeholder="VD: FPT, VNM, VCB..."
                                            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors px-3 py-3"
                                >
                                    {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    Tùy chỉnh
                                </button>

                                <Button
                                    onClick={handleValuate}
                                    disabled={loading || !symbol.trim()}
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-8 py-3 rounded-xl"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
                                    ĐỊNH GIÁ
                                </Button>
                            </div>

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
                                            💡 Required Return (r) = lãi suất mà bạn yêu cầu cho rủi ro. Mặc định 12% phù hợp thị trường VN.
                                            Tăng r → giảm giá trị nội tại → đánh giá bảo thủ hơn.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

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

                    {/* Results */}
                    {valuation && fundamentals && (
                        <ErrorBoundary>
                            {/* Summary Card */}
                            <SummaryCard valuation={valuation} fundamentals={fundamentals} />

                            {/* Conviction Dashboard / Health Indicators */}
                            <div className="mt-6">
                                <ConvictionDashboard data={fundamentals} />
                            </div>

                            {/* Fundamentals Overview */}
                            <div className="mt-6">
                                <FundamentalsGrid fundamentals={fundamentals} />
                            </div>

                            {/* 4 Method Cards */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                                {valuation.results.map((result) => (
                                    <MethodCard key={result.methodKey} result={result} currentPrice={fundamentals.currentPrice} />
                                ))}
                            </div>

                            {/* Sensitivity Table */}
                            {sensitivity && fundamentals.eps > 0 && (
                                <div className="mt-6">
                                    <SensitivityTable data={sensitivity} currentPrice={fundamentals.currentPrice} />
                                </div>
                            )}
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
            </div>
        </div>
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
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Kết quả định giá</p>
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
                    </div>
                </div>
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
        <Card className={`bg-[#111827] border-slate-800 shadow-lg overflow-hidden ${!isValid ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-indigo-400" />
                            {result.method}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500 mt-1 font-mono">{result.formula}</CardDescription>
                    </div>
                    <Badge className={`${config.bg} ${config.color} text-xs font-bold`}>
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
                        <p className={`text-2xl font-black font-mono ${isValid ? config.color : 'text-slate-600'}`}>
                            {isValid ? `${(result.intrinsicValue / 1000).toFixed(1)}k` : 'N/A'}
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
                            <span className="text-slate-300 font-mono">{value}</span>
                        </div>
                    ))}
                </div>

                {/* Note */}
                <p className="text-[10px] text-slate-500 italic pt-1">{result.notes}</p>
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
