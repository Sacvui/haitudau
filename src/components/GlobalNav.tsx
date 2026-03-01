'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp } from 'lucide-react';

export function GlobalNav() {
    const pathname = usePathname();
    const router = useRouter();

    // Do not show back button on the root home page itself
    if (pathname === '/') return null;

    return (
        <div className="sticky top-0 z-50 w-full border-b border-slate-800 bg-[#0b1121]/90 backdrop-blur-md lg:hidden">
            <div className="flex h-14 items-center justify-between px-4">
                <button
                    onClick={() => router.push('/')}
                    className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">Trở về</span>
                </button>

                <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity absolute left-1/2 -translate-x-1/2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-white text-sm">Hải Từ Đâu</span>
                </Link>

                {/* Empty div to balance flex spacing */}
                <div className="w-[72px]"></div>
            </div>
        </div>
    );
}
