'use client';

import React from 'react';
import { GlassCard } from '@/components/ui/glass';
import { TrendingUp, TrendingDown, Minus, Info, Zap } from 'lucide-react';
import { T0Signal } from '@/lib/t0-logic';

interface T0AssistantProps {
    signals: T0Signal[];
    loading?: boolean;
}

export function T0Assistant({ signals, loading }: T0AssistantProps) {
    if (loading) {
        return (
            <GlassCard className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-slate-800 rounded w-1/4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-slate-800/50 rounded-xl"></div>
                        ))}
                    </div>
                </div>
            </GlassCard>
        );
    }

    const activeSignals = signals.filter(s => s.action !== 'HOLD');

    return (
        <GlassCard className="p-6 border-indigo-500/20 bg-indigo-500/[0.02]">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                    Trợ lý Lướt T+0
                </h3>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                    Real-time Analysis
                </span>
            </div>

            {activeSignals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-black/20 rounded-2xl border border-dashed border-slate-800">
                    <Info className="w-8 h-8 text-slate-600 mb-2" />
                    <p className="text-slate-400 text-sm">Chưa có tín hiệu lướt sóng tối ưu lúc này.</p>
                    <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-tight">Thị trường đang trong vùng trung tính</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeSignals.map((signal) => (
                        <div 
                            key={signal.symbol} 
                            className={`p-4 rounded-2xl border transition-all duration-300 ${
                                signal.action === 'BUY' 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15' 
                                    : 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-bold text-white">{signal.symbol}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        signal.action === 'BUY' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                                    }`}>
                                        {signal.action === 'BUY' ? 'Lướt Mua' : 'Lướt Bán'}
                                    </span>
                                </div>
                                <div className="text-xs font-mono font-bold text-slate-400">
                                    Tin cậy: {Math.round(signal.strength)}%
                                </div>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed mb-3">
                                {signal.message}
                            </p>

                            {signal.targetPrice && (
                                <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">Điểm cover dự kiến</span>
                                    <span className={`text-sm font-mono font-bold ${
                                        signal.action === 'BUY' ? 'text-rose-400' : 'text-emerald-400'
                                    }`}>
                                        {signal.targetPrice.toLocaleString()}
                                    </span>
                                </div>
                            )}

                            {/* Progress bar for strength */}
                            <div className="w-full h-1 bg-black/20 rounded-full mt-3 overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-1000 ${
                                        signal.action === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${signal.strength}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
                <Info className="w-3 h-3 text-amber-500" />
                <p className="text-[10px] text-amber-500 leading-tight">
                    Lưu ý: Chỉ lướt T+0 trên số lượng cổ phiếu có sẵn. Không dùng để tăng tổng nợ margin.
                </p>
            </div>
        </GlassCard>
    );
}
