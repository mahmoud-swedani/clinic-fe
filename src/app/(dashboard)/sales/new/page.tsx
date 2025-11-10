// ✅ src/app/(dashboard)/sales/new/page.tsx
'use client'

import { Suspense } from 'react'
import SalesForm from '@/components/sales/sales-form'
import { Skeleton } from '@/components/ui/skeleton'

function NewSaleContent() {
  return (
    <div className='p-4'>
      <h1 className='text-2xl font-bold mb-4'>إضافة عملية بيع</h1>
      <SalesForm />
    </div>
  )
}

export default function NewSalePage() {
  return (
    <Suspense
      fallback={
        <div className='p-4'>
          <h1 className='text-2xl font-bold mb-4'>إضافة عملية بيع</h1>
          <Skeleton className='h-96 w-full' />
        </div>
      }
    >
      <NewSaleContent />
    </Suspense>
  )
}
