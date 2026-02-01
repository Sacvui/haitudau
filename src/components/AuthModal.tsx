'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const { signIn, signUp, signInWithGoogle } = useAuth();

    const handleSubmit = async (mode: 'login' | 'signup') => {
        if (!email || !password) {
            setError('Vui lòng nhập đầy đủ email và mật khẩu');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (mode === 'login') {
                const { error } = await signIn(email, password);
                if (error) throw error;
                onClose();
            } else {
                const { error } = await signUp(email, password);
                if (error) throw error;
                setSuccess('Đã gửi email xác thực. Vui lòng kiểm tra hộp thư của bạn.');
            }
        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await signInWithGoogle();
            if (error) throw error;
        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi với Google Sign In');
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">
                        Chào mừng bạn
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Đăng nhập để lưu lại lịch sử phân tích của bạn
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="login" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="login">Đăng nhập</TabsTrigger>
                        <TabsTrigger value="signup">Đăng ký</TabsTrigger>
                    </TabsList>

                    <TabsContent value="login" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="login-email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="login-email"
                                    type="email"
                                    placeholder="email@example.com"
                                    className="pl-10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="login-password">Mật khẩu</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="login-password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>
                        )}

                        <Button
                            className="w-full"
                            onClick={() => handleSubmit('login')}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Đăng nhập
                        </Button>
                    </TabsContent>

                    <TabsContent value="signup" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="signup-email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="signup-email"
                                    type="email"
                                    placeholder="email@example.com"
                                    className="pl-10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="signup-password">Mật khẩu</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="signup-password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>
                        )}
                        {success && (
                            <p className="text-sm text-chart-2 bg-chart-2/10 p-3 rounded-lg">{success}</p>
                        )}

                        <Button
                            className="w-full"
                            onClick={() => handleSubmit('signup')}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Đăng ký
                        </Button>
                    </TabsContent>
                </Tabs>

                <div className="relative my-4">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                        hoặc
                    </span>
                </div>

                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    Tiếp tục với Google
                </Button>
            </DialogContent>
        </Dialog>
    );
}
