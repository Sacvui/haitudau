'use client';

import React from 'react';
import { DollarSign, TrendingUp, Coins, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface InvestmentResult {
    totalInvested: number;
    currentValue: number;
    absoluteReturn: number;
    percentageReturn: number;
    annualizedReturn: number;
    totalShares: number;
    averageCostPerShare: number;
    currentPrice?: number;
}

interface InvestmentSummaryProps {
    result: InvestmentResult;
}

export function InvestmentSummary({ result }: InvestmentSummaryProps) {
    const isPositive = result.absoluteReturn >= 0;

    const formatCompact = (value: number) => {
        if (value >= 1e9) return `${(value / 1e9).toFixed(2)} tỷ`;
        if (value >= 1e6) return `${(value / 1e6).toFixed(1)} triệu`;
        return value.toLocaleString('vi-VN');
    };

    return null; // Moved to main page for cleaner integration
}

interface DividendSummaryProps {
    cashReceived: number;
    stockReceived: number;
    reinvested: number;
}

export function DividendSummary({ cashReceived, stockReceived, reinvested }: DividendSummaryProps) {
    return null; // Moved to main page for cleaner integration
}

interface StatCardProps {
    label: string;
    value: string;
    subValue?: string;
    icon: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
}

export function StatCard({ label, value, subValue, icon, trend }: StatCardProps) {
    return (
        <Card className="bg-white/[0.02] border-white/5">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className={`text-xl font-bold ${trend === 'up' ? 'text-emerald-400' :
                                trend === 'down' ? 'text-red-400' :
                                    'text-foreground'
                            }`}>
                            {value}
                        </p>
                        {subValue && (
                            <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
                        )}
                    </div>
                    <div className="p-2 rounded-lg bg-white/5">
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
