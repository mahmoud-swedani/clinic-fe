// src/lib/axios.ts
import axios from 'axios'
import { performanceMonitor } from './performance'

// Get base URL from environment variable
// Ensures the baseURL always ends with /api
const getBaseURL = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  if (envUrl) {
    // Remove trailing slash if present
    const cleanUrl = envUrl.replace(/\/$/, '')
    // Ensure /api is appended if not already present
    if (cleanUrl.endsWith('/api')) {
      return cleanUrl
    }
    // It should be the full URL (e.g., https://clinic-be-production.up.railway.app)
    // We append /api to ensure consistency
    return `${cleanUrl}/api`
  }
  // Default to localhost with /api prefix for development
  return 'http://localhost:5000/api'
}

const instance = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true, // مهم للسماح بإرسال الكوكيز مع كل طلب
})

instance.interceptors.request.use(
  (config) => {
    // Cookies are sent automatically with withCredentials: true
    // No need to manually add Authorization header
    
    // Add timestamp for performance tracking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(config as any).__startTime = performance.now()
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// إضافة interceptor للاستجابة للتعامل مع أخطاء المصادقة
instance.interceptors.response.use(
  (response) => {
    // Track API performance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const startTime = (response.config as any).__startTime
    if (startTime) {
      const duration = performance.now() - startTime
      const url = response.config.url || 'unknown'
      performanceMonitor.trackApiCall(url, duration)
    }
    return response
  },
  (error) => {
    // Track API performance even for errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const startTime = (error.config as any)?.__startTime
    if (startTime) {
      const duration = performance.now() - startTime
      const url = error.config?.url || 'unknown'
      performanceMonitor.trackApiCall(url, duration)
    }
    // Handle CORS errors
    // CORS errors typically have no response and network error codes
    const isCorsError = 
      (!error.response && (error.message?.includes('CORS') || error.code === 'ERR_NETWORK' || error.code === 'ERR_FAILED')) ||
      (error.response?.status === 0) // Sometimes CORS shows as status 0
    
    if (isCorsError) {
      const method = error.config?.method?.toUpperCase() || 'UNKNOWN'
      const url = error.config?.url || 'unknown'
      const baseURL = instance.defaults.baseURL || 'not set'
      const fullURL = error.config?.baseURL 
        ? `${error.config.baseURL}${url}`
        : `${baseURL}${url}`
      const origin = typeof window !== 'undefined' ? window.location.origin : 'unknown'
      
      console.error(
        `❌ CORS Error - Backend not configured to allow requests from frontend:\n` +
        `  Frontend Origin: ${origin}\n` +
        `  Backend URL: ${fullURL}\n` +
        `  Method: ${method}\n` +
        `\n⚠️  This must be fixed on the backend server.\n` +
        `   The backend needs to set these headers:\n` +
        `   - Access-Control-Allow-Origin: ${origin}\n` +
        `   - Access-Control-Allow-Credentials: true\n` +
        `   - Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS\n` +
        `   - Access-Control-Allow-Headers: Content-Type, Authorization\n`
      )
    }

    // Log 404 errors for debugging
    if (error.response?.status === 404) {
      const method = error.config?.method?.toUpperCase() || 'UNKNOWN'
      const url = error.config?.url || 'unknown'
      const baseURL = instance.defaults.baseURL || 'not set'
      const fullURL = error.config?.baseURL 
        ? `${error.config.baseURL}${url}`
        : `${baseURL}${url}`
      
      console.error(
        `❌ API endpoint not found (404):\n` +
        `  Method: ${method}\n` +
        `  Endpoint: ${url}\n` +
        `  Base URL: ${baseURL}\n` +
        `  Full URL: ${fullURL}\n` +
        `  Environment: ${process.env.NODE_ENV}\n` +
        `  NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL || 'not set'}`
      )
    }

    if (error.response?.status === 401) {
      // إذا كان الخطأ 401، أعد التوجيه لصفحة تسجيل الدخول
      // Cookie will be cleared by backend logout endpoint
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default instance
