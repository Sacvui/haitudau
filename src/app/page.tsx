'use client';

import React, { useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ControlBar } from '@/components/dashboard/ControlBar';
import { KpiGrid } from '@/components/dashboard/KpiGrid';
import { ComparisonGrid } from '@/components/dashboard/ComparisonGrid';
import { DividendTable } from '@/components/dashboard/DividendTable';
import { TransactionTimeline } from '@/components/dashboard/TransactionTimeline';
import { YearlyDetailTable } from '@/components/dashboard/YearlyDetailTable';
import { NAVChart } from '@/components/dashboard/NAVChart';
import { PriceChart, YearlyPerformanceChart, DividendBreakdown } from '@/components/Charts';
import { GlassCard } from '@/components/ui/glass';
import { calculateInvestment } from '@/lib/investment-calculator';
import { Menu, Search, Bell, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DividendEvent {
  date: string;
  type: 'cash' | 'stock';
  value: number;
  description?: string;
}

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

interface InvestmentResult {
  symbol: string;
  currentValue: number;
  totalInvested: number;
  totalShares: number;
  currentPrice: number;
  absoluteReturn: number;
  percentageReturn: number;
  annualizedReturn: number;
  dividendsCashReceived: number;
  dividendsReinvested: number;
  dividendsStockReceived: number;
  timeline: TimelineEvent[];
  monthlyPerformance: unknown[];
  yearlyPerformance: { year: number; return: number; dividends: number }[];
}

interface PriceDataPoint {
  date: string;
  close: number;
  savingsValue: number;
  compareClose?: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvestmentResult | null>(null);
  const [compareResult, setCompareResult] = useState<InvestmentResult | null>(null);
  const [priceData, setPriceData] = useState<PriceDataPoint[]>([]);
  const [navData, setNavData] = useState<{ date: string; portfolioValue: number; totalCost: number; savingsValue: number }[]>([]);
  const [dividendData, setDividendData] = useState<DividendEvent[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [formData, setFormData] = useState({
    symbol: '',
    compareSymbol: '', // NEW: comparison symbol
    startDate: '2020-01-01',
    endDate: new Date().toISOString().split('T')[0], // Today
    initialAmount: 100000000,
    monthlyInvestment: 0,
    reinvestDividends: true,
  });

  // Helper function to analyze a single stock
  const analyzeStock = async (symbol: string): Promise<{ result: InvestmentResult; prices: PriceDataPoint[], dividends: DividendEvent[] } | null> => {
    const priceRes = await fetch(`/api/stock/history?symbol=${symbol}&startDate=${formData.startDate}&endDate=${formData.endDate}`);
    const priceJson = await priceRes.json();

    if (!priceJson.success || !priceJson.data.length) return null;
    const prices = priceJson.data;

    const divRes = await fetch(`/api/stock/dividends?symbol=${symbol}`);
    const divJson = await divRes.json();
    const dividends = divJson.success ? divJson.data : [];

    const formattedDividends = dividends.map((d: any) => ({
      ...d,
      description: d.description || "Cổ tức",
      date: d.exDate // Map exDate to date for Table component
    })); // Keep exDate for calculation logic if needed

    const investmentResult = calculateInvestment(
      { ...formData, symbol },
      prices,
      formattedDividends.map((d: any) => ({ ...d, exDate: d.exDate || d.date })) // Ensure exDate exists for calculator
    );

    return { result: { ...investmentResult, symbol } as InvestmentResult, prices, dividends: formattedDividends };
  };

  const handleAnalyze = useCallback(async () => {
    if (!formData.symbol) return;
    setLoading(true);
    setResult(null);
    setCompareResult(null);

    try {
      // 1. Analyze primary stock
      const primaryData = await analyzeStock(formData.symbol);
      if (!primaryData) throw new Error("No data for primary stock");

      // 2. Benchmark Savings Logic (6.5%/year)
      const monthlyRate = 0.065 / 12;
      let savingsBalance = formData.initialAmount;
      const monthlyDCA = formData.monthlyInvestment || 0;

      let mergedData = primaryData.prices.map((p: PriceDataPoint, idx: number) => {
        if (idx > 0 && idx % 22 === 0) {
          savingsBalance = savingsBalance * (1 + monthlyRate) + monthlyDCA;
        }
        return { ...p, savingsValue: savingsBalance };
      });

      // 3. Analyze comparison stock if provided
      if (formData.compareSymbol && formData.compareSymbol !== formData.symbol) {
        const compareData = await analyzeStock(formData.compareSymbol);
        if (compareData) {
          setCompareResult(compareData.result);

          // Merge compare prices into primary data
          const compareMap = new Map(compareData.prices.map((p: PriceDataPoint) => [p.date, p.close]));
          mergedData = mergedData.map((p: PriceDataPoint) => ({
            ...p,
            compareClose: compareMap.get(p.date) ?? undefined,
          }));
        }
      }

      setPriceData(mergedData);
      setResult(primaryData.result);
      setDividendData(primaryData.dividends);

      // Generate NAV data from timeline for portfolio value chart
      const timeline = primaryData.result.timeline || [];
      if (timeline.length > 0) {
        const monthlyRate = 0.065 / 12;
        let savingsBalance = formData.initialAmount;
        let totalCost = formData.initialAmount;

        const navPoints = timeline
          .filter((e: TimelineEvent) => e.portfolioValue > 0)
          .map((e: TimelineEvent, idx: number) => {
            // Update savings benchmark
            if (idx > 0 && idx % 22 === 0) {
              savingsBalance = savingsBalance * (1 + monthlyRate);
            }
            if (e.type === 'buy' || e.type === 'deposit') {
              totalCost += e.shares * e.pricePerShare;
              savingsBalance += e.shares * e.pricePerShare;
            }
            return {
              date: e.date,
              portfolioValue: e.portfolioValue,
              totalCost,
              savingsValue: savingsBalance,
            };
          });
        setNavData(navPoints);
      }

      console.log('Timeline data:', primaryData.result.timeline?.length, 'events');

    } catch (e) {
      console.error(e);
      alert("Không thể lấy dữ liệu. Vui lòng thử lại với mã khác (VD: FPT, VNM, HPG).");
    } finally {
      setLoading(false);
    }
  }, [formData]);

  return (
    <div className="flex h-screen w-full bg-[#030712] overflow-hidden font-sans text-slate-100 selection:bg-indigo-500/30">

      {/* GALAXY BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[120px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-900/10 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      {/* --- SIDEBAR --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[280px] bg-[#0b1121]/90 backdrop-blur-xl border-r border-white/5 transition-transform duration-300 ease-in-out shadow-2xl
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:static lg:translate-x-0
      `}>
        <Sidebar className="h-full w-full bg-transparent border-none shadow-none" />
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* --- MAIN CONTENT SHELL --- */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative z-10">

        {/* 1. Header */}
        <header className="h-16 flex-none bg-[#0b1121]/60 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden text-slate-400 hover:bg-white/5" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Market Dashboard
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-1.5 w-72 focus-within:bg-white/10 focus-within:border-indigo-500/50 transition-all">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <input className="bg-transparent border-none outline-none text-xs text-white w-full placeholder-slate-500 font-medium" placeholder="Tìm kiếm thị trường..." />
            </div>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/5 rounded-full">
              <Bell className="w-5 h-5" />
            </Button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 p-[1.5px] shadow-lg shadow-indigo-500/20 cursor-pointer hover:scale-105 transition-transform">
              <div className="h-full w-full rounded-full bg-[#0b1121] flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </header>

        {/* 2. Control Bar (Sticky) */}
        <div className="flex-none z-10 relative">
          <ControlBar
            formData={formData}
            setFormData={setFormData}
            onAnalyze={handleAnalyze}
            loading={loading}
          />
        </div>

        {/* 3. Workspace (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 scroll-smooth custom-scrollbar">
          <div className="max-w-[1920px] mx-auto space-y-6">

            {/* KPI Section - Hiển thị mã chính, có nhãn nếu đang so sánh */}
            {result && (
              <div className="relative">
                {compareResult && (
                  <div className="absolute -top-2 left-4 z-10 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {result.symbol} (Mã chính)
                  </div>
                )}
                <KpiGrid data={result} />
              </div>
            )}

            {/* Comparison Section - NEW */}
            {result && compareResult && (
              <ComparisonGrid primaryResult={result} compareResult={compareResult} />
            )}

            {/* Charts Area */}
            {result ? (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 pb-6">
                  {/* Main NAV Chart */}
                  <div className="xl:col-span-8">
                    <NAVChart
                      data={navData}
                      height={420}
                      symbol={result.symbol}
                    />
                  </div>

                  {/* Side Charts */}
                  <div className="xl:col-span-4 space-y-4">
                    {/* Dividend Breakdown Pie */}
                    <DividendBreakdown
                      cashDividends={result.dividendsCashReceived}
                      stockDividends={result.dividendsStockReceived}
                      reinvested={result.dividendsReinvested}
                    />

                    {/* Yearly Performance Bar */}
                    <div className="h-[180px]">
                      <YearlyPerformanceChart data={result.yearlyPerformance} height={160} />
                    </div>

                    {/* Dividend Table History */}
                    <DividendTable dividends={dividendData} symbol={result.symbol} />
                  </div>
                </div>

                {/* Yearly Detail Table - Full Width */}
                <div className="pb-10">
                  <YearlyDetailTable
                    timeline={result.timeline}
                    compareTimeline={compareResult?.timeline}
                    symbol={result.symbol}
                    compareSymbol={compareResult?.symbol}
                    initialInvestment={formData.initialAmount}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-1000">
                <div className="relative group cursor-default">
                  <div className="absolute inset-0 bg-indigo-500/30 blur-[100px] rounded-full group-hover:bg-indigo-500/40 transition-all duration-1000" />
                  <h1 className="relative text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-600 tracking-tighter select-none drop-shadow-2xl">
                    HẢI TỪ ĐÂU
                  </h1>
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50 blur-sm"></div>
                </div>
                <p className="text-slate-400 max-w-lg mx-auto text-base md:text-lg font-light leading-relaxed">
                  Hệ thống mô phỏng đầu tư chứng khoán cao cấp. <br />
                  <span className="text-indigo-400 font-medium">Data Realtime</span> • <span className="text-emerald-400 font-medium">Phân tích Kỹ thuật</span> • <span className="text-amber-400 font-medium">Lãi kép</span>
                </p>

                <div className="mt-8 flex gap-4">
                  <div className="px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur text-xs font-mono text-slate-400">
                    VNDIRECT Connected
                  </div>
                  <div className="px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur text-xs font-mono text-slate-400">
                    SSI iBoard Ready
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </main >
    </div >
  );
}
