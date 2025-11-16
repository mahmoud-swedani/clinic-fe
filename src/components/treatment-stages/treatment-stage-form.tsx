'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useState, useEffect, useMemo } from 'react'
import axios from '@/lib/axios'
import { toast } from 'sonner'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { AppointmentService, Service } from '@/types/api'

export function TreatmentStageForm({
  appointmentId,
  clientId,
  doctorId,
  appointmentServiceId: initialAppointmentServiceId,
  onSuccess,
}: {
  appointmentId: string
  clientId: string
  doctorId: string
  appointmentServiceId?: string // Optional: if provided, use this directly
  onSuccess?: () => void
}) {
  // Prevent clicks from bubbling up to parent elements
  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [cost, setCost] = useState('')
  const [appointmentServiceId, setAppointmentServiceId] = useState<string>(initialAppointmentServiceId || '')
  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const queryClient = useQueryClient()

  // Fetch appointment services (always fetch to get service details)
  const { data: appointmentServices = [], isLoading: loadingServices } = useQuery({
    queryKey: ['appointment-services', appointmentId],
    queryFn: async () => {
      const { data } = await axios.get(`/appointments/${appointmentId}/services`)
      return data.data as AppointmentService[]
    },
    enabled: !!appointmentId, // Always fetch to get service price
  })

  // Auto-select first service if only one exists (and no initial appointmentServiceId)
  useEffect(() => {
    if (initialAppointmentServiceId) {
      setAppointmentServiceId(initialAppointmentServiceId)
    } else if (appointmentServices.length === 1 && !appointmentServiceId) {
      setAppointmentServiceId(appointmentServices[0]._id)
    }
  }, [appointmentServices, appointmentServiceId, initialAppointmentServiceId])

  // Get selected service details
  const selectedService = useMemo(() => {
    if (!appointmentServiceId) return null
    const service = appointmentServices.find((as) => as._id === appointmentServiceId)
    if (!service) return null
    const serviceData = typeof service.service === 'object' && service.service !== null
      ? service.service as Service
      : null
    return {
      appointmentService: service,
      service: serviceData,
      price: serviceData?.price || null,
    }
  }, [appointmentServices, appointmentServiceId])

  // Calculate discount if cost is less than service price
  const discount = useMemo(() => {
    if (!selectedService?.price || !cost) return null
    const servicePrice = selectedService.price
    const stageCost = parseFloat(cost)
    if (isNaN(stageCost) || stageCost <= 0) return null
    if (stageCost < servicePrice) {
      return servicePrice - stageCost
    }
    return null
  }, [selectedService, cost])

  const handleConfirm = () => {
    // Validation
    if (!title.trim()) {
      toast.error('يرجى إدخال عنوان المرحلة')
      return
    }

    if (!date) {
      toast.error('يرجى إدخال تاريخ المرحلة')
      return
    }

    // Validate date
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
      toast.error('تاريخ غير صحيح')
      return
    }

    // Validate service selection if appointment has multiple services
    if (appointmentServices.length > 1 && !appointmentServiceId) {
      toast.error('يرجى اختيار الخدمة')
      return
    }

    // Show confirmation dialog
    setShowConfirmDialog(true)
  }

  const handleSubmit = async () => {
    if (!clientId || !doctorId || !appointmentId) {
      console.error('[TreatmentStageForm] Missing required fields:', {
        appointmentId: appointmentId || 'MISSING',
        clientId: clientId || 'MISSING',
        doctorId: doctorId || 'MISSING',
      })
      toast.error('بيانات العميل أو الطبيب أو الموعد غير مكتملة')
      return
    }

    // Validation
    if (!title.trim()) {
      toast.error('يرجى إدخال عنوان المرحلة')
      return
    }

    if (!date) {
      toast.error('يرجى إدخال تاريخ المرحلة')
      return
    }

    // Validate date
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
      toast.error('تاريخ غير صحيح')
      return
    }

    // Validate service selection if appointment has multiple services
    if (appointmentServices.length > 1 && !appointmentServiceId) {
      toast.error('يرجى اختيار الخدمة')
      return
    }

    setLoading(true)
    setShowConfirmDialog(false)
    try {
      const payload: Record<string, unknown> = {
        client: clientId,
        title: title.trim(),
        description: description.trim(),
        date: dateObj.toISOString(),
        doctor: doctorId,
        appointment: appointmentId, // Keep for backward compatibility
        isCompleted: false,
      }

      // Use appointmentServiceId if available (new format), otherwise use appointmentId (old format)
      if (appointmentServiceId) {
        payload.appointmentServiceId = appointmentServiceId
      }

      // Only include cost if it's a valid number
      if (cost && !isNaN(Number(cost)) && Number(cost) > 0) {
        payload.cost = Number(cost)
      }

      const response = await axios.post('/treatment-stages', payload)

      // Invalidate invoices cache since creating a treatment stage may create/update an invoice
      // Use prefix matching to invalidate all invoice queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all })
      
      // Explicitly refetch all invoice list queries
      queryClient.refetchQueries({ queryKey: ['invoices'], type: 'all' })
      queryClient.refetchQueries({ queryKey: queryKeys.invoices.all, type: 'all' })
      
      // If the response includes an invoice, also invalidate and refetch that specific invoice
      if (response.data?.data?.invoice?._id) {
        const invoiceId = response.data.data.invoice._id
        queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(invoiceId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.byInvoice(invoiceId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs.entity('Invoice', invoiceId) })
        // Explicitly refetch to ensure immediate updates
        queryClient.refetchQueries({ queryKey: queryKeys.invoices.detail(invoiceId) })
        queryClient.refetchQueries({ queryKey: queryKeys.payments.byInvoice(invoiceId) })
        queryClient.refetchQueries({ queryKey: queryKeys.auditLogs.entity('Invoice', invoiceId) })
      }

      // Reset form
      setTitle('')
      setDescription('')
      setDate('')
      setCost('')
      if (appointmentServices.length > 1) {
        setAppointmentServiceId('')
      }

      toast.success('تمت إضافة المرحلة بنجاح')
      onSuccess?.()
    } catch (err: unknown) {
      console.error('Error creating treatment stage:', err)
      let errorMessage = 'حدث خطأ أثناء الإضافة'
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: unknown } }).response
        if (response?.data && typeof response.data === 'object') {
          const data = response.data as Record<string, unknown>
          errorMessage = (data.error || data.message || errorMessage) as string
        }
      }
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Get service name for display
  const getServiceName = (appointmentService: AppointmentService): string => {
    const service = appointmentService.service as Service
    if (typeof service === 'object' && service !== null) {
      return service.name || 'خدمة غير معروفة'
    }
    return 'خدمة غير معروفة'
  }

  return (
    <div 
      className='space-y-4'
      onClick={handleContainerClick}
      onPointerDown={handleContainerClick}
    >
      {/* Service selector - only show if appointment has multiple services */}
      {appointmentServices.length > 1 && (
        <div>
          <label className='text-sm font-medium mb-2 block'>الخدمة *</label>
          <Select
            value={appointmentServiceId}
            onValueChange={setAppointmentServiceId}
            required
          >
            <SelectTrigger onClick={(e) => e.stopPropagation()}>
              <SelectValue placeholder={loadingServices ? 'جارٍ التحميل...' : 'اختر الخدمة'} />
            </SelectTrigger>
            <SelectContent>
              {appointmentServices.map((as) => (
                <SelectItem key={as._id} value={as._id}>
                  {getServiceName(as)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className='space-y-2'>
        <Label>عنوان المرحلة *</Label>
        <Input
          placeholder='عنوان المرحلة'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          required
        />
      </div>
      <div className='space-y-2'>
        <Label>وصف المرحلة</Label>
        <Textarea
          placeholder='وصف المرحلة'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          rows={3}
        />
      </div>
      <div className='space-y-2'>
        <Label>تاريخ المرحلة *</Label>
        <Input
          type='datetime-local'
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          required
        />
      </div>
      {/* Service Price Display */}
      {selectedService?.price && (
        <div className='bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800'>
          <div className='flex justify-between items-center mb-2'>
            <Label className='text-sm font-medium text-blue-900 dark:text-blue-100'>
              سعر الخدمة:
            </Label>
            <span className='text-lg font-bold text-blue-900 dark:text-blue-100'>
              {selectedService.price.toLocaleString()} ل.س
            </span>
          </div>
        </div>
      )}

      <div className='space-y-2'>
        <Label>التكلفة {selectedService?.price && <span className='text-xs text-gray-500'>(اختياري)</span>}</Label>
        <Input
          type='number'
          placeholder='التكلفة'
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          max={selectedService?.price || undefined}
        />
        {selectedService?.price && cost && !isNaN(parseFloat(cost)) && parseFloat(cost) > 0 && (
          <div className='space-y-1'>
            {parseFloat(cost) > selectedService.price && (
              <p className='text-xs text-red-600'>
                ⚠ التكلفة أكبر من سعر الخدمة
              </p>
            )}
            {discount && discount > 0 && (
              <div className='bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800'>
                <div className='flex justify-between items-center'>
                  <span className='text-sm font-medium text-green-900 dark:text-green-100'>
                    الخصم:
                  </span>
                  <span className='text-lg font-bold text-green-900 dark:text-green-100'>
                    {discount.toLocaleString()} ل.س
                  </span>
                </div>
                <p className='text-xs text-green-700 dark:text-green-300 mt-1'>
                  الفرق بين سعر الخدمة والتكلفة المدخلة
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <Button 
        onClick={handleConfirm} 
        disabled={loading || (appointmentServices.length > 1 && !appointmentServiceId)}
        className='w-full'
      >
        {loading ? 'جارٍ الإضافة...' : 'تأكيد وحفظ'}
      </Button>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className='max-w-[95vw] w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader className='sticky top-0 bg-background z-10 pb-4 border-b'>
            <DialogTitle>تأكيد إضافة المرحلة العلاجية</DialogTitle>
            <DialogDescription>
              يرجى مراجعة التفاصيل قبل التأكيد
            </DialogDescription>
          </DialogHeader>
          <div className='overflow-y-auto max-h-[calc(90vh-120px)]'>
            <div className='space-y-4'>
              {/* Service Info */}
              {selectedService && (
                <div className='bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800'>
                  <h3 className='font-semibold text-base mb-3 text-blue-900 dark:text-blue-100'>
                    معلومات الخدمة
                  </h3>
                  <div className='space-y-2'>
                    <div className='flex justify-between'>
                      <span className='text-sm text-gray-600 dark:text-gray-400'>اسم الخدمة:</span>
                      <span className='text-sm font-semibold'>{selectedService.service?.name || 'غير معروف'}</span>
                    </div>
                    {selectedService.price && (
                      <div className='flex justify-between'>
                        <span className='text-sm text-gray-600 dark:text-gray-400'>سعر الخدمة:</span>
                        <span className='text-sm font-semibold'>{selectedService.price.toLocaleString()} ل.س</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stage Details */}
              <div className='bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg border border-gray-200 dark:border-gray-800'>
                <h3 className='font-semibold text-base mb-3'>تفاصيل المرحلة</h3>
                <div className='space-y-3'>
                  <div className='flex justify-between'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>العنوان:</span>
                    <span className='text-sm font-semibold'>{title || '-'}</span>
                  </div>
                  {description && (
                    <div className='flex flex-col gap-1'>
                      <span className='text-sm text-gray-600 dark:text-gray-400'>الوصف:</span>
                      <span className='text-sm'>{description}</span>
                    </div>
                  )}
                  <div className='flex justify-between'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>التاريخ:</span>
                    <span className='text-sm font-semibold'>
                      {date ? new Date(date).toLocaleString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : '-'}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>التكلفة:</span>
                    <span className='text-sm font-semibold'>
                      {cost && !isNaN(parseFloat(cost)) ? `${parseFloat(cost).toLocaleString()} ل.س` : 'غير محدد'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Free Consultation Notice */}
              {(!cost || isNaN(parseFloat(cost)) || parseFloat(cost) <= 0) && (
                <div className='bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800'>
                  <div className='flex items-start gap-3'>
                    <div className='flex-shrink-0 mt-0.5'>
                      <svg className='w-5 h-5 text-yellow-600 dark:text-yellow-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                      </svg>
                    </div>
                    <div className='flex-1'>
                      <h3 className='font-semibold text-base mb-2 text-yellow-900 dark:text-yellow-100'>
                        استشارة مجانية
                      </h3>
                      <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                        هذه المرحلة لا تحتوي على تكلفة، مما يعني أنها استشارة مجانية أو خدمة بدون رسوم.
                      </p>
                      <p className='text-sm font-medium text-yellow-900 dark:text-yellow-100 mt-2'>
                        ⚠ لن يتم إنشاء فاتورة تلقائياً لهذه المرحلة
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Price Summary */}
              {selectedService?.price && cost && !isNaN(parseFloat(cost)) && parseFloat(cost) > 0 && (
                <div className='bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800'>
                  <h3 className='font-semibold text-base mb-3 text-green-900 dark:text-green-100'>
                    ملخص الأسعار
                  </h3>
                  <div className='space-y-2'>
                    <div className='flex justify-between'>
                      <span className='text-sm text-gray-600 dark:text-gray-400'>سعر الخدمة:</span>
                      <span className='text-sm font-semibold'>{selectedService.price.toLocaleString()} ل.س</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-sm text-gray-600 dark:text-gray-400'>تكلفة المرحلة:</span>
                      <span className='text-sm font-semibold'>{parseFloat(cost).toLocaleString()} ل.س</span>
                    </div>
                    {discount && discount > 0 && (
                      <div className='flex justify-between pt-2 border-t border-green-300 dark:border-green-700'>
                        <span className='text-sm font-medium text-green-900 dark:text-green-100'>الخصم:</span>
                        <span className='text-lg font-bold text-green-900 dark:text-green-100'>
                          {discount.toLocaleString()} ل.س
                        </span>
                      </div>
                    )}
                    {parseFloat(cost) > selectedService.price && (
                      <div className='flex justify-between pt-2 border-t border-red-300 dark:border-red-700'>
                        <span className='text-sm font-medium text-red-900 dark:text-red-100'>الزيادة:</span>
                        <span className='text-lg font-bold text-red-900 dark:text-red-100'>
                          {(parseFloat(cost) - selectedService.price).toLocaleString()} ل.س
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className='flex justify-end gap-2 mt-6 pt-4 border-t'>
            <Button
              variant='outline'
              onClick={() => setShowConfirmDialog(false)}
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'جارٍ الحفظ...' : 'تأكيد والحفظ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
