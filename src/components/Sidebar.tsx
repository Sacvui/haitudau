'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import {
    LayoutDashboard,
    LineChart,
    Wallet,
    Newspaper,
    Settings,
    LogOut,
    TrendingUp,
    Coins,
    Target,
    Calendar,
    Lock,
    Calculator,
    Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
    className?: string;
}

const NAV_GROUPS = [
    {
        title: 'KHÁM PHÁ CƠ HỘI',
        items: [
            { label: 'Tổng Quan Thị Trường', icon: LayoutDashboard, href: '/' },
            { label: 'Bộ Lọc Cổ Phiếu', icon: Coins, href: '/screener' },
        ]
    },
    {
        title: 'PHÂN TÍCH CHUYÊN SÂU',
        items: [
            { label: 'Định Giá Tự Động', icon: Calculator, href: '/valuation' },
            { label: 'Phân Tích "Hải"', icon: Newspaper, href: '/analysis' },
        ]
    },
    {
        title: 'MÔ PHỎNG & KẾ HOẠCH',
        items: [
            { label: 'Hành Trình Tích Sản', icon: LineChart, href: '/wealth-journey' },
            { label: 'Mục Tiêu Đầu Tư', icon: Target, href: '/planner' },
        ]
    },
    {
        title: 'QUẢN TRỊ DANH MỤC',
        items: [
            { label: 'Két Sắt (Private)', icon: Lock, href: '/portfolio' },
        ]
    }
];

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<{ username: string, displayName?: string, role?: string } | null>(null);

    useEffect(() => {
        fetch('/api/auth/me').then(r => r.json()).then(data => {
            if (data.authenticated && data.user) {
                setUser(data.user);
            }
        }).catch(() => { });
    }, [pathname]);

    const handleSignOut = async () => {
        await fetch('/api/auth/login', { method: 'DELETE' });
        setUser(null);
        router.push('/');
        router.refresh();
    };

    const displayName = user?.displayName || user?.username || 'Guest';
    const initials = displayName.substring(0, 2).toUpperCase();

    return (
        <div className={cn("flex flex-col h-full bg-[#0b1121] border-r border-slate-800/60 shadow-2xl relative overflow-hidden", className)}>

            {/* Background Ambient Glow */}
            <div className="absolute top-0 left-0 w-full h-64 bg-indigo-600/5 blur-[80px] pointer-events-none" />

            {/* 1. LOGO BRANDING */}
            <div className="flex-none p-4 pb-6 pt-6 md:p-6 md:pb-8 md:pt-8 flex justify-center">
                <Link href="/" className="group relative block w-full no-underline">
                    <div className="transform group-hover:scale-105 transition-transform duration-300 origin-center flex justify-center">
                        <Logo size="default" />
                    </div>
                </Link>
            </div>

            {/* 2. NAVIGATION */}
            <div className="flex-1 px-4 space-y-6 overflow-y-auto custom-scrollbar pb-6">
                {NAV_GROUPS.map((group, gIdx) => (
                    <div key={gIdx}>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-3">{group.title}</div>
                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative overflow-hidden",
                                            isActive
                                                ? "bg-gradient-to-r from-indigo-500/10 to-purple-500/5 text-indigo-300 border border-indigo-500/20"
                                                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                                        )}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-500 shadow-[0_0_10px_2px_rgba(99,102,241,0.5)]" />
                                        )}
                                        <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300")} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}

                <div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-4 mb-2">Hệ Thống</div>
                    {user?.role === 'admin' && (
                        <Link
                            href="/admin/users"
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative overflow-hidden mb-1",
                                pathname === "/admin/users"
                                    ? "bg-gradient-to-r from-rose-500/10 to-orange-500/5 text-rose-400 border border-rose-500/20"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                            )}
                        >
                            {pathname === "/admin/users" && (
                                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-rose-500 shadow-[0_0_10px_2px_rgba(244,63,94,0.5)]" />
                            )}
                            <Users className={cn("w-5 h-5 transition-colors", pathname === "/admin/users" ? "text-rose-400" : "text-slate-500 group-hover:text-slate-300")} />
                            Quản Lý User
                        </Link>
                    )}
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/40 transition-all duration-200">
                        <Settings className="w-5 h-5 text-slate-500" />
                        Cài đặt
                    </button>
                </div>
            </div>

            {/* 3. USER PROFILE */}
            <div className="flex-none p-4 mt-auto">
                {user ? (
                    <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px] shadow-lg shadow-indigo-500/20">
                                <div className="w-full h-full rounded-full bg-[#0b1121] flex items-center justify-center">
                                    <span className="font-bold text-sm text-white">{initials}</span>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{displayName}</p>
                                <p className="text-[10px] font-medium tracking-wide text-emerald-400">
                                    ● Đã đăng nhập
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg"
                                onClick={handleSignOut}
                                title="Đăng xuất"
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Link href="/login" className="block p-3 bg-slate-800/30 hover:bg-slate-800/60 rounded-2xl border border-slate-700/50 hover:border-indigo-500/30 backdrop-blur-sm transition-all group cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 p-[2px] shadow-inner group-hover:bg-slate-700 transition-colors">
                                <div className="w-full h-full rounded-full bg-[#0b1121] flex items-center justify-center">
                                    <span className="font-bold text-sm text-slate-500">GU</span>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors truncate">Guest</p>
                                <p className="text-[10px] font-medium tracking-wide text-slate-500 group-hover:text-indigo-400 transition-colors">
                                    ○ Chưa đăng nhập (Nhấn)
                                </p>
                            </div>
                        </div>
                    </Link>
                )}
            </div>
        </div>
    );
}
