// src/hooks/usePolling.ts
// Reusable polling hook with exponential backoff and tab visibility support

import { useEffect, useRef, useState } from 'react'

interface UsePollingOptions {
  /**
   * Polling interval in milliseconds
   */
  interval: number
  /**
   * Whether polling is enabled
   */
  enabled?: boolean
  /**
   * Whether to pause polling when tab is not visible
   */
  pauseWhenHidden?: boolean
  /**
   * Callback function to execute on each poll
   */
  onPoll: () => void | Promise<void>
  /**
   * Callback when polling fails (for exponential backoff)
   */
  onError?: (error: Error) => void
  /**
   * Maximum interval for exponential backoff
   */
  maxInterval?: number
}

/**
 * Hook for smart polling with:
 * - Exponential backoff on errors
 * - Pause/resume based on tab visibility
 * - Configurable intervals
 */
export function usePolling({
  interval,
  enabled = true,
  pauseWhenHidden = true,
  onPoll,
  onError,
  maxInterval = 5 * 60 * 1000, // 5 minutes max
}: UsePollingOptions) {
  const [isPolling, setIsPolling] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentIntervalRef = useRef(interval)
  const errorCountRef = useRef(0)
  const isVisibleRef = useRef(true)

  useEffect(() => {
    // Handle tab visibility
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden
      
      if (pauseWhenHidden) {
        if (document.hidden) {
          // Pause polling when tab is hidden
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
            setIsPolling(false)
          }
        } else if (enabled) {
          // Resume polling when tab becomes visible
          startPolling()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pauseWhenHidden])

  const startPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    const poll = async () => {
      if (!enabled || (pauseWhenHidden && !isVisibleRef.current)) {
        return
      }

      try {
        setIsPolling(true)
        await onPoll()
        // Reset error count on success
        errorCountRef.current = 0
        currentIntervalRef.current = interval
      } catch (error) {
        errorCountRef.current += 1
        // Exponential backoff: double the interval on each error, up to maxInterval
        currentIntervalRef.current = Math.min(
          currentIntervalRef.current * 2,
          maxInterval
        )
        
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)))
        }
      } finally {
        setIsPolling(false)
      }
    }

    // Initial poll
    poll()

    // Set up interval with current interval (may be adjusted by backoff)
    const scheduleNext = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      
      intervalRef.current = setTimeout(() => {
        poll().finally(() => {
          scheduleNext()
        })
      }, currentIntervalRef.current)
    }

    scheduleNext()
  }

  useEffect(() => {
    if (enabled && (!pauseWhenHidden || isVisibleRef.current)) {
      startPolling()
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsPolling(false)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, interval])

  return {
    isPolling,
    stop: () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsPolling(false)
    },
    start: startPolling,
  }
}


