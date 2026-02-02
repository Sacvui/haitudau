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
    ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, Activity } from 'lucide-react';
import { MonteCarloResult } from '@/lib/investment-calculator';

interface MonteCarloChartProps {
    data: MonteCarloResult[];
    height?: number;
}

export function MonteCarloChart({ data, height = 400 }: MonteCarloChartProps) {
    if (!data || data.length === 0) return null;

    const chartData = data.map(d => ({
        year: `Năm ${d.year}`,
        p10: d.percentiles.p10,
        p50: d.percentiles.p50,
        p90: d.percentiles.p90,
    }));

    const lastResult = data[data.length - 1];
    const riskAmount = lastResult.percentiles.p10;
    const baseAmount = lastResult.percentiles.p50;
    const optimisticAmount = lastResult.percentiles.p90;

    return (
        <Card className="bg-[#111827] border-slate-800 shadow-xl overflow-hidden mt-6">
            <CardHeader className="pb-2 border-b border-slate-800 bg-slate-900/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-sm flex items-center gap-2 text-slate-200">
                            <Activity className="w-4 h-4 text-purple-400" />
                            MÔ PHỎNG TƯƠNG LAI (MONTE CARLO)
                        </CardTitle>
                        <CardDescription className="text-xs mt-1 text-slate-500">
                            Dự phóng 1,000 kịch bản thị trường dựa trên biến động lịch sử (VN-Index)
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-3 border-b border-slate-800">
                    <div className="p-4 border-r border-slate-800 text-center">
                        <p className="text-xs text-rose-400 font-bold uppercase mb-1">Kịch bản Rủi ro</p>
                        <p className="text-xl font-mono text-white">{(riskAmount / 1e9).toFixed(1)} Tỷ</p>
                        <p className="text-[10px] text-slate-500">10% khả năng xảy ra</p>
                    </div>
                    <div className="p-4 border-r border-slate-800 text-center bg-white/[0.02]">
                        <p className="text-xs text-amber-400 font-bold uppercase mb-1">Kịch bản Cơ sở</p>
                        <p className="text-2xl font-mono text-white font-bold">{(baseAmount / 1e9).toFixed(1)} Tỷ</p>
                        <p className="text-[10px] text-slate-500">Trung vị (50%)</p>
                    </div>
                    <div className="p-4 text-center">
                        <p className="text-xs text-emerald-400 font-bold uppercase mb-1">Kịch bản Lạc quan</p>
                        <p className="text-xl font-mono text-white">{(optimisticAmount / 1e9).toFixed(1)} Tỷ</p>
                        <p className="text-[10px] text-slate-500">Top 10% may mắn</p>
                    </div>
                </div>

                <div className="p-4">
                    <ResponsiveContainer width="100%" height={height}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradientP90" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradientP10" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis
                                dataKey="year"
                                stroke="#64748b"
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#64748b"
                                tick={{ fontSize: 10 }}
                                tickFormatter={(value) => `${(value / 1e9).toFixed(0)}B`}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                itemStyle={{ fontSize: '12px' }}
                                formatter={(value: any, name: any) => [
                                    `${(Number(value) / 1e6).toFixed(0)} Tr`,
                                    name === 'p90' ? 'Lạc quan' : name === 'p50' ? 'Trung bình' : 'Rủi ro'
                                ]}
                            />

                            {/* Area P50-P90 (Upside) */}
                            <Area
                                type="monotone"
                                dataKey="p90"
                                stackId="1"
                                stroke="none"
                                fill="url(#gradientP90)"
                                fillOpacity={1}
                            />
                            {/* Area P10-P50 (Downside) - This stacking trick is tricky in Recharts.
                                Instead, we draw separate areas overlapping.
                            */}

                            <Area
                                type="monotone"
                                dataKey="p90"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                fillOpacity={0}
                                name="Lạc quan"
                            />

                            <Area
                                type="monotone"
                                dataKey="p50"
                                stroke="#fbbf24"
                                strokeWidth={3}
                                fill="url(#gradientP90)" // Reuse for now
                                fillOpacity={0.1}
                                name="Trung bình"
                            />

                            <Area
                                type="monotone"
                                dataKey="p10"
                                stroke="#f43f5e"
                                strokeWidth={2}
                                strokeDasharray="3 3"
                                fill="url(#gradientP10)"
                                fillOpacity={0.2}
                                name="Rủi ro"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
