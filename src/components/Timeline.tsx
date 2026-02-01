'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { DollarSign, TrendingUp, Gift, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TimelineEvent {
    date: string;
    type: 'buy' | 'dividend_cash' | 'dividend_stock' | 'sell';
    description: string;
    shares?: number;
    amount?: number;
    price?: number;
}

interface TimelineProps {
    events: TimelineEvent[];
    maxEvents?: number;
}

export default function Timeline({ events, maxEvents = 10 }: TimelineProps) {
    const [expanded, setExpanded] = useState(false);
    const displayEvents = expanded ? events : events.slice(0, maxEvents);

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'buy':
                return <TrendingUp className="w-3.5 h-3.5" />;
            case 'dividend_cash':
                return <DollarSign className="w-3.5 h-3.5" />;
            case 'dividend_stock':
                return <Gift className="w-3.5 h-3.5" />;
            default:
                return <TrendingUp className="w-3.5 h-3.5" />;
        }
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case 'buy':
                return 'bg-indigo-500/20 text-indigo-400';
            case 'dividend_cash':
                return 'bg-emerald-500/20 text-emerald-400';
            case 'dividend_stock':
                return 'bg-amber-500/20 text-amber-400';
            default:
                return 'bg-white/10 text-white';
        }
    };

    const getEventLabel = (type: string) => {
        switch (type) {
            case 'buy':
                return 'Mua';
            case 'dividend_cash':
                return 'Cổ tức tiền';
            case 'dividend_stock':
                return 'Cổ tức CP';
            default:
                return type;
        }
    };

    const formatAmount = (amount?: number) => {
        if (!amount) return '';
        if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M`;
        if (amount >= 1e3) return `${(amount / 1e3).toFixed(0)}K`;
        return amount.toLocaleString();
    };

    return (
        <Card className="bg-white/[0.02] border-white/5">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                        Lịch sử giao dịch
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px]">{events.length} sự kiện</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[15px] top-0 bottom-0 w-px bg-white/10" />

                    <div className="space-y-3">
                        {displayEvents.map((event, index) => (
                            <div key={index} className="relative flex items-start gap-4 pl-10">
                                {/* Dot */}
                                <div className={`absolute left-0 w-[30px] h-[30px] rounded-full flex items-center justify-center ${getEventColor(event.type)}`}>
                                    {getEventIcon(event.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 py-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-[10px] text-muted-foreground font-medium">
                                            {format(new Date(event.date), 'dd/MM/yyyy', { locale: vi })}
                                        </span>
                                        <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${getEventColor(event.type)}`}>
                                            {getEventLabel(event.type)}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-foreground/90 truncate">{event.description}</p>
                                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                        {event.shares && <span>{event.shares.toLocaleString()} CP</span>}
                                        {event.amount && <span className="text-emerald-400">{formatAmount(event.amount)} VND</span>}
                                        {event.price && <span>@ {event.price.toLocaleString()}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {events.length > maxEvents && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpanded(!expanded)}
                            className="w-full mt-4 text-xs"
                        >
                            {expanded ? (
                                <>
                                    <ChevronUp className="w-3.5 h-3.5 mr-2" />
                                    Thu gọn
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="w-3.5 h-3.5 mr-2" />
                                    Xem thêm {events.length - maxEvents} sự kiện
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
