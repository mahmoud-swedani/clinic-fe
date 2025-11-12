// src/app/(dashboard)/layout.tsx
'use client'

import { ReactNode, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/dashboard/sidebar'
import Navbar from '@/components/dashboard/navbar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Loader2 } from 'lucide-react'
import { NavigationProvider, useNavigation } from '@/contexts/NavigationContext'

function DashboardContent({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { isNavigating, setIsNavigating } = useNavigation()

  // Reset navigation state when pathname changes
  // setIsNavigating is stable from useState, but included for ESLint
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname, setIsNavigating])

  return (
    <div className='h-screen flex flex-col'>
      {/* Navbar يحتوي على زر فتح الـ Sidebar الصغير */}
      <Navbar />

      <div className='flex flex-1 overflow-hidden'>
        {/* Sidebar - visible on large screens (≥1024px), accessible via navbar menu on mobile */}
        <aside className='hidden lg:flex lg:w-64 lg:flex-shrink-0 border-r bg-gray-100 overflow-y-auto'>
          <Sidebar />
        </aside>

        <main className='flex-1 overflow-auto p-4 relative'>
          {isNavigating ? (
            <div className='absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center'>
              <div className='flex flex-col items-center gap-4'>
                <Loader2 className='animate-spin h-8 w-8 text-gray-600' />
                <p className='text-sm text-gray-600'>جاري التحميل...</p>
              </div>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <NavigationProvider>
        <DashboardContent>{children}</DashboardContent>
      </NavigationProvider>
    </ErrorBoundary>
  )
}
