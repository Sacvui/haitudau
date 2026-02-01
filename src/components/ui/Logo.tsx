import React from 'react';

export function Logo({ className = "", size = "default" }: { className?: string, size?: "small" | "default" | "large" }) {
    // Size config
    const scale = size === 'small' ? 0.6 : size === 'large' ? 1.5 : 1;
    const width = 280 * scale;
    const height = 80 * scale;

    return (
        <div className={`relative flex items-center gap-3 ${className}`} style={{ width, height }}>
            {/* 1. ICON: COMPASS + CHART */}
            <div className="relative h-full aspect-square flex items-center justify-center">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-indigo-500/30 blur-xl rounded-full animate-pulse" />

                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]">
                    {/* Compass Circle */}
                    <circle cx="50" cy="50" r="45" fill="none" stroke="url(#grad1)" strokeWidth="2" className="opacity-50" />
                    <circle cx="50" cy="50" r="35" fill="none" stroke="url(#grad1)" strokeWidth="1" strokeDasharray="4 4" className="opacity-30 animate-spin-slow" />

                    {/* Growth Arrow / Needle */}
                    <path d="M30 70 L50 50 L80 20" stroke="url(#grad2)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M70 20 L80 20 L80 30" stroke="url(#grad2)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Compass N-S-E-W markers */}
                    <path d="M50 5 L50 15 M50 85 L50 95 M5 50 L15 50 M85 50 L95 50" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />

                    {/* Gradients */}
                    <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#c084fc" />
                        </linearGradient>
                        <linearGradient id="grad2" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#22d3ee" /> {/* Cyan */}
                            <stop offset="100%" stopColor="#a855f7" /> {/* Purple */}
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            {/* 2. TEXT BRANDING */}
            <div className="flex flex-col justify-center h-full">
                {/* "Hải" - Signature style */}
                <span className="font-handwriting text-indigo-400 -mb-2 ml-1 text-lg italic"
                    style={{ fontFamily: "'Dancing Script', cursive, sans-serif", textShadow: "0 0 5px rgba(129, 140, 248, 0.5)" }}>
                    Hải
                </span>

                {/* "ĐẦU TƯ TỪ ĐÂU" - Strong, Bold, Neon */}
                <div className="relative">
                    <h1 className="text-3xl font-black tracking-tighter uppercase leading-none text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 drop-shadow-sm">
                        ĐẦU TƯ
                    </h1>
                    <h1 className="text-3xl font-black tracking-tighter uppercase leading-none text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                        TỪ ĐÂU
                    </h1>

                    {/* Underline decorative */}
                    <div className="h-1 w-full mt-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full" />
                </div>
            </div>
        </div>
    );
}
