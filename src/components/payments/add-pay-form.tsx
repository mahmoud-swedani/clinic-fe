'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import axios from '@/lib/axios'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { TreatmentStage, Payment, AppointmentService } from '@/types/api'

export function AddPayForm({
  invoiceId,
  clientId,
  appointmentId,
  refetchInvoices,
  onClose,
  payments = [],
  remainingAmount = 0,
  treatmentStages = [],
  initialSelectedStage = null,
  appointmentServices = [],
  stagesByService = {},
}: {
  invoiceId: string
  clientId?: string
  appointmentId?: string
  refetchInvoices?: () => void
  onClose?: () => void
  payments?: Payment[] // Full payment objects with treatmentStages
  remainingAmount?: number
  treatmentStages?: TreatmentStage[]
  initialSelectedStage?: string | null // Single stage ID instead of array
  appointmentServices?: AppointmentService[] // Services for the appointment
  stagesByService?: Record<string, TreatmentStage[]> // Stages grouped by service ID
}) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('نقدًا')
  const [notes, setNotes] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [selectedStage, setSelectedStage] = useState<string | null>(initialSelectedStage || null)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  // Update selected stage when initialSelectedStage changes (important for pre-selected stage)
  useEffect(() => {
    if (initialSelectedStage) {
      setSelectedStage(initialSelectedStage)
      
      // Auto-select the service that contains this stage
      if (appointmentServices.length > 0 && Object.keys(stagesByService).length > 0) {
        const serviceForStage = appointmentServices.find((as) => {
          const serviceStages = stagesByService[as._id] || []
          return serviceStages.some((s) => s._id === initialSelectedStage)
        })
        if (serviceForStage) {
          setSelectedServiceId(serviceForStage._id)
        }
      }
    } else if (!initialSelectedStage && selectedStage) {
      // Clear selection if initialSelectedStage is cleared
      setSelectedStage(null)
      setSelectedServiceId(null)
    }
  }, [initialSelectedStage, appointmentServices, stagesByService, selectedStage])

  // Helper function to calculate paid amount for a specific stage
  const calculateStagePaid = useCallback((stageId: string): number => {
    if (!payments || payments.length === 0) return 0
    
    return payments.reduce((sum, payment) => {
      // Skip payments without specific treatmentStages (old format)
      if (!payment.treatmentStages || payment.treatmentStages.length === 0) {
        return sum // Old payments don't apply to specific stages
      }
      
      // Payment has specific stages - check if it's for THIS stage
      const paymentStageIds = payment.treatmentStages.map((ts) =>
        typeof ts === 'object' && ts !== null ? (ts as TreatmentStage)._id : String(ts)
      ).map(id => String(id))
      
      const currentStageId = String(stageId)
      
      // Check if this payment is specifically for the selected stage
      if (paymentStageIds.some(id => {
        const normalizedId = String(id).trim().toLowerCase()
        const normalizedCurrent = String(currentStageId).trim().toLowerCase()
        return normalizedId === normalizedCurrent
      })) {
        // Payment is for this stage - apply full amount (payments are always single-stage now)
        return sum + (payment.amount || 0)
      }
      
      return sum // Payment is not for this stage
    }, 0)
  }, [payments])

  // Handle stage selection - properly triggers RadioGroup's onValueChange
  const handleStageSelect = useCallback((value: string) => {
    const stageId = value && value.trim() !== '' ? String(value).trim() : null
    setSelectedStage(stageId)
  }, [])

  // Get available stages for selected service (filter out fully paid stages)
  const availableStages = useMemo(() => {
    if (!selectedServiceId) return []
    const allStages = stagesByService[selectedServiceId] || []
    // Filter out fully paid stages
    return allStages.filter((stage) => {
      const stageCost = stage.cost || 0
      const stagePaid = calculateStagePaid(String(stage._id))
      const stageRemaining = stageCost - stagePaid
      return stageRemaining > 0
    })
  }, [selectedServiceId, stagesByService, calculateStagePaid])

  // Auto-select service if only one service exists
  useEffect(() => {
    if (appointmentServices.length === 1 && !selectedServiceId) {
      const singleService = appointmentServices[0]
      if (singleService && singleService._id) {
        setSelectedServiceId(singleService._id)
      }
    }
  }, [appointmentServices, selectedServiceId])

  // Clear stage selection when service changes
  useEffect(() => {
    if (selectedServiceId && !initialSelectedStage) {
      setSelectedStage(null)
    }
  }, [selectedServiceId, initialSelectedStage])

  // Get selected stage object
  const selectedStageObj = useMemo(() => {
    if (!selectedStage) return null
    // First try to find in available stages (for selected service)
    if (availableStages.length > 0) {
      return availableStages.find((stage) => stage._id === selectedStage) || null
    }
    // Fallback to all treatment stages
    return treatmentStages.find((stage) => stage._id === selectedStage) || null
  }, [selectedStage, availableStages, treatmentStages])

  // Calculate cost of selected stage
  const selectedStageCost = useMemo(() => {
    return selectedStageObj ? (selectedStageObj.cost || 0) : 0
  }, [selectedStageObj])

  // Calculate how much has been paid to the selected stage
  const selectedStagePaid = useMemo(() => {
    if (!selectedStage) return 0

    return (payments || []).reduce((sum, payment) => {
      // Skip payments without specific treatmentStages (old format)
      if (!payment.treatmentStages || payment.treatmentStages.length === 0) {
        return sum // Old payments don't apply to specific stages
      }

      // Payment has specific stages - check if it's for THIS stage
      const paymentStageIds = payment.treatmentStages.map((ts) =>
        typeof ts === 'object' && ts !== null ? (ts as TreatmentStage)._id : String(ts)
      ).map(id => String(id))

      const currentStageId = String(selectedStage)

      // Check if this payment is specifically for the selected stage
      if (paymentStageIds.includes(currentStageId)) {
        // Payment is for this stage - apply full amount (payments are always single-stage now)
        return sum + (payment.amount || 0)
      }

      return sum // Payment is not for this stage
    }, 0)
  }, [selectedStage, payments])

  // Calculate remaining amount for selected stage
  const selectedStageRemaining = useMemo(() => {
    return Math.max(0, selectedStageCost - selectedStagePaid)
  }, [selectedStageCost, selectedStagePaid])

  // Auto-fill amount with remaining amount when stage is selected
  useEffect(() => {
    if (selectedStageRemaining > 0 && !amount && selectedStage) {
      setAmount(selectedStageRemaining.toString())
    }
  }, [selectedStageRemaining, amount, selectedStage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate service is selected (if multiple services exist)
    if (appointmentServices.length > 1 && !selectedServiceId) {
      toast.error('يرجى اختيار الخدمة أولاً')
      return
    }

    // Validate that exactly one treatment stage is selected
    if (!selectedStage) {
      toast.error('يرجى اختيار مرحلة علاج واحدة')
      return
    }

    const numericAmount = parseFloat(amount)
    
    if (numericAmount <= 0) {
      toast.error('المبلغ يجب أن يكون أكبر من صفر')
      return
    }

    // Validate against remaining amount for selected stage, not whole invoice
    if (numericAmount > selectedStageRemaining) {
      toast.error(`لا يمكن دفع أكثر من المبلغ المتبقي للمرحلة المختارة (${selectedStageRemaining.toLocaleString()} ل.س)`)
      return
    }

    setLoading(true)

    try {
      // Validate selectedStage is set (double check)
      if (!selectedStage) {
        toast.error('يرجى اختيار مرحلة علاج واحدة')
        setLoading(false)
        return
      }

      // Send payment with single treatment stage (as array with one element)
      const paymentData = {
        invoiceId,
        client: clientId,
        appointment: appointmentId,
        treatmentStages: [selectedStage], // Send as array with single stage ID - MUST be exactly one stage
        amount: numericAmount,
        method,
        notes: notes.trim() || undefined, // Include notes if provided
      }

      // Debug: Log payment data being sent
      if (process.env.NODE_ENV === 'development') {
        console.log('Sending payment with treatment stage:', {
          invoiceId,
          treatmentStages: paymentData.treatmentStages,
          amount: paymentData.amount,
          selectedStage,
          selectedStageType: typeof selectedStage
        })
      }

      const response = await axios.post('/payments', paymentData)

      toast.success('تمت إضافة الدفعة بنجاح')

      // Debug: Log the response
      if (process.env.NODE_ENV === 'development') {
        console.log('Payment created successfully:', response.data)
      }

      // Invalidate queries immediately
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(invoiceId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.byInvoice(invoiceId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs.entity('Invoice', invoiceId) })

      setAmount('')
      setMethod('نقدًا')
      setNotes('')
      setSelectedStage(null)
      setSelectedServiceId(null)

      // Wait a moment for backend to process
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Call refetch callback if provided - this will refetch invoice and payments
      if (refetchInvoices) {
        await refetchInvoices()
      }
      
      // Also explicitly refetch payments to ensure UI updates
      queryClient.refetchQueries({
        queryKey: queryKeys.payments.byInvoice(invoiceId),
      })
      
      if (onClose) onClose()
    } catch (error) {
      console.error(error)
      toast.error('فشل في إضافة الدفعة. تحقق من البيانات.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      {/* سجل الدفعات السابقة */}
      <div className='space-y-2'>
        <h4 className='text-sm font-medium'>سجل الدفعات السابقة</h4>
        {payments.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            لا توجد دفعات حتى الآن.
          </p>
        ) : (
          <ul className='space-y-2 text-sm'>
            {payments.map((pay) => {
              const paymentDate = pay.date || pay.createdAt
              const paymentStages = pay.treatmentStages || []
              const hasSpecificStages = paymentStages.length > 0
              
              return (
                <li key={pay._id} className='border-b pb-2 space-y-1'>
                  <div className='flex justify-between items-center'>
                    <span>
                      {paymentDate
                        ? new Date(paymentDate).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '-'}{' '}
                      - {pay.method}
                    </span>
                    <span className='font-semibold'>{pay.amount?.toLocaleString() || 0} ل.س</span>
                  </div>
                  {hasSpecificStages && (
                    <div className='text-xs text-gray-600 pr-4'>
                      للمرحلة: {paymentStages.map((ts, idx) => {
                        const stageName = typeof ts === 'object' && ts !== null
                          ? (ts as TreatmentStage).title
                          : treatmentStages.find(s => s._id === ts)?.title || 'غير معروف'
                        return (
                          <span key={idx}>
                            {stageName}
                            {idx < paymentStages.length - 1 ? '، ' : ''}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {!hasSpecificStages && (
                    <div className='text-xs text-gray-500 pr-4'>لجميع المراحل (دفعة قديمة)</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* نموذج الدفع */}
      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* Step 1: Select Service (always show if services exist) */}
        {appointmentServices.length > 0 && (
          <div className='space-y-2'>
            <Label>اختر الخدمة *</Label>
            <Select
              value={selectedServiceId || ''}
              onValueChange={(value) => {
                setSelectedServiceId(value || null)
              }}
            >
              <SelectTrigger 
                onClick={(e) => {
                  e.stopPropagation()
                }}
              >
                <SelectValue placeholder='اختر الخدمة' />
              </SelectTrigger>
              <SelectContent>
                {appointmentServices
                  .filter((appointmentService) => {
                    // Only show services that have unpaid stages
                    const serviceStages = stagesByService[appointmentService._id] || []
                    if (serviceStages.length === 0) return false
                    
                    // Check if any stage has remaining amount (unpaid)
                    const hasUnpaidStages = serviceStages.some((stage) => {
                      const stageCost = stage.cost || 0
                      const stagePaid = calculateStagePaid(String(stage._id))
                      const stageRemaining = stageCost - stagePaid
                      return stageRemaining > 0
                    })
                    
                    return hasUnpaidStages
                  })
                  .map((appointmentService) => {
                    const service = typeof appointmentService.service === 'object'
                      ? appointmentService.service
                      : null
                    const serviceStages = stagesByService[appointmentService._id] || []
                    const unpaidStages = serviceStages.filter((stage) => {
                      const stageCost = stage.cost || 0
                      const stagePaid = calculateStagePaid(String(stage._id))
                      const stageRemaining = stageCost - stagePaid
                      return stageRemaining > 0
                    })
                    
                    return (
                      <SelectItem
                        key={appointmentService._id}
                        value={appointmentService._id}
                      >
                        {service?.name || 'خدمة غير معروفة'} ({unpaidStages.length} مرحلة متبقية)
                      </SelectItem>
                    )
                  })}
              </SelectContent>
            </Select>
            {!selectedServiceId && (
              <p className='text-sm text-red-600'>يرجى اختيار الخدمة أولاً</p>
            )}
          </div>
        )}

        {/* Step 2: Select Treatment Stage (Single Selection) - Show stages for selected service */}
        {selectedServiceId && availableStages.length > 0 && (
          <div className='space-y-2'>
            <Label>اختر مرحلة العلاج *</Label>
            <RadioGroup
              value={selectedStage ? String(selectedStage) : ''}
              onValueChange={handleStageSelect}
              className='border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2'
            >
              {availableStages.map((stage) => {
                const stageCost = stage.cost || 0
                const isPreSelected = initialSelectedStage === stage._id
                
                // Calculate payment status for this stage
                const stagePaid = (payments || []).reduce((sum, payment) => {
                  // Skip payments without specific treatmentStages (old format)
                  if (!payment.treatmentStages || payment.treatmentStages.length === 0) {
                    return sum
                  }
                  
                  const paymentStageIds = payment.treatmentStages.map((ts) => {
                    if (typeof ts === 'string') {
                      return String(ts).trim()
                    }
                    if (typeof ts === 'object' && ts !== null) {
                      const stageObj = ts as TreatmentStage
                      return String(stageObj._id || stageObj.id || ts).trim()
                    }
                    return String(ts).trim()
                  })
                  
                  const currentStageId = String(stage._id).trim()
                  const isForThisStage = paymentStageIds.some(id => String(id).trim() === currentStageId)
                  
                  if (isForThisStage) {
                    return sum + (payment.amount || 0)
                  }
                  return sum
                }, 0)
                
                const stageRemaining = Math.max(0, stageCost - stagePaid)
                const radioId = `stage-${stage._id}`
                
                return (
                  <div
                    key={stage._id}
                    className='flex items-center space-x-2 space-x-reverse p-2 hover:bg-gray-50 rounded cursor-pointer'
                    onClick={(e) => {
                      // Check if click is on Select or its children - if so, don't handle
                      const target = e.target as HTMLElement
                      if (target.closest('[role="combobox"]') || target.closest('[data-slot="select-trigger"]') || target.closest('[data-slot="select-content"]')) {
                        return
                      }
                      // Programmatically click the RadioGroupItem button to trigger Radix UI's internal handler
                      // Use setTimeout to ensure DOM is ready
                      setTimeout(() => {
                        const buttonById = document.getElementById(radioId) as HTMLButtonElement
                        if (buttonById) {
                          buttonById.click()
                        }
                      }, 0)
                    }}
                    role='button'
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        const buttonById = document.getElementById(radioId) as HTMLButtonElement
                        if (buttonById) {
                          buttonById.click()
                        }
                      }
                    }}
                  >
                    <RadioGroupItem
                      value={String(stage._id)}
                      id={radioId}
                    />
                    <div
                      className='flex-1 text-sm cursor-pointer flex items-center justify-between'
                      onClick={(e) => {
                        // Check if click is on Select - if so, don't handle
                        const target = e.target as HTMLElement
                        if (target.closest('[role="combobox"]') || target.closest('[data-slot="select-trigger"]')) {
                          return
                        }
                        // Programmatically click the RadioGroupItem button
                        const buttonById = document.getElementById(radioId) as HTMLButtonElement
                        if (buttonById) {
                          buttonById.click()
                        }
                      }}
                    >
                      <div className='flex flex-col'>
                        <span className='font-medium'>
                          {stage.title}
                          {isPreSelected && (
                            <span className='text-xs text-blue-600 mr-1'>(محدد مسبقاً)</span>
                          )}
                        </span>
                        <div className='text-xs text-gray-600 mt-1'>
                          <span>التكلفة: {stageCost.toLocaleString()} ل.س</span>
                          {stagePaid > 0 && (
                            <span className='mr-2'> | مدفوع: {Math.round(stagePaid).toLocaleString()} ل.س</span>
                          )}
                          {stageRemaining > 0 && (
                            <span className='text-red-600'> | متبقي: {Math.round(stageRemaining).toLocaleString()} ل.س</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </RadioGroup>
            {!selectedStage && (
              <p className='text-sm text-red-600'>يرجى اختيار مرحلة علاج واحدة</p>
            )}
          </div>
        )}

        {/* Show message if no services available */}
        {appointmentServices.length === 0 && (
          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3'>
            <p className='text-sm text-yellow-800'>
              لا توجد خدمات متاحة. يرجى التحقق من الموعد المرتبط بهذه الفاتورة.
            </p>
          </div>
        )}

        {/* Show message if service selected but no stages */}
        {selectedServiceId && availableStages.length === 0 && (
          <div className='bg-gray-50 border border-gray-200 rounded-lg p-3'>
            <p className='text-sm text-gray-600'>
              لا توجد مراحل علاج متاحة لهذه الخدمة
            </p>
          </div>
        )}

        {/* Step 2: Select Treatment Stage (if only one service - auto-selected) */}
        {appointmentServices.length === 1 && treatmentStages.length > 0 && (
          <div className='space-y-2'>
            <Label>اختر مرحلة العلاج *</Label>
            <RadioGroup
              value={selectedStage ? String(selectedStage) : ''}
              onValueChange={handleStageSelect}
              className='border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2'
            >
              {treatmentStages
                .filter((stage) => {
                  // Only show stages that are not fully paid
                  const stageCost = stage.cost || 0
                  const stagePaid = calculateStagePaid(String(stage._id))
                  const stageRemaining = stageCost - stagePaid
                  return stageRemaining > 0
                })
                .map((stage) => {
                const stageCost = stage.cost || 0
                const isPreSelected = initialSelectedStage === stage._id
                
                // Calculate payment status for this stage
                const stagePaid = (payments || []).reduce((sum, payment) => {
                  if (!payment.treatmentStages || payment.treatmentStages.length === 0) {
                    return sum
                  }
                  const paymentStageIds = payment.treatmentStages.map((ts) => {
                    if (typeof ts === 'string') {
                      return String(ts).trim()
                    }
                    if (typeof ts === 'object' && ts !== null) {
                      const stageObj = ts as TreatmentStage
                      return String(stageObj._id || stageObj.id || ts).trim()
                    }
                    return String(ts).trim()
                  })
                  
                  const currentStageId = String(stage._id).trim()
                  const isForThisStage = paymentStageIds.some(id => String(id).trim() === currentStageId)
                  
                  if (isForThisStage) {
                    return sum + (payment.amount || 0)
                  }
                  return sum
                }, 0)
                
                const stageRemaining = Math.max(0, stageCost - stagePaid)
                const radioId = `stage-${stage._id}`
                
                return (
                  <div
                    key={stage._id}
                    className='flex items-center space-x-2 space-x-reverse p-2 hover:bg-gray-50 rounded cursor-pointer'
                    onClick={(e) => {
                      // Check if click is on Select or its children - if so, don't handle
                      const target = e.target as HTMLElement
                      if (target.closest('[role="combobox"]') || target.closest('[data-slot="select-trigger"]') || target.closest('[data-slot="select-content"]')) {
                        return
                      }
                      // Programmatically click the RadioGroupItem button to trigger Radix UI's internal handler
                      // Use setTimeout to ensure DOM is ready
                      setTimeout(() => {
                        const buttonById = document.getElementById(radioId) as HTMLButtonElement
                        if (buttonById) {
                          buttonById.click()
                        }
                      }, 0)
                    }}
                    role='button'
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        const buttonById = document.getElementById(radioId) as HTMLButtonElement
                        if (buttonById) {
                          buttonById.click()
                        }
                      }
                    }}
                  >
                    <RadioGroupItem
                      value={String(stage._id)}
                      id={radioId}
                    />
                    <div
                      className='flex-1 text-sm cursor-pointer flex items-center justify-between'
                      onClick={(e) => {
                        // Check if click is on Select - if so, don't handle
                        const target = e.target as HTMLElement
                        if (target.closest('[role="combobox"]') || target.closest('[data-slot="select-trigger"]')) {
                          return
                        }
                        // Programmatically click the RadioGroupItem button
                        const buttonById = document.getElementById(radioId) as HTMLButtonElement
                        if (buttonById) {
                          buttonById.click()
                        }
                      }}
                    >
                      <div className='flex flex-col'>
                        <span className='font-medium'>
                          {stage.title}
                          {isPreSelected && (
                            <span className='text-xs text-blue-600 mr-1'>(محدد مسبقاً)</span>
                          )}
                        </span>
                        <div className='text-xs text-gray-600 mt-1'>
                          <span>التكلفة: {stageCost.toLocaleString()} ل.س</span>
                          {stagePaid > 0 && (
                            <span className='mr-2'> | مدفوع: {Math.round(stagePaid).toLocaleString()} ل.س</span>
                          )}
                          {stageRemaining > 0 && (
                            <span className='text-red-600'> | متبقي: {Math.round(stageRemaining).toLocaleString()} ل.س</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </RadioGroup>
            {!selectedStage && (
              <p className='text-sm text-red-600'>يرجى اختيار مرحلة علاج واحدة</p>
            )}
          </div>
        )}

        {/* Show message if no service selected */}
        {appointmentServices.length > 0 && !selectedServiceId && (
          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3'>
            <p className='text-sm text-yellow-800'>
              يرجى اختيار الخدمة أولاً لعرض مراحل العلاج المتاحة
            </p>
          </div>
        )}

        {/* Show message if service selected but no stages */}
        {selectedServiceId && availableStages.length === 0 && (
          <div className='bg-gray-50 border border-gray-200 rounded-lg p-3'>
            <p className='text-sm text-gray-600'>
              لا توجد مراحل علاج متاحة لهذه الخدمة
            </p>
          </div>
        )}

        {/* Selected Stage Summary */}
        {selectedStage && selectedStageObj && (
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2'>
            <div className='flex justify-between items-center'>
              <span className='text-sm font-medium'>المرحلة المختارة:</span>
              <span className='text-sm font-semibold'>{selectedStageObj.title}</span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-sm font-medium'>تكلفة المرحلة:</span>
              <span className='text-sm font-semibold'>{selectedStageCost.toLocaleString()} ل.س</span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-green-700'>المدفوع للمرحلة:</span>
              <span className='text-sm font-semibold text-green-700'>
                {Math.round(selectedStagePaid).toLocaleString()} ل.س
              </span>
            </div>
            <div className='flex justify-between items-center border-t pt-2'>
              <span className='text-sm font-medium text-red-700'>المتبقي للمرحلة:</span>
              <span className='text-sm font-bold text-red-700'>
                {Math.round(selectedStageRemaining).toLocaleString()} ل.س
              </span>
            </div>
          </div>
        )}

        <div className='space-y-1'>
          <Label>
            المبلغ {selectedStage && (
              <span className='text-sm text-gray-600'>
                (المتبقي للمرحلة المختارة: {Math.round(selectedStageRemaining).toLocaleString()} ل.س)
              </span>
            )}
          </Label>
          <Input
            type='number'
            placeholder='أدخل المبلغ'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            max={selectedStage ? selectedStageRemaining : remainingAmount}
            required
            disabled={!selectedStage}
          />
          {selectedStage && selectedStageRemaining > 0 && (
            <p className='text-xs text-gray-500 mt-1'>
              يمكنك تعديل المبلغ يدويًا (الحد الأقصى: {Math.round(selectedStageRemaining).toLocaleString()} ل.س)
            </p>
          )}
          {!selectedStage && (
            <p className='text-xs text-red-500 mt-1'>يرجى اختيار مرحلة علاج أولاً</p>
          )}
        </div>

        <div className='space-y-1'>
          <Label>طريقة الدفع</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger>
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

        <div className='space-y-1'>
          <Label>ملاحظات (اختياري)</Label>
          <Textarea
            placeholder='أضف ملاحظات حول هذه الدفعة (اختياري)'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <Button type='submit' disabled={loading || !selectedStage}>
          {loading ? 'جاري الإضافة...' : 'إضافة'}
        </Button>
      </form>
    </div>
  )
}
