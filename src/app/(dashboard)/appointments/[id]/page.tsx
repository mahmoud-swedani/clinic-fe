// src/app/(dashboard)/appointments/[id]/page.tsx
'use client'

import React, { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import axios from '@/lib/axios'
import { Card, CardContent } from '@/components/ui/card'
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
import { motion } from 'framer-motion'
import { Appointment, Patient, User, TreatmentStage, ApiResponse } from '@/types/api'
import { useUserPermissions } from '@/hooks/usePermissions'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, Pencil } from 'lucide-react'
import { AppointmentForm } from '@/components/appointments/appointment-form'
import { AppointmentActivities } from '@/components/appointments/appointment-activities'
import { TreatmentStageEditForm } from '@/components/treatment-stages/treatment-stage-edit-form'
import { useAllFormData } from '@/hooks/useFormData'
import { queryKeys } from '@/lib/queryKeys'
import { useCurrentUser } from '@/hooks/useCurrentUser'

moment.locale('ar')

// Helper function to extract ID from patient/doctor (string or object)
const extractId = (value: string | Patient | User | null | undefined): string => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null) {
    const obj = value as { _id?: string; id?: string }
    return obj._id || obj.id || ''
  }
  return ''
}

export default function AppointmentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.id
  const queryClient = useQueryClient()
  const { canAddTreatmentStageFromAppointment, canManageAppointments, canViewAppointmentActivities, hasPermission } = useUserPermissions()
  const canEditStage = hasPermission('treatment-stages.edit')

  const [openAddStage, setOpenAddStage] = useState(false)
  const [openEditForm, setOpenEditForm] = useState(false)
  const [openEditStage, setOpenEditStage] = useState(false)
  const [selectedStage, setSelectedStage] = useState<TreatmentStage | null>(null)

  // Get current user for branch filtering
  const { data: user } = useCurrentUser()
  const branchId = typeof user?.branch === 'object' && user?.branch !== null 
    ? (user.branch as { _id: string })._id 
    : user?.branch

  // Fetch appointment using React Query
  const { data: appointment, isLoading: appointmentLoading, error: appointmentError, refetch: refetchAppointment } = useQuery({
    queryKey: queryKeys.appointments.detail(appointmentId as string),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<Appointment>>(`/appointments/${appointmentId}`)
      return data.data
    },
    enabled: !!appointmentId,
  })

  // Fetch treatment stages for this appointment
  const { data: treatmentStagesData, refetch: refetchStages } = useQuery({
    queryKey: ['treatment-stages', 'appointment', appointmentId],
    queryFn: async () => {
      const { data } = await axios.get(`/treatment-stages/appointment/${appointmentId}`)
      return data
    },
    enabled: !!appointmentId,
    select: (data) => {
      // Return stages from API response
      return (data?.data || []) as TreatmentStage[]
    },
  })

  const treatmentStages = treatmentStagesData || []

  // Fetch form data using cached hooks (data is cached globally)
  const { patients, doctors, services, departments } = useAllFormData(branchId)

  // Set loading and error states
  const loading = appointmentLoading
  const error = appointmentError 
    ? (appointmentError as { response?: { data?: { message?: string } } })?.response?.data?.message || 'تعذر تحميل تفاصيل الموعد.'
    : null

  if (loading) {
    return (
      <div className='flex justify-center items-center h-screen'>
        <div className='text-gray-500 text-center'>
          جاري تحميل تفاصيل الموعد...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex justify-center items-center h-screen'>
        <div className='text-red-500 text-center'>{error}</div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className='flex justify-center items-center h-screen'>
        <div className='text-gray-500 text-center'>
          لم يتم العثور على الموعد.
        </div>
      </div>
    )
  }

  return (
    <div
      dir='rtl'
      className='min-h-screen bg-gray-50 py-8 px-4 md:px-8 lg:px-16'
    >
      {/* Container for animations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className='max-w-3xl mx-auto space-y-6'
      >
        {/* أزرار الإجراءات في الأعلى */}
        <div className='flex justify-end gap-2'>
          {canManageAppointments && (
            <Dialog open={openEditForm} onOpenChange={setOpenEditForm}>
              <DialogTrigger asChild>
                <Button variant='outline' className='flex items-center gap-2'>
                  <Pencil className='w-4 h-4' />
                  تعديل الموعد
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-xl' dir='rtl'>
                <DialogHeader>
                  <DialogTitle>تعديل الموعد</DialogTitle>
                  <DialogDescription>
                    قم بتعديل بيانات الموعد
                  </DialogDescription>
                </DialogHeader>
                {appointment && (
                  <AppointmentForm
                    patients={patients}
                    doctors={doctors}
                    services={services}
                    departments={departments}
                    initialData={appointment}
                    onSuccess={() => {
                      setOpenEditForm(false)
                      // Invalidate all appointment queries to ensure updates are reflected everywhere
                      queryClient.invalidateQueries({ queryKey: ['appointments'] })
                      queryClient.invalidateQueries({ queryKey: ['appointments', 'all-shared'] })
                      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.detail(appointmentId as string) })
                      // Force refetch of ALL queries (not just active) to immediately update the UI for all users
                      queryClient.refetchQueries({ queryKey: ['appointments'], type: 'all' })
                      // Refetch the current appointment detail
                      refetchAppointment()
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>
          )}
          {canAddTreatmentStageFromAppointment && (
            <Dialog open={openAddStage} onOpenChange={setOpenAddStage}>
              <DialogTrigger asChild>
                <Button className='bg-green-500 hover:bg-green-600 text-white'>
                  إضافة مرحلة علاج
                </Button>
              </DialogTrigger>
            <DialogContent className='max-w-md' dir='rtl'>
              <DialogHeader>
                <DialogTitle>إضافة مرحلة علاج</DialogTitle>
                <DialogDescription>
                  أضف مرحلة علاجية جديدة للموعد
                </DialogDescription>
              </DialogHeader>
              <TreatmentStageForm
                appointmentId={appointment._id}
                patientId={extractId(appointment.patient)}
                doctorId={extractId(appointment.doctor)}
                onSuccess={() => {
                  setOpenAddStage(false)
                  refetchStages()
                }}
              />
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* بطاقة تفاصيل الموعد */}
        <Card className='bg-white shadow-lg rounded-2xl overflow-hidden'>
          <CardContent className='p-6 space-y-4'>
            <motion.h1
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className='text-2xl font-bold text-gray-800 text-right'
            >
              تفاصيل الموعد
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className='grid grid-cols-1 gap-4 text-right md:grid-cols-2'
            >
              <div className='space-y-2'>
                <p>
                  <span className='font-semibold'>نوع الموعد:</span>{' '}
                  <span className='text-gray-700'>
                    {appointment.type || '-'}
                  </span>
                </p>
                <p>
                  <span className='font-semibold'>المريض:</span>{' '}
                  <span className='text-gray-700'>
                    {typeof appointment.patient === 'object' && appointment.patient !== null
                      ? appointment.patient.fullName
                      : '-'}
                  </span>
                </p>
                <p>
                  <span className='font-semibold'>الطبيب:</span>{' '}
                  <span className='text-gray-700'>
                    {typeof appointment.doctor === 'object' && appointment.doctor !== null
                      ? appointment.doctor.name
                      : '-'}
                  </span>
                </p>
                <p>
                  <span className='font-semibold'>الخدمة:</span>{' '}
                  <span className='text-gray-700'>
                    {typeof appointment.service === 'object' && appointment.service !== null
                      ? appointment.service.name
                      : '-'}
                  </span>
                </p>
                <p>
                  <span className='font-semibold'>القسم:</span>{' '}
                  <span className='text-gray-700'>
                    {typeof appointment.departmentId === 'object' && appointment.departmentId !== null
                      ? appointment.departmentId.name
                      : '-'}
                  </span>
                </p>
              </div>

              <div className='space-y-2'>
                <p>
                  <span className='font-semibold'>التاريخ والوقت:</span>{' '}
                  <span className='text-gray-700'>
                    {appointment.date
                      ? moment(appointment.date).format('YYYY-MM-DD HH:mm')
                      : '-'}
                  </span>
                </p>
                <p>
                  <span className='font-semibold'>الحالة:</span>{' '}
                  <Badge className='bg-blue-100 text-blue-800 px-2 py-1 rounded-md'>
                    {appointment.status || '-'}
                  </Badge>
                </p>
                <p>
                  <span className='font-semibold'>ملاحظات:</span>{' '}
                  <span className='text-gray-700'>
                    {appointment.notes || '-'}
                  </span>
                </p>
              </div>
            </motion.div>
          </CardContent>
        </Card>

        {/* مراحل العلاج */}
        <Card className='bg-white shadow-lg rounded-2xl overflow-hidden'>
          <CardContent className='p-6 space-y-4'>
            <motion.h2
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className='text-xl font-bold text-gray-800 text-right mb-4'
            >
              مراحل العلاج
            </motion.h2>

            {treatmentStages.length > 0 ? (
              <div className='space-y-3'>
                {treatmentStages.map((stage: TreatmentStage) => (
                  <motion.div
                    key={stage._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className='border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors'
                  >
                    <div className='flex justify-between items-start mb-2'>
                      <h3 className='text-lg font-semibold text-gray-800'>
                        {stage.title}
                      </h3>
                      <div className='flex items-center gap-2'>
                        {canEditStage && (
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedStage(stage)
                              setOpenEditStage(true)
                            }}
                            className='h-8 w-8 p-0'
                            title='تعديل المرحلة'
                          >
                            <Pencil className='w-4 h-4' />
                          </Button>
                        )}
                        {stage.isCompleted ? (
                          <CheckCircle2 className='text-green-600 w-5 h-5' />
                        ) : (
                          <XCircle className='text-red-600 w-5 h-5' />
                        )}
                        <Badge
                          variant={stage.isCompleted ? 'default' : 'outline'}
                          className='text-xs'
                        >
                          {stage.isCompleted ? 'مكتملة' : 'غير مكتملة'}
                        </Badge>
                      </div>
                    </div>
                    {stage.description && (
                      <p className='text-gray-700 mb-2'>{stage.description}</p>
                    )}
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600'>
                      <p>
                        <span className='font-semibold'>التاريخ:</span>{' '}
                        {stage.date
                          ? moment(stage.date).format('YYYY-MM-DD HH:mm')
                          : '-'}
                      </p>
                      <p>
                        <span className='font-semibold'>الطبيب:</span>{' '}
                        {typeof stage.doctor === 'object' && stage.doctor !== null
                          ? stage.doctor.name
                          : '-'}
                      </p>
                      <p>
                        <span className='font-semibold'>التكلفة:</span>{' '}
                        {stage.cost ? `${stage.cost.toLocaleString()} ل.س` : '0 ل.س'}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className='text-center text-gray-500 py-8'>
                لا توجد مراحل علاجية لهذا الموعد
              </p>
            )}
          </CardContent>
        </Card>

        {/* سجل الأنشطة */}
        {canViewAppointmentActivities && (
          <AppointmentActivities appointmentId={appointmentId as string} />
        )}

        {/* زر العودة للمواعيد */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className='flex justify-end'
        >
          <Button variant='outline' onClick={() => router.back()}>
            العودة للمواعيد
          </Button>
        </motion.div>
      </motion.div>

      {/* Edit Stage Dialog */}
      {canEditStage && (
        <Dialog open={openEditStage} onOpenChange={setOpenEditStage}>
          <DialogContent className='max-w-2xl' dir='rtl'>
            <DialogHeader>
              <DialogTitle>تعديل المرحلة العلاجية</DialogTitle>
              <DialogDescription>قم بتعديل بيانات المرحلة العلاجية</DialogDescription>
            </DialogHeader>
            {selectedStage && (
              <TreatmentStageEditForm
                stage={selectedStage}
                onSuccess={() => {
                  setOpenEditStage(false)
                  setSelectedStage(null)
                  refetchStages()
                }}
                onCancel={() => {
                  setOpenEditStage(false)
                  setSelectedStage(null)
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
