export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#030712]">
            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-900/15 blur-[120px] rounded-full animate-pulse" />
            </div>

            <div className="relative z-10 text-center">
                {/* Spinning loader */}
                <div className="relative w-16 h-16 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-purple-400 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
                </div>

                <p className="text-sm font-medium text-slate-400 tracking-wide">
                    Đang tải dữ liệu...
                </p>
            </div>
        </div>
    );
}
