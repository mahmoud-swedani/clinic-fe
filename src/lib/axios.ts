// src/lib/axios.ts
import axios from 'axios'

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
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// إضافة interceptor للاستجابة للتعامل مع أخطاء المصادقة
instance.interceptors.response.use(
  (response) => response,
  (error) => {
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
