'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import axios from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { LoginRequest } from '@/types/api'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>()

  const onSubmit = async (data: LoginRequest) => {
    try {
      await axios.post('/auth/login', data)

      // Token is automatically stored in httpOnly cookie by backend
      // No need to store in localStorage or client-side cookies

      // إعادة التوجيه للوحة التحكم أو الصفحة الرئيسية
      router.push('/dashboard')
    } catch (err: unknown) {
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
            <Button type='submit' className='w-full' suppressHydrationWarning>
              دخول
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
