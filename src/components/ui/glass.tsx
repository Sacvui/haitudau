'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    hoverEffect?: boolean;
}

export function GlassCard({ children, className, delay = 0, hoverEffect = false }: GlassCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay, ease: "easeOut" }}
            whileHover={hoverEffect ? { y: -5, boxShadow: "0 20px 40px -10px rgba(99, 102, 241, 0.2)" } : undefined}
            className={cn(
                "relative overflow-hidden rounded-2xl border border-white/10 shadow-xl",
                "bg-[#111827]/60 backdrop-blur-xl", // The Core Glass Effect
                "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-transparent before:pointer-events-none",
                className
            )}
        >
            {children}
        </motion.div>
    );
}

export function NeonText({ children, className, color = "indigo" }: { children: React.ReactNode, className?: string, color?: "indigo" | "emerald" | "amber" | "rose" }) {
    const glowColors = {
        indigo: "drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]",
        emerald: "drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]",
        amber: "drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]",
        rose: "drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]",
    };

    return (
        <span className={cn("font-bold tracking-tight", glowColors[color], className)}>
            {children}
        </span>
    );
}
