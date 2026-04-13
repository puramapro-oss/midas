'use client'

import { cn } from '@/lib/utils/formatters'

interface PullToRefreshIndicatorProps {
  pullDistance: number
  isRefreshing: boolean
  threshold?: number
  className?: string
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 80,
  className,
}: PullToRefreshIndicatorProps) {
  if (pullDistance <= 0 && !isRefreshing) return null

  const progress = Math.min(pullDistance / threshold, 1)
  const rotation = pullDistance * 3 // rotate based on pull distance
  const opacity = Math.min(progress * 1.5, 1)
  const scale = 0.5 + progress * 0.5

  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden transition-[height] duration-200',
        className
      )}
      style={{ height: `${pullDistance}px` }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          opacity,
          transform: `scale(${scale})`,
          transition: isRefreshing ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className={cn(isRefreshing && 'animate-spin')}
          style={{
            transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
            transition: isRefreshing ? 'none' : 'transform 0.05s linear',
          }}
        >
          <path
            d="M21 12a9 9 0 1 1-6.219-8.56"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M21 3v5h-5"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: progress }}
          />
        </svg>
      </div>
    </div>
  )
}

PullToRefreshIndicator.displayName = 'PullToRefreshIndicator'
export default PullToRefreshIndicator
