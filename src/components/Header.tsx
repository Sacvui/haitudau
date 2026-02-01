'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, History, ChevronDown, Menu, X, ExternalLink, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AuthModal from './AuthModal';

export default function Header() {
    const { user, loading, signOut, isConfigured } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
                <div className="container flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div className="hidden sm:block">
                            <span className="font-bold text-white">Hải Từ Đâu</span>
                            <span className="text-xs text-slate-500 block -mt-0.5">Stock Analyzer</span>
                        </div>
                    </Link>

                    {/* Center Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" asChild>
                            <Link href="/">Phân tích</Link>
                        </Button>
                        {isConfigured && (
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" asChild>
                                <Link href="/history">Lịch sử</Link>
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" asChild>
                            <a href="https://ncskit.org" target="_blank" rel="noopener noreferrer">
                                ncskit.org
                                <ExternalLink className="w-3 h-3 ml-1.5" />
                            </a>
                        </Button>
                    </nav>

                    {/* Right */}
                    <div className="flex items-center gap-3">
                        {!isConfigured && (
                            <Badge variant="outline" className="hidden sm:flex text-xs border-amber-500/30 text-amber-400 bg-amber-500/10">
                                Demo Mode
                            </Badge>
                        )}

                        {!loading && isConfigured && (
                            user ? (
                                <div className="relative">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowDropdown(!showDropdown)}
                                        className="flex items-center gap-2"
                                    >
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                            {user.email?.charAt(0).toUpperCase()}
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                    </Button>

                                    {showDropdown && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                                            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-slate-900 p-1.5 shadow-2xl z-50">
                                                <div className="px-3 py-2.5 border-b border-white/5 mb-1">
                                                    <p className="text-sm font-medium truncate text-white">{user.email}</p>
                                                </div>
                                                <Link
                                                    href="/history"
                                                    onClick={() => setShowDropdown(false)}
                                                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg text-slate-300 hover:bg-white/5 hover:text-white"
                                                >
                                                    <History className="w-4 h-4" />
                                                    Lịch sử phân tích
                                                </Link>
                                                <button
                                                    onClick={() => { signOut(); setShowDropdown(false); }}
                                                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg text-red-400 hover:bg-red-500/10"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    Đăng xuất
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <Button
                                    onClick={() => setShowAuthModal(true)}
                                    size="sm"
                                    className="hidden sm:flex bg-indigo-500 hover:bg-indigo-600 text-white"
                                >
                                    Đăng nhập
                                </Button>
                            )
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </Button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-white/5 p-4 space-y-1 bg-slate-900">
                        <Button variant="ghost" className="w-full justify-start text-slate-300" asChild>
                            <Link href="/" onClick={() => setMobileMenuOpen(false)}>Phân tích</Link>
                        </Button>
                        {isConfigured && (
                            <Button variant="ghost" className="w-full justify-start text-slate-300" asChild>
                                <Link href="/history" onClick={() => setMobileMenuOpen(false)}>Lịch sử</Link>
                            </Button>
                        )}
                        <Button variant="ghost" className="w-full justify-start text-slate-400" asChild>
                            <a href="https://ncskit.org" target="_blank">ncskit.org</a>
                        </Button>
                        {!loading && isConfigured && !user && (
                            <Button
                                onClick={() => { setShowAuthModal(true); setMobileMenuOpen(false); }}
                                className="w-full mt-3 bg-indigo-500"
                            >
                                Đăng nhập
                            </Button>
                        )}
                    </div>
                )}
            </header>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </>
    );
}
