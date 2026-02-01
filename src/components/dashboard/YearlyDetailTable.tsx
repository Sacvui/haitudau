'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/glass';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, Coins, Gift, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

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

interface DividendEvent {
    date: string;
    type: 'cash' | 'stock';
    shares: number;
    pricePerShare: number;
    value: number;
    totalSharesAfter: number;
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
    dividendEvents: DividendEvent[];
}

export function YearlyDetailTable({
    timeline,
    compareTimeline,
    symbol,
    compareSymbol,
    initialInvestment
}: YearlyDetailTableProps) {
    const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

    const toggleYear = (year: number) => {
        const newExpanded = new Set(expandedYears);
        if (newExpanded.has(year)) {
            newExpanded.delete(year);
        } else {
            newExpanded.add(year);
        }
        setExpandedYears(newExpanded);
    };

    const formatCurrency = (val: number) => {
        if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
        if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
        if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
        return val.toLocaleString();
    };

    const processTimeline = (events: TimelineEvent[]): YearlyData[] => {
        if (!events || events.length === 0) return [];

        const yearlyMap = new Map<number, YearlyData>();

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
                    dividendEvents: [],
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
                data.dividendEvents.push({
                    date: event.date,
                    type: 'stock',
                    shares: event.shares,
                    pricePerShare: event.pricePerShare,
                    value: event.shares * event.pricePerShare,
                    totalSharesAfter: event.totalShares,
                });
            } else if (event.type === 'dividend_cash') {
                const cashValue = event.shares * event.pricePerShare;
                data.cashDividends += cashValue;
                data.dividendEvents.push({
                    date: event.date,
                    type: 'cash',
                    shares: 0,
                    pricePerShare: event.pricePerShare,
                    value: cashValue,
                    totalSharesAfter: event.totalShares,
                });
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
                <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Chưa có dữ liệu chi tiết theo năm</p>
                <p className="text-slate-500 text-xs mt-1">Phân tích cổ phiếu để xem bảng tăng trưởng</p>
            </GlassCard>
        );
    }

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
                    Chi Tiết Tăng Trưởng Theo Năm - {symbol}
                    {compareSymbol && <span className="text-emerald-400 ml-2">vs {compareSymbol}</span>}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Click vào năm để xem chi tiết các đợt cổ tức</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase w-10"></th>
                            <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase">Năm</th>
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
                                    Cổ Tức Tiền
                                </span>
                            </th>
                            <th className="p-3 text-right text-xs font-bold text-slate-400 uppercase">CP Cuối Năm</th>
                            <th className="p-3 text-right text-xs font-bold text-slate-400 uppercase">
                                <span className="flex items-center justify-end gap-1">
                                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                                    Giá Trị DM
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {allYears.map((year, idx) => {
                            const primary = getDataForYear(primaryData, year);
                            const prevPrimary = idx > 0 ? getDataForYear(primaryData, allYears[idx - 1]) : null;
                            const isExpanded = expandedYears.has(year);
                            const hasDividends = primary && primary.dividendEvents.length > 0;

                            const growth = primary && prevPrimary
                                ? ((primary.endPortfolioValue - prevPrimary.endPortfolioValue) / prevPrimary.endPortfolioValue * 100)
                                : null;

                            return (
                                <React.Fragment key={year}>
                                    {/* Main Year Row */}
                                    <tr
                                        className={`hover:bg-white/[0.02] transition-colors ${hasDividends ? 'cursor-pointer' : ''}`}
                                        onClick={() => hasDividends && toggleYear(year)}
                                    >
                                        <td className="p-3 text-center">
                                            {hasDividends && (
                                                isExpanded ?
                                                    <ChevronUp className="w-4 h-4 text-indigo-400" /> :
                                                    <ChevronDown className="w-4 h-4 text-slate-500" />
                                            )}
                                        </td>
                                        <td className="p-3 font-bold text-white">
                                            {year}
                                            {hasDividends && (
                                                <span className="ml-2 text-[10px] text-indigo-400 font-normal">
                                                    ({primary.dividendEvents.length} đợt)
                                                </span>
                                            )}
                                        </td>
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
                                    </tr>

                                    {/* Expanded Dividend Events */}
                                    {isExpanded && primary?.dividendEvents.map((divEvent, divIdx) => (
                                        <tr
                                            key={`${year}-div-${divIdx}`}
                                            className="bg-indigo-500/5 border-l-2 border-indigo-500"
                                        >
                                            <td className="p-2"></td>
                                            <td className="p-2 pl-6 text-xs text-slate-400">
                                                <span className="flex items-center gap-2">
                                                    {divEvent.type === 'stock' ? (
                                                        <Gift className="w-3 h-3 text-indigo-400" />
                                                    ) : (
                                                        <Coins className="w-3 h-3 text-amber-400" />
                                                    )}
                                                    {format(new Date(divEvent.date), 'dd/MM/yyyy', { locale: vi })}
                                                </span>
                                            </td>
                                            <td className="p-2 text-right text-xs text-slate-500">-</td>
                                            <td className="p-2 text-right text-xs font-mono">
                                                {divEvent.type === 'stock' ? (
                                                    <span className="text-indigo-400">+{divEvent.shares.toLocaleString()} CP</span>
                                                ) : (
                                                    <span className="text-slate-500">-</span>
                                                )}
                                            </td>
                                            <td className="p-2 text-right text-xs font-mono">
                                                {divEvent.type === 'cash' ? (
                                                    <span className="text-amber-400">{formatCurrency(divEvent.value)}</span>
                                                ) : (
                                                    <span className="text-slate-500">-</span>
                                                )}
                                            </td>
                                            <td className="p-2 text-right text-xs font-mono text-slate-400">
                                                → {divEvent.totalSharesAfter.toLocaleString()}
                                            </td>
                                            <td className="p-2 text-right text-xs text-slate-500">
                                                {divEvent.type === 'stock' && (
                                                    <span className="text-indigo-400/70">
                                                        ≈ {formatCurrency(divEvent.value)}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>

                    {/* Footer Totals */}
                    <tfoot className="border-t-2 border-white/10 bg-white/[0.03]">
                        <tr>
                            <td className="p-3"></td>
                            <td className="p-3 font-bold text-amber-400 uppercase text-xs">Tổng Cộng</td>
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
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Summary Stats */}
            <div className="p-4 border-t border-white/5 bg-white/[0.02] grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase">Tổng Đợt Cổ Tức</p>
                    <p className="text-lg font-bold text-indigo-400">
                        {primaryData.reduce((s, d) => s + d.dividendEvents.length, 0)}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase">CP Từ Cổ Tức</p>
                    <p className="text-lg font-bold text-purple-400">
                        +{primaryData.reduce((s, d) => s + d.sharesFromDividend, 0).toLocaleString()}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase">Tiền Cổ Tức</p>
                    <p className="text-lg font-bold text-amber-400">
                        {formatCurrency(primaryData.reduce((s, d) => s + d.cashDividends, 0))}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase">Tăng Trưởng</p>
                    <p className="text-lg font-bold text-emerald-400">
                        {primaryData.length > 0 && primaryData[0].endPortfolioValue > 0 ? (
                            `${((primaryData[primaryData.length - 1].endPortfolioValue / initialInvestment - 1) * 100).toFixed(1)}%`
                        ) : '-'}
                    </p>
                </div>
            </div>
        </GlassCard>
    );
}
