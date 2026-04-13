'use client'

import { cn } from '@/lib/utils/formatters'

export interface SkeletonProps {
  className?: string
  variant?: 'text' | 'card' | 'chart' | 'table' | 'avatar' | 'badge'
  width?: string | number
  height?: string | number
  count?: number
}

const shimmerBase =
  'animate-shimmer bg-gradient-to-r from-white/[0.03] via-[#F59E0B]/[0.06] to-white/[0.03] bg-[length:200%_100%]'

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  count = 1,
}: SkeletonProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }

  const items = Array.from({ length: count }, (_, i) => i)

  if (variant === 'text') {
    return (
      <>
        {items.map((i) => (
          <div
            key={i}
            className={cn(shimmerBase, 'h-4 rounded-md', className)}
            style={style}
          />
        ))}
      </>
    )
  }

  if (variant === 'card') {
    return (
      <>
        {items.map((i) => (
          <div
            key={i}
            className={cn(
              'rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4',
              className
            )}
            style={{ width: style.width ?? '100%', height: style.height ?? 'auto' }}
          >
            <div className={cn(shimmerBase, 'h-5 w-2/3 rounded-lg')} />
            <div className={cn(shimmerBase, 'h-3 w-full rounded-md')} />
            <div className={cn(shimmerBase, 'h-3 w-4/5 rounded-md')} />
            <div className="flex gap-2 pt-2">
              <div className={cn(shimmerBase, 'h-8 w-20 rounded-lg')} />
              <div className={cn(shimmerBase, 'h-8 w-20 rounded-lg')} />
            </div>
          </div>
        ))}
      </>
    )
  }

  if (variant === 'chart') {
    return (
      <>
        {items.map((i) => (
          <div
            key={i}
            className={cn(
              'rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6',
              className
            )}
            style={{ width: style.width ?? '100%', height: style.height ?? '240px' }}
          >
            {/* Y-axis labels */}
            <div className="flex h-full gap-3">
              <div className="flex flex-col justify-between py-2">
                <div className={cn(shimmerBase, 'h-3 w-8 rounded')} />
                <div className={cn(shimmerBase, 'h-3 w-6 rounded')} />
                <div className={cn(shimmerBase, 'h-3 w-8 rounded')} />
                <div className={cn(shimmerBase, 'h-3 w-6 rounded')} />
              </div>
              {/* Chart area */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 flex items-end gap-1">
                  {[40, 65, 50, 80, 35, 70, 55, 90, 45, 75, 60, 85].map(
                    (h, idx) => (
                      <div
                        key={idx}
                        className={cn(shimmerBase, 'flex-1 rounded-t-sm')}
                        style={{ height: `${h}%` }}
                      />
                    )
                  )}
                </div>
                {/* X-axis */}
                <div className="flex justify-between pt-3">
                  <div className={cn(shimmerBase, 'h-2 w-6 rounded')} />
                  <div className={cn(shimmerBase, 'h-2 w-6 rounded')} />
                  <div className={cn(shimmerBase, 'h-2 w-6 rounded')} />
                  <div className={cn(shimmerBase, 'h-2 w-6 rounded')} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </>
    )
  }

  if (variant === 'table') {
    return (
      <>
        {items.map((i) => (
          <div
            key={i}
            className={cn(
              'rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden',
              className
            )}
            style={{ width: style.width ?? '100%' }}
          >
            {/* Header row */}
            <div className="flex gap-4 p-4 border-b border-white/[0.06]">
              <div className={cn(shimmerBase, 'h-4 flex-[2] rounded-md')} />
              <div className={cn(shimmerBase, 'h-4 flex-1 rounded-md')} />
              <div className={cn(shimmerBase, 'h-4 flex-1 rounded-md')} />
              <div className={cn(shimmerBase, 'h-4 flex-1 rounded-md')} />
            </div>
            {/* Data rows */}
            {[0, 1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="flex gap-4 p-4 border-b border-white/[0.04] last:border-b-0"
              >
                <div className={cn(shimmerBase, 'h-3 flex-[2] rounded-md')} />
                <div className={cn(shimmerBase, 'h-3 flex-1 rounded-md')} />
                <div className={cn(shimmerBase, 'h-3 flex-1 rounded-md')} />
                <div className={cn(shimmerBase, 'h-3 flex-1 rounded-md')} />
              </div>
            ))}
          </div>
        ))}
      </>
    )
  }

  if (variant === 'avatar') {
    return (
      <>
        {items.map((i) => (
          <div
            key={i}
            className={cn(shimmerBase, 'rounded-full', className)}
            style={{
              width: style.width ?? '40px',
              height: style.height ?? '40px',
            }}
          />
        ))}
      </>
    )
  }

  if (variant === 'badge') {
    return (
      <>
        {items.map((i) => (
          <div
            key={i}
            className={cn(shimmerBase, 'h-6 w-16 rounded-full', className)}
            style={style}
          />
        ))}
      </>
    )
  }

  return <div className={cn(shimmerBase, 'h-4 rounded-md', className)} style={style} />
}

Skeleton.displayName = 'Skeleton'
export default Skeleton
