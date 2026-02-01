'use client';

import React from 'react';
import { GlassCard } from '@/components/ui/glass';
import { Coins, Calendar, TrendingUp, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DividendEvent {
    date: string;
    type: 'cash' | 'stock';
    value: number;
    description?: string;
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

    // Group dividends by year
    const dividendsByYear = dividends.reduce((acc, div) => {
        const year = new Date(div.date).getFullYear();
        if (!acc[year]) {
            acc[year] = { cash: 0, stock: 0, events: [] };
        }
        if (div.type === 'cash') {
            acc[year].cash += div.value;
        } else {
            acc[year].stock += div.value;
        }
        acc[year].events.push(div);
        return acc;
    }, {} as Record<number, { cash: number; stock: number; events: DividendEvent[] }>);

    const years = Object.keys(dividendsByYear).sort((a, b) => Number(b) - Number(a));

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <GlassCard className="overflow-hidden" delay={0.3}>
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-400" />
                    Lịch Sử Chia Cổ Tức - {symbol}
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
                                Số Lần
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {years.map((year) => {
                            const data = dividendsByYear[Number(year)];
                            return (
                                <tr key={year} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="p-4">
                                        <span className="font-bold text-white text-sm">{year}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {data.cash > 0 ? (
                                            <span className="font-mono text-emerald-400 font-bold text-sm">
                                                {formatCurrency(data.cash)}
                                            </span>
                                        ) : (
                                            <span className="text-slate-500">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        {data.stock > 0 ? (
                                            <span className="font-mono text-indigo-400 font-bold text-sm">
                                                {data.stock}%
                                            </span>
                                        ) : (
                                            <span className="text-slate-500">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-xs font-bold text-slate-300">
                                            {data.events.length}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="border-t border-white/10 bg-white/[0.02]">
                        <tr>
                            <td className="p-4 font-bold text-amber-400 text-sm">TỔNG CỘNG</td>
                            <td className="p-4 text-right">
                                <span className="font-mono text-emerald-400 font-bold text-sm">
                                    {formatCurrency(Object.values(dividendsByYear).reduce((sum, d) => sum + d.cash, 0))}
                                </span>
                            </td>
                            <td className="p-4 text-right">
                                <span className="font-mono text-indigo-400 font-bold text-sm">
                                    {Object.values(dividendsByYear).reduce((sum, d) => sum + d.stock, 0)}%
                                </span>
                            </td>
                            <td className="p-4 text-center">
                                <span className="font-bold text-white text-sm">
                                    {dividends.length}
                                </span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </GlassCard>
    );
}
