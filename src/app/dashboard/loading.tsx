'use client';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" data-testid="dashboard-loading">
      {/* Portfolio skeleton */}
      <div className="h-72 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden relative">
        <div className="absolute inset-0 shimmer-gold" />
        <div className="p-6 space-y-4">
          <div className="h-5 w-40 rounded-lg bg-[#FFD700]/[0.08]" />
          <div className="h-10 w-56 rounded-lg bg-[#FFD700]/[0.06]" />
          <div className="h-4 w-32 rounded-lg bg-white/[0.04]" />
          <div className="h-32 w-full rounded-lg bg-white/[0.03] mt-4" />
        </div>
      </div>

      {/* AI Status + Controls row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-48 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden relative">
          <div className="absolute inset-0 shimmer-gold" />
          <div className="p-6 space-y-4">
            <div className="h-5 w-36 rounded-lg bg-[#FFD700]/[0.08]" />
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-1 h-24 rounded-xl bg-white/[0.03]" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="h-[84px] rounded-2xl bg-white/[0.03] border border-white/[0.06] relative overflow-hidden">
            <div className="absolute inset-0 shimmer-gold" />
          </div>
          <div className="h-[84px] rounded-2xl bg-white/[0.03] border border-white/[0.06] relative overflow-hidden">
            <div className="absolute inset-0 shimmer-gold" />
          </div>
        </div>
      </div>

      {/* Open Positions skeleton */}
      <div className="h-64 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden relative">
        <div className="absolute inset-0 shimmer-gold" />
        <div className="p-6 space-y-4">
          <div className="h-5 w-44 rounded-lg bg-[#FFD700]/[0.08]" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 w-full rounded-lg bg-white/[0.03]" />
          ))}
        </div>
      </div>

      {/* Signals + Activity skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="h-64 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden relative">
            <div className="absolute inset-0 shimmer-gold" />
            <div className="p-6 space-y-4">
              <div className="h-5 w-32 rounded-lg bg-[#FFD700]/[0.08]" />
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-10 w-full rounded-lg bg-white/[0.03]" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Shield skeleton */}
      <div className="h-48 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden relative">
        <div className="absolute inset-0 shimmer-gold" />
        <div className="p-6 space-y-4">
          <div className="h-5 w-28 rounded-lg bg-[#FFD700]/[0.08]" />
          <div className="h-20 w-full rounded-lg bg-white/[0.03]" />
        </div>
      </div>

      <style jsx>{`
        .shimmer-gold {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 215, 0, 0.04) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.8s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
