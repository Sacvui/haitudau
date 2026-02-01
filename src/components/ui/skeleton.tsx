'use client';

import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
    className = '',
    variant = 'rectangular',
    width,
    height,
    animation = 'pulse',
}: SkeletonProps) {
    const baseClasses = 'bg-slate-700/50';

    const variantClasses = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: '',
        rounded: 'rounded-lg',
    };

    const animationClasses = {
        pulse: 'animate-pulse',
        wave: 'animate-shimmer',
        none: '',
    };

    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
            style={style}
        />
    );
}

// Pre-built skeleton patterns
export function KpiCardSkeleton() {
    return (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <Skeleton variant="text" width={80} height={12} />
                <Skeleton variant="circular" width={32} height={32} />
            </div>
            <Skeleton variant="text" width={100} height={28} />
            <Skeleton variant="text" width={60} height={14} />
        </div>
    );
}

export function ChartSkeleton({ height = 350 }: { height?: number }) {
    return (
        <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800">
                <Skeleton variant="text" width={200} height={20} />
            </div>
            <div className="p-4" style={{ height }}>
                <div className="h-full flex items-end justify-between gap-1">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            variant="rectangular"
                            width="100%"
                            height={`${30 + Math.random() * 60}%`}
                            className="flex-1"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800">
                <Skeleton variant="text" width={180} height={20} />
            </div>
            <div className="divide-y divide-slate-800">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="p-4 flex items-center gap-4">
                        <Skeleton variant="text" width={60} height={16} />
                        <Skeleton variant="text" width={120} height={16} className="flex-1" />
                        <Skeleton variant="text" width={80} height={16} />
                        <Skeleton variant="text" width={60} height={16} />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <KpiCardSkeleton key={i} />
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <div className="xl:col-span-8">
                    <ChartSkeleton height={400} />
                </div>
                <div className="xl:col-span-4 space-y-4">
                    <ChartSkeleton height={180} />
                    <ChartSkeleton height={180} />
                </div>
            </div>

            {/* Table */}
            <TableSkeleton rows={5} />
        </div>
    );
}

export function ScreenerSkeleton() {
    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-[#111827] border border-slate-800 rounded-xl p-4 text-center">
                        <Skeleton variant="text" width={80} height={12} className="mx-auto mb-2" />
                        <Skeleton variant="text" width={60} height={28} className="mx-auto" />
                    </div>
                ))}
            </div>

            {/* Table */}
            <TableSkeleton rows={10} />
        </div>
    );
}
