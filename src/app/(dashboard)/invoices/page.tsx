'use client'

import { useState, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useInvoices } from '@/hooks/useInvoices'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { AddPayForm } from '@/components/payments/add-pay-form'
import { useUserPermissions } from '@/hooks/usePermissions'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Invoice, PaginatedResponse } from '@/types/api'
import { Skeleton } from '@/components/ui/skeleton'

function InvoicesContent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [openDialogId, setOpenDialogId] = useState<string | null>(null)
  const { page, limit, goToPage, changeLimit } = usePagination(10)
  const { data, isLoading, refetch } = useInvoices()
  const { canAddPayments, canManageInvoices } = useUserPermissions()

  const typedData = data as PaginatedResponse<Invoice> | undefined
  const invoices = typedData?.data || []

  const filteredInvoices = invoices.filter((invoice: Invoice) => {
    const patientName =
      typeof invoice.patient === 'object' && invoice.patient !== null
        ? invoice.patient.fullName || ''
        : ''
    return patientName.toLowerCase().includes(searchTerm.toLowerCase())
  })
  const paginationMeta = typedData?.pagination
    ? {
        page: typedData.pagination.page,
        limit: typedData.pagination.limit,
        total: typedData.pagination.total,
        totalPages: typedData.pagination.totalPages,
      }
    : { page, limit, total: 0, totalPages: 0 }

  return (
    <div className='p-6 space-y-6'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>الفواتير</h1>
        {canManageInvoices && (
          <Link href='/invoices/new'>
            <Button className='flex items-center gap-2'>
              <Plus className='w-4 h-4' />
              إضافة فاتورة
            </Button>
          </Link>
        )}
      </div>

      <Input
        placeholder='ابحث باسم المريض...'
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className='max-w-sm'
      />

      <Card>
        <CardHeader>
          <CardTitle>قائمة الفواتير</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          {isLoading ? (
            <div className='flex justify-center items-center py-12'>
              <p>جاري التحميل...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <p className='text-center text-gray-500 py-12'>
              لا توجد فواتير حتى الآن
            </p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm text-right'>
                <thead>
                  <tr className='border-b bg-gray-100'>
                    <th className='px-4 py-3 font-semibold'>رقم الفاتورة</th>
                    <th className='px-4 py-3 font-semibold'>المريض</th>
                    <th className='px-4 py-3 font-semibold'>الإجمالي</th>
                    <th className='px-4 py-3 font-semibold'>المدفوع</th>
                    <th className='px-4 py-3 font-semibold'>المتبقي</th>
                    <th className='px-4 py-3 font-semibold'>التاريخ</th>
                    <th className='px-4 py-3 font-semibold'>الحالة</th>
                    <th className='px-4 py-3 font-semibold'>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice: Invoice, index: number) => {
                    const patientName =
                      typeof invoice.patient === 'object' && invoice.patient !== null
                        ? invoice.patient.fullName
                        : 'غير معروف'
                    const isFullyPaid = invoice.status === 'مدفوعة بالكامل'

                    return (
                      <tr
                        key={invoice._id}
                        className='border-b hover:bg-gray-50 transition-colors'
                      >
                        <td className='px-4 py-3 font-medium'>
                          IVN-{String(index + 1).padStart(4, '0')}
                        </td>
                        <td className='px-4 py-3'>{patientName}</td>
                        <td className='px-4 py-3'>
                          {invoice.totalAmount?.toLocaleString() || '0'} ل.س
                        </td>
                        <td className='px-4 py-3'>
                          {invoice.paidAmount?.toLocaleString() || '0'} ل.س
                        </td>
                        <td className='px-4 py-3'>
                          <span
                            className={
                              invoice.remainingAmount > 0
                                ? 'text-red-600 font-semibold'
                                : 'text-green-600'
                            }
                          >
                            {invoice.remainingAmount?.toLocaleString() || '0'} ل.س
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          {invoice.createdAt
                            ? new Date(invoice.createdAt).toLocaleDateString('ar-EG')
                            : '-'}
                        </td>
                        <td className='px-4 py-3'>
                          <Badge
                            variant={
                              invoice.status === 'مدفوعة بالكامل'
                                ? 'secondary'
                                : invoice.status === 'مدفوعة جزئيًا'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {invoice.status}
                          </Badge>
                        </td>
                        <td className='px-4 py-3'>
                          {!isFullyPaid && canAddPayments && (
                            <Dialog
                              open={openDialogId === invoice._id}
                              onOpenChange={(isOpen) =>
                                setOpenDialogId(isOpen ? invoice._id : null)
                              }
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  onClick={() => setOpenDialogId(invoice._id)}
                                >
                                  إضافة دفعة
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>إضافة دفعة</DialogTitle>
                                  <DialogDescription>
                                    قم بإضافة دفعة جديدة للفاتورة
                                  </DialogDescription>
                                </DialogHeader>
                                <AddPayForm
                                  invoiceId={invoice._id}
                                  patientId={
                                    typeof invoice.patient === 'object' &&
                                    invoice.patient !== null
                                      ? invoice.patient._id
                                      : invoice.patient
                                  }
                                  appointmentId={
                                    typeof invoice.appointment === 'object' &&
                                    invoice.appointment !== null
                                      ? invoice.appointment._id
                                      : invoice.appointment
                                  }
                                  payments={[]}
                                  remainingAmount={invoice.remainingAmount}
                                  refetchInvoices={refetch}
                                  onClose={() => setOpenDialogId(null)}
                                />
                              </DialogContent>
                            </Dialog>
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

export default function InvoicesPage() {
  return (
    <Suspense
      fallback={
        <div className='p-6 space-y-6'>
          <div className='flex justify-between items-center'>
            <Skeleton className='h-8 w-32' />
            <Skeleton className='h-10 w-32' />
          </div>
          <Skeleton className='h-10 w-64' />
          <Skeleton className='h-96 w-full' />
        </div>
      }
    >
      <InvoicesContent />
    </Suspense>
  )
}
