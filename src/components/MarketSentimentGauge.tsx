import React from 'react';
import { Shield, Info } from 'lucide-react';

interface MarketSentimentGaugeProps {
    score: number;
    label: string;
    color: string;
    breakdown?: {
        rsi: number;
        momentum: string;
        volRatio: string;
    };
}

export default function MarketSentimentGauge({ score, label, color, breakdown }: MarketSentimentGaugeProps) {
    // Calculate rotation for the needle (0 score = -90deg, 100 score = 90deg)
    const rotation = (score / 100) * 180 - 90;

    return (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 relative overflow-hidden shadow-2xl">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />

            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">
                        Tâm Lý Thị Trường (VN30)
                    </h3>
                </div>
                <div className="group relative">
                    <Info className="w-4 h-4 text-slate-500 cursor-help" />
                    <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-slate-900 border border-slate-700 rounded-lg text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                        Chỉ số Fear & Greed đo lường sự hưng phấn hoặc hoảng sợ của đám đông.
                        Định giá sẽ tự động thắt chặt khi thị trường "Tham Lam" và nới lỏng khi "Sợ Hãi".
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center">
                {/* Gauge Figure */}
                <div className="relative w-48 h-24 mb-4 overflow-hidden">
                    {/* Semi-circle background */}
                    <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[12px] border-slate-800" />

                    {/* Zones */}
                    <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 50">
                        {/* Red: 0-25 */}
                        <path d="M 5 50 A 45 45 0 0 1 20 18" fill="none" stroke="#ef4444" strokeWidth="8" strokeOpacity="0.3" strokeLinecap="round" />
                        {/* Orange: 25-45 */}
                        <path d="M 20 18 A 45 45 0 0 1 45 5" fill="none" stroke="#f97316" strokeWidth="8" strokeOpacity="0.3" />
                        {/* Gray: 45-55 */}
                        <path d="M 45 5 A 45 45 0 0 1 55 5" fill="none" stroke="#94a3b8" strokeWidth="8" strokeOpacity="0.3" />
                        {/* Green: 55-75 */}
                        <path d="M 55 5 A 45 45 0 0 1 80 18" fill="none" stroke="#22c55e" strokeWidth="8" strokeOpacity="0.3" />
                        {/* Emerald: 75-100 */}
                        <path d="M 80 18 A 45 45 0 0 1 95 50" fill="none" stroke="#10b981" strokeWidth="8" strokeOpacity="0.3" strokeLinecap="round" />
                    </svg>

                    {/* Active highlighted zone */}
                    <div
                        className="absolute inset-x-0 bottom-0 h-1 z-20"
                        style={{ backgroundColor: color, opacity: 0.5, boxShadow: `0 0 20px ${color}` }}
                    />

                    {/* Needle */}
                    <div
                        className="absolute bottom-0 left-1/2 w-1 h-20 bg-white origin-bottom rounded-full transition-transform duration-1000 ease-out z-30"
                        style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full border-2 border-slate-900 shadow-lg" />
                    </div>
                </div>

                <div className="text-center">
                    <span
                        className="text-2xl font-black font-mono block mb-1"
                        style={{ color: color }}
                    >
                        {score}
                    </span>
                    <span
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: color }}
                    >
                        {label}
                    </span>
                </div>
            </div>

            {breakdown && (
                <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-800/50">
                    <div className="text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">RSI VN30</p>
                        <p className="text-xs text-slate-300 font-mono">{breakdown.rsi}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Momentum</p>
                        <p className="text-xs text-slate-300 font-mono">{breakdown.momentum}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Thanh khoản</p>
                        <p className="text-xs text-slate-300 font-mono">x{breakdown.volRatio}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
