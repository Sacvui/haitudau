'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Calendar, CircleDollarSign, LineChart, RotateCcw, Scale } from 'lucide-react';
import StockSearch from '@/components/StockSearch';

interface FormDataType {
    symbol: string;
    compareSymbol: string; // NEW: Symbol to compare
    startDate: string;
    endDate: string;
    initialAmount: number;
    monthlyInvestment: number;
    reinvestDividends: boolean;
}

interface ControlBarProps {
    formData: FormDataType;
    setFormData: React.Dispatch<React.SetStateAction<FormDataType>>;
    onAnalyze: () => void;
    loading: boolean;
}

export function ControlBar({ formData, setFormData, onAnalyze, loading }: ControlBarProps) {

    // Helper to format/parse money
    const handleAmountChange = (key: keyof Pick<FormDataType, 'initialAmount' | 'monthlyInvestment'>, value: string) => {
        const num = parseInt(value.replace(/[^0-9]/g, '')) || 0;
        setFormData(prev => ({ ...prev, [key]: num }));
    };

    const formatCurrency = (val: number) => {
        if (!val) return '';
        return new Intl.NumberFormat('vi-VN').format(val);
    }

    return (
        <div className="w-full bg-[#0b1121]/95 backdrop-blur-md border-b border-slate-800 shadow-xl z-30 sticky top-0">
            <div className="p-3 lg:p-4 max-w-[1920px] mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-x-3 gap-y-4 items-end">

                    {/* 1. STOCK SYMBOL - Primary */}
                    <div className="col-span-1 md:col-span-1 lg:col-span-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1.5 tracking-wider">
                            <LineChart className="w-3 h-3 text-indigo-400" /> Mã Chính
                        </label>
                        <div className="h-10 relative shadow-sm">
                            <StockSearch
                                value={formData.symbol}
                                onChange={(s) => setFormData(prev => ({ ...prev, symbol: s }))}
                                placeholder="VD: VIB"
                            />
                        </div>
                    </div>

                    {/* 2. COMPARE SYMBOL - NEW */}
                    <div className="col-span-1 md:col-span-1 lg:col-span-2">
                        <label className="text-[10px] uppercase font-bold text-amber-400 mb-1.5 flex items-center gap-1.5 tracking-wider">
                            <Scale className="w-3 h-3 text-amber-400" /> So Sánh Với
                        </label>
                        <div className="h-10 relative shadow-sm">
                            <StockSearch
                                value={formData.compareSymbol}
                                onChange={(s) => setFormData(prev => ({ ...prev, compareSymbol: s }))}
                                placeholder="(Tùy chọn)"
                            />
                        </div>
                    </div>

                    {/* 2. INITIAL CAPITAL */}
                    <div className="col-span-1 md:col-span-1 lg:col-span-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1.5 tracking-wider">
                            <CircleDollarSign className="w-3 h-3 text-emerald-400" /> Vốn Gốc
                        </label>
                        <div className="relative group">
                            <Input
                                className="h-10 pl-3 pr-12 w-full bg-slate-900 border-slate-700 text-white font-mono text-sm font-semibold focus:border-emerald-500 transition-all focus:ring-1 focus:ring-emerald-500/50"
                                value={formatCurrency(formData.initialAmount)}
                                onChange={(e) => handleAmountChange('initialAmount', e.target.value)}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 bg-slate-800/50 px-1 rounded font-mono">VND</span>
                        </div>
                    </div>

                    {/* 3. MONTHLY DCA */}
                    <div className="col-span-1 md:col-span-1 lg:col-span-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1.5 tracking-wider">
                            <RotateCcw className="w-3 h-3 text-sky-400" /> Nạp/Tháng
                        </label>
                        <div className="relative group">
                            <Input
                                className="h-10 pl-3 pr-12 w-full bg-slate-900 border-slate-700 text-white font-mono text-sm font-semibold focus:border-sky-500 transition-all focus:ring-1 focus:ring-sky-500/50 border-dashed"
                                placeholder="0"
                                value={formatCurrency(formData.monthlyInvestment)}
                                onChange={(e) => handleAmountChange('monthlyInvestment', e.target.value)}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 bg-slate-800/50 px-1 rounded font-mono">VND</span>
                        </div>
                    </div>

                    {/* 4. DATE RANGE */}
                    <div className="col-span-2 md:col-span-2 lg:col-span-3 grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1.5 tracking-wider">
                                <Calendar className="w-3 h-3" /> Bắt Đầu
                            </label>
                            <Input
                                type="date"
                                className="h-10 bg-slate-900 border-slate-700 text-white text-xs px-2 font-medium focus:border-indigo-500"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Kết Thúc</label>
                            <Input
                                type="date"
                                className="h-10 bg-slate-900 border-slate-700 text-white text-xs px-2 font-medium focus:border-indigo-500"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* 5. ACTION */}
                    <div className="col-span-2 md:col-span-2 lg:col-span-3 flex items-center justify-between lg:justify-end gap-3 h-10">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-900/50 border border-slate-800">
                            <Switch
                                id="reinvest-mode"
                                checked={formData.reinvestDividends}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, reinvestDividends: e.target.checked }))}
                                className="data-[state=checked]:bg-emerald-500 scale-90"
                            />
                            <label htmlFor="reinvest-mode" className="text-[10px] font-bold text-slate-400 cursor-pointer select-none uppercase tracking-wide">
                                Tái đ/tư
                            </label>
                        </div>

                        <Button
                            onClick={onAnalyze}
                            disabled={!formData.symbol || loading}
                            className={`
                                relative h-10 px-6 font-bold text-xs uppercase tracking-wider transition-all duration-300 overflow-hidden
                                ${loading
                                    ? 'bg-slate-700 cursor-wait shadow-none'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:shadow-[0_0_30px_rgba(139,92,246,0.7)] hover:scale-105 active:scale-95'
                                }
                            `}
                        >
                            {!loading && (
                                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 animate-[shimmer_2s_infinite]" />
                            )}
                            <span className="relative">{loading ? 'ĐANG TÍNH...' : '✨ PHÂN TÍCH NGAY'}</span>
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    );
}
