// src/app/(dashboard)/financial-records/new/page.tsx
'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import FinancialRecordForm from '@/components/forms/financial-record-form'
import { Skeleton } from '@/components/ui/skeleton'

function NewFinancialRecordContent() {
  const searchParams = useSearchParams()
  const type = searchParams.get('type') || undefined

  return (
    <div className='max-w-xl mx-auto p-4' dir='rtl'>
      <h2 className='text-2xl font-bold mb-4'>
        {type === 'purchase' ? 'إضافة مشتريات' : 'سجل مالي جديد'}
      </h2>
      <FinancialRecordForm defaultType={type as 'purchase' | 'expense' | 'salary' | undefined} />
    </div>
  )
}

export default function NewFinancialRecordPage() {
  return (
    <Suspense
      fallback={
        <div className='max-w-xl mx-auto p-4' dir='rtl'>
          <Skeleton className='h-8 w-48 mb-4' />
          <Skeleton className='h-96 w-full' />
        </div>
      }
    >
      <NewFinancialRecordContent />
    </Suspense>
  )
}
