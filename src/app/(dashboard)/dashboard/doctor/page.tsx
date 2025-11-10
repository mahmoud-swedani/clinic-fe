// src/app/(dashboard)/dashboard/doctor/page.tsx
'use client'

import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useTodayAppointments, useUpcomingAppointments, useDoctorPatientStats } from '@/hooks/useDoctorDashboard'
import { TreatmentStageForm } from '@/components/treatment-stages/treatment-stage-form'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { Calendar, Users, ClipboardList, TrendingUp, Plus } from 'lucide-react'
import { Appointment } from '@/types/api'
import { useUserPermissions } from '@/hooks/usePermissions'

export default function DoctorDashboardPage() {
  const [openAddStage, setOpenAddStage] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const { canManageTreatmentStages } = useUserPermissions()

  const { data: todayAppointments, isLoading: todayLoading } = useTodayAppointments()
  const { data: upcomingAppointments, isLoading: upcomingLoading } = useUpcomingAppointments()
  const { data: stats, isLoading: statsLoading } = useDoctorPatientStats()

  const openStageDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setOpenAddStage(true)
  }

  return (
    <main className='p-8 bg-gradient-to-b from-white to-gray-100 min-h-screen'>
      <h1 className='text-4xl font-extrabold mb-8 text-gray-900 tracking-wide'>
        لوحة تحكم الطبيب
      </h1>

      {/* Statistics Cards */}
      <section className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8'>
        <Card className='shadow-lg hover:shadow-xl transition-shadow'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-lg font-semibold text-gray-700 flex items-center gap-2'>
              <Users className='w-5 h-5 text-indigo-600' />
              المرضى
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className='h-8 w-20' />
            ) : (
              <p className='text-3xl font-extrabold text-indigo-600'>
                {stats?.totalPatients || 0}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className='shadow-lg hover:shadow-xl transition-shadow'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-lg font-semibold text-gray-700 flex items-center gap-2'>
              <Calendar className='w-5 h-5 text-blue-600' />
              المواعيد
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className='h-8 w-20' />
            ) : (
              <p className='text-3xl font-extrabold text-blue-600'>
                {stats?.totalAppointments || 0}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className='shadow-lg hover:shadow-xl transition-shadow'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-lg font-semibold text-gray-700 flex items-center gap-2'>
              <ClipboardList className='w-5 h-5 text-green-600' />
              مراحل العلاج
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className='h-8 w-20' />
            ) : (
              <p className='text-3xl font-extrabold text-green-600'>
                {stats?.totalTreatmentStages || 0}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className='shadow-lg hover:shadow-xl transition-shadow'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-lg font-semibold text-gray-700 flex items-center gap-2'>
              <TrendingUp className='w-5 h-5 text-purple-600' />
              نسبة الإنجاز
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className='h-8 w-20' />
            ) : (
              <p className='text-3xl font-extrabold text-purple-600'>
                {stats?.completionRate || 0}%
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Today's Schedule and Upcoming Appointments */}
      <section className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
        {/* Today's Schedule */}
        <Card className='shadow-lg'>
          <CardHeader>
            <CardTitle className='text-2xl font-bold text-gray-800 flex items-center gap-2'>
              <Calendar className='w-6 h-6' />
              مواعيد اليوم
            </CardTitle>
            <CardDescription>
              المواعيد المجدولة لليوم
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayLoading ? (
              <div className='space-y-3'>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className='h-16 w-full' />
                ))}
              </div>
            ) : todayAppointments && todayAppointments.length > 0 ? (
              <div className='space-y-3 max-h-[400px] overflow-y-auto'>
                {todayAppointments.map((appointment: Appointment) => (
                  <div
                    key={appointment._id}
                    className='border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition'
                  >
                    <div className='flex justify-between items-start mb-2'>
                      <div>
                        <p className='font-semibold text-lg text-indigo-700'>
                          {typeof appointment.patient === 'object' && appointment.patient !== null
                            ? appointment.patient.fullName
                            : 'غير معروف'}
                        </p>
                        <p className='text-sm text-gray-600'>
                          {appointment.date
                            ? format(new Date(appointment.date), 'HH:mm', { locale: arSA })
                            : '-'}
                        </p>
                      </div>
                      <Badge variant='outline'>{appointment.type}</Badge>
                    </div>
                    {appointment.service && (
                      <p className='text-sm text-gray-500 mb-2'>
                        الخدمة:{' '}
                        {typeof appointment.service === 'object' && appointment.service !== null
                          ? appointment.service.name
                          : appointment.service || '-'}
                      </p>
                    )}
                    {canManageTreatmentStages && (
                      <div className='flex gap-2 mt-2'>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => openStageDialog(appointment)}
                          className='flex items-center gap-1'
                        >
                          <Plus className='w-4 h-4' />
                          إضافة مرحلة علاج
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-center text-gray-500 py-8'>
                لا توجد مواعيد لليوم
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card className='shadow-lg'>
          <CardHeader>
            <CardTitle className='text-2xl font-bold text-gray-800 flex items-center gap-2'>
              <Calendar className='w-6 h-6' />
              المواعيد القادمة
            </CardTitle>
            <CardDescription>
              المواعيد خلال الأسبوع القادم
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingLoading ? (
              <div className='space-y-3'>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className='h-16 w-full' />
                ))}
              </div>
            ) : upcomingAppointments && upcomingAppointments.length > 0 ? (
              <div className='space-y-3 max-h-[400px] overflow-y-auto'>
                {upcomingAppointments
                  .filter((apt: Appointment) => {
                    if (!apt.date) return false
                    const aptDate = new Date(apt.date)
                    const today = new Date()
                    return aptDate > today
                  })
                  .slice(0, 10)
                  .map((appointment: Appointment) => (
                    <div
                      key={appointment._id}
                      className='border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition'
                    >
                      <div className='flex justify-between items-start mb-2'>
                        <div>
                          <p className='font-semibold text-lg text-indigo-700'>
                            {typeof appointment.patient === 'object' && appointment.patient !== null
                              ? appointment.patient.fullName
                              : 'غير معروف'}
                          </p>
                          <p className='text-sm text-gray-600'>
                            {appointment.date
                              ? format(new Date(appointment.date), 'dd MMM yyyy, HH:mm', {
                                  locale: arSA,
                                })
                              : '-'}
                          </p>
                        </div>
                        <Badge variant='outline'>{appointment.type}</Badge>
                      </div>
                      {appointment.service && (
                        <p className='text-sm text-gray-500'>
                          الخدمة:{' '}
                          {typeof appointment.service === 'object' && appointment.service !== null
                            ? appointment.service.name
                            : appointment.service || '-'}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <p className='text-center text-gray-500 py-8'>
                لا توجد مواعيد قادمة
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Quick Add Treatment Stage Dialog */}
      <Dialog open={openAddStage} onOpenChange={setOpenAddStage}>
        <DialogContent className='max-w-xl'>
          <DialogHeader>
            <DialogTitle>إضافة مرحلة علاج جديدة</DialogTitle>
            <DialogDescription>
              قم بإضافة مرحلة علاج جديدة للمريض
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <TreatmentStageForm
              appointmentId={selectedAppointment._id}
              patientId={
                typeof selectedAppointment.patient === 'object' &&
                selectedAppointment.patient !== null
                  ? selectedAppointment.patient._id
                  : selectedAppointment.patient || ''
              }
              doctorId={
                typeof selectedAppointment.doctor === 'object' &&
                selectedAppointment.doctor !== null
                  ? selectedAppointment.doctor._id
                  : selectedAppointment.doctor || ''
              }
              onSuccess={() => {
                setOpenAddStage(false)
                setSelectedAppointment(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}

