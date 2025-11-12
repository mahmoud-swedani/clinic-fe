'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTreatmentStage } from '@/hooks/useTreatmentStage'
import { useUserPermissions } from '@/hooks/usePermissions'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { TreatmentStageActivities } from '@/components/treatment-stages/treatment-stage-activities'
import { TreatmentStageEditForm } from '@/components/treatment-stages/treatment-stage-edit-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Pencil, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import moment from 'moment'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

moment.locale('ar')

export default function TreatmentStageDetailPage() {
  const router = useRouter()
  const params = useParams()
  const stageId = params.id as string
  const { data: stage, isLoading, isError } = useTreatmentStage(stageId)
  const { data: currentUser, isLoading: userLoading } = useCurrentUser()
  const { hasPermission, permissions } = useUserPermissions()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Check permissions - try multiple possible permission names
  const canEdit = 
    hasPermission('treatment-stages.edit') ||
    hasPermission('treatment-stages.update') ||
    hasPermission('treatmentStages.edit') ||
    hasPermission('treatmentStages.update')
  
  const canViewActivities = hasPermission('treatment-stages.view') || hasPermission('treatment-stages.view-activities')

  // Debug: Log permissions to help diagnose issues (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !userLoading && currentUser) {
      console.log('=== Treatment Stage Detail Page Debug ===')
      console.log('User:', currentUser)
      console.log('User permissions array:', permissions)
      console.log('Has treatment-stages.edit:', hasPermission('treatment-stages.edit'))
      console.log('Has treatment-stages.update:', hasPermission('treatment-stages.update'))
      console.log('Can edit (combined check):', canEdit)
      console.log('========================================')
    }
  }, [permissions, canEdit, currentUser, userLoading, hasPermission])

  if (isLoading) {
    return (
      <div className='container py-8 space-y-4'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-96 w-full' />
      </div>
    )
  }

  if (isError || !stage) {
    return (
      <div className='container py-8'>
        <div className='text-center'>
          <p className='text-red-500 text-lg mb-4'>حدث خطأ أثناء تحميل بيانات المرحلة</p>
          <Button variant='outline' onClick={() => router.back()}>
            <ArrowLeft className='w-4 h-4 mr-2' />
            العودة
          </Button>
        </div>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appointment = stage.appointment as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patient = stage.patient as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doctor = stage.doctor as any

  return (
    <div className='container py-8 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <Button variant='ghost' onClick={() => router.back()} className='flex items-center gap-2'>
          <ArrowLeft className='w-4 h-4' />
          العودة
        </Button>
        {canEdit && (
          <Button onClick={() => setIsEditDialogOpen(true)} className='flex items-center gap-2'>
            <Pencil className='w-4 h-4' />
            تعديل المرحلة
          </Button>
        )}
      </div>

      {/* Treatment Stage Details */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-2xl'>{stage.title}</CardTitle>
            <Badge variant={stage.isCompleted ? 'default' : 'secondary'}>
              {stage.isCompleted ? (
                <span className='flex items-center gap-1'>
                  <CheckCircle2 className='w-4 h-4' />
                  مكتملة
                </span>
              ) : (
                <span className='flex items-center gap-1'>
                  <XCircle className='w-4 h-4' />
                  غير مكتملة
                </span>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Description */}
          {stage.description && (
            <div>
              <h3 className='font-semibold text-lg mb-2'>الوصف</h3>
              <p className='text-gray-700'>{stage.description}</p>
            </div>
          )}

          {/* Details Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <h3 className='font-semibold text-sm text-gray-600 mb-1'>التاريخ والوقت</h3>
              <p className='text-gray-800'>
                {stage.date ? moment(stage.date).format('YYYY-MM-DD HH:mm') : '-'}
              </p>
            </div>

            <div>
              <h3 className='font-semibold text-sm text-gray-600 mb-1'>التكلفة</h3>
              <p className='text-gray-800'>
                {stage.cost ? `${stage.cost.toLocaleString()} ل.س` : '0 ل.س'}
              </p>
            </div>

            {doctor && (
              <div>
                <h3 className='font-semibold text-sm text-gray-600 mb-1'>الطبيب</h3>
                <p className='text-gray-800'>{doctor.name || '-'}</p>
              </div>
            )}

            {patient && (
              <div>
                <h3 className='font-semibold text-sm text-gray-600 mb-1'>المريض</h3>
                <p className='text-gray-800'>
                  {patient.fullName || patient.name || '-'}
                  {patient.phone && <span className='text-gray-500 text-sm'> - {patient.phone}</span>}
                </p>
              </div>
            )}

            {appointment && (
              <div>
                <h3 className='font-semibold text-sm text-gray-600 mb-1'>الموعد</h3>
                <p className='text-gray-800'>
                  {appointment.date
                    ? moment(appointment.date).format('YYYY-MM-DD HH:mm')
                    : '-'}
                </p>
                {appointment.notes && (
                  <p className='text-gray-500 text-sm mt-1'>{appointment.notes}</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activities */}
      {canViewActivities && <TreatmentStageActivities stageId={stageId} />}

      {/* Edit Dialog */}
      {canEdit && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className='max-w-2xl' dir='rtl'>
            <DialogHeader>
              <DialogTitle>تعديل المرحلة العلاجية</DialogTitle>
              <DialogDescription>قم بتعديل بيانات المرحلة العلاجية</DialogDescription>
            </DialogHeader>
            <TreatmentStageEditForm
              stage={stage}
              onSuccess={() => {
                setIsEditDialogOpen(false)
              }}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}


