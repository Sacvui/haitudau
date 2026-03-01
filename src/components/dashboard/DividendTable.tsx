'use client';

import React, { useMemo } from 'react';
import { GlassCard } from '@/components/ui/glass';
import { Coins, Calendar, TrendingUp, Gift, Sparkles } from 'lucide-react';

interface DividendEvent {
    date: string;
    type: 'cash' | 'stock';
    value: number;
    description?: string;
    isProjected?: boolean;
}

interface DividendTableProps {
    dividends: DividendEvent[];
    symbol: string;
}

export function DividendTable({ dividends, symbol }: DividendTableProps) {
    if (!dividends || dividends.length === 0) {
        return (
            <GlassCard className="p-6 text-center">
                <Coins className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Không có dữ liệu cổ tức cho {symbol}</p>
            </GlassCard>
        );
    }

    const { years, dividendsByYear, totalCash, totalStock, totalEvents } = useMemo(() => {
        // Group historical dividends by year
        const byYear = dividends.reduce((acc, div) => {
            const year = new Date(div.date).getFullYear();
            if (!acc[year]) {
                acc[year] = { cash: 0, stock: 0, events: [], isProjected: false };
            }
            if (div.type === 'cash') {
                acc[year].cash += div.value;
            } else {
                acc[year].stock += div.value;
            }
            acc[year].events.push(div);
            return acc;
        }, {} as Record<number, { cash: number; stock: number; events: DividendEvent[]; isProjected: boolean }>);

        const historicalYears = Object.keys(byYear).map(Number).sort((a, b) => b - a);
        const latestYear = historicalYears[0] || new Date().getFullYear();

        // Calculate 3-Year Average for Projections
        let sumCash = 0;
        let sumStock = 0;
        let count = 0;
        for (let i = 0; i < 3; i++) {
            const y = latestYear - i;
            if (byYear[y]) {
                sumCash += byYear[y].cash;
                sumStock += byYear[y].stock;
                count++;
            }
        }

        const avgCash = count > 0 ? Math.round(sumCash / count) : 0;
        const avgStock = count > 0 ? Math.round(sumStock / count) : 0;

        // Inject Projected Years (2025, 2026)
        const currentYear = new Date().getFullYear();
        for (let y = latestYear + 1; y <= currentYear; y++) {
            byYear[y] = {
                cash: avgCash,
                stock: avgStock,
                events: [{ date: `${y}-12-31`, type: 'cash', value: avgCash, isProjected: true }],
                isProjected: true
            };
        }

        const sortedYears = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

        let tCash = 0;
        let tStock = 0;
        let tEvents = 0;
        Object.values(byYear).forEach(d => {
            if (!d.isProjected) {
                tCash += d.cash;
                tStock += d.stock;
                tEvents += d.events.length;
            }
        });

        return { years: sortedYears, dividendsByYear: byYear, totalCash: tCash, totalStock: tStock, totalEvents: tEvents };
    }, [dividends]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <GlassCard className="overflow-hidden" delay={0.3}>
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-400" />
                    Cổ Tức Thực Nhận & Dự Kiến - {symbol}
                </h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="text-left p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3" />
                                    Năm
                                </div>
                            </th>
                            <th className="text-right p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <div className="flex items-center gap-2 justify-end">
                                    <Coins className="w-3 h-3 text-emerald-400" />
                                    Tiền Mặt
                                </div>
                            </th>
                            <th className="text-right p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <div className="flex items-center gap-2 justify-end">
                                    <TrendingUp className="w-3 h-3 text-indigo-400" />
                                    Cổ Phiếu (%)
                                </div>
                            </th>
                            <th className="text-center p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Trạng Thái
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {years.map((yearStr) => {
                            const year = Number(yearStr);
                            const data = dividendsByYear[year];
                            const isProjected = data.isProjected;

                            return (
                                <tr key={year} className={`hover:bg-white/[0.02] transition-colors ${isProjected ? 'opacity-80' : ''}`}>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white text-sm">{year}</span>
                                            {isProjected && <span className="text-[10px] text-purple-400 flex items-center gap-1"><Sparkles className="w-3 h-3" /> KH dự phóng</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        {data.cash > 0 ? (
                                            <span className={`font-mono font-bold text-sm ${isProjected ? 'text-emerald-400/70' : 'text-emerald-400'}`}>
                                                {isProjected ? '~' : ''}{new Intl.NumberFormat('vi-VN').format(data.cash)} <span className="text-xs text-slate-400">đ</span>
                                            </span>
                                        ) : (
                                            <span className="text-slate-500">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        {data.stock > 0 ? (
                                            <span className={`font-mono font-bold text-sm ${isProjected ? 'text-indigo-400/70' : 'text-indigo-400'}`}>
                                                {isProjected ? '~' : ''}{data.stock}%
                                            </span>
                                        ) : (
                                            <span className="text-slate-500">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        {isProjected ? (
                                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-purple-500/10 text-[10px] font-bold text-purple-400 border border-purple-500/20">
                                                Tương lai
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-emerald-500/10 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                                                Đã nhận ({data.events.length})
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="border-t border-white/10 bg-white/[0.02]">
                        <tr>
                            <td className="p-4 font-bold text-amber-400 text-sm">TỔNG THỰC NHẬN</td>
                            <td className="p-4 text-right">
                                <span className="font-mono text-emerald-400 font-bold text-sm">
                                    {formatCurrency(totalCash)}
                                </span>
                            </td>
                            <td className="p-4 text-right">
                                <span className="font-mono text-indigo-400 font-bold text-sm">
                                    {totalStock}%
                                </span>
                            </td>
                            <td className="p-4 text-center">
                                <span className="font-bold text-white text-sm">
                                    {totalEvents} lần
                                </span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </GlassCard >
    );
}
