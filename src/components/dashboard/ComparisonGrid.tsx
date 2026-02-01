'use client';

import React from 'react';
import { GlassCard, NeonText } from '@/components/ui/glass';
import { TrendingUp, TrendingDown, Scale, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparisonResult {
    symbol: string;
    currentValue: number;
    totalInvested: number;
    absoluteReturn: number;
    percentageReturn: number;
    annualizedReturn: number;
    dividendsCashReceived: number;
    dividendsReinvested: number;
}

interface ComparisonGridProps {
    primaryResult: ComparisonResult;
    compareResult: ComparisonResult;
}

export function ComparisonGrid({ primaryResult, compareResult }: ComparisonGridProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
    };

    const primaryWins = primaryResult.percentageReturn > compareResult.percentageReturn;

    const metrics = [
        {
            label: 'Tổng Tài Sản',
            primary: primaryResult.currentValue,
            compare: compareResult.currentValue,
            format: formatCurrency,
            suffix: '',
        },
        {
            label: 'Lợi Nhuận %',
            primary: primaryResult.percentageReturn,
            compare: compareResult.percentageReturn,
            format: (v: number) => v.toFixed(2),
            suffix: '%',
        },
        {
            label: 'CAGR',
            primary: primaryResult.annualizedReturn,
            compare: compareResult.annualizedReturn,
            format: (v: number) => v.toFixed(2),
            suffix: '%',
        },
        {
            label: 'Tổng Cổ Tức',
            primary: primaryResult.dividendsCashReceived + (primaryResult.dividendsReinvested || 0),
            compare: compareResult.dividendsCashReceived + (compareResult.dividendsReinvested || 0),
            format: formatCurrency,
            suffix: '',
        },
    ];

    return (
        <GlassCard className="overflow-hidden" delay={0.1}>
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Scale className="w-4 h-4 text-indigo-400" />
                    So Sánh Đầu Tư
                </h3>
            </div>

            {/* Winner Badge */}
            <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-white/5">
                <div className="flex items-center justify-center gap-3">
                    <div className={cn(
                        "px-4 py-2 rounded-full font-bold text-sm",
                        primaryWins ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50" : "bg-slate-800 text-slate-400"
                    )}>
                        {primaryResult.symbol}
                    </div>
                    <span className="text-slate-500 text-xs">VS</span>
                    <div className={cn(
                        "px-4 py-2 rounded-full font-bold text-sm",
                        !primaryWins ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50" : "bg-slate-800 text-slate-400"
                    )}>
                        {compareResult.symbol}
                    </div>
                </div>
                <p className="text-center text-xs text-slate-400 mt-2">
                    🏆 <span className="text-emerald-400 font-bold">{primaryWins ? primaryResult.symbol : compareResult.symbol}</span> thắng với lợi nhuận cao hơn{' '}
                    <span className="text-white font-bold">
                        {Math.abs(primaryResult.percentageReturn - compareResult.percentageReturn).toFixed(2)}%
                    </span>
                </p>
            </div>

            {/* Comparison Table */}
            <div className="divide-y divide-white/5">
                {/* Header */}
                <div className="grid grid-cols-4 gap-4 p-4 text-xs font-bold text-slate-400 uppercase">
                    <div>Chỉ Số</div>
                    <div className="text-center">{primaryResult.symbol}</div>
                    <div className="text-center">{compareResult.symbol}</div>
                    <div className="text-center">Chênh Lệch</div>
                </div>

                {/* Rows */}
                {metrics.map((metric, idx) => {
                    const diff = metric.primary - metric.compare;
                    const primaryBetter = diff > 0;

                    return (
                        <div key={idx} className="grid grid-cols-4 gap-4 p-4 items-center hover:bg-white/[0.02] transition-colors">
                            <div className="text-sm text-slate-300 font-medium">{metric.label}</div>
                            <div className={cn(
                                "text-center font-mono text-sm font-bold",
                                primaryBetter ? "text-emerald-400" : "text-slate-300"
                            )}>
                                {metric.format(metric.primary)}{metric.suffix}
                                {primaryBetter && <TrendingUp className="w-3 h-3 inline ml-1" />}
                            </div>
                            <div className={cn(
                                "text-center font-mono text-sm font-bold",
                                !primaryBetter ? "text-emerald-400" : "text-slate-300"
                            )}>
                                {metric.format(metric.compare)}{metric.suffix}
                                {!primaryBetter && diff !== 0 && <TrendingUp className="w-3 h-3 inline ml-1" />}
                            </div>
                            <div className={cn(
                                "text-center font-mono text-xs font-bold flex items-center justify-center gap-1",
                                diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-slate-500"
                            )}>
                                {diff > 0 ? <ArrowUpRight className="w-3 h-3" /> : diff < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                                {diff > 0 ? '+' : ''}{metric.format(diff)}{metric.suffix}
                            </div>
                        </div>
                    );
                })}
            </div>
        </GlassCard>
    );
}
