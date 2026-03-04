'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Key, Eye, EyeOff, Check, X, Sparkles, ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'user_gemini_api_key';

export function getStoredApiKey(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEY) || '';
}

export default function ApiKeySettings() {
    const [isOpen, setIsOpen] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [saved, setSaved] = useState(false);
    const [hasKey, setHasKey] = useState(false);

    useEffect(() => {
        const stored = getStoredApiKey();
        if (stored) {
            setApiKey(stored);
            setHasKey(true);
        }
    }, []);

    const handleSave = () => {
        if (apiKey.trim()) {
            localStorage.setItem(STORAGE_KEY, apiKey.trim());
            setHasKey(true);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    const handleClear = () => {
        localStorage.removeItem(STORAGE_KEY);
        setApiKey('');
        setHasKey(false);
        setSaved(false);
    };

    const maskKey = (key: string) => {
        if (key.length <= 8) return '••••••••';
        return key.slice(0, 4) + '••••••••' + key.slice(-4);
    };

    return (
        <div className="relative">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 border ${hasKey
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                    }`}
                title={hasKey ? 'AI Brain đã kích hoạt' : 'Cấu hình AI Brain'}
            >
                {hasKey ? (
                    <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">AI BRAIN</span>
                    </>
                ) : (
                    <>
                        <Settings className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">CẤU HÌNH AI</span>
                    </>
                )}
            </button>

            {/* Settings Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-[360px]">
                    <div className="relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20"></div>
                        <div className="relative bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl p-5">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="bg-indigo-500/20 p-1.5 rounded-lg">
                                        <Sparkles className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white tracking-tight">AI Brain Configuration</h3>
                                        <p className="text-[10px] text-slate-500">Kết nối bộ não phân tích của bạn</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Description */}
                            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 mb-4">
                                <p className="text-[11px] text-indigo-200/80 leading-relaxed">
                                    Nhập API Key của Google Gemini để kích hoạt phân tích chiến lược AI.
                                    Key được lưu trên trình duyệt của bạn và <span className="font-bold text-indigo-300">không bao giờ</span> gửi đến bên thứ ba.
                                </p>
                            </div>

                            {/* Input */}
                            <div className="space-y-3">
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                        <Key className="w-3.5 h-3.5 text-slate-500" />
                                    </div>
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="AIzaSy... (dán API Key tại đây)"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
                                    />
                                    <button
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                    >
                                        {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>

                                {/* Status */}
                                {hasKey && !saved && (
                                    <div className="flex items-center gap-2 text-[10px]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                        <span className="text-emerald-400 font-bold uppercase tracking-wider">Đã kích hoạt</span>
                                        <span className="text-slate-600">|</span>
                                        <span className="text-slate-500">{maskKey(apiKey)}</span>
                                    </div>
                                )}

                                {saved && (
                                    <div className="flex items-center gap-2 text-[10px]">
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span className="text-emerald-400 font-bold uppercase tracking-wider">Đã lưu thành công!</span>
                                    </div>
                                )}

                                {/* Buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSave}
                                        disabled={!apiKey.trim()}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold py-2.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        Kích hoạt AI Brain
                                    </button>
                                    {hasKey && (
                                        <button
                                            onClick={handleClear}
                                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold px-4 py-2.5 rounded-xl transition-all border border-rose-500/20"
                                        >
                                            Xóa
                                        </button>
                                    )}
                                </div>

                                {/* How to get key */}
                                <div className="pt-2 border-t border-slate-800">
                                    <a
                                        href="https://aistudio.google.com/apikey"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                                    >
                                        <Key className="w-2.5 h-2.5" />
                                        Lấy API Key miễn phí tại Google AI Studio →
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
