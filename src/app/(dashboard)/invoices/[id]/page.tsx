'use client'

import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useInvoiceById } from '@/hooks/useInvoices'
import { usePaymentsByInvoice } from '@/hooks/usePayments'
import { Payment, TreatmentStage, AuditLog, AppointmentService, Invoice } from '@/types/api'
import { useUserPermissions } from '@/hooks/usePermissions'
import { queryKeys } from '@/lib/queryKeys'
import { useEntityAuditHistory } from '@/hooks/useAuditLogs'
import { isGloballyRateLimited, setGlobalRateLimited, cleanupExpiredRateLimit } from '@/lib/rateLimit'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AddPayForm } from '@/components/payments/add-pay-form'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { ApiResponse } from '@/types/api'
import { ClipboardList, Pencil, FileText, Layers, CreditCard, Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function InvoiceDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const invoiceId = id as string
  const [openDialog, setOpenDialog] = useState(false)
  const [preSelectedStage, setPreSelectedStage] = useState<string | null>(null)
  const [hasCheckedRecalculation, setHasCheckedRecalculation] = useState(false)
  const [openPaymentsDialog, setOpenPaymentsDialog] = useState(false)
  const [selectedStageForPayments, setSelectedStageForPayments] = useState<TreatmentStage | null>(null)
  const [activityTab, setActivityTab] = useState<'payments' | 'stages' | 'invoice'>('payments')
  const paymentActivityCache = useRef<AuditLog[]>([])
  const [isPaymentRefetching, setIsPaymentRefetching] = useState(false)
  const [manualPaymentRefreshKey, setManualPaymentRefreshKey] = useState(0)
  const [paymentActivityError, setPaymentActivityError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { canAddPayments, hasPermission, canViewInvoiceActivities } = useUserPermissions()
  const canEditPayments = hasPermission('payments.edit') || hasPermission('payments.update')

  useEffect(() => {
    const cleanupInterval = setInterval(cleanupExpiredRateLimit, 1000)
    return () => clearInterval(cleanupInterval)
  }, [])

  const isRateLimited = isGloballyRateLimited()

  // جلب تفاصيل الفاتورة
  const {
    data: invoice,
    isLoading: loadingInvoice,
    error: errorInvoice,
    refetch: refetchInvoice,
  } = useInvoiceById(invoiceId)

  // جلب الدفعات الخاصة بالفاتورة
  const {
    data: payments,
    isLoading: loadingPayments,
    error: errorPayments,
    refetch: refetchPayments,
  } = usePaymentsByInvoice(invoiceId)

  // جلب سجل نشاط الفاتورة
  const {
    data: invoiceActivities,
    isLoading: loadingActivities,
    error: errorActivities,
    refetch: refetchInvoiceActivities,
  } = useEntityAuditHistory('Invoice', invoiceId, 100, activityTab === 'invoice')

  // جلب سجلات المدفوعات
  const paymentIds = useMemo(() => {
    if (!payments || !Array.isArray(payments)) return []
    return payments.map((p: Payment) => String(p._id))
  }, [payments])

  const paymentMap = useMemo(() => {
    const map = new Map<string, Payment>()
    if (Array.isArray(payments)) {
      payments.forEach((payment) => {
        map.set(String(payment._id), payment)
      })
    }
    return map
  }, [payments])

  // جلب سجلات المراحل
  const stageIds = useMemo(() => {
    if (!invoice?.treatmentStages || !Array.isArray(invoice.treatmentStages)) return []
    return invoice.treatmentStages.map((s) => {
      if (typeof s === 'object' && s !== null) {
        return String((s as TreatmentStage)._id)
      }
      return String(s)
    })
  }, [invoice?.treatmentStages])

  // Helper function to get audit logs for multiple entities
  const getAllPaymentActivities = useCallback(async () => {
    if (!paymentIds.length) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Skipping payment activity fetch: no payment IDs')
      }
      return []
    }

    if (isGloballyRateLimited() && paymentActivityCache.current.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Rate limited while fetching payment activities, using cached data')
      }
      return paymentActivityCache.current
    }

    const allActivities: AuditLog[] = []
    
    // Process requests with delay to avoid rate limiting
    for (let i = 0; i < paymentIds.length; i++) {
      const paymentId = paymentIds[i]
      
      // Add delay between requests (except for the first one)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 200)) // 200ms delay to avoid rate limiting
      }
      
      try {
        const { data } = await axios.get<ApiResponse<AuditLog[]>>(
          `/audit-logs/entity/Payment/${paymentId}`,
          { params: { limit: 50 } }
        )
        if (data.data) {
          allActivities.push(...data.data)
        }
      } catch (error: unknown) {
        // Log error but continue with other requests
        const axiosError = error as { response?: { status?: number }; message?: string }
        if (axiosError.response?.status === 429) {
          console.warn(`Rate limit hit for payment ${paymentId}, backing off...`)
          setGlobalRateLimited()
          break
        } else if (axiosError.response?.status === 403) {
          // Permission denied - silently skip (user may not have permission to view audit logs)
          // Don't log as error, just continue
        } else {
          // Only log non-403, non-429 errors
          console.warn(`Error fetching audit log for payment ${paymentId}:`, axiosError.response?.status || axiosError.message)
        }
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('Fetched payment audit logs', {
        invoiceId,
        paymentIdsCount: paymentIds.length,
        activityCount: allActivities.length,
      })
    }

    return allActivities.sort((a, b) => {
      const dateA = a.performedAt ? new Date(a.performedAt).getTime() : 0
      const dateB = b.performedAt ? new Date(b.performedAt).getTime() : 0
      return dateB - dateA
    })
  }, [paymentIds, invoiceId])

  const getAllStageActivities = useCallback(async () => {
    if (!stageIds.length || isGloballyRateLimited()) return []
    const allActivities: AuditLog[] = []
    
    // Process requests with delay to avoid rate limiting
    for (let i = 0; i < stageIds.length; i++) {
      const stageId = stageIds[i]
      
      // Add delay between requests (except for the first one)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 200)) // 200ms delay to avoid rate limiting
      }
      
      try {
        const { data } = await axios.get<ApiResponse<AuditLog[]>>(
          `/audit-logs/entity/TreatmentStage/${stageId}`,
          { params: { limit: 50 } }
        )
        if (data.data) {
          allActivities.push(...data.data)
        }
      } catch (error: unknown) {
        // Log error but continue with other requests
        const axiosError = error as { response?: { status?: number }; message?: string }
        if (axiosError.response?.status === 429) {
          console.warn(`Rate limit hit for stage ${stageId}, backing off...`)
          setGlobalRateLimited()
          break
        } else if (axiosError.response?.status === 403) {
          // Permission denied - silently skip (user may not have permission to view audit logs)
          // Don't log as error, just continue
        } else {
          // Only log non-403, non-429 errors
          console.warn(`Error fetching audit log for stage ${stageId}:`, axiosError.response?.status || axiosError.message)
        }
      }
    }
    
    return allActivities.sort((a, b) => {
      const dateA = a.performedAt ? new Date(a.performedAt).getTime() : 0
      const dateB = b.performedAt ? new Date(b.performedAt).getTime() : 0
      return dateB - dateA
    })
  }, [stageIds])

  const { data: paymentActivities = [], isFetching: isFetchingPaymentActivities, error: paymentActivitiesQueryError } = useQuery({
    queryKey: ['payment-activities', paymentIds, manualPaymentRefreshKey],
    queryFn: getAllPaymentActivities,
    enabled: paymentIds.length > 0 && activityTab === 'payments' && !isRateLimited,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error: unknown) => {
      // Don't retry on 429 (rate limit) or 403 (forbidden) errors
      const axiosError = error as { response?: { status?: number } } | null
      if (axiosError?.response?.status === 429 || axiosError?.response?.status === 403) {
        return false
      }
      return failureCount < 2
    },
  })

  // Handle success: clear error when data is successfully fetched
  useEffect(() => {
    if (paymentActivities && paymentActivities.length >= 0 && !paymentActivitiesQueryError) {
      setPaymentActivityError(null)
    }
  }, [paymentActivities, paymentActivitiesQueryError])

  // Handle error: set error message when query fails
  useEffect(() => {
    if (paymentActivitiesQueryError) {
      const axiosError = paymentActivitiesQueryError as { message?: string }
      setPaymentActivityError(axiosError?.message || 'تعذر تحميل سجل الدفعات')
    }
  }, [paymentActivitiesQueryError])

  useEffect(() => {
    if (paymentActivities && paymentActivities.length > 0) {
      paymentActivityCache.current = paymentActivities
    }
  }, [paymentActivities])

  useEffect(() => {
    setIsPaymentRefetching(isFetchingPaymentActivities)
  }, [isFetchingPaymentActivities])

  const handleManualPaymentRefresh = useCallback(() => {
    setPaymentActivityError(null)
    setManualPaymentRefreshKey((prev) => prev + 1)
    queryClient.invalidateQueries({ queryKey: ['payment-activities'] })
  }, [queryClient])

  const { data: stageActivities = [], isLoading: loadingStageActivities } = useQuery({
    queryKey: ['stage-activities', stageIds],
    queryFn: getAllStageActivities,
    enabled: stageIds.length > 0 && activityTab === 'stages' && !isRateLimited,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error: unknown) => {
      // Don't retry on 429 (rate limit) or 403 (forbidden) errors
      const axiosError = error as { response?: { status?: number } } | null
      if (axiosError?.response?.status === 429 || axiosError?.response?.status === 403) {
        return false
      }
      return failureCount < 2
    },
  })

  // Get appointment ID from invoice
  const appointmentId = useMemo(() => {
    if (!invoice) return null
    if (typeof invoice.appointment === 'object' && invoice.appointment !== null) {
      const appointment = invoice.appointment as { _id?: string; id?: string }
      return appointment._id || appointment.id || null
    }
    return invoice.appointment as string | null
  }, [invoice])

  // Fetch appointment services
  const { data: appointmentServices = [], isLoading: loadingServices } = useQuery({
    queryKey: ['appointment-services', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return []
      const { data } = await axios.get<ApiResponse<AppointmentService[]>>(
        `/appointments/${appointmentId}/services`
      )
      return data.data || []
    },
    enabled: !!appointmentId,
  })

  // Refetch invoice when appointment services are loaded to get populated treatment stages
  useEffect(() => {
    if (!loadingServices && appointmentServices.length > 0 && invoice) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.detail(invoiceId),
      })
    }
  }, [loadingServices, appointmentServices.length, invoiceId, queryClient, invoice])

  // Recalculate invoice amounts when payments change (in case payments were deleted externally)
  // This ensures invoice amounts stay in sync with actual payments from the database
  // Only run this check once after initial load, not on every change
  useEffect(() => {
    // Only check once after data is loaded, not on every change
    if (!loadingPayments && !loadingInvoice && payments && invoice && !hasCheckedRecalculation) {
      // Calculate total from actual payments
      const actualPaidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
      const invoicePaidAmount = invoice.paidAmount || 0
      
      // If there's a significant mismatch (more than 1 SYP difference), trigger recalculation
      if (Math.abs(invoicePaidAmount - actualPaidAmount) > 1) {
        // Recalculate invoice amounts from API to sync with database
        axios.post(`/payments/invoice/${invoiceId}/recalculate`)
          .then(() => {
            queryClient.invalidateQueries({
              queryKey: queryKeys.invoices.detail(invoiceId),
            })
            queryClient.invalidateQueries({
              queryKey: queryKeys.payments.byInvoice(invoiceId),
            })
          })
          .catch((error) => {
            console.error('Failed to recalculate invoice amounts:', error)
          })
      }
      setHasCheckedRecalculation(true)
    }
  }, [loadingPayments, loadingInvoice, payments, invoice, invoiceId, queryClient, hasCheckedRecalculation])

  // Helper function to calculate paid amount for a specific stage
  const calculateStagePaid = useCallback((stageId: string): number => {
    if (!payments || payments.length === 0) return 0
    
    return payments.reduce((sum, payment) => {
      // Skip payments without specific treatmentStages (old format)
      if (!payment.treatmentStages || 
          (Array.isArray(payment.treatmentStages) && payment.treatmentStages.length === 0)) {
        return sum // Don't apply old payments to specific stages
      }
      
      // Payment has specific stages - extract stage IDs as strings for comparison
      const paymentStageIds = payment.treatmentStages.map((ts) => {
        if (typeof ts === 'string') {
          return String(ts).trim()
        }
        if (typeof ts === 'object' && ts !== null) {
          // Handle populated TreatmentStage object
          const stageObj = ts as TreatmentStage
          return String(stageObj._id || stageObj.id || ts).trim()
        }
        return String(ts).trim()
      })
      
      // Convert current stage ID to string for comparison
      const currentStageId = String(stageId).trim()
      
      // Check if this payment is specifically for THIS EXACT stage
      const isForThisStage = paymentStageIds.some(id => {
        // Normalize both IDs to strings and compare
        const normalizedId = String(id).trim().toLowerCase()
        const normalizedCurrent = String(currentStageId).trim().toLowerCase()
        return normalizedId === normalizedCurrent
      })
      
      if (isForThisStage) {
        // Payment is for this stage - apply FULL amount (payments are single-stage only)
        return sum + (payment.amount || 0)
      }
      
      // Payment is not for this stage
      return sum
    }, 0)
  }, [payments])

  // Group treatment stages by service
  const stagesByService = useMemo(() => {
    if (!Array.isArray(invoice?.treatmentStages) || !appointmentServices.length) {
      return {}
    }

    const grouped: Record<string, TreatmentStage[]> = {}
    
    // Initialize with all services
    appointmentServices.forEach((as) => {
      grouped[as._id] = []
    })
    
    // Group stages by appointmentService
    invoice.treatmentStages.forEach((stage) => {
      const stageObj = typeof stage === 'object' && stage !== null ? stage : null
      if (!stageObj) return

      // Extract appointmentService ID - handle both populated object and string ID
      let appointmentServiceId: string | null = null
      
      if (stageObj.appointmentService) {
        if (typeof stageObj.appointmentService === 'object' && stageObj.appointmentService !== null) {
          // It's a populated object - get the _id
          const asObj = stageObj.appointmentService as AppointmentService
          appointmentServiceId = asObj._id || asObj.id || null
        } else if (typeof stageObj.appointmentService === 'string') {
          // It's a string ID
          appointmentServiceId = stageObj.appointmentService
        }
      }
      
      // Try to match with appointmentService IDs
      if (appointmentServiceId) {
        // Find matching appointmentService by _id (convert to string for comparison)
        const matchingService = appointmentServices.find((as) => {
          const asId = String(as._id || as.id || '')
          const serviceId = String(appointmentServiceId || '')
          return asId === serviceId
        })
        
        if (matchingService) {
          const key = matchingService._id || matchingService.id
          if (key && grouped[key]) {
            grouped[key].push(stageObj)
          } else if (key) {
            // Key exists but not in grouped - initialize it
            grouped[key] = [stageObj]
          }
        } else {
          // Service ID doesn't match - this shouldn't happen, but fallback to first service
          console.warn('Treatment stage appointmentService ID does not match any appointment service:', appointmentServiceId)
          const firstServiceId = appointmentServices[0]?._id || appointmentServices[0]?.id
          if (firstServiceId && grouped[firstServiceId]) {
            grouped[firstServiceId].push(stageObj)
          }
        }
      } else {
        // No appointmentService field - old format, distribute to first service
        // This means the treatment stage was created before the migration
        const firstServiceId = appointmentServices[0]?._id || appointmentServices[0]?.id
        if (firstServiceId && grouped[firstServiceId]) {
          grouped[firstServiceId].push(stageObj)
        }
      }
    })
    
    return grouped
  }, [invoice?.treatmentStages, appointmentServices])

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
      <div className='bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800'>
        <h3 className='font-semibold text-base mb-3 text-blue-900 dark:text-blue-100'>
          معلومات العميل
        </h3>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>الاسم</p>
            <p className='text-sm font-bold text-gray-900 dark:text-gray-100'>{clientName}</p>
          </div>
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>الهاتف</p>
            <p className='text-sm font-bold text-gray-900 dark:text-gray-100'>{clientPhone}</p>
          </div>
          {appointmentDate && (
            <div>
              <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>تاريخ الموعد</p>
              <p className='text-sm font-bold text-gray-900 dark:text-gray-100'>
                {new Date(appointmentDate).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ملخص الفاتورة */}
      <div className='bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800'>
        <h3 className='font-semibold text-base mb-3 text-blue-900 dark:text-blue-100'>
          الملخص المالي
        </h3>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4'>
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>الإجمالي</p>
            <p className='text-lg font-bold text-gray-900 dark:text-gray-100'>
              {invoice.totalAmount?.toLocaleString() || '0'} ل.س
            </p>
          </div>
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>المبلغ المدفوع</p>
            <p className='text-lg font-bold text-green-600'>
              {invoice.paidAmount?.toLocaleString() || '0'} ل.س
            </p>
            {payments && payments.length > 0 && (
              <p className='text-xs text-gray-500 mt-1'>({payments.length} دفعة)</p>
            )}
          </div>
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>المبلغ المتبقي</p>
            <p className={`text-lg font-bold ${
              invoice.remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'
            }`}>
              {invoice.remainingAmount?.toLocaleString() || '0'} ل.س
            </p>
          </div>
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>حالة الدفع</p>
            <Badge
              variant={
                invoice.status === 'مدفوعة بالكامل'
                  ? 'secondary'
                  : invoice.status === 'مدفوعة جزئيًا'
                  ? 'secondary'
                  : 'destructive'
              }
              className='text-sm font-semibold'
            >
              {invoice.status === 'مدفوعة جزئيًا' && '⚠ '}
              {invoice.status}
            </Badge>
          </div>
        </div>
        
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-blue-300 dark:border-blue-700'>
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>أنشئت بواسطة</p>
            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>{createdByName}</p>
          </div>
          {invoice.createdAt && (
            <div>
              <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>تاريخ الإنشاء</p>
              <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                {new Date(invoice.createdAt).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>

        <div className='pt-4 flex flex-wrap gap-2'>
          {/* زر إعادة حساب المبالغ */}
          <Button
            variant='outline'
            size='sm'
            onClick={async () => {
              try {
                await axios.post(`/payments/invoice/${invoiceId}/recalculate`)
        await Promise.all([
          refetchInvoice(),
          refetchPayments(),
        ])
                toast.success('تم إعادة حساب المبالغ بنجاح')
              } catch (error) {
                console.error(error)
                toast.error('فشل في إعادة حساب المبالغ')
              }
            }}
            className='text-xs'
          >
            إعادة حساب المبالغ
          </Button>

          {/* زر إضافة دفعة */}
          {!isFullyPaid && canAddPayments && (
              <Dialog 
                open={openDialog} 
                onOpenChange={(open) => {
                  setOpenDialog(open)
                  if (!open) {
                    // Clear pre-selected stage when dialog closes
                    setPreSelectedStage(null)
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant='default'
                    className='bg-primary text-white hover:bg-primary/90'
                    onClick={() => {
                      // Clear pre-selected stage when opening from main button
                      setPreSelectedStage(null)
                    }}
                  >
                    إضافة دفعة
                  </Button>
                </DialogTrigger>
                <DialogContent className='overflow-hidden max-w-[95vw] w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
                  <DialogHeader className='sticky top-0 bg-background z-10 pb-4 border-b -mx-6 px-6 -mt-6 pt-6'>
                    <DialogTitle>إضافة دفعة</DialogTitle>
                    <DialogDescription>
                      قم بإضافة دفعة جديدة للفاتورة
                    </DialogDescription>
                  </DialogHeader>
                  <div className='overflow-y-auto max-h-[calc(90vh-120px)]'>
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
                    payments={payments || []} // Pass full payment objects with treatmentStages
                    remainingAmount={invoice.remainingAmount}
                    treatmentStages={
                      Array.isArray(invoice.treatmentStages)
                        ? invoice.treatmentStages.filter(
                            (stage): stage is TreatmentStage =>
                              typeof stage === 'object' && stage !== null
                          )
                        : []
                    }
                    appointmentServices={appointmentServices}
                    stagesByService={stagesByService}
                    initialSelectedStage={preSelectedStage}
                    refetchInvoices={async () => {
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.invoices.detail(invoiceId),
                      })
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.payments.byInvoice(invoiceId),
                      })
                      
                      await Promise.all([
                        refetchInvoice(),
                        refetchPayments(),
                      ])
                      
                      setHasCheckedRecalculation(false)
                    }}
                    onPaymentSuccess={() => {
                      queryClient.invalidateQueries({
                        queryKey: ['payment-activities', paymentIds],
                      })
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.auditLogs.entity('Invoice', invoiceId),
                      })

                      Promise.allSettled([
                        refetchPayments(),
                        refetchInvoice(),
                        activityTab === 'invoice' ? refetchInvoiceActivities() : Promise.resolve(),
                        getAllPaymentActivities().then((activities) => {
                          if (activities && activities.length > 0) {
                            paymentActivityCache.current = activities
                          }
                        }),
                      ])
                    }}
                    onClose={() => {
                      setOpenDialog(false)
                      setPreSelectedStage(null) // Clear pre-selected stage when form closes
                    }}
                  />
                  </div>
                </DialogContent>
              </Dialog>
          )}
        </div>
      </div>

      {/* الخدمات ومراحل العلاج */}
      {Array.isArray(invoice.treatmentStages) &&
        invoice.treatmentStages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <ClipboardList className='w-5 h-5' />
                الخدمات ومراحل العلاج
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingServices ? (
                <div className='text-center py-4'>جارٍ تحميل الخدمات...</div>
              ) : appointmentServices.length > 0 ? (
                <div className='space-y-6'>
                  {appointmentServices
                    .filter((appointmentService) => {
                      // Only show services that have treatment stages in this invoice
                      const serviceStages = stagesByService[appointmentService._id] || []
                      return serviceStages.length > 0
                    })
                    .map((appointmentService) => {
                    const service = typeof appointmentService.service === 'object' 
                      ? appointmentService.service 
                      : null
                    const serviceStages = stagesByService[appointmentService._id] || []
                    const serviceTotal = serviceStages.reduce((sum, stage) => sum + (stage.cost || 0), 0)

                    return (
                      <div key={appointmentService._id} className='border rounded-lg p-4 space-y-3'>
                        {/* Service Header */}
                        <div className='flex items-center justify-between pb-2 border-b'>
                          <div>
                            <h3 className='text-lg font-semibold'>{service?.name || 'خدمة غير معروفة'}</h3>
                            <div className='flex gap-4 mt-1 text-sm text-gray-600'>
                              <span>السعر: {service?.price ? `${service.price.toLocaleString()} ل.س` : '-'}</span>
                              <span>المدة: {service?.duration ? `${service.duration} دقيقة` : '-'}</span>
                            </div>
                          </div>
                          <Badge variant='outline' className='text-sm'>
                            إجمالي المراحل: {serviceTotal.toLocaleString()} ل.س
                          </Badge>
                        </div>

                        {/* Treatment Stages for this Service */}
                        {serviceStages.length > 0 ? (
                          <div className='space-y-2'>
                            <h4 className='font-medium text-sm text-gray-700'>مراحل العلاج ({serviceStages.length})</h4>
                            <div className='overflow-x-auto'>
                              <table className='w-full text-sm text-right'>
                                <thead>
                                  <tr className='border-b bg-gray-50'>
                                    <th className='px-3 py-2 font-semibold text-xs'>المرحلة</th>
                                    <th className='px-3 py-2 font-semibold text-xs'>الوصف</th>
                                    <th className='px-3 py-2 font-semibold text-xs'>التاريخ</th>
                                    <th className='px-3 py-2 font-semibold text-xs'>التكلفة</th>
                                    <th className='px-3 py-2 font-semibold text-xs'>حالة الدفع</th>
                                    <th className='px-3 py-2 font-semibold text-xs'>الحالة</th>
                                    <th className='px-3 py-2 font-semibold text-xs'>الدفعات</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {serviceStages.map((stage: TreatmentStage) => {
                                    const stageCost = stage.cost || 0
                                    
                                    // Calculate payments specifically for this treatment stage
                                    const stagePaid = calculateStagePaid(String(stage._id))
                                    
                                    const stageRemaining = stageCost - stagePaid
                                    const isStageFullyPaid = stagePaid >= stageCost
                                    
                                    // Calculate number of payments for this stage
                                    const stageId = String(stage._id).trim().toLowerCase()
                                    const stagePaymentsCount = (payments || []).filter((payment) => {
                                      if (!payment.treatmentStages || payment.treatmentStages.length === 0) {
                                        return false
                                      }
                                      
                                      const paymentStageIds = payment.treatmentStages.map((ts) => {
                                        if (typeof ts === 'string') {
                                          return String(ts).trim().toLowerCase()
                                        }
                                        if (typeof ts === 'object' && ts !== null) {
                                          const stageObj = ts as TreatmentStage
                                          return String(stageObj._id || stageObj.id || ts).trim().toLowerCase()
                                        }
                                        return String(ts).trim().toLowerCase()
                                      })
                                      
                                      return paymentStageIds.includes(stageId)
                                    }).length
                                    
                                    return (
                                      <tr 
                                        key={stage._id} 
                                        className='border-b hover:bg-gray-50'
                                      >
                                        <td className='px-3 py-2'>{stage.title}</td>
                                        <td className='px-3 py-2 text-gray-600'>
                                          {stage.description || '-'}
                                        </td>
                                        <td className='px-3 py-2 text-gray-600'>
                                          {stage.date
                                            ? new Date(stage.date).toLocaleDateString('ar-EG', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                              })
                                            : '-'}
                                        </td>
                                        <td className='px-3 py-2 font-medium'>
                                          {stageCost.toLocaleString()} ل.س
                                        </td>
                                        <td className='px-3 py-2'>
                                          <div className='flex flex-col gap-1'>
                                            <div className='text-xs'>
                                              <span className='text-green-600 font-medium'>
                                                مدفوع: {Math.round(stagePaid).toLocaleString()} ل.س
                                              </span>
                                            </div>
                                            {stageRemaining > 0 && (
                                              <div className='text-xs text-red-600'>
                                                متبقي: {Math.round(stageRemaining).toLocaleString()} ل.س
                                              </div>
                                            )}
                                            <Badge
                                              variant={isStageFullyPaid ? 'default' : 'outline'}
                                              className='text-xs w-fit'
                                            >
                                              {isStageFullyPaid ? 'مدفوع بالكامل' : 'غير مدفوع'}
                                            </Badge>
                                          </div>
                                        </td>
                                        <td className='px-3 py-2'>
                                          <Badge
                                            variant={stage.isCompleted ? 'default' : 'outline'}
                                            className='text-xs'
                                          >
                                            {stage.isCompleted ? 'مكتملة' : 'غير مكتملة'}
                                          </Badge>
                                        </td>
                                        <td className='px-3 py-2'>
                                          <div className='flex items-center gap-2'>
                                            <span className='text-xs text-gray-600'>
                                              {stagePaymentsCount} دفعة
                                            </span>
                                            {stagePaymentsCount > 0 && canEditPayments && (
                                              <Button
                                                size='sm'
                                                variant='ghost'
                                                className='h-6 w-6 p-0'
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setSelectedStageForPayments(stage)
                                                  setOpenPaymentsDialog(true)
                                                }}
                                              >
                                                <Pencil className='h-4 w-4' />
                                              </Button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <p className='text-sm text-gray-500 py-2 text-center'>
                            لا توجد مراحل علاجية لهذه الخدمة في هذه الفاتورة
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                // Fallback: show flat list if no services structure
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
              )}
            </CardContent>
          </Card>
        )}

      {/* سجل الأنشطة الموحد */}
      {canViewInvoiceActivities && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <FileText className='w-5 h-5' />
              سجل الأنشطة
            </CardTitle>
          </CardHeader>
          <CardContent>
          <Tabs
            value={activityTab}
            onValueChange={(value) => setActivityTab(value as 'payments' | 'stages' | 'invoice')}
            className='w-full'
          >
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='payments' className='flex items-center gap-2'>
                <CreditCard className='w-4 h-4' />
                الدفعات
              </TabsTrigger>
              <TabsTrigger value='stages' className='flex items-center gap-2'>
                <Layers className='w-4 h-4' />
                الخدمات ومراحل العلاج
              </TabsTrigger>
              <TabsTrigger value='invoice' className='flex items-center gap-2'>
                <FileText className='w-4 h-4' />
                الفاتورة
              </TabsTrigger>
            </TabsList>

            {/* تبويب الدفعات */}
            <TabsContent value='payments' className='mt-6'>
              <div className='flex items-center justify-between mb-3'>
                <span className='text-sm font-medium text-gray-700'>سجل الدفعات</span>
                {paymentIds.length > 0 && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleManualPaymentRefresh}
                    disabled={isPaymentRefetching && !paymentActivityCache.current.length}
                  >
                    تحديث
                  </Button>
                )}
              </div>
              {paymentActivityError && (
                <div className='text-xs text-red-600 mb-2'>
                  {paymentActivityError}
                </div>
              )}
              {loadingPayments && !paymentActivityCache.current.length ? (
                <div className='text-center py-4'>جارٍ تحميل البيانات...</div>
              ) : errorPayments && !paymentActivityCache.current.length ? (
                <div className='text-center text-red-600 py-4'>
                  حدث خطأ أثناء جلب الدفعات
                </div>
              ) : paymentActivityCache.current.length === 0 ? (
                <div className='text-center text-gray-500 py-8'>
                  لا توجد دفعات مسجلة بعد
                </div>
              ) : (
                <div className='space-y-4'>
                  {isPaymentRefetching && (
                    <div className='text-center text-xs text-gray-500'>
                      جارٍ تحديث سجل الدفعات...
                    </div>
                  )}
                  <div className='overflow-x-auto'>
                    <table className='w-full text-sm text-right'>
                      <thead>
                        <tr className='border-b bg-gray-100'>
                          <th className='px-4 py-3 font-semibold'>الإجراء</th>
                          <th className='px-4 py-3 font-semibold'>المبلغ</th>
                          <th className='px-4 py-3 font-semibold'>طريقة الدفع</th>
                          <th className='px-4 py-3 font-semibold'>الخدمة / المرحلة</th>
                          <th className='px-4 py-3 font-semibold'>تاريخ الدفعة</th>
                          <th className='px-4 py-3 font-semibold'>مسجل بواسطة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(paymentActivities && paymentActivities.length > 0 ? paymentActivities : paymentActivityCache.current)
                          .filter((log: AuditLog) => (log.entityType as string) === 'Payment')
                          .sort((a, b) => {
                            const dateA = a.performedAt ? new Date(a.performedAt).getTime() : 0
                            const dateB = b.performedAt ? new Date(b.performedAt).getTime() : 0
                            return dateB - dateA
                          })
                          .map((log) => {
                            const payment = paymentMap.get(String(log.entityId))
                            const changes =
                              (log.changes as {
                                reason?: string
                                before?: Record<string, unknown>
                                after?: Record<string, unknown>
                              }) || {}
                            const after = changes.after || {}
                            const before = changes.before || {}

                            const amount =
                              typeof after.amount === 'number'
                                ? after.amount
                                : typeof before.amount === 'number'
                                ? before.amount
                                : payment?.amount || 0

                            const method =
                              typeof after.method === 'string'
                                ? after.method
                                : typeof before.method === 'string'
                                ? before.method
                                : payment?.method || 'غير محدد'

                            const actionType = log.action as 'create' | 'update' | 'delete'
                            let actionIcon = <Plus className='w-4 h-4' />
                            let actionLabel = 'إضافة'
                            let actionColor = 'text-green-600 bg-green-50'

                            if (actionType === 'update') {
                              actionIcon = <Edit className='w-4 h-4' />
                              actionLabel = 'تعديل'
                              actionColor = 'text-blue-600 bg-blue-50'
                            } else if (actionType === 'delete') {
                              actionIcon = <Trash2 className='w-4 h-4' />
                              actionLabel = 'حذف'
                              actionColor = 'text-red-600 bg-red-50'
                            }

                            let reason = ''
                            if (changes.reason) {
                              reason = String(changes.reason)
                            } else if (changes.before && changes.after) {
                              if (changes.before.amount !== changes.after.amount) {
                                reason = `تغيير المبلغ من ${Number(changes.before.amount || 0).toLocaleString()} إلى ${Number(changes.after.amount || 0).toLocaleString()} ل.س`
                              } else if (changes.before.method !== changes.after.method) {
                                reason = `تغيير طريقة الدفع من ${String(changes.before.method)} إلى ${String(changes.after.method)}`
                              } else {
                                reason = 'تعديل بيانات الدفعة'
                              }
                            } else if (actionType === 'delete') {
                              reason = 'تم حذف الدفعة'
                            }

                            const basePayment: Partial<Payment> | null =
                              payment || (actionType === 'delete' && changes.before
                                ? (changes.before as unknown as Partial<Payment>)
                                : null)

                            const receivedByName = (() => {
                              if (basePayment?.receivedBy && typeof basePayment.receivedBy === 'object') {
                                const receivedByObj = basePayment.receivedBy as { name?: string; email?: string }
                                return receivedByObj.name || receivedByObj.email || 'غير معروف'
                              }
                              if (typeof basePayment?.receivedBy === 'string') {
                                return basePayment.receivedBy
                              }
                              if (log.performedBy && typeof log.performedBy === 'object') {
                                const performedByObj = log.performedBy as { name?: string; email?: string }
                                return performedByObj.name || performedByObj.email || 'غير معروف'
                              }
                              if (typeof log.performedBy === 'string') {
                                return log.performedBy
                              }
                              return 'غير معروف'
                            })()

                            let stageInfo = 'لجميع المراحل (دفعة قديمة)'
                            const paymentStages =
                              basePayment?.treatmentStages ||
                              (Array.isArray(after.treatmentStages)
                                ? after.treatmentStages
                                : Array.isArray(before.treatmentStages)
                                ? before.treatmentStages
                                : [])

                            if (paymentStages && paymentStages.length > 0) {
                              const stageRef = paymentStages[0]
                              const paymentStageId =
                                typeof stageRef === 'object' && stageRef !== null
                                  ? (stageRef as TreatmentStage)._id
                                  : String(stageRef)
                              const normalizedStageId = String(paymentStageId).trim().toLowerCase()

                              let foundStage: TreatmentStage | null = null
                              let foundService: AppointmentService | null = null

                              for (const appointmentService of appointmentServices) {
                                const serviceStages = stagesByService[appointmentService._id] || []
                                const matchingStage = serviceStages.find((s) => {
                                  const stageId = String(s._id).trim().toLowerCase()
                                  return stageId === normalizedStageId
                                })

                                if (matchingStage) {
                                  foundStage = matchingStage
                                  foundService = appointmentService
                                  break
                                }
                              }

                              if (!foundStage && Array.isArray(invoice?.treatmentStages)) {
                                const stageObj = invoice?.treatmentStages.find((s) => {
                                  const sId =
                                    typeof s === 'object' && s !== null
                                      ? String((s as TreatmentStage)._id).trim().toLowerCase()
                                      : String(s).trim().toLowerCase()
                                  return sId === normalizedStageId
                                })

                                if (stageObj && typeof stageObj === 'object') {
                                  foundStage = stageObj as TreatmentStage
                                  foundService =
                                    appointmentServices.find((as) => {
                                      const serviceStages = stagesByService[as._id] || []
                                      return serviceStages.some((s) => {
                                        const stageId = String(s._id).trim().toLowerCase()
                                        return stageId === normalizedStageId
                                      })
                                    }) || null
                                }
                              }

                              if (foundStage) {
                                if (foundService) {
                                  const service =
                                    typeof foundService.service === 'object'
                                      ? foundService.service
                                      : null
                                  stageInfo = `${service?.name || 'خدمة غير معروفة'} - ${foundStage.title}`
                                } else {
                                  stageInfo = foundStage.title
                                }
                              } else {
                                stageInfo = 'مرحلة غير معروفة'
                              }
                            }

                            return (
                              <tr key={log._id} className='border-b hover:bg-gray-50 transition-colors'>
                                <td className='px-4 py-3'>
                                  <Badge className={`${actionColor} border-0 flex items-center gap-1.5 w-fit`}>
                                    {actionIcon}
                                    {actionLabel}
                                  </Badge>
                                  {reason && (
                                    <div className='text-xs text-gray-600 mt-1.5 pt-1.5 border-t'>
                                      <span className='font-medium'>سبب التعديل:</span> {reason}
                                    </div>
                                  )}
                                </td>
                                <td className='px-4 py-3 font-medium'>
                                  {Number(amount || 0).toLocaleString()} ل.س
                                </td>
                                <td className='px-4 py-3'>{method}</td>
                                <td className='px-4 py-3'>
                                  <div className='flex flex-col gap-1'>
                                    <span className='text-sm font-medium'>{stageInfo}</span>
                                    {basePayment?.notes && (
                                      <span className='text-xs text-gray-500'>ملاحظات: {basePayment.notes}</span>
                                    )}
                                  </div>
                                </td>
                                <td className='px-4 py-3'>
                                  {log.performedAt
                                    ? new Date(log.performedAt).toLocaleDateString('ar-EG', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : '-'}
                                </td>
                                <td className='px-4 py-3'>{receivedByName}</td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* تبويب الخدمات ومراحل العلاج */}
            <TabsContent value='stages' className='mt-6'>
              {loadingStageActivities ? (
                <div className='text-center py-4'>جارٍ تحميل البيانات...</div>
              ) : !stageActivities || (Array.isArray(stageActivities) && stageActivities.length === 0) ? (
                <div className='text-center text-gray-500 py-8'>
                  لا يوجد سجل نشاط للمراحل
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm text-right'>
                    <thead>
                      <tr className='border-b bg-gray-100'>
                        <th className='px-4 py-3 font-semibold'>الإجراء</th>
                        <th className='px-4 py-3 font-semibold'>الخدمة / المرحلة</th>
                        <th className='px-4 py-3 font-semibold'>المستخدم</th>
                        <th className='px-4 py-3 font-semibold'>التاريخ والوقت</th>
                        <th className='px-4 py-3 font-semibold'>التفاصيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stageActivities.map((activity: AuditLog) => {
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

                        // Find stage info
                        let stageInfo = 'مرحلة غير معروفة'
                        if (activity.entityId) {
                          const stageId = String(activity.entityId)
                          for (const appointmentService of appointmentServices) {
                            const serviceStages = stagesByService[appointmentService._id] || []
                            const foundStage = serviceStages.find((s) => String(s._id) === stageId)
                            if (foundStage) {
                              const service = typeof appointmentService.service === 'object'
                                ? appointmentService.service
                                : null
                              stageInfo = `${service?.name || 'خدمة غير معروفة'} - ${foundStage.title}`
                              break
                            }
                          }
                        }

                        return (
                          <tr key={activity._id} className='border-b hover:bg-gray-50 transition-colors'>
                            <td className='px-4 py-3'>
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
                            <td className='px-4 py-3 font-medium'>{stageInfo}</td>
                            <td className='px-4 py-3'>{performedByName}</td>
                            <td className='px-4 py-3'>
                              {activity.performedAt
                                ? new Date(activity.performedAt).toLocaleDateString('ar-EG', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </td>
                            <td className='px-4 py-3'>
                              {activity.action === 'update' && activity.changes
                                ? JSON.stringify(activity.changes, null, 2)
                                : activity.action === 'create'
                                ? 'تم إنشاء المرحلة'
                                : activity.action === 'delete'
                                ? 'تم حذف المرحلة'
                                : '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* تبويب الفاتورة */}
            <TabsContent value='invoice' className='mt-6'>
              {loadingActivities ? (
                <div className='text-center py-4'>جارٍ تحميل سجل النشاط...</div>
              ) : errorActivities ? (
                <div className='text-center text-red-600 py-4'>
                  حدث خطأ أثناء جلب سجل النشاط
                </div>
              ) : !invoiceActivities ||
                (Array.isArray(invoiceActivities) && invoiceActivities.length === 0) ? (
                <div className='text-center text-gray-500 py-8'>
                  لا يوجد سجل نشاط للفاتورة
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm text-right'>
                    <thead>
                      <tr className='border-b bg-gray-100'>
                        <th className='px-4 py-3 font-semibold'>الإجراء</th>
                        <th className='px-4 py-3 font-semibold'>المستخدم</th>
                        <th className='px-4 py-3 font-semibold'>التاريخ والوقت</th>
                        <th className='px-4 py-3 font-semibold'>التفاصيل</th>
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
                          <tr key={activity._id} className='border-b hover:bg-gray-50 transition-colors'>
                            <td className='px-4 py-3'>
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
                            <td className='px-4 py-3'>{performedByName}</td>
                            <td className='px-4 py-3'>
                              {activity.performedAt
                                ? new Date(activity.performedAt).toLocaleDateString('ar-EG', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </td>
                            <td className='px-4 py-3'>
                              {activity.action === 'update' && activity.changes ? (
                                <div className='text-xs text-gray-600 space-y-1'>
                                  {activity.changes.before && activity.changes.after ? (
                                    <div>
                                      {(() => {
                                        const before =
                                          (activity.changes?.before as Record<string, unknown>) || {}
                                        const after =
                                          (activity.changes?.after as Record<string, unknown>) || {}

                                        return (
                                          <>
                                            {after.status &&
                                            before.status !== after.status ? (
                                              <div>
                                                الحالة: {String(before.status || '')} →{' '}
                                                {String(after.status || '')}
                                              </div>
                                            ) : null}
                                            {after.totalAmount !== undefined &&
                                            before.totalAmount !== after.totalAmount ? (
                                              <div>
                                                الإجمالي:{' '}
                                                {Number(before.totalAmount || 0).toLocaleString()} →{' '}
                                                {Number(after.totalAmount || 0).toLocaleString()} ل.س
                                              </div>
                                            ) : null}
                                            {after.paidAmount !== undefined &&
                                            before.paidAmount !== after.paidAmount ? (
                                              <div>
                                                المدفوع:{' '}
                                                {Number(before.paidAmount || 0).toLocaleString()} →{' '}
                                                {Number(after.paidAmount || 0).toLocaleString()} ل.س
                                              </div>
                                            ) : null}
                                            {after.remainingAmount !== undefined &&
                                            before.remainingAmount !== after.remainingAmount ? (
                                              <div>
                                                المتبقي:{' '}
                                                {Number(before.remainingAmount || 0).toLocaleString()} →{' '}
                                                {Number(after.remainingAmount || 0).toLocaleString()} ل.س
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      )}

      {/* Dialog لعرض وتعديل دفعات المرحلة */}
      <Dialog open={openPaymentsDialog} onOpenChange={setOpenPaymentsDialog}>
        <DialogContent className='max-w-[95vw] w-full sm:max-w-6xl lg:max-w-7xl max-h-[95vh] overflow-y-auto'>
          <DialogHeader className='sticky top-0 bg-background z-10 pb-4 border-b'>
            <DialogTitle>
              دفعات المرحلة: {selectedStageForPayments?.title || 'غير معروف'}
            </DialogTitle>
            <DialogDescription>
              عرض وتعديل جميع الدفعات الخاصة بهذه المرحلة
            </DialogDescription>
          </DialogHeader>
          <div className='overflow-y-auto max-h-[calc(95vh-120px)]'>
            {selectedStageForPayments && (
            <StagePaymentsDialog
              stage={selectedStageForPayments}
              payments={payments || []}
              canEdit={canEditPayments}
              onClose={() => {
                setOpenPaymentsDialog(false)
                setSelectedStageForPayments(null)
              }}
              refetchInvoices={async () => {
                await refetchInvoice()
                await refetchPayments()
              }}
            />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Component for displaying and editing stage payments
// This component uses Select, Input, Button, and other UI components
function StagePaymentsDialog({
  stage,
  payments,
  canEdit,
  onClose,
  refetchInvoices,
}: {
  stage: TreatmentStage
  payments: Payment[]
  canEdit: boolean
  onClose: () => void
  refetchInvoices?: () => void
}) {
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editMethod, setEditMethod] = useState<'نقدًا' | 'بطاقة' | 'تحويل بنكي' | 'أخرى'>('نقدًا')
  const [editNotes, setEditNotes] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editReason, setEditReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  interface PaymentUpdateData {
    amount: number
    method: 'نقدًا' | 'بطاقة' | 'تحويل بنكي' | 'أخرى'
    reason: string
    date?: string
    notes?: string
  }
  
  interface PredictedInvoice {
    paidAmount: number
    remainingAmount: number
    status: string
    totalAmount: number
  }
  
  const [pendingUpdateData, setPendingUpdateData] = useState<PaymentUpdateData | null>(null)
  const [predictedInvoice, setPredictedInvoice] = useState<PredictedInvoice | null>(null)
  const queryClient = useQueryClient()
  
  // Get invoice data for confirmation dialog
  const { data: invoiceData } = useInvoiceById(
    editingPayment 
      ? (typeof editingPayment.invoice === 'object' 
          ? (editingPayment.invoice as Invoice)._id 
          : editingPayment.invoice)
      : ''
  )

  // Filter payments for this stage
  const stagePayments = useMemo(() => {
    const stageId = String(stage._id).trim().toLowerCase()
    return payments.filter((payment) => {
      if (!payment.treatmentStages || payment.treatmentStages.length === 0) {
        return false
      }
      
      const paymentStageIds = payment.treatmentStages.map((ts) => {
        if (typeof ts === 'string') {
          return String(ts).trim().toLowerCase()
        }
        if (typeof ts === 'object' && ts !== null) {
          const stageObj = ts as TreatmentStage
          return String(stageObj._id || stageObj.id || ts).trim().toLowerCase()
        }
        return String(ts).trim().toLowerCase()
      })
      
      return paymentStageIds.includes(stageId)
    })
  }, [payments, stage._id])

  // Calculate stage payment info
  const stagePaymentInfo = useMemo(() => {
    const stageCost = stage.cost || 0
    
    // Calculate total paid for this stage (excluding the payment being edited)
    const stagePaid = stagePayments.reduce((sum, payment) => {
      if (editingPayment && String(payment._id) === String(editingPayment._id)) {
        return sum // Exclude the payment being edited
      }
      return sum + (payment.amount || 0)
    }, 0)
    
    // If editing, add the current payment amount to see what the new total would be
    const currentPaymentAmount = editingPayment ? (editingPayment.amount || 0) : 0
    const newAmount = editAmount ? parseFloat(editAmount) || 0 : currentPaymentAmount
    
    // Calculate remaining before this payment
    const remainingBeforeThisPayment = Math.max(0, stageCost - stagePaid)
    
    // Calculate remaining after edit
    const totalPaidAfterEdit = stagePaid + newAmount
    const remainingAfterEdit = Math.max(0, stageCost - totalPaidAfterEdit)
    const maxAllowedAmount = remainingBeforeThisPayment + currentPaymentAmount // Max allowed = remaining + current payment
    
    // Determine payment status after edit
    let paymentStatus: 'fully-paid' | 'partially-paid' | 'over-paid' = 'partially-paid'
    if (remainingAfterEdit <= 0 && totalPaidAfterEdit >= stageCost) {
      paymentStatus = 'fully-paid'
    } else if (remainingAfterEdit < 0) {
      paymentStatus = 'over-paid'
    } else if (totalPaidAfterEdit > 0 && totalPaidAfterEdit < stageCost) {
      paymentStatus = 'partially-paid'
    }
    
    return {
      stageCost,
      stagePaid,
      currentPaymentAmount,
      newAmount,
      totalPaidAfterEdit,
      remainingAfterEdit,
      remainingBeforeThisPayment,
      maxAllowedAmount,
      paymentStatus,
    }
  }, [stage, stagePayments, editingPayment, editAmount])

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment)
    setEditAmount(payment.amount.toString())
    setEditMethod(payment.method)
    setEditNotes(payment.notes || '')
    setEditDate(
      payment.date
        ? new Date(payment.date).toISOString().split('T')[0]
        : payment.createdAt
        ? new Date(payment.createdAt).toISOString().split('T')[0]
        : ''
    )
    setEditReason('')
    setShowEditDialog(true)
  }

  // Calculate predicted invoice state
  const calculatePredictedInvoice = useCallback((currentInvoice: Invoice, updateData: PaymentUpdateData) => {
    if (!currentInvoice || !editingPayment) return null
    
    const oldAmount = editingPayment.amount
    const newAmount = updateData.amount
    const difference = newAmount - oldAmount
    
    const currentPaid = currentInvoice.paidAmount || 0
    const newPaid = currentPaid + difference
    const totalAmount = currentInvoice.totalAmount || 0
    const newRemaining = totalAmount - newPaid
    
    let newStatus = currentInvoice.status
    if (newRemaining <= 0) {
      newStatus = 'مدفوعة بالكامل'
    } else if (newPaid > 0) {
      newStatus = 'مدفوعة جزئيًا'
    } else {
      newStatus = 'غير مدفوعة'
    }
    
    return {
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      status: newStatus,
      totalAmount: totalAmount,
    }
  }, [editingPayment])

  const handleSaveEdit = async () => {
    if (!editingPayment) return

    // Validate reason
    if (!editReason.trim()) {
      toast.error('سبب التعديل مطلوب')
      return
    }

    const numericAmount = parseFloat(editAmount)
    if (numericAmount <= 0) {
      toast.error('المبلغ يجب أن يكون أكبر من صفر')
      return
    }

    // Validate amount doesn't exceed maximum allowed (remaining + current payment)
    if (numericAmount > stagePaymentInfo.maxAllowedAmount) {
      toast.error(`المبلغ يتجاوز الحد الأقصى المسموح (${stagePaymentInfo.maxAllowedAmount.toLocaleString()} ل.س)`)
      return
    }

    // Validate that amount is less than or equal to remaining (to ensure partial or full payment)
    // The remaining before this payment = stageCost - stagePaid (other payments)
    const remainingBeforeThisPayment = stagePaymentInfo.remainingBeforeThisPayment
    
    if (numericAmount > remainingBeforeThisPayment) {
      toast.error(
        `المبلغ يجب أن يكون أقل من أو يساوي المتبقي (${remainingBeforeThisPayment.toLocaleString()} ل.س) ` +
        `ليصبح الدفع جزئياً أو كاملاً. المبلغ الحالي سيؤدي إلى دفع زائد.`
      )
      return
    }

    // Show status message
    if (numericAmount === remainingBeforeThisPayment) {
      toast.info('سيتم دفع المرحلة بالكامل بعد هذا التعديل')
    } else if (numericAmount < remainingBeforeThisPayment) {
      toast.info('ستبقى المرحلة مدفوعة جزئياً بعد هذا التعديل')
    }

    const updateData: PaymentUpdateData = {
      amount: numericAmount,
      method: editMethod,
      reason: editReason.trim(),
    }
    
    if (editDate) {
      updateData.date = editDate
    }
    
    if (editNotes !== undefined) {
      updateData.notes = editNotes.trim() || undefined
    }

    // Calculate predicted invoice state
    if (invoiceData) {
      const predicted = calculatePredictedInvoice(invoiceData, updateData)
      setPredictedInvoice(predicted)
    }

    setPendingUpdateData(updateData)
    setShowEditDialog(false) // Close edit dialog
    setShowConfirmDialog(true) // Open confirmation dialog
  }

  const handleConfirmSave = async () => {
    if (!editingPayment || !pendingUpdateData) return

    // Validate reason is present
    if (!pendingUpdateData.reason || !pendingUpdateData.reason.trim()) {
      toast.error('سبب التعديل مطلوب')
      return
    }

    setLoading(true)
    try {
      console.log('Sending update payment request:', {
        paymentId: editingPayment._id,
        data: pendingUpdateData,
      })

      const response = await axios.put(`/payments/${editingPayment._id}`, pendingUpdateData)
      
      console.log('Update payment response:', response.data)
      
      toast.success('تم تحديث الدفعة بنجاح')
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      const invoiceId = typeof editingPayment.invoice === 'object' 
        ? (editingPayment.invoice as Invoice)._id 
        : editingPayment.invoice
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(invoiceId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.byInvoice(invoiceId) })
      
      // Invalidate payment activities to refresh audit logs
      queryClient.invalidateQueries({ 
        queryKey: ['payment-activities']
      })
      
      setEditingPayment(null)
      setShowEditDialog(false)
      setShowConfirmDialog(false)
      setPendingUpdateData(null)
      setPredictedInvoice(null)
      setEditReason('')

      onClose()

      if (refetchInvoices) {
        void refetchInvoices()
      }
    } catch (error: unknown) {
      console.error('Error updating payment:', error)
      const axiosError = error as { response?: { data?: { message?: string; error?: string } }; message?: string }
      console.error('Error response:', axiosError.response?.data)
      const errorMessage = axiosError.response?.data?.message || axiosError.response?.data?.error || axiosError.message || 'فشل في تحديث الدفعة'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingPayment(null)
    setEditAmount('')
    setEditMethod('نقدًا')
    setEditNotes('')
    setEditDate('')
    setEditReason('')
    setShowEditDialog(false)
    setShowConfirmDialog(false)
    setPendingUpdateData(null)
    setPredictedInvoice(null)
  }

  // Calculate stage payment summary
  const stageSummary = useMemo(() => {
    const stageCost = stage.cost || 0
    const totalPaid = stagePayments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
    const remaining = Math.max(0, stageCost - totalPaid)
    const paymentCount = stagePayments.length
    
    return {
      stageCost,
      totalPaid,
      remaining,
      paymentCount,
      isFullyPaid: remaining <= 0 && totalPaid >= stageCost,
      isPartiallyPaid: totalPaid > 0 && totalPaid < stageCost,
    }
  }, [stage, stagePayments])

  return (
    <div className='space-y-4'>
      {/* Stage Payment Summary */}
      <div className='bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800'>
        <h3 className='font-semibold text-base mb-3 text-blue-900 dark:text-blue-100'>
          ملخص المرحلة: {stage.title}
        </h3>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>التكلفة الكلية</p>
            <p className='text-lg font-bold text-gray-900 dark:text-gray-100'>
              {stageSummary.stageCost.toLocaleString()} ل.س
            </p>
          </div>
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>المبلغ المدفوع</p>
            <p className='text-lg font-bold text-green-600'>
              {stageSummary.totalPaid.toLocaleString()} ل.س
            </p>
            <p className='text-xs text-gray-500 mt-1'>
              ({stageSummary.paymentCount} دفعة)
            </p>
          </div>
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>المبلغ المتبقي</p>
            <p className={`text-lg font-bold ${
              stageSummary.remaining === 0 
                ? 'text-green-600' 
                : stageSummary.remaining > 0
                ? 'text-orange-600'
                : 'text-red-600'
            }`}>
              {stageSummary.remaining.toLocaleString()} ل.س
            </p>
          </div>
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>حالة الدفع</p>
            <Badge
              variant={
                stageSummary.isFullyPaid
                  ? 'default'
                  : stageSummary.isPartiallyPaid
                  ? 'secondary'
                  : 'outline'
              }
              className='text-sm font-semibold'
            >
              {stageSummary.isFullyPaid
                ? '✓ مدفوعة بالكامل'
                : stageSummary.isPartiallyPaid
                ? '⚠ مدفوعة جزئياً'
                : '○ غير مدفوعة'}
            </Badge>
          </div>
        </div>
      </div>

      {stagePayments.length === 0 ? (
        <p className='text-center text-gray-500 py-4'>لا توجد دفعات لهذه المرحلة</p>
      ) : (
        <div className='space-y-2 overflow-x-auto'>
          <table className='w-full text-sm text-right min-w-full'>
            <thead>
              <tr className='border-b bg-gray-100'>
                <th className='px-4 py-2 font-semibold whitespace-nowrap'>المبلغ</th>
                <th className='px-4 py-2 font-semibold whitespace-nowrap'>طريقة الدفع</th>
                <th className='px-4 py-2 font-semibold whitespace-nowrap'>التاريخ</th>
                <th className='px-4 py-2 font-semibold'>ملاحظات</th>
                {canEdit && <th className='px-4 py-2 font-semibold whitespace-nowrap'>إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {stagePayments.map((payment) => {
                return (
                  <tr key={payment._id} className='border-b hover:bg-gray-50'>
                    <td className='px-4 py-2 font-medium whitespace-nowrap'>
                      {payment.amount.toLocaleString()} ل.س
                    </td>
                    <td className='px-4 py-2 whitespace-nowrap'>{payment.method}</td>
                    <td className='px-4 py-2 whitespace-nowrap'>
                      {payment.date
                        ? new Date(payment.date).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : payment.createdAt
                        ? new Date(payment.createdAt).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className='px-4 py-2 text-gray-600 break-words max-w-xs'>
                      {payment.notes || '-'}
                    </td>
                    {canEdit && (
                      <td className='px-4 py-2 whitespace-nowrap'>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => handleEdit(payment)}
                        >
                          تعديل
                        </Button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Payment Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className='max-w-[95vw] w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader className='sticky top-0 bg-background z-10 pb-4 border-b'>
            <DialogTitle>تعديل الدفعة</DialogTitle>
            <DialogDescription>
              قم بتعديل بيانات الدفعة أدناه
            </DialogDescription>
          </DialogHeader>
          <div className='overflow-y-auto max-h-[calc(90vh-120px)]'>
            {editingPayment && (
              <div className='space-y-4'>
              {/* Stage Information */}
              <div className='bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800'>
                <h3 className='font-semibold text-sm mb-3 text-blue-900 dark:text-blue-100'>
                  معلومات المرحلة: {stage.title}
                </h3>
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm'>
                  <div>
                    <p className='text-gray-600 dark:text-gray-400 mb-1'>التكلفة الكلية</p>
                    <p className='font-semibold text-lg'>{stagePaymentInfo.stageCost.toLocaleString()} ل.س</p>
                  </div>
                  <div>
                    <p className='text-gray-600 dark:text-gray-400 mb-1'>المدفوع (باقي الدفعات)</p>
                    <p className='font-semibold text-lg text-green-600'>
                      {stagePaymentInfo.stagePaid.toLocaleString()} ل.س
                    </p>
                  </div>
                  <div>
                    <p className='text-gray-600 dark:text-gray-400 mb-1'>المبلغ الحالي</p>
                    <p className='font-semibold text-lg text-blue-600'>
                      {stagePaymentInfo.currentPaymentAmount.toLocaleString()} ل.س
                    </p>
                  </div>
                  <div>
                    <p className='text-gray-600 dark:text-gray-400 mb-1'>المتبقي بعد التعديل</p>
                    <p className={`font-semibold text-lg ${
                      stagePaymentInfo.remainingAfterEdit < 0 
                        ? 'text-red-600' 
                        : stagePaymentInfo.remainingAfterEdit === 0
                        ? 'text-green-600'
                        : 'text-orange-600'
                    }`}>
                      {stagePaymentInfo.remainingAfterEdit.toLocaleString()} ل.س
                    </p>
                    {stagePaymentInfo.remainingAfterEdit === 0 && (
                      <p className='text-xs text-green-600 mt-1'>✓ مدفوعة بالكامل</p>
                    )}
                    {stagePaymentInfo.remainingAfterEdit > 0 && stagePaymentInfo.remainingAfterEdit < stagePaymentInfo.stageCost && (
                      <p className='text-xs text-orange-600 mt-1'>⚠ مدفوعة جزئياً</p>
                    )}
                    {stagePaymentInfo.remainingAfterEdit < 0 && (
                      <p className='text-xs text-red-600 mt-1'>✗ دفع زائد</p>
                    )}
                  </div>
                </div>
                <div className='mt-2 space-y-1'>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>
                    المتبقي قبل هذه الدفعة: <span className='font-semibold'>{stagePaymentInfo.remainingBeforeThisPayment.toLocaleString()} ل.س</span>
                  </p>
                  <p className='text-xs text-blue-600 dark:text-blue-400'>
                    ⓘ يجب أن يكون المبلغ ≤ {stagePaymentInfo.remainingBeforeThisPayment.toLocaleString()} ل.س 
                    {stagePaymentInfo.remainingBeforeThisPayment === 0 ? ' (المرحلة مدفوعة بالكامل)' : ' (لتصبح مدفوعة جزئياً أو كاملاً)'}
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                {/* Amount */}
                <div className='space-y-2'>
                  <Label htmlFor='edit-amount'>
                    المبلغ * 
                    <span className='text-xs text-gray-500 ml-2'>
                      (الحد الأقصى: {stagePaymentInfo.remainingBeforeThisPayment.toLocaleString()} ل.س)
                    </span>
                  </Label>
                  <Input
                    id='edit-amount'
                    type='number'
                    value={editAmount}
                    onChange={(e) => {
                      const value = e.target.value
                      const numValue = parseFloat(value)
                      // Allow empty, or valid number between 0 and remainingBeforeThisPayment
                      if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= stagePaymentInfo.remainingBeforeThisPayment)) {
                        setEditAmount(value)
                      }
                    }}
                    placeholder='أدخل المبلغ'
                    min='0'
                    max={stagePaymentInfo.remainingBeforeThisPayment}
                    step='0.01'
                    className={
                      editAmount && parseFloat(editAmount) > stagePaymentInfo.remainingBeforeThisPayment
                        ? 'border-red-500 focus-visible:ring-red-500'
                        : ''
                    }
                  />
                  {editAmount && parseFloat(editAmount) > stagePaymentInfo.remainingBeforeThisPayment && (
                    <p className='text-xs text-red-600'>
                      المبلغ يتجاوز المتبقي ({stagePaymentInfo.remainingBeforeThisPayment.toLocaleString()} ل.س). 
                      يجب أن يكون المبلغ ≤ المتبقي لتصبح المرحلة مدفوعة جزئياً أو كاملاً.
                    </p>
                  )}
                  {editAmount && parseFloat(editAmount) > 0 && parseFloat(editAmount) <= stagePaymentInfo.remainingBeforeThisPayment && (
                    <p className='text-xs text-green-600'>
                      ✓ المبلغ صحيح - {parseFloat(editAmount) === stagePaymentInfo.remainingBeforeThisPayment 
                        ? 'المرحلة ستصبح مدفوعة بالكامل' 
                        : 'المرحلة ستبقى مدفوعة جزئياً'}
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div className='space-y-2'>
                  <Label htmlFor='edit-method'>طريقة الدفع *</Label>
                  <Select value={editMethod} onValueChange={(v: 'نقدًا' | 'بطاقة' | 'تحويل بنكي' | 'أخرى') => setEditMethod(v)}>
                    <SelectTrigger id='edit-method'>
                      <SelectValue placeholder='اختر طريقة الدفع' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='نقدًا'>نقدًا</SelectItem>
                      <SelectItem value='بطاقة'>بطاقة</SelectItem>
                      <SelectItem value='تحويل بنكي'>تحويل بنكي</SelectItem>
                      <SelectItem value='أخرى'>أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date */}
                <div className='space-y-2'>
                  <Label htmlFor='edit-date'>تاريخ الدفعة</Label>
                  <Input
                    id='edit-date'
                    type='date'
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>

                {/* Notes */}
                <div className='space-y-2'>
                  <Label htmlFor='edit-notes'>ملاحظات</Label>
                  <Input
                    id='edit-notes'
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder='ملاحظات (اختياري)'
                  />
                </div>
              </div>

              {/* Reason for Edit */}
              <div className='space-y-2'>
                <Label htmlFor='edit-reason'>
                  سبب التعديل <span className='text-red-500'>*</span>
                </Label>
                <Textarea
                  id='edit-reason'
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder='أدخل سبب التعديل (مطلوب)'
                  rows={3}
                  className='w-full'
                />
                <p className='text-xs text-gray-500'>
                  يجب إدخال سبب التعديل لتوثيق التغييرات
                </p>
              </div>

              {/* Action Buttons */}
              <div className='flex justify-end gap-2 pt-4 border-t'>
                <Button
                  variant='outline'
                  onClick={handleCancelEdit}
                  disabled={loading}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={
                    loading || 
                    !editReason.trim() || 
                    !editAmount || 
                    parseFloat(editAmount) <= 0 ||
                    parseFloat(editAmount) > stagePaymentInfo.remainingBeforeThisPayment
                  }
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </Button>
              </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className='max-w-[95vw] w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader className='sticky top-0 bg-background z-10 pb-4 border-b'>
            <DialogTitle>تأكيد تعديل الدفعة</DialogTitle>
            <DialogDescription>
              يرجى مراجعة التغييرات قبل التأكيد
            </DialogDescription>
          </DialogHeader>
          <div className='overflow-y-auto max-h-[calc(90vh-120px)]'>
            <div className='space-y-6'>
            {/* Reason */}
            <div className='space-y-2'>
              <h3 className='font-semibold text-lg'>سبب التعديل:</h3>
              <div className='bg-blue-50 p-4 rounded-lg'>
                <p className='text-sm'>{pendingUpdateData?.reason}</p>
              </div>
            </div>

            {/* Predicted Invoice State */}
            {predictedInvoice && invoiceData && (
              <div className='space-y-3'>
                <h3 className='font-semibold text-lg'>حالة الفاتورة بعد التعديل:</h3>
                <div className='bg-gray-50 p-4 rounded-lg'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <p className='text-sm font-medium text-gray-600 mb-1'>المبلغ الإجمالي:</p>
                      <p className='text-lg font-semibold'>
                        {predictedInvoice.totalAmount.toLocaleString()} ل.س
                      </p>
                    </div>
                    <div>
                      <p className='text-sm font-medium text-gray-600 mb-1'>المبلغ المدفوع:</p>
                      <p className='text-lg font-semibold text-green-600'>
                        {predictedInvoice.paidAmount.toLocaleString()} ل.س
                        {predictedInvoice.paidAmount !== (invoiceData.paidAmount || 0) && (
                          <span className='text-xs ml-2'>
                            ({predictedInvoice.paidAmount - (invoiceData.paidAmount || 0) > 0 ? '+' : ''}
                            {(predictedInvoice.paidAmount - (invoiceData.paidAmount || 0)).toLocaleString()} ل.س)
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm font-medium text-gray-600 mb-1'>المبلغ المتبقي:</p>
                      <p className='text-lg font-semibold text-orange-600'>
                        {predictedInvoice.remainingAmount.toLocaleString()} ل.س
                        {predictedInvoice.remainingAmount !== (invoiceData.remainingAmount || 0) && (
                          <span className='text-xs ml-2'>
                            ({predictedInvoice.remainingAmount - (invoiceData.remainingAmount || 0) > 0 ? '+' : ''}
                            {(predictedInvoice.remainingAmount - (invoiceData.remainingAmount || 0)).toLocaleString()} ل.س)
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm font-medium text-gray-600 mb-1'>الحالة:</p>
                      <Badge
                        variant={
                          predictedInvoice.status === 'مدفوعة بالكامل'
                            ? 'default'
                            : predictedInvoice.status === 'مدفوعة جزئيًا'
                            ? 'secondary'
                            : 'outline'
                        }
                        className='text-sm'
                      >
                        {predictedInvoice.status}
                        {predictedInvoice.status !== invoiceData.status && (
                          <span className='ml-2 text-xs'>
                            (كانت: {invoiceData.status})
                          </span>
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Changes Summary */}
            <div className='space-y-3'>
              <h3 className='font-semibold text-lg'>التغييرات:</h3>
              {editingPayment && pendingUpdateData && (
                <div className='bg-gray-50 p-4 rounded-lg space-y-2'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <p className='text-sm font-medium text-gray-600 mb-1'>المبلغ:</p>
                      <p className='text-sm'>
                        <span className='line-through text-red-600'>
                          {editingPayment.amount.toLocaleString()} ل.س
                        </span>
                        {' → '}
                        <span className='text-green-600 font-semibold'>
                          {pendingUpdateData.amount.toLocaleString()} ل.س
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className='text-sm font-medium text-gray-600 mb-1'>طريقة الدفع:</p>
                      <p className='text-sm'>
                        <span className='line-through text-red-600'>{editingPayment.method}</span>
                        {' → '}
                        <span className='text-green-600 font-semibold'>{pendingUpdateData.method}</span>
                      </p>
                    </div>
                    {pendingUpdateData.date && (
                      <div>
                        <p className='text-sm font-medium text-gray-600 mb-1'>التاريخ:</p>
                        <p className='text-sm'>
                          <span className='line-through text-red-600'>
                            {editingPayment.date
                              ? new Date(editingPayment.date).toLocaleDateString('ar-EG')
                              : '-'}
                          </span>
                          {' → '}
                          <span className='text-green-600 font-semibold'>
                            {new Date(pendingUpdateData.date).toLocaleDateString('ar-EG')}
                          </span>
                        </p>
                      </div>
                    )}
                    {pendingUpdateData.notes !== undefined && (
                      <div>
                        <p className='text-sm font-medium text-gray-600 mb-1'>الملاحظات:</p>
                        <p className='text-sm'>
                          <span className='line-through text-red-600'>
                            {editingPayment.notes || '-'}
                          </span>
                          {' → '}
                          <span className='text-green-600 font-semibold'>
                            {pendingUpdateData.notes || '-'}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className='flex justify-end gap-2 mt-6'>
            <Button
              variant='outline'
              onClick={() => setShowConfirmDialog(false)}
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmSave}
              disabled={loading}
            >
              {loading ? 'جاري الحفظ...' : 'تأكيد والحفظ'}
            </Button>
          </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className='flex justify-end'>
        <Button variant='outline' onClick={onClose}>
          إغلاق
        </Button>
      </div>
    </div>
  )
}

