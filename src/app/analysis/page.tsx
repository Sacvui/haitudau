'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, Plus, X, Search, Coins } from 'lucide-react';
import { toast } from 'sonner';

// Define VN30 list if not available
const STOCK_LIST = [
    "ACB", "BCM", "BID", "BVH", "CTG", "FPT", "GAS", "GVR", "HDB", "HPG",
    "MBB", "MSN", "MWG", "PLX", "POW", "SAB", "SHB", "SSB", "SSI", "STB",
    "TCB", "TPB", "VCB", "VHM", "VIB", "VIC", "VJC", "VNM", "VPB", "VRE"
];

interface StockHistory {
    symbol: string;
    data: { date: string; close: number; dividends?: any[] }[];
    color: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function AnalysisPage() {
    const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['VNM', 'VIB']);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [timeRange, setTimeRange] = useState(12); // Months
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Add Symbol
    const addSymbol = (symbol: string) => {
        if (selectedSymbols.includes(symbol)) return;
        if (selectedSymbols.length >= 5) {
            toast.error("Chỉ so sánh tối đa 5 mã thôi sếp ơi!");
            return;
        }
        setSelectedSymbols([...selectedSymbols, symbol]);
    };

    // Remove Symbol
    const removeSymbol = (symbol: string) => {
        setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
    };

    // Fetch & Normalize Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Calculate Start Date
                const endDate = new Date();
                const startDate = new Date();
                startDate.setMonth(startDate.getMonth() - timeRange);

                const formatDate = (d: Date) => d.toISOString().split('T')[0];

                // Fetch all concurrently
                const promises = selectedSymbols.map(async (sym) => {
                    const res = await fetch(`/api/stock/history?symbol=${sym}&startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`);
                    const json = await res.json();

                    // Fetch dividends too
                    const divRes = await fetch(`/api/stock/dividends?symbol=${sym}`);
                    const divJson = await divRes.json();
                    const dividends = divJson.success ? divJson.data : [];

                    return {
                        symbol: sym,
                        history: json.success ? json.data : [],
                        dividends: dividends || []
                    };
                });

                const results = await Promise.all(promises);

                // Process Data: Merge by Date & Normalize
                // 1. Collect all unique dates
                const allDates = new Set<string>();
                results.forEach(r => r.history.forEach((h: any) => allDates.add(h.date)));
                const sortedDates = Array.from(allDates).sort();

                // 2. Build Chart Data Points
                const processedData = sortedDates.map(date => {
                    const point: any = { date };

                    results.forEach((stock, idx) => {
                        // Find price at this date
                        const pricePoint = stock.history.find((h: any) => h.date === date);

                        if (pricePoint) {
                            // Normalized Logic: (Current / Start) * 100 ? 
                            // Or just Raw Price? User requested "Normalized to see trends together"
                            // Let's implement Normalized Percentage (Starting at 0% or 100)

                            // Find Start Price (First valid price in range)
                            const startPrice = stock.history[0]?.close || 1;
                            const normalized = ((pricePoint.close - startPrice) / startPrice) * 100;

                            point[stock.symbol] = normalized;
                            point[`${stock.symbol}_price`] = pricePoint.close; // Keep raw for tooltip

                            // Check Dividends
                            // Map dividend exDate to this date? Or closest?
                            const hasDividend = stock.dividends.find((d: any) => d.exDate === date || d.date === date);
                            if (hasDividend) {
                                point[`${stock.symbol}_div`] = hasDividend;
                            }
                        }
                    });

                    return point;
                });

                setChartData(processedData);

            } catch (err) {
                console.error(err);
                toast.error("Lỗi lấy dữ liệu");
            } finally {
                setLoading(false);
            }
        };

        if (selectedSymbols.length > 0) {
            fetchData();
        }
    }, [selectedSymbols, timeRange]);

    // Custom Tooltip
    // Show Dividend info if hovered
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs">
                    <p className="font-bold text-slate-300 mb-2">{format(new Date(label), 'dd/MM/yyyy')}</p>
                    {payload.map((p: any, idx: number) => {
                        const symbol = p.dataKey;
                        const price = p.payload[`${symbol}_price`];
                        const div = p.payload[`${symbol}_div`];

                        return (
                            <div key={symbol} className="flex flex-col mb-1.5 last:mb-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                                    <span className="font-bold text-slate-100">{symbol}</span>:
                                    <span className={Number(p.value) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                        {Number(p.value) > 0 ? '+' : ''}{Number(p.value).toFixed(2)}%
                                    </span>
                                    <span className="text-slate-500">({(price / 1000).toFixed(1)}k)</span>
                                </div>
                                {div && (
                                    <div className="pl-4 mt-0.5 text-[10px] text-amber-400 flex items-center gap-1">
                                        <Coins className="w-3 h-3" />
                                        {div.type === 'stock' ? `Thưởng CP: ${(div.value * 100).toFixed(0)}%` : `Tiền: ${div.value}đ`}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    // Custom Dot for Dividends
    const CustomizedDot = (props: any) => {
        const { cx, cy, payload, dataKey } = props;
        const symbol = dataKey; // dataKey is just 'VNM', 'VIB' etc
        const div = payload[`${symbol}_div`];

        if (div) {
            return (
                <g transform={`translate(${cx},${cy})`}>
                    <circle r="6" fill="#fbbf24" stroke="#fff" strokeWidth="1" />
                    <text x="0" y="3" textAnchor="middle" fontSize="8" fill="#000" fontWeight="bold">$</text>
                </g>
            );
        }
        return null; // No dot usually, or <circle r="0" />
    };

    return (
        <div className="min-h-screen bg-[#0b1121] p-6 pb-20">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            <TrendingUp className="w-8 h-8 text-indigo-500" />
                            Phân Tích Tương Quan
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">So sánh hiệu suất & cổ tức (Quy về % tăng trưởng)</p>
                    </div>

                    {/* Time Range */}
                    <div className="flex bg-slate-800/50 p-1 rounded-lg">
                        {[6, 12, 36, 60].map(m => (
                            <button
                                key={m}
                                onClick={() => setTimeRange(m)}
                                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${timeRange === m
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {m < 12 ? `${m} Tháng` : `${m / 12} Năm`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stock Selector */}
                <GlassCard className="p-4 flex flex-wrap gap-2 items-center min-h-[80px]">
                    {selectedSymbols.map((sym, idx) => (
                        <div key={sym} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 shadow-sm animate-in zoom-in duration-200">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <span className="font-bold text-white uppercase">{sym}</span>
                            <button onClick={() => removeSymbol(sym)} className="text-slate-500 hover:text-rose-400">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}

                    {/* Add Button Dropdown (Clickable) */}
                    <div className="relative">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="rounded-full border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-white/20"
                        >
                            <Plus className="w-4 h-4 mr-1" /> Thêm Mã
                        </Button>

                        {isDropdownOpen && (
                            <>
                                {/* Overlay to close */}
                                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />

                                {/* Dropdown Content */}
                                <div className="absolute top-full left-0 mt-2 w-64 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in zoom-in-95 duration-100">
                                    <div className="mb-2 px-1">
                                        <div className="flex items-center bg-slate-800 rounded px-2 py-1">
                                            <Search className="w-3 h-3 text-slate-500 mr-2" />
                                            <input
                                                className="bg-transparent border-none text-xs text-white w-full outline-none placeholder-slate-600"
                                                placeholder="Tìm kiếm..."
                                                autoFocus
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                                        {STOCK_LIST
                                            .filter(s => !selectedSymbols.includes(s))
                                            .filter(s => s.includes(searchTerm))
                                            .map(s => (
                                                <button
                                                    key={s}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        addSymbol(s);
                                                        setIsDropdownOpen(false);
                                                        setSearchTerm('');
                                                        toast.success(`Đang tải dữ liệu ${s}...`);
                                                    }}
                                                    className="text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 p-2 rounded text-center transition-colors cursor-pointer active:scale-95 bg-slate-800/50"
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </GlassCard>

                {/* Main Chart */}
                <GlassCard className="p-2 md:p-6 h-[500px] relative">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10 rounded-xl">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                tickFormatter={(d) => format(new Date(d), timeRange > 12 ? 'MM/yy' : 'dd/MM')}
                                minTickGap={30}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />

                            {selectedSymbols.map((sym, idx) => (
                                <Line
                                    key={sym}
                                    type="monotone"
                                    dataKey={sym}
                                    name={sym}
                                    stroke={COLORS[idx % COLORS.length]}
                                    strokeWidth={3}
                                    dot={<CustomizedDot />} // Use custom dot for dividends
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </GlassCard>

                {/* Guide */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-500">
                    <div className="flex gap-2">
                        <span className="text-yellow-400 font-bold text-lg leading-none">●</span>
                        <p>Các điểm icon màu vàng ($) trên đường biểu đồ đánh dấu thời điểm trả cổ tức (tiền mặt hoặc cổ phiếu).</p>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-indigo-400 font-bold text-lg leading-none">📈</span>
                        <p>Biểu đồ hiển thị % Tăng/Giảm so với điểm bắt đầu của chu kỳ, giúp so sánh hiệu suất thực tế giữa các mã có thị giá khác nhau.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
