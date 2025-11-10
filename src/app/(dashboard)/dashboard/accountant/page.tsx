// src/app/(dashboard)/dashboard/accountant/page.tsx
'use client'

import React, { Suspense } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useInvoices } from '@/hooks/useInvoices'
import { useFinancialRecords } from '@/hooks/useFinancialRecord'
import { Invoice, FinancialRecord, PaginatedResponse } from '@/types/api'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { FileText, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

function AccountantDashboardContent() {
  const { data: invoices, isLoading: invoicesLoading } = useInvoices()
  const { data: financialRecords, isLoading: recordsLoading } = useFinancialRecords()

  const typedInvoices = invoices as PaginatedResponse<Invoice> | undefined
  const typedFinancialRecords = financialRecords as PaginatedResponse<FinancialRecord> | undefined

  // Calculate unpaid invoices
  const unpaidInvoices =
    typedInvoices?.data?.filter(
      (inv: Invoice) => inv.status !== 'مدفوعة بالكامل' && inv.remainingAmount > 0
    ) || []
  
  const unpaidAmount = unpaidInvoices.reduce(
    (sum: number, inv: Invoice) => sum + (inv.remainingAmount || 0),
    0
  )

  // Calculate overdue payments (invoices with remaining amount older than 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const overdueInvoices = unpaidInvoices.filter((inv: Invoice) => {
    const invoiceDate = new Date(inv.createdAt || '')
    return invoiceDate < thirtyDaysAgo
  })

  const overdueAmount = overdueInvoices.reduce(
    (sum: number, inv: Invoice) => sum + (inv.remainingAmount || 0),
    0
  )

  // Calculate daily revenue (today's payments)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const todayPayments = typedFinancialRecords?.data?.filter((record: FinancialRecord) => {
    if (!record.recordDate) return false
    const recordDate = new Date(record.recordDate)
    recordDate.setHours(0, 0, 0, 0)
    return recordDate.getTime() === today.getTime() && record.recordType === 'purchase'
  }) || []

  const dailyRevenue = todayPayments.reduce(
    (sum: number, record: FinancialRecord) => sum + (record.totalAmount || 0),
    0
  )

  return (
    <main className='p-8 bg-gradient-to-b from-white to-gray-100 min-h-screen'>
      <h1 className='text-4xl font-extrabold mb-8 text-gray-900 tracking-wide'>
        لوحة تحكم المحاسب
      </h1>

      {/* Statistics Cards */}
      <section className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8'>
        <Card className='shadow-lg hover:shadow-xl transition-shadow'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-lg font-semibold text-gray-700 flex items-center gap-2'>
              <FileText className='w-5 h-5 text-red-600' />
              الفواتير غير المدفوعة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <Skeleton className='h-8 w-20' />
            ) : (
              <>
                <p className='text-3xl font-extrabold text-red-600'>
                  {unpaidInvoices.length}
                </p>
                <p className='text-sm text-gray-500 mt-1'>
                  {unpaidAmount.toLocaleString()} ل.س
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className='shadow-lg hover:shadow-xl transition-shadow'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-lg font-semibold text-gray-700 flex items-center gap-2'>
              <AlertTriangle className='w-5 h-5 text-orange-600' />
              المدفوعات المتأخرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <Skeleton className='h-8 w-20' />
            ) : (
              <>
                <p className='text-3xl font-extrabold text-orange-600'>
                  {overdueInvoices.length}
                </p>
                <p className='text-sm text-gray-500 mt-1'>
                  {overdueAmount.toLocaleString()} ل.س
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className='shadow-lg hover:shadow-xl transition-shadow'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-lg font-semibold text-gray-700 flex items-center gap-2'>
              <TrendingUp className='w-5 h-5 text-green-600' />
              إيرادات اليوم
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recordsLoading ? (
              <Skeleton className='h-8 w-20' />
            ) : (
              <p className='text-3xl font-extrabold text-green-600'>
                {dailyRevenue.toLocaleString()} ل.س
              </p>
            )}
          </CardContent>
        </Card>

        <Card className='shadow-lg hover:shadow-xl transition-shadow'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-lg font-semibold text-gray-700 flex items-center gap-2'>
              <DollarSign className='w-5 h-5 text-indigo-600' />
              إجمالي الفواتير
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <Skeleton className='h-8 w-20' />
            ) : (
              <p className='text-3xl font-extrabold text-indigo-600'>
                {typedInvoices?.data?.length || 0}
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Unpaid Invoices List */}
      <Card className='shadow-lg mb-8'>
        <CardHeader>
          <div className='flex justify-between items-center'>
            <div>
              <CardTitle className='text-2xl font-bold text-gray-800'>
                الفواتير غير المدفوعة
              </CardTitle>
              <CardDescription>
                قائمة الفواتير التي لم يتم دفعها بالكامل
              </CardDescription>
            </div>
            <Link href='/invoices'>
              <Button variant='outline'>عرض الكل</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className='space-y-3'>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className='h-16 w-full' />
              ))}
            </div>
          ) : unpaidInvoices.length > 0 ? (
            <div className='space-y-3 max-h-[400px] overflow-y-auto'>
              {unpaidInvoices.slice(0, 10).map((invoice: Invoice) => (
                <div
                  key={invoice._id}
                  className='border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition'
                >
                  <div className='flex justify-between items-start mb-2'>
                    <div>
                      <p className='font-semibold text-lg text-indigo-700'>
                        {typeof invoice.patient === 'object' && invoice.patient !== null
                          ? invoice.patient.fullName
                          : 'غير معروف'}
                      </p>
                      <p className='text-sm text-gray-600'>
                        {invoice.createdAt
                          ? format(new Date(invoice.createdAt), 'dd MMM yyyy', {
                              locale: arSA,
                            })
                          : '-'}
                      </p>
                    </div>
                    <Badge variant={invoice.status === 'مدفوعة جزئيًا' ? 'secondary' : 'destructive'}>
                      {invoice.status}
                    </Badge>
                  </div>
                  <div className='flex justify-between items-center text-sm'>
                    <div>
                      <span className='text-gray-600'>الإجمالي: </span>
                      <strong>{invoice.totalAmount?.toLocaleString()} ل.س</strong>
                    </div>
                    <div>
                      <span className='text-gray-600'>المتبقي: </span>
                      <strong className='text-red-600'>
                        {invoice.remainingAmount?.toLocaleString()} ل.س
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className='text-center text-gray-500 py-8'>
              لا توجد فواتير غير مدفوعة
            </p>
          )}
        </CardContent>
      </Card>

      {/* Overdue Payments Alert */}
      {overdueInvoices.length > 0 && (
        <Card className='shadow-lg border-orange-300 bg-orange-50'>
          <CardHeader>
            <CardTitle className='text-xl font-bold text-orange-800 flex items-center gap-2'>
              <AlertTriangle className='w-6 h-6' />
              تنبيه: مدفوعات متأخرة
            </CardTitle>
            <CardDescription className='text-orange-700'>
              يوجد {overdueInvoices.length} فاتورة متأخرة عن الدفع لأكثر من 30 يوم
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-lg font-semibold text-orange-900'>
              المبلغ الإجمالي المتأخر: {overdueAmount.toLocaleString()} ل.س
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  )
}

export default function AccountantDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className='p-8 bg-gradient-to-b from-white to-gray-100 min-h-screen'>
          <h1 className='text-4xl font-extrabold mb-8 text-gray-900 tracking-wide'>
            لوحة تحكم المحاسب
          </h1>
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8'>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className='h-32 w-full' />
            ))}
          </div>
        </main>
      }
    >
      <AccountantDashboardContent />
    </Suspense>
  )
}

