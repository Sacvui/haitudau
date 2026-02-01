'use client';

import React, { useState, useMemo } from 'react';
import { GlassCard } from '@/components/ui/glass';
import { Button } from '@/components/ui/button';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Coins,
    Gift,
    TrendingUp,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import dividendsData from '@/data/dividends.json';

interface DividendEvent {
    symbol: string;
    exDate: string;
    type: 'cash' | 'stock';
    value: number;
    description: string;
}

// Parse dividend data from JSON
const ALL_DIVIDENDS: DividendEvent[] = Object.entries(dividendsData).flatMap(([symbol, events]) =>
    (events as any[]).map(e => ({
        symbol,
        exDate: e.exDate,
        type: e.type as 'cash' | 'stock',
        value: e.value,
        description: e.description
    }))
).sort((a, b) => new Date(b.exDate).getTime() - new Date(a.exDate).getTime());

// Get upcoming dividends (next 6 months from now - simulated as from last data point)
const getUpcomingDividends = () => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    return ALL_DIVIDENDS.filter(d => new Date(d.exDate) >= sixMonthsAgo);
};

// Group by month
const groupByMonth = (events: DividendEvent[]) => {
    const groups: Record<string, DividendEvent[]> = {};
    events.forEach(e => {
        const month = e.exDate.substring(0, 7); // YYYY-MM
        if (!groups[month]) groups[month] = [];
        groups[month].push(e);
    });
    return groups;
};

export default function DividendCalendarPage() {
    const [selectedYear, setSelectedYear] = useState(2024);
    const [selectedType, setSelectedType] = useState<'all' | 'cash' | 'stock'>('all');

    const yearDividends = useMemo(() => {
        return ALL_DIVIDENDS.filter(d => {
            const year = new Date(d.exDate).getFullYear();
            if (year !== selectedYear) return false;
            if (selectedType !== 'all' && d.type !== selectedType) return false;
            return true;
        });
    }, [selectedYear, selectedType]);

    const monthlyGroups = useMemo(() => groupByMonth(yearDividends), [yearDividends]);

    const stats = useMemo(() => {
        const cash = yearDividends.filter(d => d.type === 'cash');
        const stock = yearDividends.filter(d => d.type === 'stock');
        const uniqueSymbols = new Set(yearDividends.map(d => d.symbol));
        return {
            total: yearDividends.length,
            cashCount: cash.length,
            stockCount: stock.length,
            companiesCount: uniqueSymbols.size,
        };
    }, [yearDividends]);

    const months = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];

    const formatValue = (type: 'cash' | 'stock', value: number) => {
        if (type === 'cash') {
            return `${value.toLocaleString()}đ/CP`;
        }
        return `${value}%`;
    };

    return (
        <div className="min-h-screen bg-[#0a0f1a] p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Calendar className="w-8 h-8 text-purple-400" />
                            Dividend Calendar
                        </h1>
                        <p className="text-slate-400 mt-1">Lịch chia cổ tức VN30 theo năm</p>
                    </div>
                    <Link href="/">
                        <Button variant="outline" className="border-slate-700 text-slate-300">
                            ← Về Dashboard
                        </Button>
                    </Link>
                </div>

                {/* Year Selector & Filters */}
                <GlassCard className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Year Navigation */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedYear(y => y - 1)}
                                className="text-slate-400 hover:text-white"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <span className="text-2xl font-bold text-white min-w-[80px] text-center">
                                {selectedYear}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedYear(y => y + 1)}
                                className="text-slate-400 hover:text-white"
                                disabled={selectedYear >= new Date().getFullYear()}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Type Filter */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant={selectedType === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedType('all')}
                                className={selectedType === 'all' ? 'bg-indigo-600' : 'border-slate-700'}
                            >
                                Tất cả
                            </Button>
                            <Button
                                variant={selectedType === 'cash' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedType('cash')}
                                className={selectedType === 'cash' ? 'bg-amber-600' : 'border-slate-700'}
                            >
                                <Coins className="w-4 h-4 mr-1" />
                                Tiền mặt
                            </Button>
                            <Button
                                variant={selectedType === 'stock' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedType('stock')}
                                className={selectedType === 'stock' ? 'bg-purple-600' : 'border-slate-700'}
                            >
                                <Gift className="w-4 h-4 mr-1" />
                                Cổ phiếu
                            </Button>
                        </div>
                    </div>
                </GlassCard>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <GlassCard className="p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase">Tổng sự kiện</p>
                        <p className="text-2xl font-bold text-white">{stats.total}</p>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase">Tiền mặt</p>
                        <p className="text-2xl font-bold text-amber-400">{stats.cashCount}</p>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase">Cổ phiếu</p>
                        <p className="text-2xl font-bold text-purple-400">{stats.stockCount}</p>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase">Số công ty</p>
                        <p className="text-2xl font-bold text-emerald-400">{stats.companiesCount}</p>
                    </GlassCard>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {months.map((monthName, idx) => {
                        const monthKey = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
                        const events = monthlyGroups[monthKey] || [];
                        const hasEvents = events.length > 0;

                        return (
                            <GlassCard
                                key={monthKey}
                                className={`p-4 ${hasEvents ? '' : 'opacity-50'}`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-white">{monthName}</h3>
                                    {hasEvents && (
                                        <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
                                            {events.length} sự kiện
                                        </span>
                                    )}
                                </div>

                                {hasEvents ? (
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {events.map((event, i) => (
                                            <Link
                                                key={i}
                                                href={`/?symbol=${event.symbol}`}
                                                className="block"
                                            >
                                                <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                                                    <div className="flex items-center gap-2">
                                                        {event.type === 'cash' ? (
                                                            <Coins className="w-4 h-4 text-amber-400" />
                                                        ) : (
                                                            <Gift className="w-4 h-4 text-purple-400" />
                                                        )}
                                                        <div>
                                                            <p className="font-bold text-white text-sm">{event.symbol}</p>
                                                            <p className="text-[10px] text-slate-500">
                                                                {new Date(event.exDate).toLocaleDateString('vi-VN')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-sm font-mono font-bold ${event.type === 'cash' ? 'text-amber-400' : 'text-purple-400'
                                                            }`}>
                                                            {formatValue(event.type, event.value)}
                                                        </p>
                                                        <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors ml-auto" />
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-sm text-center py-4">
                                        Không có sự kiện
                                    </p>
                                )}
                            </GlassCard>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-6 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-400" />
                        Cổ tức tiền mặt (VND/cổ phiếu)
                    </div>
                    <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-purple-400" />
                        Cổ tức cổ phiếu (% tỷ lệ)
                    </div>
                </div>
            </div>
        </div>
    );
}
