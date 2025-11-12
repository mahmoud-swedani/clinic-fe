'use client'

import { useRouter } from 'next/navigation'
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/dashboard/sidebar'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import axios from '@/lib/axios'
import { deleteCookie } from 'cookies-next'
import { useQueryClient } from '@tanstack/react-query'
import { useTransition, useState } from 'react'

export default function Navbar() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: user, isLoading } = useCurrentUser()
  const [isPending, startTransition] = useTransition()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      // Clear cache first for immediate UI update (optimistic logout)
      queryClient.clear()
      deleteCookie('token')

      // Attempt to logout from server (will delete httpOnly cookie)
      // Don't wait for this - do it in background for faster logout
      axios.post('/auth/logout').catch(() => {
        // If it fails, no problem - we've already cleared local state
      })

      // Prefetch login page for faster navigation
      router.prefetch('/login')

      // Redirect immediately using transition for smoother navigation
      startTransition(() => {
        router.replace('/login')
      })
    } catch (error) {
      console.error('خطأ أثناء تسجيل الخروج', error)
      // Even if error, clear everything and redirect
      deleteCookie('token')
      queryClient.clear()
      startTransition(() => {
        router.replace('/login')
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className='flex items-center justify-between h-16 border-b px-4'>
      {/* زر السايدبار في الشاشات الصغيرة */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant='ghost' size='icon' className='lg:hidden'>
            <Menu />
          </Button>
        </SheetTrigger>

        <SheetContent side='left' className='p-0 w-64'>
          <Sidebar />
        </SheetContent>
      </Sheet>

      <h1 className='text-xl font-bold'>نظام إدارة العيادة</h1>

      {!isLoading && user ? (
        <div className='flex items-center gap-2'>
          <span className='text-sm text-gray-600'>مرحبًا، {user.name}</span>
          <Button 
            variant='outline' 
            onClick={handleLogout}
            disabled={isLoggingOut || isPending}
          >
            {isLoggingOut || isPending ? 'جاري تسجيل الخروج...' : 'تسجيل الخروج'}
          </Button>
        </div>
      ) : (
        <Button variant='outline' onClick={() => router.push('/login')}>
          تسجيل الدخول
        </Button>
      )}
    </div>
  )
}
