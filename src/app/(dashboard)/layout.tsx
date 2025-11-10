// src/app/(dashboard)/layout.tsx
'use client'

import { ReactNode } from 'react'
import Sidebar from '@/components/dashboard/sidebar'
import Navbar from '@/components/dashboard/navbar'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <div className='h-screen flex flex-col'>
        {/* Navbar يحتوي على زر فتح الـ Sidebar الصغير */}
        <Navbar />

        <div className='flex flex-1 overflow-hidden'>
          {/* Sidebar دائم في الشاشات الكبيرة */}
          <aside className='hidden lg:block'>
            <Sidebar />
          </aside>

          <main className='flex-1 overflow-auto p-4'>{children}</main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
