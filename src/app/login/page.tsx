'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/glass';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Lock, Loader2, ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: loginUsername, password: loginPassword }),
            });
            const data = await res.json();

            if (data.success) {
                // Refresh the page or redirect to home so Sidebar picks up the new session
                window.location.href = '/';
            } else {
                setError(data.error || 'Đăng nhập thất bại');
            }
        } catch {
            setError('Lỗi kết nối server');
        } finally {
            setLoginLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0f1a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                <Link href="/" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Về trang chủ
                </Link>

                <GlassCard className="p-8 border-indigo-500/20 shadow-2xl shadow-indigo-500/5">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight mb-2">Đăng Nhập</h2>
                        <p className="text-sm text-slate-400">
                            Truy cập Khuyến nghị AI cấp cao & Bộ lọc chuyên sâu
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Tên Đăng Nhập</label>
                            <Input
                                value={loginUsername}
                                onChange={e => setLoginUsername(e.target.value)}
                                className="bg-slate-900/50 border-slate-800 text-white h-12 focus:border-indigo-500 transition-colors"
                                placeholder="Nhập username của bạn..."
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Mật Khẩu</label>
                            <Input
                                type="password"
                                value={loginPassword}
                                onChange={e => setLoginPassword(e.target.value)}
                                className="bg-slate-900/50 border-slate-800 text-white h-12 focus:border-indigo-500 transition-colors"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium text-center flex items-center justify-center gap-2">
                                <Shield className="w-4 h-4" /> {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-base mt-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
                            disabled={loginLoading}
                        >
                            {loginLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <Lock className="w-5 h-5 mr-2" />
                            )}
                            Đăng Nhập Ngay
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
                        <p className="text-xs text-slate-500">
                            Hệ thống bảo mật bằng mã hóa SHA-256 nội bộ.<br />
                            Liên hệ Admin (HaiLP) để được cấp tài khoản.
                        </p>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
