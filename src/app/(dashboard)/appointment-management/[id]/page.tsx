'use client'

import React, { useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import axios from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import moment from 'moment'
import { TreatmentStageForm } from '@/components/treatment-stages/treatment-stage-form'
import { Appointment, Client, User, Service, AppointmentService, TreatmentStage, ApiResponse } from '@/types/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Plus, ClipboardList } from 'lucide-react'
import { useUserPermissions } from '@/hooks/usePermissions'
import { Skeleton } from '@/components/ui/skeleton'

moment.locale('ar')

// Helper function to extract ID
const extractId = (value: string | Client | User | Service | null | undefined): string => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null) {
    const obj = value as { _id?: string; id?: string }
    return obj._id || obj.id || ''
  }
  return ''
}

export default function AppointmentManagementDetailPage() {
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.id as string
  const queryClient = useQueryClient()
  const { hasPermission } = useUserPermissions()
  const canAddTreatmentStage = hasPermission('treatment-stages.create') || hasPermission('appointments.add-treatment-stage')

  // Fetch appointment
  const { data: appointment, isLoading: appointmentLoading, error: appointmentError } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<Appointment>>(`/appointments/${appointmentId}`)
      return data.data
    },
    enabled: !!appointmentId,
  })

  // Fetch appointment services
  const { data: appointmentServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['appointment-services', appointmentId],
    queryFn: async () => {
      const { data } = await axios.get(`/appointments/${appointmentId}/services`)
      return data.data as AppointmentService[]
    },
    enabled: !!appointmentId,
  })

  // Fetch all treatment stages for the appointment (we'll filter by service client-side)
  const { data: allTreatmentStages = [], refetch: refetchStages } = useQuery({
    queryKey: ['treatment-stages', 'appointment', appointmentId],
    queryFn: async () => {
      const { data } = await axios.get(`/treatment-stages/appointment/${appointmentId}`)
      return (data.data || []) as TreatmentStage[]
    },
    enabled: !!appointmentId,
  })

  // Group treatment stages by service
  const stagesByService = useMemo(() => {
    const grouped: Record<string, TreatmentStage[]> = {}
    
    // Initialize with all services
    appointmentServices.forEach((as) => {
      grouped[as._id] = []
    })
    
    // Group stages by appointmentService
    allTreatmentStages.forEach((stage) => {
      const serviceId = typeof stage.appointmentService === 'object' && stage.appointmentService !== null
        ? (stage.appointmentService as { _id?: string })._id
        : stage.appointmentService
        
      if (serviceId && grouped[serviceId]) {
        grouped[serviceId].push(stage)
      } else if (stage.appointment) {
        // Fallback: stages without appointmentService (old format)
        // Distribute to first service if available
        const firstServiceId = appointmentServices[0]?._id
        if (firstServiceId && grouped[firstServiceId]) {
          grouped[firstServiceId].push(stage)
        }
      }
    })
    
    return grouped
  }, [allTreatmentStages, appointmentServices])

  const [openAddStage, setOpenAddStage] = useState<string | null>(null)

  if (appointmentLoading) {
    return (
      <div className='p-6 space-y-6'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-96 w-full' />
      </div>
    )
  }

  if (appointmentError || !appointment) {
    return (
      <div className='p-6'>
        <Card>
          <CardContent className='p-6'>
            <p className='text-red-500 text-center'>لم يتم العثور على الموعد</p>
            <Button onClick={() => router.push('/appointment-management')} className='mt-4'>
              العودة للقائمة
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const client = typeof appointment.client === 'object' ? appointment.client : null
  const doctor = typeof appointment.doctor === 'object' ? appointment.doctor : null
  const department = typeof appointment.departmentId === 'object' ? appointment.departmentId : null

  return (
    <div className='p-6 space-y-6' dir='rtl'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => router.push('/appointment-management')}
          >
            <ArrowRight className='w-4 h-4 ml-2' />
            العودة للقائمة
          </Button>
          <h1 className='text-2xl font-bold'>تفاصيل الموعد</h1>
        </div>
      </div>

      {/* Appointment Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات الموعد</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <p><span className='font-semibold'>العميل:</span> {client?.fullName || '-'}</p>
              <p><span className='font-semibold'>الطبيب:</span> {doctor?.name || '-'}</p>
              <p><span className='font-semibold'>القسم:</span> {department?.name || '-'}</p>
            </div>
            <div>
              <p><span className='font-semibold'>التاريخ والوقت:</span> {
                appointment.date
                  ? moment(appointment.date).format('YYYY-MM-DD HH:mm')
                  : '-'
              }</p>
              <p><span className='font-semibold'>الحالة:</span> {
                <Badge
                  variant={
                    appointment.status === 'تم'
                      ? 'default'
                      : appointment.status === 'نشط'
                        ? 'secondary'
                        : appointment.status === 'ملغي'
                          ? 'destructive'
                          : 'outline'
                  }
                >
                  {appointment.status}
                </Badge>
              }</p>
              <p><span className='font-semibold'>نوع الموعد:</span> {appointment.type || '-'}</p>
            </div>
          </div>
          {appointment.notes && (
            <div className='mt-4'>
              <p><span className='font-semibold'>ملاحظات:</span> {appointment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services Section */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <ClipboardList className='w-5 h-5' />
            الخدمات ({appointmentServices.length})
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {servicesLoading ? (
            <Skeleton className='h-32 w-full' />
          ) : appointmentServices.length === 0 ? (
            <p className='text-center text-gray-500 py-8'>لا توجد خدمات في هذا الموعد</p>
          ) : (
            appointmentServices.map((appointmentService) => {
              const service = typeof appointmentService.service === 'object' 
                ? appointmentService.service 
                : null
              
              // Get treatment stages for this service from grouped data
              const treatmentStages = stagesByService[appointmentService._id] || []

              return (
                <div key={appointmentService._id} className='border rounded-lg p-4 space-y-4'>
                  {/* Service Header */}
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='text-lg font-semibold'>{service?.name || 'خدمة غير معروفة'}</h3>
                      <div className='flex gap-4 mt-2 text-sm text-gray-600'>
                        <span>السعر: {service?.price ? `${service.price.toLocaleString()} ل.س` : '-'}</span>
                        <span>المدة: {service?.duration ? `${service.duration} دقيقة` : '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Treatment Stages for this Service */}
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <h4 className='font-medium'>مراحل العلاج ({treatmentStages.length})</h4>
                      {canAddTreatmentStage && (
                        <Dialog
                          open={openAddStage === appointmentService._id}
                          onOpenChange={(open) => setOpenAddStage(open ? appointmentService._id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button size='sm' variant='outline'>
                              <Plus className='w-4 h-4 ml-2' />
                              إضافة مرحلة علاج
                            </Button>
                          </DialogTrigger>
                          <DialogContent className='max-w-[95vw] w-full sm:max-w-2xl' dir='rtl'>
                            <DialogHeader>
                              <DialogTitle>إضافة مرحلة علاج</DialogTitle>
                              <DialogDescription>
                                أضف مرحلة علاجية جديدة للخدمة: {service?.name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className='overflow-y-auto max-h-[calc(90vh-120px)]'>
                              <TreatmentStageForm
                              appointmentId={appointmentId}
                              clientId={extractId(appointment.client)}
                              doctorId={extractId(appointment.doctor)}
                              appointmentServiceId={appointmentService._id}
                              onSuccess={() => {
                                setOpenAddStage(null)
                                refetchStages()
                                queryClient.invalidateQueries({ 
                                  queryKey: ['treatment-stages', 'appointment', appointmentId] 
                                })
                              }}
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>

                    {treatmentStages.length === 0 ? (
                      <p className='text-sm text-gray-500 py-4 text-center'>
                        لا توجد مراحل علاجية لهذه الخدمة
                      </p>
                    ) : (
                      <div className='space-y-2'>
                        {treatmentStages.map((stage: TreatmentStage) => (
                          <div
                            key={stage._id}
                            className='border rounded p-3 bg-gray-50'
                          >
                            <div className='flex items-center justify-between mb-2'>
                              <h5 className='font-medium'>{stage.title}</h5>
                              <Badge variant={stage.isCompleted ? 'default' : 'outline'}>
                                {stage.isCompleted ? 'مكتملة' : 'غير مكتملة'}
                              </Badge>
                            </div>
                            {stage.description && (
                              <p className='text-sm text-gray-700 mb-2'>{stage.description}</p>
                            )}
                            <div className='flex gap-4 text-xs text-gray-600'>
                              <span>التاريخ: {stage.date ? moment(stage.date).format('YYYY-MM-DD HH:mm') : '-'}</span>
                              <span>التكلفة: {stage.cost ? `${stage.cost.toLocaleString()} ل.س` : '0 ل.س'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}

