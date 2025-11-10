// src/lib/axios.ts
import axios from 'axios'

// Get base URL from environment variable
// If NEXT_PUBLIC_API_URL is set, use it as-is (it should include the full path)
// Otherwise, default to localhost with /api prefix
const getBaseURL = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  if (envUrl) {
    // If environment variable is set, use it as-is
    // It should be the full URL (e.g., https://clinic-be-production.up.railway.app/api)
    return envUrl
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
    // Log 404 errors for debugging (only in development)
    if (error.response?.status === 404 && process.env.NODE_ENV === 'development') {
      console.warn(
        `API endpoint not found: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
        `\nBase URL: ${instance.defaults.baseURL}`,
        `\nFull URL: ${error.config?.baseURL}${error.config?.url}`
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
