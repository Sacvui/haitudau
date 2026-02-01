'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, TrendingUp, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Stock {
    symbol: string;
    name: string;
    exchange: string;
}

interface StockSearchProps {
    value: string;
    onChange: (symbol: string, stock?: Stock) => void;
    placeholder?: string;
}

const POPULAR_STOCKS = ['VNM', 'FPT', 'VIB', 'VCB', 'TCB', 'MWG', 'HPG', 'VIC'];

export default function StockSearch({ value, onChange, placeholder = 'VIB, VNM, FPT...' }: StockSearchProps) {
    const [query, setQuery] = useState(value);
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const searchStocks = useCallback(async (searchQuery: string) => {
        if (!searchQuery || searchQuery.length < 1) {
            setStocks([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/stock/list?search=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            if (data.success) {
                setStocks(data.data);
            }
        } catch (error) {
            console.error('Error searching stocks:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const debounce = setTimeout(() => {
            searchStocks(query);
        }, 300);
        return () => clearTimeout(debounce);
    }, [query, searchStocks]);

    const handleSelect = (stock: Stock | string) => {
        if (typeof stock === 'string') {
            setQuery(stock);
            onChange(stock);
        } else {
            setQuery(stock.symbol);
            onChange(stock.symbol, stock);
        }
        setIsOpen(false);
    };

    return (
        <div className="relative">
            {/* Input */}
            <div className="relative group h-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <Input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value.toUpperCase());
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="pl-10 pr-9 h-10 w-full bg-slate-950 border-slate-700 text-sm text-white focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 placeholder:text-slate-600"
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
                {query && !loading && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-500 hover:text-white"
                        onClick={() => {
                            setQuery('');
                            onChange('');
                        }}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Popular Stocks (Hidden in dense mode) */}
            {!query && (
                <div className="hidden"></div>
            )}

            {/* Dropdown */}
            {isOpen && stocks.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-md shadow-2xl max-h-80 overflow-y-auto ring-1 ring-black/5">
                    {stocks.map((stock) => (
                        <button
                            key={stock.symbol}
                            onClick={() => handleSelect(stock)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-800 transition-colors text-left border-b border-slate-800/50 last:border-0 group"
                        >
                            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 transition-colors">
                                <TrendingUp className="w-4 h-4 text-slate-400 group-hover:text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-white group-hover:text-indigo-300">{stock.symbol}</span>
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-slate-600 text-slate-400">
                                        {stock.exchange}
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-500 truncate group-hover:text-slate-300">{stock.name}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* No Results */}
            {isOpen && query && stocks.length === 0 && !loading && (
                <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-md shadow-2xl p-4 text-center">
                    <p className="text-sm text-slate-400">Không tìm thấy "{query}"</p>
                </div>
            )}  </div>
    );
}
