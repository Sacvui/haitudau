'use client';

import React, { useState, useMemo } from 'react';
import { GlassCard } from '@/components/ui/glass';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Target,
    Calculator,
    TrendingUp,
    Calendar,
    DollarSign,
    PiggyBank,
    Sparkles,
    ArrowRight,
    CheckCircle,
    AlertTriangle,
    Info
} from 'lucide-react';
import Link from 'next/link';

interface PlanResult {
    monthlyRequired: number;
    totalInvested: number;
    projectedValue: number;
    dividendsEarned: number;
    achievable: boolean;
    scenarios: {
        name: string;
        returnRate: number;
        monthlyRequired: number;
        finalValue: number;
        color: string;
    }[];
    suggestedStocks: {
        symbol: string;
        reason: string;
        expectedYield: number;
    }[];
}

export default function GoalPlannerPage() {
    const [goal, setGoal] = useState({
        targetAmount: 1000000000, // 1 billion VND
        years: 10,
        initialAmount: 100000000, // 100M initial
        riskLevel: 'moderate' as 'conservative' | 'moderate' | 'aggressive',
        includeDividends: true,
    });

    const [showResult, setShowResult] = useState(false);

    const returnRates = {
        conservative: { rate: 0.08, dividend: 0.03 }, // 8% growth + 3% dividend
        moderate: { rate: 0.12, dividend: 0.025 },    // 12% growth + 2.5% dividend
        aggressive: { rate: 0.18, dividend: 0.02 },   // 18% growth + 2% dividend
    };

    const suggestedStocks = {
        conservative: [
            { symbol: 'VNM', reason: 'Cổ tức ổn định ~5%/năm, blue-chip', expectedYield: 5.0 },
            { symbol: 'VCB', reason: 'Ngân hàng hàng đầu, cổ tức + CP thưởng', expectedYield: 2.0 },
            { symbol: 'FPT', reason: 'Tăng trưởng bền vững, cổ tức đều đặn', expectedYield: 2.5 },
        ],
        moderate: [
            { symbol: 'VIB', reason: 'Ngân hàng tăng trưởng cao, CP thưởng tốt', expectedYield: 2.0 },
            { symbol: 'MBB', reason: 'ROE cao, CP thưởng hấp dẫn', expectedYield: 3.5 },
            { symbol: 'FPT', reason: 'Leader công nghệ, tăng trưởng ổn định', expectedYield: 2.5 },
        ],
        aggressive: [
            { symbol: 'VIB', reason: 'Tăng trưởng nhanh, CP thưởng lớn', expectedYield: 2.0 },
            { symbol: 'HPG', reason: 'Biến động cao, tiềm năng lớn', expectedYield: 1.5 },
            { symbol: 'TCB', reason: 'Ngân hàng tăng trưởng mạnh', expectedYield: 1.0 },
        ],
    };

    const calculatePlan = useMemo((): PlanResult | null => {
        if (!showResult) return null;

        const { targetAmount, years, initialAmount, riskLevel, includeDividends } = goal;
        const months = years * 12;
        const { rate, dividend } = returnRates[riskLevel];
        const monthlyGrowthRate = Math.pow(1 + rate, 1 / 12) - 1;
        const avgDividendYield = includeDividends ? dividend : 0;

        // Calculate monthly required using future value of annuity formula
        // FV = PV(1+r)^n + PMT * ((1+r)^n - 1) / r
        // Solve for PMT: PMT = (FV - PV(1+r)^n) * r / ((1+r)^n - 1)

        const pvGrowth = initialAmount * Math.pow(1 + rate + avgDividendYield, years);
        const remainingNeeded = targetAmount - pvGrowth;

        // Monthly compounding
        const totalMonthlyRate = monthlyGrowthRate + avgDividendYield / 12;
        const compoundFactor = Math.pow(1 + totalMonthlyRate, months);
        const monthlyRequired = remainingNeeded > 0
            ? (remainingNeeded * totalMonthlyRate) / (compoundFactor - 1)
            : 0;

        const totalInvested = initialAmount + (monthlyRequired * months);

        // Simulate growth with reinvested dividends
        let balance = initialAmount;
        let totalDividends = 0;
        for (let m = 0; m < months; m++) {
            if (m > 0) balance += monthlyRequired;
            const monthlyDividend = balance * (avgDividendYield / 12);
            totalDividends += monthlyDividend;
            balance = balance * (1 + monthlyGrowthRate) + monthlyDividend;
        }

        const scenarios = [
            {
                name: 'Thận trọng',
                returnRate: 8,
                monthlyRequired: calculateMonthlyForRate(0.08 + 0.03),
                finalValue: calculateFinalValue(0.08 + 0.03, calculateMonthlyForRate(0.08 + 0.03)),
                color: 'text-blue-400',
            },
            {
                name: 'Cân bằng',
                returnRate: 12,
                monthlyRequired: calculateMonthlyForRate(0.12 + 0.025),
                finalValue: calculateFinalValue(0.12 + 0.025, calculateMonthlyForRate(0.12 + 0.025)),
                color: 'text-emerald-400',
            },
            {
                name: 'Tích cực',
                returnRate: 18,
                monthlyRequired: calculateMonthlyForRate(0.18 + 0.02),
                finalValue: calculateFinalValue(0.18 + 0.02, calculateMonthlyForRate(0.18 + 0.02)),
                color: 'text-amber-400',
            },
        ];

        function calculateMonthlyForRate(annualRate: number): number {
            const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
            const pvg = initialAmount * Math.pow(1 + annualRate, years);
            const remaining = targetAmount - pvg;
            if (remaining <= 0) return 0;
            const cf = Math.pow(1 + monthlyRate, months);
            return (remaining * monthlyRate) / (cf - 1);
        }

        function calculateFinalValue(annualRate: number, monthly: number): number {
            const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
            let bal = initialAmount;
            for (let m = 0; m < months; m++) {
                if (m > 0) bal += monthly;
                bal = bal * (1 + monthlyRate);
            }
            return bal;
        }

        return {
            monthlyRequired: Math.max(0, monthlyRequired),
            totalInvested,
            projectedValue: balance,
            dividendsEarned: totalDividends,
            achievable: monthlyRequired < goal.targetAmount / (months * 2), // Reasonable threshold
            scenarios,
            suggestedStocks: suggestedStocks[riskLevel],
        };
    }, [showResult, goal]);

    const formatCurrency = (val: number, short = false) => {
        if (short) {
            if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
            if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
            return val.toLocaleString();
        }
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="min-h-screen bg-[#0a0f1a] p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Target className="w-8 h-8 text-indigo-400" />
                            Goal-based Planner
                        </h1>
                        <p className="text-slate-400 mt-1">Lập kế hoạch đầu tư theo mục tiêu tài chính</p>
                    </div>
                    <Link href="/">
                        <Button variant="outline" className="border-slate-700 text-slate-300">
                            ← Về Dashboard
                        </Button>
                    </Link>
                </div>

                {/* Input Form */}
                <GlassCard className="p-6">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-emerald-400" />
                        Thiết lập mục tiêu
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Target Amount */}
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">
                                🎯 Số tiền mục tiêu (VND)
                            </label>
                            <Input
                                type="text"
                                value={goal.targetAmount.toLocaleString()}
                                onChange={e => setGoal(g => ({
                                    ...g,
                                    targetAmount: parseInt(e.target.value.replace(/\D/g, '')) || 0
                                }))}
                                className="bg-slate-800/50 border-slate-700 text-white text-lg font-mono"
                            />
                            <div className="flex gap-2 mt-2">
                                {[500e6, 1e9, 2e9, 5e9].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setGoal(g => ({ ...g, targetAmount: v }))}
                                        className={`px-3 py-1 text-xs rounded-full border transition-all ${goal.targetAmount === v
                                                ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                                                : 'border-slate-700 text-slate-400 hover:border-slate-500'
                                            }`}
                                    >
                                        {formatCurrency(v, true)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Timeline */}
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">
                                📅 Thời gian (năm)
                            </label>
                            <Input
                                type="number"
                                value={goal.years}
                                onChange={e => setGoal(g => ({ ...g, years: parseInt(e.target.value) || 1 }))}
                                min={1}
                                max={30}
                                className="bg-slate-800/50 border-slate-700 text-white text-lg font-mono"
                            />
                            <div className="flex gap-2 mt-2">
                                {[5, 10, 15, 20].map(y => (
                                    <button
                                        key={y}
                                        onClick={() => setGoal(g => ({ ...g, years: y }))}
                                        className={`px-3 py-1 text-xs rounded-full border transition-all ${goal.years === y
                                                ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                                                : 'border-slate-700 text-slate-400 hover:border-slate-500'
                                            }`}
                                    >
                                        {y} năm
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Initial Amount */}
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">
                                💰 Vốn ban đầu (VND)
                            </label>
                            <Input
                                type="text"
                                value={goal.initialAmount.toLocaleString()}
                                onChange={e => setGoal(g => ({
                                    ...g,
                                    initialAmount: parseInt(e.target.value.replace(/\D/g, '')) || 0
                                }))}
                                className="bg-slate-800/50 border-slate-700 text-white text-lg font-mono"
                            />
                            <div className="flex gap-2 mt-2">
                                {[50e6, 100e6, 200e6, 500e6].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setGoal(g => ({ ...g, initialAmount: v }))}
                                        className={`px-3 py-1 text-xs rounded-full border transition-all ${goal.initialAmount === v
                                                ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                                                : 'border-slate-700 text-slate-400 hover:border-slate-500'
                                            }`}
                                    >
                                        {formatCurrency(v, true)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Risk Level */}
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">
                                ⚡ Mức độ rủi ro
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { key: 'conservative', label: 'Thận trọng', desc: '8-11%/năm', color: 'blue' },
                                    { key: 'moderate', label: 'Cân bằng', desc: '12-15%/năm', color: 'emerald' },
                                    { key: 'aggressive', label: 'Tích cực', desc: '15-20%/năm', color: 'amber' },
                                ].map(r => (
                                    <button
                                        key={r.key}
                                        onClick={() => setGoal(g => ({ ...g, riskLevel: r.key as any }))}
                                        className={`p-3 rounded-lg border text-center transition-all ${goal.riskLevel === r.key
                                                ? `border-${r.color}-500 bg-${r.color}-500/10`
                                                : 'border-slate-700 hover:border-slate-500'
                                            }`}
                                    >
                                        <p className={`text-sm font-bold ${goal.riskLevel === r.key ? `text-${r.color}-400` : 'text-white'}`}>
                                            {r.label}
                                        </p>
                                        <p className="text-xs text-slate-500">{r.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="mt-6 flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={goal.includeDividends}
                                onChange={e => setGoal(g => ({ ...g, includeDividends: e.target.checked }))}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500"
                            />
                            Tái đầu tư cổ tức
                        </label>
                    </div>

                    {/* Calculate Button */}
                    <div className="mt-8">
                        <Button
                            onClick={() => setShowResult(true)}
                            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
                        >
                            <Sparkles className="w-5 h-5 mr-2" />
                            Tính toán kế hoạch
                        </Button>
                    </div>
                </GlassCard>

                {/* Results */}
                {calculatePlan && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Main Result */}
                        <GlassCard className="p-6 border-2 border-indigo-500/30">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        {calculatePlan.achievable ? (
                                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                                        ) : (
                                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                                        )}
                                        Kết quả phân tích
                                    </h3>
                                    <p className="text-slate-400 text-sm mt-1">
                                        Để đạt {formatCurrency(goal.targetAmount)} trong {goal.years} năm
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                    <p className="text-xs text-indigo-300 uppercase">Cần đầu tư/tháng</p>
                                    <p className="text-2xl font-bold text-indigo-400 font-mono mt-1">
                                        {formatCurrency(calculatePlan.monthlyRequired, true)}
                                    </p>
                                </div>
                                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                    <p className="text-xs text-emerald-300 uppercase">Giá trị dự kiến</p>
                                    <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                                        {formatCurrency(calculatePlan.projectedValue, true)}
                                    </p>
                                </div>
                                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <p className="text-xs text-amber-300 uppercase">Tổng đã đầu tư</p>
                                    <p className="text-2xl font-bold text-amber-400 font-mono mt-1">
                                        {formatCurrency(calculatePlan.totalInvested, true)}
                                    </p>
                                </div>
                                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                    <p className="text-xs text-purple-300 uppercase">Cổ tức nhận được</p>
                                    <p className="text-2xl font-bold text-purple-400 font-mono mt-1">
                                        {formatCurrency(calculatePlan.dividendsEarned, true)}
                                    </p>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Scenarios Comparison */}
                        <GlassCard className="p-6">
                            <h3 className="text-lg font-bold text-white mb-4">📊 So sánh các kịch bản</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="p-3 text-left text-slate-400">Kịch bản</th>
                                            <th className="p-3 text-right text-slate-400">Lợi nhuận kỳ vọng</th>
                                            <th className="p-3 text-right text-slate-400">Đầu tư/tháng</th>
                                            <th className="p-3 text-right text-slate-400">Giá trị cuối kỳ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {calculatePlan.scenarios.map(s => (
                                            <tr key={s.name} className="hover:bg-white/[0.02]">
                                                <td className={`p-3 font-bold ${s.color}`}>{s.name}</td>
                                                <td className="p-3 text-right font-mono text-white">{s.returnRate}%/năm</td>
                                                <td className="p-3 text-right font-mono text-indigo-400">
                                                    {formatCurrency(s.monthlyRequired, true)}
                                                </td>
                                                <td className="p-3 text-right font-mono text-emerald-400">
                                                    {formatCurrency(s.finalValue, true)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>

                        {/* Suggested Stocks */}
                        <GlassCard className="p-6">
                            <h3 className="text-lg font-bold text-white mb-4">💡 Cổ phiếu đề xuất</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {calculatePlan.suggestedStocks.map(stock => (
                                    <div key={stock.symbol} className="p-4 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-bold text-white">{stock.symbol}</span>
                                            <span className="text-sm text-emerald-400">~{stock.expectedYield}%/năm</span>
                                        </div>
                                        <p className="text-sm text-slate-400 mt-2">{stock.reason}</p>
                                        <Link href={`/?symbol=${stock.symbol}`}>
                                            <Button size="sm" variant="ghost" className="mt-3 text-indigo-400 w-full">
                                                Phân tích chi tiết <ArrowRight className="w-4 h-4 ml-1" />
                                            </Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>

                        {/* Disclaimer */}
                        <div className="flex items-start gap-2 text-xs text-slate-500 p-4 rounded-lg bg-slate-900/50">
                            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <p>
                                Kết quả dựa trên giả định lợi nhuận trung bình trong quá khứ và có thể không phản ánh hiệu suất thực tế.
                                Đầu tư chứng khoán luôn có rủi ro, vui lòng cân nhắc kỹ trước khi quyết định.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
