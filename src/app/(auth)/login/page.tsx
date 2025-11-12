'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import axios from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useState, useTransition } from 'react'
import { LoginRequest } from '@/types/api'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

export default function LoginPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>()

  // Helper function to determine dashboard URL based on role
  const getDashboardUrl = (role?: string): string => {
    switch (role) {
      case 'طبيب':
        return '/dashboard/doctor'
      case 'سكرتير':
        return '/dashboard/reception'
      case 'محاسب':
        return '/dashboard/accountant'
      case 'مالك':
      case 'مدير':
      default:
        return '/dashboard'
    }
  }

  const onSubmit = async (data: LoginRequest) => {
    setIsLoading(true)
    setError('')
    
    try {
      const response = await axios.post<{
        data: {
          token: string
          user: {
            id: string
            name: string
            email: string
            role: string
            branch?: string
          }
        }
        message: string
      }>('/auth/login', data)

      // Token is automatically stored in httpOnly cookie by backend
      // No need to store in localStorage or client-side cookies

      // Cache user data immediately for faster subsequent access
      if (response.data?.data?.user) {
        queryClient.setQueryData(queryKeys.currentUser.me(), response.data.data.user)
      }

      // Get user role from response and redirect to role-specific dashboard
      const userRole = response.data?.data?.user?.role
      const dashboardUrl = getDashboardUrl(userRole)
      
      // Prefetch the dashboard route for faster navigation
      router.prefetch(dashboardUrl)
      
      // Use transition for smoother redirect
      startTransition(() => {
        router.replace(dashboardUrl)
      })
    } catch (err: unknown) {
      // Check for rate limiting (429 Too Many Requests)
      if ((err as { response?: { status?: number } }).response?.status === 429) {
        const retryAfter = (err as { response?: { headers?: { 'retry-after'?: string } } }).response?.headers?.['retry-after']
        const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : 15 * 60 // Default to 15 minutes
        
        if (retryAfterSeconds < 60) {
          setError(`تم تجاوز عدد محاولات تسجيل الدخول. يرجى المحاولة بعد ${retryAfterSeconds} ثانية.`)
        } else {
          const minutes = Math.ceil(retryAfterSeconds / 60)
          setError(`تم تجاوز عدد محاولات تسجيل الدخول. يرجى المحاولة بعد ${minutes} دقيقة.`)
        }
        return
      }

      // Check for CORS errors
      if (
        (err as { code?: string; message?: string; response?: unknown }).code === 'ERR_NETWORK' ||
        (err as { code?: string; message?: string; response?: unknown }).code === 'ERR_FAILED' ||
        ((err as { message?: string; response?: unknown }).message?.includes('CORS') && 
         !(err as { response?: unknown }).response)
      ) {
        setError('خطأ في الاتصال بالخادم. يرجى التحقق من إعدادات CORS في الخادم الخلفي.')
        return
      }

      // Check for API error response
      if (
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
      ) {
        setError((err as { response: { data: { message: string } } }).response.data.message)
        return
      }

      // Generic error
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ ما'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-100'>
      <Card className='w-full max-w-md shadow-lg'>
        <CardContent className='p-6'>
          <h2 className='text-2xl font-semibold mb-4'>تسجيل الدخول</h2>
          <form 
            onSubmit={handleSubmit(onSubmit)} 
            className='space-y-4'
            suppressHydrationWarning
          >
            <div>
              <Label htmlFor='email'>البريد الإلكتروني</Label>
              <Input
                id='email'
                type='email'
                {...register('email', { required: true })}
                suppressHydrationWarning
              />
              {errors.email && (
                <p className='text-sm text-red-500'>البريد مطلوب</p>
              )}
            </div>
            <div>
              <Label htmlFor='password'>كلمة المرور</Label>
              <Input
                id='password'
                type='password'
                {...register('password', { required: true })}
                suppressHydrationWarning
              />
              {errors.password && (
                <p className='text-sm text-red-500'>كلمة المرور مطلوبة</p>
              )}
            </div>
            {error && <p className='text-sm text-red-500'>{error}</p>}
            <Button 
              type='submit' 
              className='w-full' 
              disabled={isLoading || isPending}
              suppressHydrationWarning
            >
              {isLoading || isPending ? 'جاري تسجيل الدخول...' : 'دخول'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
