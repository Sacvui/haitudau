'use client';

import React from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ArrowUp, ArrowDown, Wallet } from 'lucide-react';
import { format } from 'date-fns';

interface NAVDataPoint {
    date: string;
    portfolioValue: number;
    totalCost: number;
    savingsValue: number;
}

interface NAVChartProps {
    data: NAVDataPoint[];
    height?: number;
    symbol: string;
}

export function NAVChart({ data, height = 350, symbol }: NAVChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="bg-[#111827] border-slate-800 h-full flex items-center justify-center">
                <p className="text-slate-500">Chưa có dữ liệu danh mục</p>
            </Card>
        );
    }

    const chartData = data.map((d) => ({
        ...d,
        date: format(new Date(d.date), 'dd/MM/yy'),
        valueM: d.portfolioValue / 1e6,
        costM: d.totalCost / 1e6,
        savingsM: d.savingsValue / 1e6,
    }));

    const startValue = data[0]?.portfolioValue || 0;
    const endValue = data[data.length - 1]?.portfolioValue || 0;
    const totalCost = data[data.length - 1]?.totalCost || 0;
    const profit = endValue - totalCost;
    const percentageReturn = totalCost > 0 ? ((endValue - totalCost) / totalCost * 100) : 0;

    const minValue = Math.min(...chartData.map(d => Math.min(d.valueM, d.costM, d.savingsM)));
    const maxValue = Math.max(...chartData.map(d => Math.max(d.valueM, d.costM, d.savingsM)));
    const padding = (maxValue - minValue) * 0.1;

    return (
        <Card className="bg-[#111827] border-slate-800 shadow-xl overflow-hidden h-full">
            <CardHeader className="pb-2 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm flex items-center gap-2 text-slate-200">
                            <Wallet className="w-4 h-4 text-emerald-400" />
                            GIÁ TRỊ DANH MỤC - {symbol}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1 text-slate-500">
                            <span className="text-emerald-400">■</span> Danh mục
                            <span className="text-slate-400 ml-3">■</span> Vốn đầu tư
                            <span className="text-amber-400 ml-3">- -</span> Tiết kiệm 6.5%
                        </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className={`text-xs border-slate-700 ${profit >= 0 ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10"}`}>
                            {profit >= 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                            {percentageReturn.toFixed(1)}%
                        </Badge>
                        <span className={`text-xs font-mono ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {profit >= 0 ? '+' : ''}{(profit / 1e6).toFixed(1)}M
                        </span>
                    </div>
                </div>
            </CardHeader>

            <div className="p-4" style={{ height: height - 80 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#64748b" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#64748b" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            domain={[Math.max(0, minValue - padding), maxValue + padding]}
                            tickFormatter={(v) => `${v.toFixed(0)}M`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            }}
                            labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                            formatter={(value, name) => {
                                const labels: Record<string, string> = {
                                    valueM: 'Danh mục',
                                    costM: 'Vốn đầu tư',
                                    savingsM: 'Tiết kiệm',
                                };
                                const val = typeof value === 'number' ? value : 0;
                                const n = name ?? '';
                                return [`${val.toFixed(2)}M VND`, labels[n] || n];
                            }}
                        />

                        {/* Savings line (dashed) */}
                        <Area
                            type="monotone"
                            dataKey="savingsM"
                            stroke="#f59e0b"
                            strokeWidth={1.5}
                            strokeDasharray="5 5"
                            fill="none"
                            dot={false}
                        />

                        {/* Cost area */}
                        <Area
                            type="monotone"
                            dataKey="costM"
                            stroke="#64748b"
                            strokeWidth={1.5}
                            fill="url(#costGradient)"
                            dot={false}
                        />

                        {/* Portfolio value area */}
                        <Area
                            type="monotone"
                            dataKey="valueM"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="url(#navGradient)"
                            dot={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Bottom Stats */}
            <div className="px-4 pb-4 grid grid-cols-3 gap-4 text-center border-t border-slate-800 pt-3">
                <div>
                    <p className="text-[10px] text-slate-500 uppercase">Giá trị hiện tại</p>
                    <p className="text-sm font-bold text-emerald-400 font-mono">{(endValue / 1e6).toFixed(1)}M</p>
                </div>
                <div>
                    <p className="text-[10px] text-slate-500 uppercase">Tổng vốn</p>
                    <p className="text-sm font-bold text-slate-300 font-mono">{(totalCost / 1e6).toFixed(1)}M</p>
                </div>
                <div>
                    <p className="text-[10px] text-slate-500 uppercase">Lãi/Lỗ</p>
                    <p className={`text-sm font-bold font-mono ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {profit >= 0 ? '+' : ''}{(profit / 1e6).toFixed(1)}M
                    </p>
                </div>
            </div>
        </Card>
    );
}
