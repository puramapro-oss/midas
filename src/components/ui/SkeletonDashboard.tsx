'use client'

import { cn } from '@/lib/utils/formatters'
import { Skeleton } from './Skeleton'

interface SkeletonDashboardProps {
  className?: string
}

export function SkeletonDashboard({ className }: SkeletonDashboardProps) {
  return (
    <div className={cn('space-y-6 p-4 md:p-6', className)}>
      {/* Portfolio card skeleton */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton variant="text" width="140px" className="h-5" />
          <Skeleton variant="badge" />
        </div>
        <div className="flex items-baseline gap-3 mb-4">
          <Skeleton variant="text" width="200px" className="h-10" />
          <Skeleton variant="text" width="80px" className="h-5" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton variant="text" width="80px" className="h-3" />
              <Skeleton variant="text" width="100px" className="h-5" />
            </div>
          ))}
        </div>
      </div>

      {/* Signal cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3"
          >
            <div className="flex items-center gap-3">
              <Skeleton variant="avatar" width={36} height={36} />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" className="h-4 w-24" />
                <Skeleton variant="text" className="h-3 w-16" />
              </div>
              <Skeleton variant="badge" />
            </div>
            <div className="flex justify-between pt-2">
              <div className="space-y-1">
                <Skeleton variant="text" className="h-3 w-12" />
                <Skeleton variant="text" className="h-4 w-20" />
              </div>
              <div className="space-y-1">
                <Skeleton variant="text" className="h-3 w-8" />
                <Skeleton variant="text" className="h-4 w-16" />
              </div>
              <div className="space-y-1">
                <Skeleton variant="text" className="h-3 w-8" />
                <Skeleton variant="text" className="h-4 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <Skeleton variant="chart" height="280px" />

      {/* Activity list skeleton */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
        <Skeleton variant="text" width="160px" className="h-5" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <Skeleton variant="avatar" width={32} height={32} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className="h-4 w-3/4" />
              <Skeleton variant="text" className="h-3 w-1/2" />
            </div>
            <Skeleton variant="text" className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

SkeletonDashboard.displayName = 'SkeletonDashboard'
export default SkeletonDashboard
