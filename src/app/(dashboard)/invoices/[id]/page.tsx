'use client'

import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useInvoiceById } from '@/hooks/useInvoices'
import { usePaymentsByInvoice } from '@/hooks/usePayments'
import { Payment, TreatmentStage, AuditLog } from '@/types/api'
import { useUserPermissions } from '@/hooks/usePermissions'
import { queryKeys } from '@/lib/queryKeys'
import { useEntityAuditHistory } from '@/hooks/useAuditLogs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AddPayForm } from '@/components/payments/add-pay-form'
import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export default function InvoiceDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const invoiceId = id as string
  const [openDialog, setOpenDialog] = useState(false)
  const queryClient = useQueryClient()
  const { canAddPayments } = useUserPermissions()

  // جلب تفاصيل الفاتورة
  const {
    data: invoice,
    isLoading: loadingInvoice,
    error: errorInvoice,
  } = useInvoiceById(invoiceId)

  // جلب الدفعات الخاصة بالفاتورة
  const {
    data: payments,
    isLoading: loadingPayments,
    error: errorPayments,
  } = usePaymentsByInvoice(invoiceId)

  // جلب سجل نشاط الفاتورة
  const {
    data: invoiceActivities,
    isLoading: loadingActivities,
    error: errorActivities,
  } = useEntityAuditHistory('Invoice', invoiceId, 50)

  // Refetch invoice, payments, and activities when page becomes visible (in case invoice was updated elsewhere)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && invoiceId) {
        queryClient.refetchQueries({
          queryKey: queryKeys.invoices.detail(invoiceId),
        })
        queryClient.refetchQueries({
          queryKey: queryKeys.payments.byInvoice(invoiceId),
        })
        queryClient.refetchQueries({
          queryKey: queryKeys.auditLogs.entity('Invoice', invoiceId),
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [invoiceId, queryClient])

  if (loadingInvoice) {
    return (
      <div className='p-6'>
        <div className='text-center py-12'>جارٍ التحميل...</div>
      </div>
    )
  }

  if (errorInvoice) {
    return (
      <div className='p-6'>
        <div className='text-center text-red-600 py-12'>
          حدث خطأ أثناء جلب البيانات
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className='p-6'>
        <div className='text-center py-12'>لا توجد بيانات</div>
      </div>
    )
  }

  const clientName =
    typeof invoice.client === 'object' && invoice.client !== null
      ? invoice.client.fullName
      : 'غير معروف'

  const clientPhone =
    typeof invoice.client === 'object' && invoice.client !== null
      ? invoice.client.phone || 'غير متوفر'
      : 'غير متوفر'

  const appointmentDate =
    typeof invoice.appointment === 'object' && invoice.appointment !== null
      ? invoice.appointment.date
      : null

  const createdByName =
    typeof invoice.createdBy === 'object' && invoice.createdBy !== null
      ? invoice.createdBy.name
      : 'غير معروف'

  const isFullyPaid = invoice.status === 'مدفوعة بالكامل'

  return (
    <div className='p-6 max-w-4xl mx-auto space-y-6'>
      <Button
        variant='outline'
        onClick={() => router.push('/invoices')}
        className='mb-4'
      >
        العودة إلى الفواتير
      </Button>

      <h1 className='text-2xl font-bold border-b pb-2'>تفاصيل الفاتورة</h1>

      {/* معلومات العميل */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات العميل</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid gap-2 text-sm'>
            <p>
              <strong>الاسم:</strong> {clientName}
            </p>
            <p>
              <strong>الهاتف:</strong> {clientPhone}
            </p>
            {appointmentDate && (
              <p>
                <strong>تاريخ الموعد:</strong>{' '}
                {new Date(appointmentDate).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ملخص الفاتورة */}
      <Card>
        <CardHeader>
          <CardTitle>الملخص المالي</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='flex justify-between items-center'>
            <span className='text-sm font-medium'>الإجمالي:</span>
            <span className='text-lg font-semibold'>
              {invoice.totalAmount?.toLocaleString() || '0'} ل.س
            </span>
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-sm font-medium'>المدفوع:</span>
            <span className='text-lg font-semibold text-green-600'>
              {invoice.paidAmount?.toLocaleString() || '0'} ل.س
            </span>
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-sm font-medium'>المتبقي:</span>
            <span
              className={`text-lg font-semibold ${
                invoice.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {invoice.remainingAmount?.toLocaleString() || '0'} ل.س
            </span>
          </div>
          <div className='flex justify-between items-center pt-2 border-t'>
            <span className='text-sm font-medium'>الحالة:</span>
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
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-sm font-medium'>أنشئت بواسطة:</span>
            <span className='text-sm'>{createdByName}</span>
          </div>
          {invoice.createdAt && (
            <div className='flex justify-between items-center'>
              <span className='text-sm font-medium'>تاريخ الإنشاء:</span>
              <span className='text-sm'>
                {new Date(invoice.createdAt).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}

          {/* زر إضافة دفعة */}
          {!isFullyPaid && canAddPayments && (
            <div className='pt-4'>
              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant='default'
                    className='bg-primary text-white hover:bg-primary/90'
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
                    clientId={
                      typeof invoice.client === 'object' && invoice.client !== null
                        ? invoice.client._id
                        : invoice.client
                    }
                    appointmentId={
                      typeof invoice.appointment === 'object' &&
                      invoice.appointment !== null
                        ? invoice.appointment._id
                        : invoice.appointment
                    }
                    payments={
                      payments?.map((p) => ({
                        _id: p._id,
                        amount: p.amount,
                        method: p.method,
                        createdAt: p.createdAt || p.date || new Date().toISOString(),
                      })) || []
                    }
                    remainingAmount={invoice.remainingAmount}
                    refetchInvoices={() => {
                      queryClient.invalidateQueries({ queryKey: ['invoices'] })
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.invoices.detail(invoiceId),
                      })
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.payments.byInvoice(invoiceId),
                      })
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.auditLogs.entity('Invoice', invoiceId),
                      })
                      // Explicitly refetch to ensure immediate updates
                      queryClient.refetchQueries({
                        queryKey: queryKeys.invoices.detail(invoiceId),
                      })
                      queryClient.refetchQueries({
                        queryKey: queryKeys.payments.byInvoice(invoiceId),
                      })
                      queryClient.refetchQueries({
                        queryKey: queryKeys.auditLogs.entity('Invoice', invoiceId),
                      })
                    }}
                    onClose={() => setOpenDialog(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* مراحل العلاج */}
      {Array.isArray(invoice.treatmentStages) &&
        invoice.treatmentStages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>مراحل العلاج</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm text-right'>
                  <thead>
                    <tr className='border-b bg-gray-100'>
                      <th className='px-4 py-2 font-semibold'>المرحلة</th>
                      <th className='px-4 py-2 font-semibold'>التكلفة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.treatmentStages.map((stage: TreatmentStage | string, index: number) => {
                      const stageId =
                        typeof stage === 'object' && stage !== null
                          ? stage._id
                          : stage || `stage-${index}`
                      const stageTitle =
                        typeof stage === 'object' && stage !== null
                          ? stage.title
                          : 'مرحلة غير معروفة'
                      const stageCost =
                        typeof stage === 'object' && stage !== null
                          ? stage.cost || 0
                          : 0

                      return (
                        <tr key={stageId} className='border-b hover:bg-gray-50'>
                          <td className='px-4 py-2'>{stageTitle}</td>
                          <td className='px-4 py-2'>
                            {stageCost.toLocaleString()} ل.س
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

      {/* قسم الدفعات */}
      <Card>
        <CardHeader>
          <CardTitle>سجل الدفعات</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPayments && (
            <div className='text-center py-4'>جارٍ تحميل الدفعات...</div>
          )}
          {errorPayments && (
            <div className='text-center text-red-600 py-4'>
              حدث خطأ أثناء جلب الدفعات
            </div>
          )}

          {!loadingPayments &&
            (!payments || (Array.isArray(payments) && payments.length === 0)) && (
              <div className='text-center text-gray-500 py-8'>
                لا توجد دفعات مسجلة بعد
              </div>
            )}

          {Array.isArray(payments) && payments.length > 0 && (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm text-right'>
                <thead>
                  <tr className='border-b bg-gray-100'>
                    <th className='px-4 py-2 font-semibold'>المبلغ</th>
                    <th className='px-4 py-2 font-semibold'>طريقة الدفع</th>
                    <th className='px-4 py-2 font-semibold'>تاريخ الدفعة</th>
                    <th className='px-4 py-2 font-semibold'>مسجل بواسطة</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment: Payment) => {
                    const receivedByName =
                      typeof payment.receivedBy === 'object' &&
                      payment.receivedBy !== null
                        ? payment.receivedBy.name
                        : 'غير معروف'

                    return (
                      <tr key={payment._id} className='border-b hover:bg-gray-50'>
                        <td className='px-4 py-2'>
                          {payment.amount.toLocaleString()} ل.س
                        </td>
                        <td className='px-4 py-2'>{payment.method}</td>
                        <td className='px-4 py-2'>
                          {payment.date
                            ? new Date(payment.date).toLocaleDateString('ar-EG', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : payment.createdAt
                            ? new Date(payment.createdAt).toLocaleDateString('ar-EG', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </td>
                        <td className='px-4 py-2'>{receivedByName}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* سجل نشاط الفاتورة */}
      <Card>
        <CardHeader>
          <CardTitle>سجل النشاط</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingActivities && (
            <div className='text-center py-4'>جارٍ تحميل سجل النشاط...</div>
          )}
          {errorActivities && (
            <div className='text-center text-red-600 py-4'>
              حدث خطأ أثناء جلب سجل النشاط
            </div>
          )}

          {!loadingActivities &&
            (!invoiceActivities ||
              (Array.isArray(invoiceActivities) &&
                invoiceActivities.length === 0)) && (
              <div className='text-center text-gray-500 py-8'>
                لا يوجد سجل نشاط للفاتورة
              </div>
            )}

          {Array.isArray(invoiceActivities) && invoiceActivities.length > 0 && (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm text-right'>
                <thead>
                  <tr className='border-b bg-gray-100'>
                    <th className='px-4 py-2 font-semibold'>الإجراء</th>
                    <th className='px-4 py-2 font-semibold'>المستخدم</th>
                    <th className='px-4 py-2 font-semibold'>التاريخ والوقت</th>
                    <th className='px-4 py-2 font-semibold'>التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceActivities.map((activity: AuditLog) => {
                    const performedByName =
                      typeof activity.performedBy === 'object' &&
                      activity.performedBy !== null
                        ? activity.performedBy.name
                        : 'غير معروف'

                    const actionLabel =
                      activity.action === 'create'
                        ? 'إنشاء'
                        : activity.action === 'update'
                        ? 'تحديث'
                        : activity.action === 'delete'
                        ? 'حذف'
                        : activity.action

                    return (
                      <tr key={activity._id} className='border-b hover:bg-gray-50'>
                        <td className='px-4 py-2'>
                          <Badge
                            variant={
                              activity.action === 'create'
                                ? 'secondary'
                                : activity.action === 'update'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {actionLabel}
                          </Badge>
                        </td>
                        <td className='px-4 py-2'>{performedByName}</td>
                        <td className='px-4 py-2'>
                          {activity.performedAt
                            ? new Date(activity.performedAt).toLocaleDateString(
                                'ar-EG',
                                {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )
                            : '-'}
                        </td>
                        <td className='px-4 py-2'>
                          {activity.action === 'update' && activity.changes ? (
                            <div className='text-xs text-gray-600'>
                              {activity.changes.before &&
                              activity.changes.after ? (
                                <div>
                                  {(() => {
                                    const before =
                                      (activity.changes?.before as Record<
                                        string,
                                        unknown
                                      >) || {}
                                    const after =
                                      (activity.changes?.after as Record<
                                        string,
                                        unknown
                                      >) || {}
                                    return (
                                      <>
                                        {after.status &&
                                        before.status !== after.status ? (
                                          <div>
                                            الحالة: {String(before.status || '')} →{' '}
                                            {String(after.status || '')}
                                          </div>
                                        ) : null}
                                        {after.paidAmount !== undefined &&
                                        before.paidAmount !== after.paidAmount ? (
                                          <div>
                                            المدفوع:{' '}
                                            {String(before.paidAmount || 0)} →{' '}
                                            {String(after.paidAmount || 0)}
                                          </div>
                                        ) : null}
                                        {after.totalAmount !== undefined &&
                                        before.totalAmount !== after.totalAmount ? (
                                          <div>
                                            الإجمالي:{' '}
                                            {String(before.totalAmount || 0)} →{' '}
                                            {String(after.totalAmount || 0)}
                                          </div>
                                        ) : null}
                                      </>
                                    )
                                  })()}
                                </div>
                              ) : (
                                'تم التحديث'
                              )}
                            </div>
                          ) : activity.action === 'create' ? (
                            'تم إنشاء الفاتورة'
                          ) : activity.action === 'delete' ? (
                            'تم حذف الفاتورة'
                          ) : (
                            '-'
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
    </div>
  )
}

