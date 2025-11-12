// Global rate limit state - shared across all hooks
let globalRateLimitedUntil: number | null = null
const RATE_LIMIT_COOLDOWN = 5 * 60 * 1000 // 5 minutes cooldown after rate limit

// Helper to check if we're currently rate limited
// IMPORTANT: This must be a pure function (no side effects) to avoid Fast Refresh rebuild loops
export const isGloballyRateLimited = (): boolean => {
  // Don't mutate state here - just check and return
  // Cleanup will happen automatically when the value expires on next check
  if (globalRateLimitedUntil && Date.now() < globalRateLimitedUntil) {
    return true
  }
  // If expired, return false but don't mutate - let it expire naturally
  // The next call to setGlobalRateLimited will overwrite it anyway
  return false
}

// Helper to set global rate limit state
export const setGlobalRateLimited = (): void => {
  globalRateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN
}

// Cleanup function to reset expired rate limits (call this periodically, not during render)
export const cleanupExpiredRateLimit = (): void => {
  if (globalRateLimitedUntil && Date.now() >= globalRateLimitedUntil) {
    globalRateLimitedUntil = null
  }
}

