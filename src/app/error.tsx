'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Page error:', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#030712] p-8">
            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-900/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 text-center max-w-lg">
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Đã xảy ra lỗi</h1>
                <p className="text-sm text-slate-400 mb-8">
                    Ứng dụng gặp sự cố không mong muốn. Vui lòng thử lại hoặc liên hệ hỗ trợ.
                </p>

                {error?.message && (
                    <div className="mb-6 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                        <code className="text-xs text-red-400 font-mono break-all">{error.message}</code>
                    </div>
                )}

                <div className="flex gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        Thử lại
                    </button>
                    <a
                        href="/"
                        className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10 transition-colors"
                    >
                        Về trang chủ
                    </a>
                </div>
            </div>
        </div>
    );
}
