'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
    Settings, 
    Key, 
    ShieldCheck, 
    Lock, 
    User, 
    Sparkles, 
    Eye, 
    EyeOff, 
    Check, 
    X,
    Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const API_KEY_STORAGE = 'user_gemini_api_key';
const VAULT_PASS_STORAGE = 'user_vault_password';
const DEFAULT_VAULT_PASS = '11223344';

interface SettingsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ isOpen, onOpenChange }: SettingsDialogProps) {
    // --- API Key State ---
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);

    // --- Vault Password State ---
    const [vaultPass, setVaultPass] = useState('');
    const [newVaultPass, setNewVaultPass] = useState('');
    const [showVaultPass, setShowVaultPass] = useState(false);

    // --- User Info (Read-only for now) ---
    const [user, setUser] = useState<{ username: string; displayName?: string; role?: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Load API Key
            const storedKey = localStorage.getItem(API_KEY_STORAGE) || '';
            setApiKey(storedKey);
            setHasApiKey(!!storedKey);

            // Load Vault Password (simulation, usually we catch it from a secure store)
            const storedPass = localStorage.getItem(VAULT_PASS_STORAGE) || DEFAULT_VAULT_PASS;
            setVaultPass(storedPass);
            setNewVaultPass(storedPass);

            // Load User Info
            fetch('/api/auth/me')
                .then(r => r.json())
                .then(data => {
                    if (data.authenticated) setUser(data.user);
                })
                .catch(() => {});
        }
    }, [isOpen]);

    const handleSaveApiKey = () => {
        if (apiKey.trim()) {
            localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
            setHasApiKey(true);
            toast.success('Đã cấu hình bộ não AI thành công!');
        } else {
            localStorage.removeItem(API_KEY_STORAGE);
            setHasApiKey(false);
            toast.info('Đã xóa cấu hình AI.');
        }
    };

    const handleSaveVaultPass = () => {
        if (newVaultPass.length < 4) {
            toast.error('Mật khẩu phải có ít nhất 4 ký tự');
            return;
        }
        localStorage.setItem(VAULT_PASS_STORAGE, newVaultPass);
        setVaultPass(newVaultPass);
        toast.success('Đã cập nhật mật khẩu két sắt!');
    };

    const maskKey = (key: string) => {
        if (!key) return '';
        if (key.length <= 8) return '••••••••';
        return key.slice(0, 4) + '••••••••' + key.slice(-4);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-[#0b1121] border-slate-800 text-white p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                        <Settings className="w-5 h-5 text-indigo-400" />
                        CÀI ĐẶT HỆ THỐNG
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Quản lý cấu hình AI, bảo mật và tài khoản của bạn.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="ai" className="w-full">
                    <div className="px-6">
                        <TabsList className="grid w-full grid-cols-3 bg-slate-900/50 border border-slate-800/50 p-1">
                            <TabsTrigger value="ai" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                <Sparkles className="w-4 h-4 mr-2" />
                                AI Brain
                            </TabsTrigger>
                            <TabsTrigger value="security" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                <Shield className="w-4 h-4 mr-2" />
                                Bảo mật
                            </TabsTrigger>
                            <TabsTrigger value="account" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                <User className="w-4 h-4 mr-2" />
                                Tài khoản
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="p-6 pt-4 h-[320px] overflow-y-auto custom-scrollbar">
                        {/* 1. AI BRAIN TAB */}
                        <TabsContent value="ai" className="mt-0 space-y-4">
                            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 mb-2">
                                <p className="text-xs text-indigo-200/80 leading-relaxed">
                                    Hệ thống sử dụng mô hình <span className="text-indigo-400 font-bold">Gemini 2.5 Flash</span> để phân tích dữ liệu Whale và T+0. 
                                    Vui lòng nhập API Key để kích hoạt các tính năng AI chuyên sâu.
                                </p>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Google Gemini API Key</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input
                                        type={showApiKey ? 'text' : 'password'}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="AIzaSy..."
                                        className="bg-slate-900/50 border-slate-800 pl-10 pr-10 focus:border-indigo-500"
                                    />
                                    <button
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                    >
                                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {hasApiKey && (
                                    <p className="text-[10px] text-emerald-400 font-medium">
                                        ● Đã kích hoạt API: {maskKey(apiKey)}
                                    </p>
                                )}
                            </div>

                            <div className="pt-2">
                                <Button onClick={handleSaveApiKey} className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold">
                                    Lưu cấu hình AI
                                </Button>
                                <a
                                    href="https://aistudio.google.com/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block mt-3 text-[10px] text-center text-indigo-400 hover:underline"
                                >
                                    Lấy API Key miễn phí tại Google AI Studio →
                                </a>
                            </div>
                        </TabsContent>

                        {/* 2. SECURITY TAB */}
                        <TabsContent value="security" className="mt-0 space-y-4">
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 mb-2">
                                <p className="text-xs text-emerald-200/80 leading-relaxed">
                                    Mật khẩu két sắt dùng để truy cập trang <span className="text-emerald-400 font-bold">Private Portfolio</span>. 
                                    Mật khẩu mặc định là <code className="bg-emerald-500/20 px-1 rounded">11223344</code>.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mật khẩu Két Sắt mới</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <Input
                                            type={showVaultPass ? 'text' : 'password'}
                                            value={newVaultPass}
                                            onChange={(e) => setNewVaultPass(e.target.value)}
                                            placeholder="Nhập mật khẩu mới"
                                            className="bg-slate-900/50 border-slate-800 pl-10 pr-10 focus:border-emerald-500"
                                        />
                                        <button
                                            onClick={() => setShowVaultPass(!showVaultPass)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                        >
                                            {showVaultPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                
                                <Button onClick={handleSaveVaultPass} className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold">
                                    Cập nhật mật khẩu
                                </Button>
                            </div>
                        </TabsContent>

                        {/* 3. ACCOUNT TAB */}
                        <TabsContent value="account" className="mt-0 space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-slate-900/40 border border-slate-800 rounded-2xl">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[3px]">
                                    <div className="w-full h-full rounded-full bg-[#0b1121] flex items-center justify-center">
                                        <span className="text-2xl font-bold">{user?.username?.[0]?.toUpperCase() || 'G'}</span>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-white leading-tight">{user?.displayName || user?.username || 'Guest'}</h4>
                                    <p className="text-xs text-slate-500">Vai trò: <span className="text-indigo-400 font-bold uppercase">{user?.role || 'user'}</span></p>
                                    <p className="text-[10px] text-emerald-400 mt-1">● Tài khoản đã xác thực</p>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between items-center p-3 bg-slate-900/30 rounded-xl border border-dotted border-slate-800">
                                    <span className="text-xs text-slate-400">Trạng thái hệ thống</span>
                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-900/30 rounded-xl border border-dotted border-slate-800">
                                    <span className="text-xs text-slate-400">Phiên bản Ứng dụng</span>
                                    <span className="text-[10px] text-slate-500 font-mono">v4.2.0-stable</span>
                                </div>
                            </div>
                        </TabsContent>
                    </div>

                    <div className="p-6 pt-0 flex justify-between items-center bg-slate-900/20 border-t border-slate-800/50 mt-4">
                        <p className="text-[10px] text-slate-600">© 2026 BTCK VN Stock Analyzer. All rights reserved.</p>
                        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs hover:bg-slate-800 text-slate-400">
                            Đóng
                        </Button>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
