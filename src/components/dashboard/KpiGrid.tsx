'use client';

import React from 'react';
import { GlassCard, NeonText } from '@/components/ui/glass';
import { TrendingUp, TrendingDown, Wallet, Layers, Activity } from 'lucide-react';
import CountUp from 'react-countup';
import { cn } from '@/lib/utils';

interface InvestmentResultData {
    currentValue: number;
    totalInvested: number;
    absoluteReturn: number;
    percentageReturn: number;
    annualizedReturn: number;
    dividendsCashReceived: number;
    dividendsReinvested: number;
    currentPrice: number;
}

interface KpiGridProps {
    data: InvestmentResultData;
}

export function KpiGrid({ data }: KpiGridProps) {
    if (!data) return null;

    const isProfit = data.absoluteReturn >= 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Tổng Tài Sản - Highlight nhất */}
            <KpiCard
                title="TỔNG TÀI SẢN"
                value={data.currentValue}
                prefix
                subValue={`Vốn gốc: ${new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(data.totalInvested)}`}
                icon={<Wallet className="w-5 h-5 text-white" />}
                iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
                textColor="emerald"
                delay={0}
            />

            {/* 2. Lợi Nhuận Ròng - Quan trọng nhì */}
            <KpiCard
                title="LỢI NHUẬN RÒNG"
                value={Math.abs(data.absoluteReturn)}
                prefix={isProfit ? '+' : '-'}
                subValue={`${data.percentageReturn.toFixed(2)}% Tổng`}
                icon={isProfit ? <TrendingUp className="w-5 h-5 text-white" /> : <TrendingDown className="w-5 h-5 text-white" />}
                iconBg={isProfit ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-rose-500 to-red-600'}
                textColor={isProfit ? 'emerald' : 'rose'}
                delay={0.1}
            />

            {/* 3. CAGR - Hiệu suất năm */}
            <KpiCard
                title="HIỆU SUẤT NĂM (CAGR)"
                value={data.annualizedReturn}
                suffix="%"
                decimals={2}
                subValue="Lợi nhuận kép trung bình"
                icon={<Activity className="w-5 h-5 text-white" />}
                iconBg="bg-gradient-to-br from-indigo-500 to-purple-600"
                textColor="indigo"
                delay={0.2}
            />

            {/* 4. Cổ Tức - Thu nhập thụ động */}
            <KpiCard
                title="TỔNG CỔ TỨC NHẬN"
                value={data.dividendsCashReceived + (data.dividendsReinvested || 0)}
                prefix
                subValue="Thu nhập thụ động tích lũy"
                icon={<Layers className="w-5 h-5 text-white" />}
                iconBg="bg-gradient-to-br from-amber-500 to-orange-600"
                textColor="amber"
                delay={0.3}
            />
        </div>
    );
}

interface KpiCardProps {
    title: string;
    value: number;
    subValue: string;
    icon: React.ReactNode;
    iconBg: string;
    textColor: 'indigo' | 'emerald' | 'amber' | 'rose';
    prefix?: string | boolean;
    suffix?: string;
    decimals?: number;
    delay?: number;
}

function KpiCard({ title, value, subValue, icon, iconBg, textColor, prefix, suffix, decimals = 0, delay = 0 }: KpiCardProps) {
    return (
        <GlassCard delay={delay} hoverEffect className="group">
            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">{title}</h3>
                    <div className={cn("p-2 rounded-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300", iconBg)}>
                        {icon}
                    </div>
                </div>
                <div>
                    <div className="text-2xl xl:text-3xl font-mono tracking-tight text-white flex items-baseline gap-1">
                        {prefix === true ? '' : <span className="text-lg opacity-80">{prefix}</span>}
                        <NeonText color={textColor}>
                            <CountUp
                                end={value}
                                duration={2}
                                separator="."
                                decimal=","
                                decimals={decimals}
                                preserveValue={true}
                                formattingFn={(val: number) => {
                                    return prefix === true
                                        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
                                        : val.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
                                }}
                            />
                        </NeonText>
                        {suffix && <span className="text-lg opacity-80">{suffix}</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-2">
                        <span className={`w-1 h-1 rounded-full ${textColor === 'rose' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                        {subValue}
                    </p>
                </div>
            </div>
        </GlassCard>
    );
}
