'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/glass';
import { Button } from '@/components/ui/button';
import {
    ChevronDown,
    ChevronUp,
    ShoppingCart,
    Coins,
    Gift,
    RefreshCw,
    TrendingUp,
    Wallet,
    Calendar
} from 'lucide-react';
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

interface TransactionTimelineProps {
    timeline: TimelineEvent[];
    symbol: string;
}

const eventIcons: Record<string, React.ReactNode> = {
    buy: <ShoppingCart className="w-4 h-4 text-emerald-400" />,
    sell: <TrendingUp className="w-4 h-4 text-rose-400" />,
    dividend_cash: <Coins className="w-4 h-4 text-amber-400" />,
    dividend_stock: <Gift className="w-4 h-4 text-indigo-400" />,
    reinvest: <RefreshCw className="w-4 h-4 text-cyan-400" />,
    deposit: <Wallet className="w-4 h-4 text-blue-400" />,
};

const eventLabels: Record<string, string> = {
    buy: 'Mua',
    sell: 'Bán',
    dividend_cash: 'Cổ tức tiền',
    dividend_stock: 'Cổ tức CP',
    reinvest: 'Tái đầu tư',
    deposit: 'Nạp tiền',
};

const eventColors: Record<string, string> = {
    buy: 'border-emerald-500/30 bg-emerald-500/5',
    sell: 'border-rose-500/30 bg-rose-500/5',
    dividend_cash: 'border-amber-500/30 bg-amber-500/5',
    dividend_stock: 'border-indigo-500/30 bg-indigo-500/5',
    reinvest: 'border-cyan-500/30 bg-cyan-500/5',
    deposit: 'border-blue-500/30 bg-blue-500/5',
};

export function TransactionTimeline({ timeline, symbol }: TransactionTimelineProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showAll, setShowAll] = useState(false);

    if (!timeline || timeline.length === 0) return null;

    // Sort by date descending (newest first)
    const sortedTimeline = [...timeline].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const displayedEvents = showAll ? sortedTimeline : sortedTimeline.slice(0, 10);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(val);
    };

    // Calculate summary stats
    const buyEvents = timeline.filter(e => e.type === 'buy' || e.type === 'reinvest');
    const dividendEvents = timeline.filter(e => e.type === 'dividend_cash' || e.type === 'dividend_stock');
    const totalBuyValue = buyEvents.reduce((sum, e) => sum + (e.shares * e.pricePerShare), 0);

    return (
        <GlassCard className="overflow-hidden" delay={0.4}>
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between hover:bg-white/[0.04] transition-colors"
            >
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    Chi Tiết Giao Dịch - {symbol}
                </h3>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                        {timeline.length} giao dịch
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                </div>
            </button>

            {/* Expandable Content */}
            {isExpanded && (
                <div className="p-4 space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 uppercase">Lần mua</p>
                            <p className="text-sm font-bold text-emerald-400">{buyEvents.length}</p>
                        </div>
                        <div className="text-center border-x border-white/5">
                            <p className="text-[10px] text-slate-500 uppercase">Lần nhận cổ tức</p>
                            <p className="text-sm font-bold text-amber-400">{dividendEvents.length}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 uppercase">Tổng đã mua</p>
                            <p className="text-sm font-bold text-white">{(totalBuyValue / 1e6).toFixed(1)}M</p>
                        </div>
                    </div>

                    {/* Timeline Events */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {displayedEvents.map((event, idx) => (
                            <div
                                key={idx}
                                className={`p-3 rounded-lg border ${eventColors[event.type]} transition-all hover:scale-[1.01]`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5">
                                            {eventIcons[event.type]}
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-white">
                                                {event.description}
                                            </p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">
                                                {format(new Date(event.date), 'dd/MM/yyyy', { locale: vi })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-xs font-mono font-bold text-white">
                                            {event.shares > 0 && `${event.shares.toLocaleString()} CP`}
                                        </p>
                                        {event.pricePerShare > 0 && (
                                            <p className="text-[10px] text-slate-500">
                                                @{(event.pricePerShare / 1000).toFixed(1)}K
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Portfolio snapshot */}
                                <div className="mt-2 pt-2 border-t border-white/5 flex justify-between text-[10px] text-slate-400">
                                    <span>Sở hữu: {event.totalShares.toLocaleString()} CP</span>
                                    <span>Danh mục: {formatCurrency(event.portfolioValue)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Show More Button */}
                    {sortedTimeline.length > 10 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs text-slate-400 hover:text-white"
                            onClick={() => setShowAll(!showAll)}
                        >
                            {showAll ? `Thu gọn` : `Xem tất cả ${sortedTimeline.length} giao dịch`}
                        </Button>
                    )}
                </div>
            )}
        </GlassCard>
    );
}
