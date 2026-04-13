'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Prevents double-click / rapid re-invocation of a callback.
 * Returns [wrappedFn, isLocked].
 *
 * `isLocked` is reactive (useState) so the UI can disable buttons.
 * The actual lock gate uses a ref to avoid stale-closure issues.
 */
export function usePreventDoubleClick<T extends (...args: never[]) => unknown>(
  fn: T,
  delayMs = 1000
): [(...args: Parameters<T>) => void, boolean] {
  const lockRef = useRef(false)
  const [isLocked, setIsLocked] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const wrappedFn = useCallback(
    (...args: Parameters<T>) => {
      if (lockRef.current) return

      lockRef.current = true
      setIsLocked(true)

      try {
        fn(...args)
      } catch {
        // unlock immediately on sync error
        lockRef.current = false
        setIsLocked(false)
        return
      }

      timerRef.current = setTimeout(() => {
        lockRef.current = false
        setIsLocked(false)
        timerRef.current = null
      }, delayMs)
    },
    [fn, delayMs]
  )

  return [wrappedFn, isLocked]
}

export default usePreventDoubleClick
