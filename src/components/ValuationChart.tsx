'use client';

import React from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

interface ValuationChartProps {
    data: {
        date: string;
        close: number; // Adjusted price usually
    }[];
    height?: number;
}

export function ValuationChart({ data, height = 350 }: ValuationChartProps) {
    // Calculate SMA 200 (Simple Moving Average)
    const maPeriod = 200;

    // We need enough data
    if (!data || data.length < maPeriod) {
        return (
            <Card className="bg-[#111827] border-slate-800 shadow-xl overflow-hidden h-full flex items-center justify-center p-8">
                <p className="text-slate-500 text-sm text-center">
                    Cần ít nhất 200 ngày dữ liệu để hiển thị biểu đồ định giá MA200.
                </p>
            </Card>
        );
    }

    const enrichedData = data.map((item, index, array) => {
        let sma = null;
        if (index >= maPeriod - 1) {
            const sum = array.slice(index - maPeriod + 1, index + 1).reduce((acc, curr) => acc + curr.close, 0);
            sma = sum / maPeriod;
        }

        return {
            ...item,
            dateStr: format(new Date(item.date), 'dd/MM/yy'),
            price: item.close,
            sma: sma,
            // upperBand: sma ? sma * 1.2 : null, // +20%
            // lowerBand: sma ? sma * 0.8 : null  // -20%
        };
    }).filter(item => item.sma !== null); // Removing developing period to show clean chart

    const lastItem = enrichedData[enrichedData.length - 1];
    const signal = lastItem.price < lastItem.sma!
        ? { text: "VÙNG MUA (RẺ)", color: "text-emerald-400" }
        : { text: "VÙNG BÁN (ĐẮT)", color: "text-rose-400" };

    return (
        <Card className="bg-[#111827] border-slate-800 shadow-xl overflow-hidden">
            <CardHeader className="pb-2 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm flex items-center gap-2 text-slate-200">
                            <Lightbulb className="w-4 h-4 text-yellow-400" />
                            ĐỊNH GIÁ: PRICE vs MA200
                        </CardTitle>
                        <CardDescription className="text-xs mt-1 text-slate-500">
                            So sánh Giá trị thị trường (Xanh) với Xu hướng dài hạn (Vàng).
                        </CardDescription>
                    </div>
                    <div>
                        <span className={`text-xs font-bold px-2 py-1 rounded bg-slate-800 border border-slate-700 ${signal.color}`}>
                            {signal.text}
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="p-4">
                    <ResponsiveContainer width="100%" height={height}>
                        <ComposedChart data={enrichedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis
                                dataKey="dateStr"
                                stroke="#64748b"
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                stroke="#64748b"
                                tick={{ fontSize: 10 }}
                                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                tickLine={false}
                                axisLine={false}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                itemStyle={{ fontSize: '12px' }}
                                labelStyle={{ color: '#94a3b8', marginBottom: '5px' }}
                                formatter={(value: any, name: any) => [Number(value).toLocaleString(), name === 'price' ? 'Giá' : name]}
                            />
                            <Line
                                type="monotone"
                                dataKey="sma"
                                stroke="#fbbf24"
                                strokeWidth={2}
                                dot={false}
                                name="MA200"
                            />
                            <Line
                                type="monotone"
                                dataKey="price"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={false}
                                name="Giá"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
