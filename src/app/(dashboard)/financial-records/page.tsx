// src/app/(dashboard)/financial-records/page.tsx
'use client'

import Link from 'next/link'
import { useState, Suspense } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  useFinancialRecords,
} from '@/hooks/useFinancialRecord'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { useUserPermissions } from '@/hooks/usePermissions'
import { FinancialRecord, PaginatedResponse } from '@/types/api'
import { Skeleton } from '@/components/ui/skeleton'

function FinancialRecordsContent() {
  const { page, limit, goToPage, changeLimit } = usePagination(10)
  const { data, isLoading, isError } = useFinancialRecords()
  const { canManageFinancialRecords } = useUserPermissions()

  const typedData = data as PaginatedResponse<FinancialRecord> | undefined
  // Extract array from paginated response
  const recordsData = typedData?.data || []
  const paginationMeta = typedData?.pagination
    ? {
        page: typedData.pagination.page,
        limit: typedData.pagination.limit,
        total: typedData.pagination.total,
        totalPages: typedData.pagination.totalPages,
      }
    : { page, limit, total: 0, totalPages: 0 }

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>(
    'all'
  )
  const [recordTypeFilter, setRecordTypeFilter] = useState<
    'all' | 'purchase' | 'expense'
  >('all')
  const [sortOption, setSortOption] = useState<
    'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
  >('date-desc')

  const filteredRecords = recordsData
    .filter((record) => {
      const searchText = (
        record.description ||
        record.supplierName ||
        record.invoiceNumber ||
        ''
      ).toLowerCase()
      const titleMatch = searchText.includes(search.toLowerCase())
      const paidAmount =
        record.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
      const remaining = record.totalAmount - paidAmount
      const statusMatch =
        statusFilter === 'all' ||
        (statusFilter === 'paid' && remaining === 0) ||
        (statusFilter === 'unpaid' && remaining > 0)

      const typeMatch =
        recordTypeFilter === 'all' || record.recordType === recordTypeFilter

      return titleMatch && statusMatch && typeMatch
    })
    ?.sort((a, b) => {
      if (sortOption === 'date-desc') {
        if (!a.recordDate || !b.recordDate) return 0
        return new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime()
      }
      if (sortOption === 'date-asc') {
        if (!a.recordDate || !b.recordDate) return 0
        return new Date(a.recordDate).getTime() - new Date(b.recordDate).getTime()
      }
      if (sortOption === 'amount-desc') return b.totalAmount - a.totalAmount
      if (sortOption === 'amount-asc') return a.totalAmount - b.totalAmount
      return 0
    })

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold tracking-tight'>السجلات المالية</h1>
        {canManageFinancialRecords && (
          <div className='flex gap-2'>
            <Link href='/financial-records/new?type=purchase'>
              <Button variant='default' className='flex items-center gap-2'>
                <Plus className='w-4 h-4' />
                إضافة مشتريات
              </Button>
            </Link>
            <Link href='/financial-records/new'>
              <Button variant='outline' className='flex items-center gap-2'>
                <Plus className='w-4 h-4' />
                إضافة سجل جديد
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className='flex flex-wrap gap-4'>
        <div className='flex-1 min-w-[200px] space-y-1'>
          <Label>بحث</Label>
          <Input
            placeholder='ابحث بعنوان السجل'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className='min-w-[150px] space-y-1'>
          <Label>الحالة</Label>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as 'all' | 'paid' | 'unpaid')
            }
          >
            <SelectTrigger>
              <SelectValue placeholder='اختر الحالة' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>الكل</SelectItem>
              <SelectItem value='paid'>مدفوع</SelectItem>
              <SelectItem value='unpaid'>غير مدفوع</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='min-w-[150px] space-y-1'>
          <Label>نوع السجل</Label>
          <Select
            value={recordTypeFilter}
            onValueChange={(value) =>
              setRecordTypeFilter(value as 'all' | 'purchase' | 'expense')
            }
          >
            <SelectTrigger>
              <SelectValue placeholder='اختر النوع' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>الكل</SelectItem>
              <SelectItem value='purchase'>مشتريات</SelectItem>
              <SelectItem value='expense'>مصروفات</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='min-w-[160px] space-y-1'>
          <Label>الفرز</Label>
          <Select
            value={sortOption}
            onValueChange={(value) =>
              setSortOption(
                value as 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder='فرز حسب' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='date-desc'>الأحدث أولاً</SelectItem>
              <SelectItem value='date-asc'>الأقدم أولاً</SelectItem>
              <SelectItem value='amount-desc'>الأكبر مبلغاً</SelectItem>
              <SelectItem value='amount-asc'>الأصغر مبلغاً</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Records */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة السجلات المالية</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          {isLoading ? (
            <div className='flex justify-center items-center py-12'>
              <p>جاري التحميل...</p>
            </div>
          ) : isError ? (
            <p className='text-center text-red-600 py-12'>
              حدث خطأ أثناء جلب البيانات
            </p>
          ) : filteredRecords.length === 0 ? (
            <p className='text-center text-gray-500 py-12'>
              لا توجد سجلات مطابقة للبحث أو الفلاتر.
            </p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm text-right'>
                <thead>
                  <tr className='border-b bg-gray-100'>
                    <th className='px-4 py-3 font-semibold'>العنوان</th>
                    <th className='px-4 py-3 font-semibold'>النوع</th>
                    <th className='px-4 py-3 font-semibold'>المبلغ الإجمالي</th>
                    <th className='px-4 py-3 font-semibold'>المدفوع</th>
                    <th className='px-4 py-3 font-semibold'>المتبقي</th>
                    <th className='px-4 py-3 font-semibold'>التاريخ</th>
                    <th className='px-4 py-3 font-semibold'>الحالة</th>
                    <th className='px-4 py-3 font-semibold'>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => {
                    const paidAmount =
                      record.payments?.reduce((sum, p) => sum + p.amount, 0) ||
                      0
                    const remaining = record.totalAmount - paidAmount
                    const statusText = remaining === 0 ? 'مدفوع' : 'غير مدفوع'

                    return (
                      <tr
                        key={record._id}
                        className='border-b hover:bg-gray-50 transition-colors'
                      >
                        <td className='px-4 py-3 font-medium'>
                          {record.description || record.supplierName || record.invoiceNumber || '-'}
                        </td>
                        <td className='px-4 py-3'>
                          {record.recordType === 'purchase'
                            ? 'مشتريات'
                            : record.recordType === 'expense'
                            ? 'مصروفات'
                            : record.recordType === 'salary'
                            ? 'راتب'
                            : record.recordType}
                        </td>
                        <td className='px-4 py-3'>
                          {record.totalAmount.toLocaleString()} ل.س
                        </td>
                        <td className='px-4 py-3'>
                          {paidAmount.toLocaleString()} ل.س
                        </td>
                        <td className='px-4 py-3'>
                          <span
                            className={
                              remaining > 0
                                ? 'text-red-600 font-semibold'
                                : 'text-green-600'
                            }
                          >
                            {remaining.toLocaleString()} ل.س
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          {record.recordDate
                            ? new Date(record.recordDate).toLocaleDateString('ar-EG')
                            : '-'}
                        </td>
                        <td className='px-4 py-3'>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              remaining === 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {statusText}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          {remaining > 0 && canManageFinancialRecords && (
                            <Link
                              href={`/financial-records/${record._id}/add-payment`}
                            >
                              <Button size='sm' variant='outline'>
                                إضافة دفعة
                              </Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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

export default function FinancialRecordsPage() {
  return (
    <Suspense
      fallback={
        <div className='space-y-6'>
          <div className='flex justify-between items-center'>
            <Skeleton className='h-8 w-48' />
            <Skeleton className='h-10 w-32' />
          </div>
          <div className='flex flex-wrap gap-4'>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className='h-20 w-48' />
            ))}
          </div>
          <Skeleton className='h-96 w-full' />
        </div>
      }
    >
      <FinancialRecordsContent />
    </Suspense>
  )
}
