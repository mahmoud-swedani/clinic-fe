// src/lib/performance.ts
// Performance monitoring utilities

interface PerformanceMetrics {
  apiCalls: number
  slowQueries: number
  averageResponseTime: number
  cacheHits: number
  cacheMisses: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    apiCalls: 0,
    slowQueries: 0,
    averageResponseTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
  }

  private responseTimes: number[] = []
  private readonly SLOW_QUERY_THRESHOLD = 1000 // 1 second
  private readonly SLOW_API_THRESHOLD = 500 // 500ms

  /**
   * Track API call performance
   */
  trackApiCall(url: string, duration: number) {
    this.metrics.apiCalls++
    this.responseTimes.push(duration)
    
    // Calculate average response time
    const sum = this.responseTimes.reduce((a, b) => a + b, 0)
    this.metrics.averageResponseTime = sum / this.responseTimes.length

    // Log slow API calls in development
    if (process.env.NODE_ENV === 'development' && duration > this.SLOW_API_THRESHOLD) {
      console.warn(
        `⚠️ Slow API call detected: ${url}\n` +
        `  Duration: ${duration.toFixed(2)}ms\n` +
        `  Threshold: ${this.SLOW_API_THRESHOLD}ms`
      )
    }
  }

  /**
   * Track query execution time
   */
  trackQuery(queryKey: string, duration: number) {
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      this.metrics.slowQueries++
      
      // Log slow queries in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `⚠️ Slow query detected: ${JSON.stringify(queryKey)}\n` +
          `  Duration: ${duration.toFixed(2)}ms\n` +
          `  Threshold: ${this.SLOW_QUERY_THRESHOLD}ms`
        )
      }
    }
  }

  /**
   * Track cache hit
   */
  trackCacheHit() {
    this.metrics.cacheHits++
  }

  /**
   * Track cache miss
   */
  trackCacheMiss() {
    this.metrics.cacheMisses++
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      apiCalls: 0,
      slowQueries: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
    }
    this.responseTimes = []
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses
    if (total === 0) return 0
    return (this.metrics.cacheHits / total) * 100
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

/**
 * Measure execution time of an async function
 */
export async function measureAsync<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<T> {
  const start = performance.now()
  try {
    const result = await fn()
    const duration = performance.now() - start
    
    if (label && process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`)
    }
    
    return result
  } catch (error) {
    const duration = performance.now() - start
    if (label && process.env.NODE_ENV === 'development') {
      console.error(`❌ ${label} failed after ${duration.toFixed(2)}ms:`, error)
    }
    throw error
  }
}

/**
 * Measure execution time of a synchronous function
 */
export function measureSync<T>(fn: () => T, label?: string): T {
  const start = performance.now()
  try {
    const result = fn()
    const duration = performance.now() - start
    
    if (label && process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`)
    }
    
    return result
  } catch (error) {
    const duration = performance.now() - start
    if (label && process.env.NODE_ENV === 'development') {
      console.error(`❌ ${label} failed after ${duration.toFixed(2)}ms:`, error)
    }
    throw error
  }
}


