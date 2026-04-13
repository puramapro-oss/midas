'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface PullToRefreshOptions {
  /** Pull distance in px required to trigger refresh (default 80) */
  threshold?: number
  /** Maximum pull distance in px (default 120) */
  maxPull?: number
  /** Resistance factor 0-1 — lower = more resistance (default 0.5) */
  resistance?: number
}

interface PullToRefreshReturn {
  isRefreshing: boolean
  pullDistance: number
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  options?: PullToRefreshOptions
): PullToRefreshReturn {
  const { threshold = 80, maxPull = 120, resistance = 0.5 } = options ?? {}

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)

  const startYRef = useRef(0)
  const isPullingRef = useRef(false)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (isRefreshing) return
      const container = containerRef.current
      if (!container) return

      // Only activate when scrolled to top
      if (container.scrollTop > 0) return

      startYRef.current = e.touches[0].clientY
      isPullingRef.current = true
    },
    [isRefreshing]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshing) return

      const currentY = e.touches[0].clientY
      const delta = currentY - startYRef.current

      // Only handle downward pull
      if (delta <= 0) {
        setPullDistance(0)
        return
      }

      // Apply resistance so it feels native
      const resisted = Math.min(delta * resistance, maxPull)
      setPullDistance(resisted)

      // Prevent native scroll while pulling
      if (resisted > 0) {
        e.preventDefault()
      }
    },
    [isRefreshing, resistance, maxPull]
  )

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return
    isPullingRef.current = false

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(threshold) // snap to threshold while refreshing

      try {
        await onRefresh()
      } catch {
        // swallow — caller handles errors
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return { isRefreshing, pullDistance, containerRef }
}

export default usePullToRefresh
