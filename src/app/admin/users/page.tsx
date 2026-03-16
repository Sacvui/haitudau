'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '@/components/ui/glass';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Users, Plus, Trash2, Edit, Shield, ShieldCheck, Lock,
    ArrowLeft, Loader2, CheckCircle, X, Eye, EyeOff
} from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

interface UserInfo {
    id: string;
    username: string;
    role: 'admin' | 'user';
    permissions: { vn100: boolean; top20: boolean };
    displayName: string;
    createdAt: string;
}

export default function AdminUsersPage() {
    const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Login state (if not authenticated)
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    // Create user modal
    const [showCreate, setShowCreate] = useState(false);
    const [newUser, setNewUser] = useState({
        username: '', password: '', displayName: '',
        role: 'user' as 'admin' | 'user',
        vn100: false, top20: false,
    });
    const [showPassword, setShowPassword] = useState(false);

    const checkSession = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            if (data.authenticated && data.user?.role === 'admin') {
                setCurrentUser(data.user);
                await fetchUsers();
            }
        } catch {
            // Not logged in
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/auth/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
            }
        } catch {
            setError('Không thể tải danh sách users');
        }
    };

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
            if (data.success && data.user?.role === 'admin') {
                setCurrentUser(data.user);
                await fetchUsers();
            } else if (data.success) {
                setError('Tài khoản này không có quyền admin!');
            } else {
                setError(data.error || 'Đăng nhập thất bại');
            }
        } catch {
            setError('Lỗi kết nối server');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch('/api/auth/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: newUser.username,
                    password: newUser.password,
                    displayName: newUser.displayName || newUser.username,
                    role: newUser.role,
                    permissions: { vn100: newUser.vn100, top20: newUser.top20 },
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(`Đã tạo user "${newUser.username}" thành công!`);
                setShowCreate(false);
                setNewUser({ username: '', password: '', displayName: '', role: 'user', vn100: false, top20: false });
                await fetchUsers();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.error || 'Tạo user thất bại');
            }
        } catch {
            setError('Lỗi kết nối server');
        }
    };

    const handleTogglePermission = async (userId: string, perm: 'vn100' | 'top20', currentValue: boolean) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;
        try {
            const res = await fetch('/api/auth/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    permissions: { ...user.permissions, [perm]: !currentValue },
                }),
            });
            if (res.ok) {
                await fetchUsers();
            }
        } catch {
            setError('Lỗi cập nhật quyền');
        }
    };

    const handleDeleteUser = async (userId: string, username: string) => {
        if (!confirm(`Bạn chắc chắn muốn xóa user "${username}"?`)) return;
        try {
            const res = await fetch('/api/auth/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(`Đã xóa user "${username}"`);
                await fetchUsers();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.error || 'Xóa thất bại');
            }
        } catch {
            setError('Lỗi kết nối server');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    // Not logged in as admin → show login
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
                <GlassCard className="w-full max-w-md p-6 border-indigo-500/20">
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-3">
                            <Shield className="w-6 h-6 text-indigo-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Quản Trị Viên</h2>
                        <p className="text-sm text-slate-400">Đăng nhập bằng tài khoản Admin</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Username</label>
                            <Input value={loginUsername} onChange={e => setLoginUsername(e.target.value)}
                                className="bg-slate-900/50 border-slate-700 text-white h-11" placeholder="Admin username" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Password</label>
                            <Input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                                className="bg-slate-900/50 border-slate-700 text-white h-11" placeholder="Password" required />
                        </div>
                        {error && <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center">{error}</div>}
                        <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold" disabled={loginLoading}>
                            {loginLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                            ĐĂNG NHẬP
                        </Button>
                    </form>
                    <div className="mt-4 text-center">
                        <Link href="/" className="text-xs text-slate-500 hover:text-slate-300">← Về trang chủ</Link>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0f1a] p-4 md:p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link href="/"><Logo /></Link>
                    <Link href="/">
                        <Button variant="ghost" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Về Trang Chủ
                        </Button>
                    </Link>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Users className="w-7 h-7 text-indigo-400" />
                            Quản Lý Thành Viên
                        </h1>
                        <p className="text-slate-400 mt-1">Xin chào, {currentUser.displayName} (Admin)</p>
                    </div>
                    <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                        <Plus className="w-4 h-4 mr-2" /> Tạo User Mới
                    </Button>
                </div>

                {/* Messages */}
                {success && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> {success}
                    </div>
                )}
                {error && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>
                )}

                {/* Users Table */}
                <GlassCard className="overflow-hidden">
                    <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Danh Sách Thành Viên ({users.length})</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase">#</th>
                                    <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase">Username</th>
                                    <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase">Tên Hiển Thị</th>
                                    <th className="p-3 text-center text-xs font-bold text-slate-400 uppercase">Role</th>
                                    <th className="p-3 text-center text-xs font-bold text-slate-400 uppercase">VN100</th>
                                    <th className="p-3 text-center text-xs font-bold text-slate-400 uppercase">Top 20</th>
                                    <th className="p-3 text-center text-xs font-bold text-slate-400 uppercase">Ngày Tạo</th>
                                    <th className="p-3 text-center text-xs font-bold text-slate-400 uppercase">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {users.map((user, idx) => (
                                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-3 text-slate-500">{idx + 1}</td>
                                        <td className="p-3 font-bold text-white">{user.username}</td>
                                        <td className="p-3 text-slate-300">{user.displayName}</td>
                                        <td className="p-3 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${user.role === 'admin'
                                                ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                                                : 'bg-slate-500/20 text-slate-400 border-slate-500/50'}`}>
                                                {user.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                                                {user.role === 'admin' ? 'Admin' : 'User'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => handleTogglePermission(user.id, 'vn100', user.permissions.vn100)}
                                                className={`px-3 py-1 rounded text-xs font-bold border transition-all ${user.permissions.vn100
                                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30'
                                                    : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:bg-slate-700/50'}`}
                                            >
                                                {user.permissions.vn100 ? '✓ ON' : '✗ OFF'}
                                            </button>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => handleTogglePermission(user.id, 'top20', user.permissions.top20)}
                                                className={`px-3 py-1 rounded text-xs font-bold border transition-all ${user.permissions.top20
                                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30'
                                                    : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:bg-slate-700/50'}`}
                                            >
                                                {user.permissions.top20 ? '✓ ON' : '✗ OFF'}
                                            </button>
                                        </td>
                                        <td className="p-3 text-center text-slate-500 text-xs">
                                            {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="p-3 text-center">
                                            {user.id !== currentUser.id && (
                                                <Button size="sm" variant="ghost"
                                                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                                    onClick={() => handleDeleteUser(user.id, user.username)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                {/* Create User Modal */}
                {showCreate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f1a]/80 backdrop-blur-sm p-4 animate-in fade-in">
                        <GlassCard className="w-full max-w-md p-6 relative border-emerald-500/20">
                            <button onClick={() => setShowCreate(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>

                            <div className="text-center mb-6">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                                    <Plus className="w-6 h-6 text-emerald-400" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Tạo Thành Viên Mới</h2>
                            </div>

                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Tên Đăng Nhập *</label>
                                    <Input value={newUser.username} onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))}
                                        className="bg-slate-900/50 border-slate-700 text-white h-10" required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Mật Khẩu *</label>
                                    <div className="relative">
                                        <Input type={showPassword ? 'text' : 'password'}
                                            value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                                            className="bg-slate-900/50 border-slate-700 text-white h-10 pr-10" required />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Tên Hiển Thị</label>
                                    <Input value={newUser.displayName} onChange={e => setNewUser(u => ({ ...u, displayName: e.target.value }))}
                                        className="bg-slate-900/50 border-slate-700 text-white h-10" placeholder="(mặc định = Username)" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Vai Trò</label>
                                    <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value as 'admin' | 'user' }))}
                                        className="w-full h-10 rounded-md bg-slate-900/50 border border-slate-700 text-white px-3">
                                        <option value="user">User (Thành viên)</option>
                                        <option value="admin">Admin (Quản trị)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase block">Quyền Truy Cập</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={newUser.vn100}
                                                onChange={e => setNewUser(u => ({ ...u, vn100: e.target.checked }))}
                                                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500" />
                                            <span className="text-sm text-slate-300">VN100</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={newUser.top20}
                                                onChange={e => setNewUser(u => ({ ...u, top20: e.target.checked }))}
                                                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500" />
                                            <span className="text-sm text-slate-300">Top 20</span>
                                        </label>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold mt-2">
                                    <Plus className="w-4 h-4 mr-2" /> Tạo User
                                </Button>
                            </form>
                        </GlassCard>
                    </div>
                )}
            </div>
        </div>
    );
}
