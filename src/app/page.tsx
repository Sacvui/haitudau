'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';
import {
  Search, Calculator, Filter, TrendingUp, Target, Lock,
  ArrowRight, Sparkles, BarChart3, Calendar, Wallet,
  Menu, Coins, Gift, ChevronRight, Loader2
} from 'lucide-react';
import dividendsData from '@/data/dividends.json';

interface DividendEvent {
  symbol: string;
  exDate: string;
  type: 'cash' | 'stock';
  value: number;
  description: string;
}

const FEATURE_CARDS = [
  {
    href: '/valuation',
    icon: Calculator,
    title: 'Định Giá Cổ Phiếu',
    desc: '4 phương pháp + Reverse DCF + P/E Band',
    color: 'from-indigo-500 to-purple-600',
    badge: '3 Tabs',
  },
  {
    href: '/screener',
    icon: Filter,
    title: 'Bộ Lọc Cổ Phiếu',
    desc: 'Lọc cổ tức cao, lịch chia cổ tức sắp tới',
    color: 'from-cyan-500 to-blue-600',
    badge: 'Live Data',
  },
  {
    href: '/wealth-journey',
    icon: TrendingUp,
    title: 'Hành Trình Tích Sản',
    desc: 'Monte Carlo, so sánh NAV 2 mã & biểu đồ lãi kép',
    color: 'from-emerald-500 to-teal-600',
    badge: 'Simulator',
  },
  {
    href: '/planner',
    icon: Target,
    title: 'Mục Tiêu Đầu Tư',
    desc: 'Lập kế hoạch hưu trí & dòng tiền tự do',
    color: 'from-amber-500 to-orange-600',
    badge: 'Planner',
  },
  {
    href: '/analysis',
    icon: BarChart3,
    title: 'Phân Tích "Hải"',
    desc: 'Nhận định chuyên sâu & biểu đồ kỹ thuật',
    color: 'from-rose-500 to-pink-600',
    badge: 'Expert',
  },
  {
    href: '/portfolio',
    icon: Lock,
    title: 'Két Sắt (Private)',
    desc: 'Quản lý danh mục cá nhân & lịch sử mô phỏng',
    color: 'from-slate-500 to-slate-700',
    badge: 'Secure',
  },
];

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchSymbol, setSearchSymbol] = useState('');
  const [upcomingDividends, setUpcomingDividends] = useState<DividendEvent[]>([]);

  useEffect(() => {
    // Parse upcoming dividends from local JSON
    const now = new Date();
    const allEvents: DividendEvent[] = Object.entries(dividendsData).flatMap(([symbol, events]) =>
      (events as any[]).map(e => ({
        symbol,
        exDate: e.exDate,
        type: e.type as 'cash' | 'stock',
        value: e.value,
        description: e.description || '',
      }))
    );
    const upcoming = allEvents
      .filter(e => new Date(e.exDate) >= now)
      .sort((a, b) => new Date(a.exDate).getTime() - new Date(b.exDate).getTime())
      .slice(0, 8);
    setUpcomingDividends(upcoming);
  }, []);

  const handleSearch = () => {
    if (searchSymbol.trim()) {
      window.location.href = `/valuation?symbol=${searchSymbol.trim().toUpperCase()}`;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#030712] overflow-hidden font-sans text-slate-100">
      {/* Mobile menu */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden fixed top-16 left-4 z-50 p-2 bg-slate-800 rounded-lg">
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-40 h-full w-64 transition-transform duration-300`}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">

          {/* Hero Header */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-500/10 p-8 md:p-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 blur-3xl rounded-full pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Hải Từ Đâu • Phân Tích Đầu Tư</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
                Tổng Quan Thị Trường
              </h1>
              <p className="text-slate-400 max-w-xl text-sm md:text-base leading-relaxed">
                Bộ công cụ chuyên nghiệp giúp bạn <strong className="text-white">tìm kiếm</strong>, <strong className="text-white">định giá</strong>, và <strong className="text-white">mô phỏng</strong> chiến lược đầu tư cổ phiếu Việt Nam.
              </p>

              {/* Search Bar */}
              <div className="mt-6 flex gap-2 max-w-lg">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={searchSymbol}
                    onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Nhập mã CK để định giá ngay (VD: FPT, VCB...)"
                    className="w-full pl-12 pr-4 py-4 bg-slate-900/80 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none text-sm backdrop-blur-sm"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Calculator className="w-4 h-4" />
                  <span className="hidden sm:inline">Định Giá</span>
                </button>
              </div>
            </div>
          </div>

          {/* Feature Cards Grid */}
          <div>
            <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-indigo-400" />
              Công Cụ Đầu Tư
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURE_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="group relative bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-600/80 transition-all duration-300 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color} shadow-lg`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-800/80 px-2 py-1 rounded-full">
                        {card.badge}
                      </span>
                    </div>
                    <h3 className="font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">{card.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{card.desc}</p>
                    <ArrowRight className="w-4 h-4 text-slate-600 absolute bottom-5 right-5 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Upcoming Dividends */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                Lịch Cổ Tức Sắp Tới
              </h2>
              <Link href="/screener" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                Xem tất cả <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {upcomingDividends.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {upcomingDividends.map((event, i) => (
                  <Link
                    key={`${event.symbol}-${event.exDate}-${i}`}
                    href={`/valuation?symbol=${event.symbol}`}
                    className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 hover:border-slate-600/60 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-md ${event.type === 'cash' ? 'bg-amber-500/10 text-amber-400' : 'bg-purple-500/10 text-purple-400'}`}>
                          {event.type === 'cash' ? <Coins className="w-3.5 h-3.5" /> : <Gift className="w-3.5 h-3.5" />}
                        </div>
                        <span className="font-bold text-white text-sm">{event.symbol}</span>
                      </div>
                      <span className={`text-xs font-mono font-bold ${event.type === 'cash' ? 'text-amber-400' : 'text-purple-400'}`}>
                        {event.type === 'cash' ? `${event.value.toLocaleString()}đ` : `${event.value}%`}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Ex-Date: {new Date(event.exDate).toLocaleDateString('vi-VN')}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-8 text-center">
                <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Không có lịch cổ tức sắp tới</p>
              </div>
            )}
          </div>

          {/* Quick Tips */}
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-indigo-300 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Bạn mới? Bắt đầu từ đây
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-indigo-200/70">
              <div className="flex gap-2">
                <span className="text-indigo-400 font-black text-lg">1</span>
                <p className="leading-relaxed">Nhập mã cổ phiếu ở ô tìm kiếm phía trên để <strong className="text-white">xem giá trị nội tại</strong> ngay lập tức.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-indigo-400 font-black text-lg">2</span>
                <p className="leading-relaxed">Dùng <strong className="text-white">Bộ Lọc Cổ Phiếu</strong> để tìm mã có cổ tức cao và biên an toàn lớn.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-indigo-400 font-black text-lg">3</span>
                <p className="leading-relaxed">Chạy <strong className="text-white">Mô Phỏng Monte Carlo</strong> để xem 10 năm tích sản sẽ ra sao.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
