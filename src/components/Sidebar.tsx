'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    LineChart,
    Wallet,
    Newspaper,
    Settings,
    LogOut,
    TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
    className?: string;
}

const NAV_ITEMS = [
    { label: 'Tổng Quan', icon: LayoutDashboard, href: '/', active: true },
    { label: 'Danh Mục', icon: Wallet, href: '/' },
    { label: 'Phân Tích', icon: LineChart, href: '/' },
    { label: 'Tin Tức', icon: Newspaper, href: '/' },
];

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();

    return (
        <div className={cn("flex flex-col h-full bg-[#0b1121] border-r border-slate-800/60 shadow-2xl relative overflow-hidden", className)}>

            {/* Background Ambient Glow */}
            <div className="absolute top-0 left-0 w-full h-64 bg-indigo-600/5 blur-[80px] pointer-events-none" />

            {/* 1. LOGO BRANDING */}
            <div className="flex-none p-6 pb-8 pt-8">
                <Link href="/" className="flex items-center justify-center group relative">
                    {/* Logo Container */}
                    <div className="relative w-48 h-16 flex-shrink-0">
                        {/* Glow Layer */}
                        <div className="absolute inset-0 bg-indigo-500/20 blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
                        {/* Logo Image */}
                        <img
                            src="/logo.png"
                            alt="Hải Từ Đâu - Invest OS"
                            className="relative w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                    </div>
                </Link>
            </div>

            {/* 2. NAVIGATION */}
            <div className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-4 mb-2 mt-2">Menu Chính</div>
                {NAV_ITEMS.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative overflow-hidden",
                            item.active
                                ? "bg-gradient-to-r from-indigo-500/10 to-purple-500/5 text-indigo-300 border border-indigo-500/20"
                                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                        )}
                    >
                        {item.active && (
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-500 shadow-[0_0_10px_2px_rgba(99,102,241,0.5)]" />
                        )}
                        <item.icon className={cn("w-5 h-5 transition-colors", item.active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300")} />
                        {item.label}
                    </Link>
                ))}

                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-4 mb-2 mt-8">Hệ Thống</div>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all duration-200">
                    <Settings className="w-5 h-5 text-slate-500" />
                    Cài đặt
                </button>
            </div>

            {/* 3. USER PROFILE */}
            <div className="flex-none p-4 mt-auto">
                <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px] shadow-lg shadow-indigo-500/20">
                            <div className="w-full h-full rounded-full bg-[#0b1121] flex items-center justify-center">
                                <span className="font-bold text-sm text-white">Guest</span>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">Premium Account</p>
                            <p className="text-[10px] text-emerald-400 font-medium tracking-wide">● Đang hoạt động</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg">
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
