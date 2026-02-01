'use client';

import React from 'react';
import { GlassCard } from '@/components/ui/glass';
import { Table, Calendar, TrendingUp, Coins, Gift, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface TimelineEvent {
    date: string;
    type: 'buy' | 'sell' | 'dividend_cash' | 'dividend_stock' | 'reinvest' | 'deposit';
    description: string;
    shares: number;
    pricePerShare: number;
    totalShares: number;
    portfolioValue: number;
    cashBalance: number;
}

interface YearlyDetailTableProps {
    timeline: TimelineEvent[];
    compareTimeline?: TimelineEvent[];
    symbol: string;
    compareSymbol?: string;
    initialInvestment: number;
}

interface YearlyData {
    year: number;
    startShares: number;
    endShares: number;
    sharesFromDividend: number;
    sharesFromBuy: number;
    cashDividends: number;
    reinvestedAmount: number;
    endPortfolioValue: number;
}

export function YearlyDetailTable({
    timeline,
    compareTimeline,
    symbol,
    compareSymbol,
    initialInvestment
}: YearlyDetailTableProps) {

    const formatCurrency = (val: number) => {
        if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
        if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
        if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
        return val.toLocaleString();
    };

    const processTimeline = (events: TimelineEvent[]): YearlyData[] => {
        if (!events || events.length === 0) return [];

        const yearlyMap = new Map<number, YearlyData>();

        // Sort by date
        const sorted = [...events].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        let prevShares = 0;

        sorted.forEach(event => {
            const year = new Date(event.date).getFullYear();

            if (!yearlyMap.has(year)) {
                yearlyMap.set(year, {
                    year,
                    startShares: prevShares,
                    endShares: 0,
                    sharesFromDividend: 0,
                    sharesFromBuy: 0,
                    cashDividends: 0,
                    reinvestedAmount: 0,
                    endPortfolioValue: 0,
                });
            }

            const data = yearlyMap.get(year)!;

            if (event.type === 'buy' || event.type === 'deposit') {
                data.sharesFromBuy += event.shares;
            } else if (event.type === 'reinvest') {
                data.reinvestedAmount += event.shares * event.pricePerShare;
                data.sharesFromBuy += event.shares;
            } else if (event.type === 'dividend_stock') {
                data.sharesFromDividend += event.shares;
            } else if (event.type === 'dividend_cash') {
                data.cashDividends += event.shares * event.pricePerShare; // This might need adjustment
            }

            data.endShares = event.totalShares;
            data.endPortfolioValue = event.portfolioValue;
            prevShares = event.totalShares;
        });

        return Array.from(yearlyMap.values()).sort((a, b) => a.year - b.year);
    };

    const primaryData = processTimeline(timeline);
    const compareData = compareTimeline ? processTimeline(compareTimeline) : [];

    if (primaryData.length === 0) {
        return (
            <GlassCard className="p-6 text-center">
                <Table className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Chưa có dữ liệu chi tiết theo năm</p>
            </GlassCard>
        );
    }

    // Merge years for comparison
    const allYears = [...new Set([
        ...primaryData.map(d => d.year),
        ...compareData.map(d => d.year)
    ])].sort();

    const getDataForYear = (data: YearlyData[], year: number) =>
        data.find(d => d.year === year);

    return (
        <GlassCard className="overflow-hidden" delay={0.3}>
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    Chi Tiết Tăng Trưởng Theo Năm
                </h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase">Năm</th>
                            {compareSymbol ? (
                                <>
                                    <th colSpan={4} className="p-3 text-center text-xs font-bold text-indigo-400 uppercase border-l border-white/5">
                                        {symbol}
                                    </th>
                                    <th colSpan={4} className="p-3 text-center text-xs font-bold text-emerald-400 uppercase border-l border-white/5">
                                        {compareSymbol}
                                    </th>
                                </>
                            ) : (
                                <>
                                    <th className="p-3 text-right text-xs font-bold text-slate-400 uppercase">CP Đầu Năm</th>
                                    <th className="p-3 text-right text-xs font-bold text-slate-400 uppercase">
                                        <span className="flex items-center justify-end gap-1">
                                            <Gift className="w-3 h-3 text-indigo-400" />
                                            CP Thưởng
                                        </span>
                                    </th>
                                    <th className="p-3 text-right text-xs font-bold text-slate-400 uppercase">
                                        <span className="flex items-center justify-end gap-1">
                                            <Coins className="w-3 h-3 text-amber-400" />
                                            Cổ Tức (VND)
                                        </span>
                                    </th>
                                    <th className="p-3 text-right text-xs font-bold text-slate-400 uppercase">CP Cuối Năm</th>
                                    <th className="p-3 text-right text-xs font-bold text-slate-400 uppercase">
                                        <span className="flex items-center justify-end gap-1">
                                            <TrendingUp className="w-3 h-3 text-emerald-400" />
                                            Giá Trị DM
                                        </span>
                                    </th>
                                </>
                            )}
                        </tr>
                        {compareSymbol && (
                            <tr className="border-b border-white/5">
                                <th></th>
                                {/* Primary stock headers */}
                                <th className="p-2 text-right text-[10px] text-slate-500 border-l border-white/5">CP Đầu</th>
                                <th className="p-2 text-right text-[10px] text-slate-500">CP Thưởng</th>
                                <th className="p-2 text-right text-[10px] text-slate-500">Cổ Tức</th>
                                <th className="p-2 text-right text-[10px] text-slate-500">Giá Trị</th>
                                {/* Compare stock headers */}
                                <th className="p-2 text-right text-[10px] text-slate-500 border-l border-white/5">CP Đầu</th>
                                <th className="p-2 text-right text-[10px] text-slate-500">CP Thưởng</th>
                                <th className="p-2 text-right text-[10px] text-slate-500">Cổ Tức</th>
                                <th className="p-2 text-right text-[10px] text-slate-500">Giá Trị</th>
                            </tr>
                        )}
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {allYears.map((year, idx) => {
                            const primary = getDataForYear(primaryData, year);
                            const compare = getDataForYear(compareData, year);
                            const prevPrimary = idx > 0 ? getDataForYear(primaryData, allYears[idx - 1]) : null;

                            const growth = primary && prevPrimary
                                ? ((primary.endPortfolioValue - prevPrimary.endPortfolioValue) / prevPrimary.endPortfolioValue * 100)
                                : null;

                            return (
                                <tr key={year} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="p-3 font-bold text-white">{year}</td>

                                    {compareSymbol ? (
                                        <>
                                            {/* Primary */}
                                            <td className="p-3 text-right font-mono text-slate-300 border-l border-white/5">
                                                {primary?.startShares.toLocaleString() || '-'}
                                            </td>
                                            <td className="p-3 text-right font-mono text-indigo-400">
                                                {primary?.sharesFromDividend ? `+${primary.sharesFromDividend.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="p-3 text-right font-mono text-amber-400">
                                                {primary?.cashDividends ? formatCurrency(primary.cashDividends) : '-'}
                                            </td>
                                            <td className="p-3 text-right font-mono font-bold text-white">
                                                {primary?.endPortfolioValue ? formatCurrency(primary.endPortfolioValue) : '-'}
                                            </td>
                                            {/* Compare */}
                                            <td className="p-3 text-right font-mono text-slate-300 border-l border-white/5">
                                                {compare?.startShares.toLocaleString() || '-'}
                                            </td>
                                            <td className="p-3 text-right font-mono text-indigo-400">
                                                {compare?.sharesFromDividend ? `+${compare.sharesFromDividend.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="p-3 text-right font-mono text-amber-400">
                                                {compare?.cashDividends ? formatCurrency(compare.cashDividends) : '-'}
                                            </td>
                                            <td className="p-3 text-right font-mono font-bold text-white">
                                                {compare?.endPortfolioValue ? formatCurrency(compare.endPortfolioValue) : '-'}
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-3 text-right font-mono text-slate-300">
                                                {primary?.startShares.toLocaleString() || '0'}
                                            </td>
                                            <td className="p-3 text-right font-mono text-indigo-400 font-bold">
                                                {primary?.sharesFromDividend ? (
                                                    <span className="flex items-center justify-end gap-1">
                                                        <ArrowUpRight className="w-3 h-3" />
                                                        +{primary.sharesFromDividend.toLocaleString()}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="p-3 text-right font-mono text-amber-400">
                                                {primary?.cashDividends ? formatCurrency(primary.cashDividends) : '-'}
                                            </td>
                                            <td className="p-3 text-right font-mono text-white font-bold">
                                                {primary?.endShares.toLocaleString() || '0'}
                                            </td>
                                            <td className="p-3 text-right">
                                                <span className="font-mono font-bold text-emerald-400">
                                                    {primary?.endPortfolioValue ? formatCurrency(primary.endPortfolioValue) : '-'}
                                                </span>
                                                {growth !== null && (
                                                    <span className={`text-[10px] ml-1 ${growth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        ({growth >= 0 ? '+' : ''}{growth.toFixed(1)}%)
                                                    </span>
                                                )}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                    {/* Footer totals */}
                    <tfoot className="border-t-2 border-white/10 bg-white/[0.03]">
                        <tr>
                            <td className="p-3 font-bold text-amber-400 uppercase text-xs">Tổng</td>
                            {compareSymbol ? (
                                <>
                                    <td className="p-3 border-l border-white/5"></td>
                                    <td className="p-3 text-right font-mono font-bold text-indigo-400">
                                        +{primaryData.reduce((s, d) => s + d.sharesFromDividend, 0).toLocaleString()}
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-amber-400">
                                        {formatCurrency(primaryData.reduce((s, d) => s + d.cashDividends, 0))}
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-emerald-400">
                                        {formatCurrency(primaryData[primaryData.length - 1]?.endPortfolioValue || 0)}
                                    </td>
                                    <td className="p-3 border-l border-white/5"></td>
                                    <td className="p-3 text-right font-mono font-bold text-indigo-400">
                                        +{compareData.reduce((s, d) => s + d.sharesFromDividend, 0).toLocaleString()}
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-amber-400">
                                        {formatCurrency(compareData.reduce((s, d) => s + d.cashDividends, 0))}
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-emerald-400">
                                        {formatCurrency(compareData[compareData.length - 1]?.endPortfolioValue || 0)}
                                    </td>
                                </>
                            ) : (
                                <>
                                    <td className="p-3"></td>
                                    <td className="p-3 text-right font-mono font-bold text-indigo-400">
                                        +{primaryData.reduce((s, d) => s + d.sharesFromDividend, 0).toLocaleString()} CP
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-amber-400">
                                        {formatCurrency(primaryData.reduce((s, d) => s + d.cashDividends, 0))}
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-white">
                                        {primaryData[primaryData.length - 1]?.endShares.toLocaleString() || 0} CP
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-emerald-400">
                                        {formatCurrency(primaryData[primaryData.length - 1]?.endPortfolioValue || 0)}
                                    </td>
                                </>
                            )}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </GlassCard>
    );
}
