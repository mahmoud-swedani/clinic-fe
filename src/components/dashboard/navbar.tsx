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

export default function Navbar() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: user, isLoading } = useCurrentUser()

  const handleLogout = async () => {
    try {
      // محاولة تسجيل الخروج من الخادم (سيحذف httpOnly cookie)
      await axios.post('/auth/logout').catch(() => {
        // إذا فشل، لا مشكلة - سنحذف التوكن محليًا على أي حال
      })

      // حذف التوكن من الكوكيز (إذا كان موجودًا كـ non-httpOnly cookie)
      deleteCookie('token')

      // إلغاء تفعيل جميع الاستعلامات في React Query
      queryClient.clear()

      // إعادة التوجيه لصفحة تسجيل الدخول
      router.push('/login')
      router.refresh() // تحديث الصفحة للتأكد من إزالة الحالة
    } catch (error) {
      console.error('خطأ أثناء تسجيل الخروج', error)
      // حتى لو فشل، احذف التوكن من الكوكيز
      deleteCookie('token')
      queryClient.clear()
      router.push('/login')
      router.refresh()
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
          <Button variant='outline' onClick={handleLogout}>
            تسجيل الخروج
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
