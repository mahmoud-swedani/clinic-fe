'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { useSales } from '@/hooks/useSales'
import { Sale, PaginatedResponse } from '@/types/api'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { useUserPermissions } from '@/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

function SalesContent() {
  const { page, limit, goToPage, changeLimit } = usePagination(10)
  const { data: salesResponse, isLoading, error } = useSales()
  const { canManageSales } = useUserPermissions()

  // Extract array from paginated response
  const typedSalesResponse = salesResponse as PaginatedResponse<Sale> | undefined
  const sales = typedSalesResponse?.data || []
  
  const paginationMeta = typedSalesResponse?.pagination
    ? {
        page: typedSalesResponse.pagination.page,
        limit: typedSalesResponse.pagination.limit,
        total: typedSalesResponse.pagination.total,
        totalPages: typedSalesResponse.pagination.totalPages,
      }
    : { page, limit, total: 0, totalPages: 0 }

  if (isLoading) return <div className='p-4'>جارٍ التحميل...</div>
  if (error)
    return <div className='p-4 text-red-600'>حدث خطأ أثناء جلب البيانات</div>

  return (
    <div className='p-4 space-y-4'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>المبيعات</h1>
        {canManageSales && (
          <Link href='/sales/new'>
            <Button className='flex items-center gap-2'>
              <Plus className='w-4 h-4' />
              عملية بيع جديدة
            </Button>
          </Link>
        )}
      </div>
      <table className='w-full text-right table-auto border-collapse border border-gray-300'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='border border-gray-300 p-2'>المريض</th>
            <th className='border border-gray-300 p-2'>الإجمالي</th>
            <th className='border border-gray-300 p-2'>المدفوع</th>
            <th className='border border-gray-300 p-2'>المتبقي</th>
            <th className='border border-gray-300 p-2'>حالة الدفع</th>
            <th className='border border-gray-300 p-2'>تفاصيل</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(sales) && sales.map((sale: Sale) => (
            <tr key={sale._id} className='hover:bg-gray-50'>
              <td className='border border-gray-300 p-2'>
                {typeof sale.patient === 'object' && sale.patient !== null
                  ? sale.patient.fullName
                  : 'غير معروف'}
              </td>
              <td className='border border-gray-300 p-2'>
                {sale.totalAmount} ل.س
              </td>
              <td className='border border-gray-300 p-2'>
                {sale.paidAmount} ل.س
              </td>
              <td className='border border-gray-300 p-2'>
                {sale.remainingAmount} ل.س
              </td>
              <td className='border border-gray-300 p-2 text-center'>
                <span
                  className={clsx('px-2 py-1 rounded text-xs font-semibold', {
                    'bg-green-100 text-green-800':
                      sale.paymentStatus === 'paid',
                    'bg-yellow-100 text-yellow-800':
                      sale.paymentStatus === 'partial',
                    'bg-red-100 text-red-800': sale.paymentStatus === 'unpaid',
                  })}
                >
                  {sale.paymentStatus === 'paid'
                    ? 'مدفوع بالكامل'
                    : sale.paymentStatus === 'partial'
                    ? 'مدفوع جزئي'
                    : 'غير مدفوع'}
                </span>
              </td>
              <td className='border border-gray-300 p-2 text-center'>
                <Link
                  href={`/sales/${sale._id}`}
                  className='text-blue-600 hover:underline'
                >
                  عرض
                </Link>
              </td>
            </tr>
          ))}
          {(!Array.isArray(sales) || sales.length === 0) && (
            <tr>
              <td colSpan={6} className='text-center p-4 text-gray-500'>
                لا توجد مبيعات حتى الآن
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {paginationMeta.totalPages > 1 && (
        <Pagination
          meta={paginationMeta}
          onPageChange={goToPage}
          onLimitChange={changeLimit}
        />
      )}
    </div>
  )
}

export default function SalesPage() {
  return (
    <Suspense
      fallback={
        <div className='p-4 space-y-4'>
          <div className='flex justify-between items-center'>
            <Skeleton className='h-8 w-32' />
            <Skeleton className='h-10 w-32' />
          </div>
          <Skeleton className='h-96 w-full' />
        </div>
      }
    >
      <SalesContent />
    </Suspense>
  )
}
