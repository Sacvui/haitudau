'use client';

import React from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Area,
    AreaChart,
    BarChart,
    PieChart,
    Pie,
    Cell,
    ReferenceLine,
    ReferenceDot,
    Scatter,
    ScatterChart,
} from 'recharts';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, BarChart3, Calendar, PieChart as PieIcon, Lightbulb, ArrowUp, ArrowDown, Coins, Gift } from 'lucide-react';
import type { TimelineEvent } from '@/lib/types';

interface AssetGrowthChartProps {
    data: {
        date: string;
        close: number;
        volume?: number;
        savingsValue?: number;
    }[];
    timeline?: TimelineEvent[];
    height?: number;
}

export function PriceChart({ data, timeline, height = 350 }: AssetGrowthChartProps) {
    // Check if data contains portfolio values (large numbers > 1M) or stock prices (< 1M)
    const isPortfolioData = data.length > 0 && data[0].close > 1000000;

    const chartData = data.map((d) => ({
        ...d,
        date: format(new Date(d.date), 'dd/MM/yy'),
        // If portfolio value, show in Millions. If stock price, show in thousands
        valueM: isPortfolioData ? d.close / 1e6 : d.close / 1000,
        savingsM: d.savingsValue ? d.savingsValue / 1e6 : null,
    }));

    // Find dividend events from timeline to mark on chart
    const dividendEvents = timeline?.filter(e => e.type === 'dividend_cash' || e.type === 'dividend_stock') || [];

    // Calculate insights
    const values = data.map(d => d.close);
    const startValue = values[0] || 0;
    const endValue = values[values.length - 1] || 0;
    const valueChange = startValue > 0 ? ((endValue - startValue) / startValue * 100) : 0;
    const unit = isPortfolioData ? 'Triệu' : 'K';

    return (
        <Card className="bg-[#111827] border-slate-800 shadow-xl overflow-hidden">
            <CardHeader className="pb-2 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm flex items-center gap-2 text-slate-200">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            {isPortfolioData ? 'GIÁ TRỊ DANH MỤC' : 'TĂNG TRƯỞNG TÀI SẢN'}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1 text-slate-500">
                            {isPortfolioData
                                ? `Từ ${(startValue / 1e6).toFixed(0)}M → ${(endValue / 1e6).toFixed(0)}M VND`
                                : 'So sánh: Đầu tư Cổ phiếu (Xanh) vs Gửi Tiết kiệm (Xám)'
                            }
                            {dividendEvents.length > 0 && (
                                <span className="ml-2 text-amber-400">• {dividendEvents.length} lần chia cổ tức</span>
                            )}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="outline" className={`text-xs border-slate-700 ${valueChange >= 0 ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10"}`}>
                            {valueChange >= 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                            {Math.abs(valueChange).toFixed(2)}%
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="p-4">
                    <ResponsiveContainer width="100%" height={height}>
                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                                <filter id="glow" height="300%" width="300%" x="-75%" y="-75%">
                                    <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.4} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={40}
                                dy={10}
                            />
                            <YAxis
                                orientation="right"
                                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => isPortfolioData ? `${val.toFixed(0)}M` : `${val.toFixed(0)}K`}
                                domain={['auto', 'auto']}
                                dx={10}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                    borderColor: '#334155',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    color: '#f8fafc',
                                    backdropFilter: 'blur(10px)',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                                }}
                                itemStyle={{ padding: '4px 0' }}
                                cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '4 4' }}
                                formatter={(value: any, name: any) => {
                                    const valNum = Number(value);
                                    const unitLabel = isPortfolioData ? 'Triệu VND' : 'K';
                                    if (name === 'savingsM') return [`${valNum.toLocaleString()} ${unitLabel}`, 'Gửi Tiết Kiệm'];
                                    return [`${valNum.toLocaleString()} ${unitLabel}`, isPortfolioData ? 'Giá Trị DM' : 'Giá CP'];
                                }}
                                labelStyle={{ marginBottom: '8px', color: '#cbd5e1', fontWeight: 600 }}
                            />

                            {/* Area: Portfolio/Stock Value - NEON STYLE */}
                            <Area
                                type="monotone"
                                dataKey="valueM"
                                stroke="#8b5cf6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorPrice)"
                                name="valueM"
                                filter="url(#glow)"
                                activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2, filter: 'url(#glow)' }}
                            />

                            {/* Line: Savings Benchmark */}
                            <Line
                                type="monotone"
                                dataKey="savingsM"
                                stroke="#64748b"
                                strokeWidth={2}
                                strokeDasharray="6 6"
                                dot={false}
                                name="savingsM"
                                opacity={0.6}
                            />

                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

interface MonthlyReturnsChartProps {
    data: { month: number; averageReturn: number }[];
    height?: number;
}

export function MonthlyReturnsChart({ data, height = 300 }: MonthlyReturnsChartProps) {
    const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    const chartData = data.map((d) => ({
        month: monthNames[d.month - 1],
        return: d.averageReturn,
        fullMonth: `Tháng ${d.month}`,
    }));

    // Find best and worst months
    const sortedData = [...data].sort((a, b) => b.averageReturn - a.averageReturn);
    const bestMonth = sortedData[0];
    const worstMonth = sortedData[sortedData.length - 1];

    return (
        <Card className="bg-white/[0.02] border-white/5">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    Lợi nhuận theo tháng
                </CardTitle>
                <CardDescription className="text-xs">
                    Thời điểm mua tốt nhất trong năm
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Insights */}
                <div className="flex gap-3 mb-4">
                    <div className="flex-1 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-1">
                            <Lightbulb className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] font-medium text-emerald-400 uppercase">Tháng tốt nhất</span>
                        </div>
                        <p className="text-lg font-bold">Tháng {bestMonth.month}</p>
                        <p className="text-xs text-emerald-400">+{bestMonth.averageReturn.toFixed(3)}% TB</p>
                    </div>
                    <div className="flex-1 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="flex items-center gap-2 mb-1">
                            <Lightbulb className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-[10px] font-medium text-red-400 uppercase">Tháng xấu nhất</span>
                        </div>
                        <p className="text-lg font-bold">Tháng {worstMonth.month}</p>
                        <p className="text-xs text-red-400">{worstMonth.averageReturn.toFixed(3)}% TB</p>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height={height}>
                    <BarChart data={chartData} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(2)}%`} />
                        <ReferenceLine y={0} stroke="#71717a" strokeDasharray="3 3" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                            formatter={(value: any) => [`${Number(value).toFixed(3)}%`, 'Lợi nhuận TB']}
                            labelFormatter={(label: any) => `${label}`}
                        />
                        <Bar dataKey="return" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={index} fill={entry.return >= 0 ? '#22c55e' : '#ef4444'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface YearlyPerformanceChartProps {
    data: { year: number; return: number; dividends: number }[];
    height?: number;
    dividendGrowth?: { cagr3Year: number; cagr5Year: number };
}

export function YearlyPerformanceChart({ data, height = 300, dividendGrowth }: YearlyPerformanceChartProps) {
    // Calculate insights
    const avgReturn = data.reduce((acc, d) => acc + d.return, 0) / data.length;
    const totalDividends = data.reduce((acc, d) => acc + d.dividends, 0);
    const positiveYears = data.filter(d => d.return >= 0).length;

    return (
        <Card className="bg-white/[0.02] border-white/5">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    Hiệu suất hàng năm & Tăng trưởng cổ tức
                </CardTitle>
                <CardDescription className="text-xs">
                    Phân tích lợi nhuận và xu hướng tăng trưởng cổ tức (CAGR)
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Insights */}
                <div className="grid grid-cols-4 gap-3 mb-4 p-3 rounded-lg bg-white/[0.02]">
                    <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase">LN trung bình</p>
                        <p className={`text-sm font-bold ${avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {avgReturn >= 0 ? '+' : ''}{avgReturn.toFixed(1)}%
                        </p>
                    </div>
                    <div className="text-center border-l border-white/5">
                        <p className="text-[10px] text-muted-foreground uppercase">Tổng cổ tức</p>
                        <p className="text-sm font-bold text-amber-400">{(totalDividends / 1e6).toFixed(1)}M</p>
                    </div>
                    {/* Dividend Growth Section - NEW */}
                    <div className="text-center border-l border-white/5">
                        <p className="text-[10px] text-muted-foreground uppercase">Tăng 3 năm</p>
                        <p className={`text-sm font-bold ${dividendGrowth && dividendGrowth.cagr3Year > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {dividendGrowth ? `${dividendGrowth.cagr3Year.toFixed(1)}%` : 'N/A'}
                        </p>
                    </div>
                    <div className="text-center border-l border-white/5">
                        <p className="text-[10px] text-muted-foreground uppercase">Tăng 5 năm</p>
                        <p className={`text-sm font-bold ${dividendGrowth && dividendGrowth.cagr5Year > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {dividendGrowth ? `${dividendGrowth.cagr5Year.toFixed(1)}%` : 'N/A'}
                        </p>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height={height}>
                    <ComposedChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="return" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                        <YAxis yAxisId="dividend" orientation="right" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                        <ReferenceLine yAxisId="return" y={0} stroke="#71717a" strokeDasharray="3 3" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                            formatter={(value: any, name: any) => {
                                if (name === 'Lợi nhuận') return [`${Number(value).toFixed(2)}%`, name];
                                return [`${(Number(value) / 1e6).toFixed(2)} triệu VND`, 'Cổ tức'];
                            }}
                        />
                        <Bar yAxisId="return" dataKey="return" name="Lợi nhuận" radius={[4, 4, 0, 0]}>
                            {data.map((entry, i) => <Cell key={i} fill={entry.return >= 0 ? '#6366f1' : '#ef4444'} />)}
                        </Bar>
                        <Line yAxisId="dividend" type="monotone" dataKey="dividends" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b' }} name="Cổ tức" />
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface DividendBreakdownProps {
    cashDividends: number;
    stockDividends: number;
    reinvested: number;
}

const COLORS = ['#22c55e', '#6366f1', '#f59e0b'];

export function DividendBreakdown({ cashDividends, stockDividends, reinvested }: DividendBreakdownProps) {
    const data = [
        { name: 'Cổ tức tiền mặt', value: cashDividends, description: 'Tiền mặt nhận được' },
        { name: 'Giá trị CP thưởng', value: stockDividends, description: 'Cổ phiếu nhận được' },
        { name: 'Đã tái đầu tư', value: reinvested, description: 'Mua thêm từ cổ tức' },
    ].filter((d) => d.value > 0);

    if (data.length === 0) {
        return (
            <Card className="bg-white/[0.02] border-white/5">
                <CardContent className="p-6 text-center">
                    <PieIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Chưa có dữ liệu cổ tức</p>
                </CardContent>
            </Card>
        );
    }

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const reinvestRatio = reinvested / total * 100;

    return (
        <Card className="bg-white/[0.02] border-white/5">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-amber-400" />
                    Phân tích cổ tức
                </CardTitle>
                <CardDescription className="text-xs">
                    Tổng giá trị: {(total / 1e6).toFixed(2)} triệu VND
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Insight */}
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                    <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5" />
                        <div>
                            <p className="text-xs font-medium text-amber-400">Hiệu quả tái đầu tư</p>
                            <p className="text-xs text-amber-200/70 mt-0.5">
                                {reinvestRatio.toFixed(1)}% cổ tức đã được tái đầu tư để mua thêm cổ phiếu,
                                tạo hiệu ứng lãi kép cho danh mục.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6">
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                                formatter={(value: any) => [`${(Number(value) / 1e6).toFixed(2)} triệu VND`]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-shrink-0 space-y-2 w-full md:w-auto">
                        {data.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium">{item.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{item.description}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold">{(item.value / 1e6).toFixed(1)}M</p>
                                    <p className="text-[10px] text-muted-foreground">{((item.value / total) * 100).toFixed(0)}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
