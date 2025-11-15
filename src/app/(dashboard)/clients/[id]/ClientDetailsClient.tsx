'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useClientDetails } from '@/hooks/useClientDetails'
import { useClientAppointments } from '@/hooks/useClientAppointments'
import { useUserPermissions } from '@/hooks/usePermissions'
import { ClientActivities } from '@/components/clients/client-activities'
import { Loader2, CheckCircle2, XCircle, Filter, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TreatmentStage, Sale, SaleItem, Client, Appointment } from '@/types/api'
import { useQuery } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { TreatmentStageEditForm } from '@/components/treatment-stages/treatment-stage-edit-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

type ClientDetailsClientProps = {
  id: string
}

const ClientDetailsClient: React.FC<ClientDetailsClientProps> = ({ id }) => {
  const router = useRouter()
  const { data, isLoading, isError } = useClientDetails(id)
  const { data: appointments, isLoading: appointmentsLoading } = useClientAppointments(id)
  const {
    canViewClientAppointments,
    canViewClientTreatmentStages,
    canViewClientSales,
    canViewClientActivities,
    hasPermission,
    permissions,
  } = useUserPermissions()
  
  // Add fallback permission checks for tabs
  const canViewAppointmentsTab = useMemo(() => {
    return (
      canViewClientAppointments ||
      hasPermission('appointments.view') ||
      hasPermission('appointments.create') ||
      hasPermission('appointments.edit') ||
      permissions.includes('appointments.view') ||
      permissions.includes('appointments.create') ||
      permissions.includes('appointments.edit')
    )
  }, [canViewClientAppointments, hasPermission, permissions])
  
  const canViewTreatmentStagesTab = useMemo(() => {
    return (
      canViewClientTreatmentStages ||
      hasPermission('treatment-stages.view') ||
      hasPermission('treatment-stages.create') ||
      hasPermission('treatment-stages.edit') ||
      permissions.includes('treatment-stages.view') ||
      permissions.includes('treatment-stages.create') ||
      permissions.includes('treatment-stages.edit')
    )
  }, [canViewClientTreatmentStages, hasPermission, permissions])
  
  const canViewSalesTab = useMemo(() => {
    return (
      canViewClientSales ||
      hasPermission('sales.view') ||
      hasPermission('sales.create') ||
      hasPermission('sales.edit') ||
      permissions.includes('sales.view') ||
      permissions.includes('sales.create') ||
      permissions.includes('sales.edit')
    )
  }, [canViewClientSales, hasPermission, permissions])
  
  const canEditStage = hasPermission('treatment-stages.edit')
  const [search, setSearch] = useState('')
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all')
  const [showCompleted, setShowCompleted] = useState<
    'all' | 'completed' | 'pending'
  >('all')
  const [openEditStage, setOpenEditStage] = useState(false)
  const [selectedStage, setSelectedStage] = useState<TreatmentStage | null>(null)
  const { refetch: refetchClientDetails } = useClientDetails(id)
  
  // Determine available tabs based on permissions
  const availableTabs = useMemo(() => {
    const tabs: ('info' | 'appointments' | 'stages' | 'sales')[] = ['info']
    if (canViewAppointmentsTab) tabs.push('appointments')
    if (canViewTreatmentStagesTab) tabs.push('stages')
    if (canViewSalesTab) tabs.push('sales')
    return tabs
  }, [canViewAppointmentsTab, canViewTreatmentStagesTab, canViewSalesTab])
  
  const [activeTab, setActiveTab] = useState<'info' | 'appointments' | 'stages' | 'sales'>('info')
  
  // Update activeTab if current tab is no longer available
  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0])
    }
  }, [availableTabs, activeTab])

  // Fetch client details
  const { data: clientData } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data } = await axios.get<{ data: Client }>(`/clients/${id}`)
      return data.data
    },
    enabled: !!id,
  })

  // استخرج قائمة الأطباء بدون تكرار من البيانات (افتراضياً الاسم مع _id)
  const doctors = useMemo(() => {
    if (!data) return []
    const doctorMap = new Map<string, string>()
    data.stages.forEach((stage: TreatmentStage) => {
      if (
        typeof stage.doctor === 'object' &&
        stage.doctor !== null &&
        stage.doctor._id &&
        stage.doctor.name
      ) {
        doctorMap.set(stage.doctor._id, stage.doctor.name)
      }
    })
    return Array.from(doctorMap, ([_id, name]) => ({ _id, name }))
  }, [data])

  const filteredStages = useMemo(() => {
    if (!data) return []
    return data.stages.filter((stage: TreatmentStage) => {
      const matchesSearch =
        (stage.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (stage.description || '').toLowerCase().includes(search.toLowerCase())
      // تطابق الطبيب إما الكل أو يساوي الطبيب المختار
      const doctorId =
        typeof stage.doctor === 'object' && stage.doctor !== null
          ? stage.doctor._id
          : stage.doctor
      const matchesDoctor =
        selectedDoctorId === 'all' || doctorId === selectedDoctorId

      const matchesStatus =
        showCompleted === 'all' ||
        (showCompleted === 'completed' && stage.isCompleted) ||
        (showCompleted === 'pending' && !stage.isCompleted)

      return matchesSearch && matchesDoctor && matchesStatus
    })
  }, [data, search, selectedDoctorId, showCompleted])

  if (isLoading)
    return (
      <div className='flex justify-center items-center py-20 text-gray-500'>
        <Loader2 className='animate-spin mr-2' />
        جاري التحميل...
      </div>
    )

  if (isError)
    return (
      <div className='text-red-600 text-center py-10 font-semibold'>
        حدث خطأ أثناء جلب بيانات العميل.
      </div>
    )

  if (!data)
    return (
      <div className='text-gray-600 text-center py-10 font-medium'>
        لا توجد بيانات متاحة للعميل.
      </div>
    )

  return (
    <section className='space-y-6'>
      {/* Header with Edit Button */}
      {clientData && hasPermission('clients.edit') && (
        <div className='flex justify-end'>
          <Button
            onClick={() => router.push(`/clients/${id}/edit`)}
            className='gap-2'
          >
            <Pencil className='w-4 h-4' />
            تعديل بيانات العميل
          </Button>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'info' | 'appointments' | 'stages' | 'sales')}
      >
        <TabsList className='mb-4 border-b border-gray-200 dark:border-gray-700'>
          <TabsTrigger value='info'>معلومات العميل</TabsTrigger>
          {canViewAppointmentsTab && (
            <TabsTrigger value='appointments'>المواعيد</TabsTrigger>
          )}
          {canViewTreatmentStagesTab && (
            <TabsTrigger value='stages'>المراحل العلاجية</TabsTrigger>
          )}
          {canViewSalesTab && (
            <TabsTrigger value='sales'>المبيعات</TabsTrigger>
          )}
        </TabsList>

        {/* Client Information Tab */}
        <TabsContent value='info'>
          {clientData && (
            <Card>
              <CardHeader>
                <CardTitle>معلومات العميل</CardTitle>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {clientData.refNumber && (
                    <div>
                      <p className='text-sm text-gray-600'>رقم الملف</p>
                      <p className='font-semibold font-mono'>{clientData.refNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className='text-sm text-gray-600'>الاسم الكامل</p>
                    <p className='font-semibold'>{clientData.fullName}</p>
                  </div>
                  <div>
                    <p className='text-sm text-gray-600'>رقم الهاتف</p>
                    <p className='font-semibold'>{clientData.phone}</p>
                  </div>
                  <div>
                    <p className='text-sm text-gray-600'>الجنس</p>
                    <p className='font-semibold'>{clientData.gender === 'male' ? 'ذكر' : 'أنثى'}</p>
                  </div>
                  {clientData.dateOfBirth && (
                    <div>
                      <p className='text-sm text-gray-600'>تاريخ الميلاد</p>
                      <p className='font-semibold'>
                        {new Date(clientData.dateOfBirth).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                  )}
                  {clientData.nationality && (
                    <div>
                      <p className='text-sm text-gray-600'>الجنسية</p>
                      <p className='font-semibold'>{clientData.nationality}</p>
                    </div>
                  )}
                  {clientData.email && (
                    <div>
                      <p className='text-sm text-gray-600'>البريد الإلكتروني</p>
                      <p className='font-semibold'>{clientData.email}</p>
                    </div>
                  )}
                  {clientData.clientClassification && (
                    <div>
                      <p className='text-sm text-gray-600'>التصنيف</p>
                      <p className='font-semibold'>
                        {clientData.clientClassification === 'new'
                          ? 'جديد'
                          : clientData.clientClassification === 'regular'
                            ? 'عادي'
                            : clientData.clientClassification === 'chronic'
                              ? 'مزمن'
                              : 'VIP'}
                      </p>
                    </div>
                  )}
                </div>
                {clientData.address && (
                  <div>
                    <p className='text-sm text-gray-600 mb-2'>العنوان</p>
                    <p className='font-semibold'>
                      {typeof clientData.address === 'string'
                        ? clientData.address
                        : `${clientData.address.city || ''} ${clientData.address.region || ''} ${clientData.address.street || ''}`.trim() || '-'}
                    </p>
                  </div>
                )}
                {clientData.emergencyContact && (
                  <div>
                    <p className='text-sm text-gray-600 mb-2'>جهة الاتصال في حالات الطوارئ</p>
                    <p className='font-semibold'>
                      {clientData.emergencyContact.name || '-'} - {clientData.emergencyContact.phone || '-'} ({clientData.emergencyContact.relationship || '-'})
                    </p>
                  </div>
                )}
                {clientData.primaryReasonForVisit && (
                  <div>
                    <p className='text-sm text-gray-600 mb-2'>السبب الرئيسي للزيارة</p>
                    <p className='font-semibold'>{clientData.primaryReasonForVisit}</p>
                  </div>
                )}
                {clientData.currentMedicalHistory && (
                  <div>
                    <p className='text-sm text-gray-600 mb-2'>التاريخ الطبي الحالي</p>
                    <p className='font-semibold whitespace-pre-wrap'>{clientData.currentMedicalHistory}</p>
                  </div>
                )}
                {clientData.allergies && clientData.allergies.length > 0 && (
                  <div>
                    <p className='text-sm text-gray-600 mb-2'>الحساسيات</p>
                    <p className='font-semibold'>{clientData.allergies.join(', ')}</p>
                  </div>
                )}
                {clientData.chronicDiseases && clientData.chronicDiseases.length > 0 && (
                  <div>
                    <p className='text-sm text-gray-600 mb-2'>الأمراض المزمنة</p>
                    <p className='font-semibold'>{clientData.chronicDiseases.join(', ')}</p>
                  </div>
                )}
                {clientData.baselineVitals && (
                  <div>
                    <p className='text-sm text-gray-600 mb-2'>القياسات الأساسية</p>
                    <div className='grid grid-cols-2 gap-2'>
                      {clientData.baselineVitals.bloodPressure && (
                        <p className='font-semibold'>ضغط الدم: {clientData.baselineVitals.bloodPressure}</p>
                      )}
                      {clientData.baselineVitals.bloodSugar && (
                        <p className='font-semibold'>السكر: {clientData.baselineVitals.bloodSugar}</p>
                      )}
                      {clientData.baselineVitals.weight && (
                        <p className='font-semibold'>الوزن: {clientData.baselineVitals.weight} كجم</p>
                      )}
                      {clientData.baselineVitals.height && (
                        <p className='font-semibold'>الطول: {clientData.baselineVitals.height} سم</p>
                      )}
                    </div>
                  </div>
                )}
                {clientData.bmi && (
                  <div>
                    <p className='text-sm text-gray-600'>مؤشر كتلة الجسم (BMI)</p>
                    <p className='font-semibold'>{clientData.bmi.toFixed(1)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* تبويب المواعيد */}
        {canViewAppointmentsTab && (
          <TabsContent value='appointments'>
            <Card className='overflow-hidden'>
              <CardHeader>
                <CardTitle>المواعيد</CardTitle>
              </CardHeader>
              <CardContent>
                {appointmentsLoading ? (
                  <div className='flex justify-center items-center py-20 text-gray-500'>
                    <Loader2 className='animate-spin mr-2' />
                    جاري التحميل...
                  </div>
                ) : !appointments || appointments.length === 0 ? (
                  <p className='text-center text-gray-500 py-8'>
                    لا توجد مواعيد مسجلة.
                  </p>
                ) : (
                  <div className='space-y-4'>
                    {appointments
                      .sort((a, b) => {
                        const dateA = a.date ? new Date(a.date).getTime() : 0
                        const dateB = b.date ? new Date(b.date).getTime() : 0
                        return dateB - dateA // Newest first
                      })
                      .map((appointment: Appointment) => (
                        <AppointmentCard
                          key={appointment._id}
                          appointment={appointment}
                          canViewTreatmentStages={canViewClientTreatmentStages}
                        />
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* تبويب المراحل العلاجية */}
        {canViewTreatmentStagesTab && (
          <TabsContent value='stages'>
          <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4'>
            <Input
              placeholder='ابحث في المراحل (العنوان، الوصف)...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='max-w-md'
            />
            {/* Select لاختيار الطبيب */}
            <select
              className='border rounded-md p-2 max-w-xs text-gray-700'
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
            >
              <option value='all'>كل الأطباء</option>
              {doctors.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.name}
                </option>
              ))}
            </select>

            <div className='flex items-center space-x-2 rtl:space-x-reverse'>
              <Filter className='w-5 h-5 text-gray-600' />
              <Button
                variant={showCompleted === 'all' ? 'default' : 'outline'}
                onClick={() => setShowCompleted('all')}
              >
                الكل
              </Button>
              <Button
                variant={showCompleted === 'completed' ? 'default' : 'outline'}
                onClick={() => setShowCompleted('completed')}
                className='flex items-center'
              >
                مكتملة <CheckCircle2 className='w-4 h-4 mr-1 rtl:ml-1' />
              </Button>
              <Button
                variant={showCompleted === 'pending' ? 'default' : 'outline'}
                onClick={() => setShowCompleted('pending')}
                className='flex items-center'
              >
                غير مكتملة <XCircle className='w-4 h-4 mr-1 rtl:ml-1' />
              </Button>
            </div>
          </div>

          <Card className='overflow-hidden'>
            <CardHeader>
              <CardTitle>المراحل العلاجية</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredStages.length === 0 ? (
                <p className='text-center text-gray-500 py-8'>
                  لا توجد مراحل تطابق البحث.
                </p>
              ) : (
                <ul className='space-y-6'>
                  {filteredStages.map((stage: TreatmentStage) => (
                    <li
                      key={stage._id}
                      className={cn(
                        'p-4 rounded-lg border shadow-sm transition-shadow hover:shadow-lg',
                        stage.isCompleted
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-300 bg-white'
                      )}
                    >
                      <div className='flex justify-between items-center mb-2'>
                        <h3 className='text-lg font-semibold text-gray-800'>
                          {stage.title}
                        </h3>
                        <div className='flex items-center space-x-2 rtl:space-x-reverse'>
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
                            <CheckCircle2 className='text-green-600 w-6 h-6' />
                          ) : (
                            <XCircle className='text-red-600 w-6 h-6' />
                          )}
                          <time
                            dateTime={stage.date}
                            className='text-gray-500 text-sm select-none'
                            title={stage.date ? new Date(stage.date).toLocaleString() : ''}
                          >
                            {stage.date
                              ? new Date(stage.date).toLocaleDateString('ar-EG', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })
                              : '-'}
                          </time>
                        </div>
                      </div>
                      <p className='mb-2 text-gray-700'>{stage.description}</p>
                      <p className='text-sm text-gray-600'>
                        الطبيب:{' '}
                        <span className='font-medium'>
                          {typeof stage.doctor === 'object' && stage.doctor !== null
                            ? stage.doctor.name
                            : '-'}
                        </span>
                      </p>
                      <p className='text-sm text-gray-600'>
                        التكلفة:{' '}
                        <span className='font-medium'>
                          {(stage.cost || 0).toLocaleString()} ل.س
                        </span>
                      </p>
                      <p className='text-sm text-gray-600'>
                        ملاحظات الموعد:{' '}
                        <span className='italic'>
                          {typeof stage.appointment === 'object' &&
                          stage.appointment !== null
                            ? stage.appointment.notes || '-'
                            : '-'}
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* تبويب المبيعات */}
        {canViewSalesTab && (
          <TabsContent value='sales'>
          {/* (الكود كما هو دون تغيير) */}
          <Card className='overflow-hidden'>
            <CardHeader>
              <CardTitle>تفاصيل المبيعات</CardTitle>
            </CardHeader>
            <CardContent>
              {data.sales.length === 0 ? (
                <p className='text-center text-gray-500 py-8'>
                  لا توجد مبيعات مسجلة.
                </p>
              ) : (
                <ul className='space-y-6'>
                  {data.sales.map((sale: Sale) => (
                    <li
                      key={sale._id}
                      className='p-4 rounded-lg border border-gray-300 bg-white shadow-sm hover:shadow-md transition-shadow'
                    >
                      <div className='flex justify-between items-center mb-2'>
                        <time
                          dateTime={sale.createdAt}
                          className='text-gray-500 text-sm select-none'
                          title={sale.createdAt ? new Date(sale.createdAt).toLocaleString() : ''}
                        >
                          {sale.createdAt
                            ? new Date(sale.createdAt).toLocaleDateString('ar-EG', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })
                            : '-'}
                        </time>
                        <span
                          className={cn(
                            'px-2 py-1 rounded text-xs font-semibold',
                            sale.paymentStatus === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          )}
                        >
                          حالة الدفع:{' '}
                          {sale.paymentStatus === 'paid'
                            ? 'مدفوع'
                            : 'غير مدفوع'}
                        </span>
                      </div>
                      <p className='text-gray-700 mb-1'>
                        المجموع: <b>{sale.totalAmount.toLocaleString()} ل.س</b>
                      </p>
                      <p className='text-gray-700 mb-1'>
                        المدفوع: <b>{sale.paidAmount.toLocaleString()} ل.س</b>
                      </p>
                      <p className='text-gray-700 mb-1'>
                        المتبقي:{' '}
                        <b>{sale.remainingAmount.toLocaleString()} ل.س</b>
                      </p>
                      <p className='text-gray-600 mb-3 italic'>
                        ملاحظات: {sale.notes || '-'}
                      </p>

                      <details className='mb-3'>
                        <summary className='cursor-pointer font-semibold text-gray-800 mb-2'>
                          المنتجات ({sale.items.length})
                        </summary>
                        <ul className='list-disc list-inside space-y-1'>
                          {sale.items.map((item: SaleItem, idx: number) => {
                            const productName =
                              typeof item.product === 'object' &&
                              item.product !== null
                                ? item.product.name
                                : 'منتج غير معروف'
                            return (
                              <li key={idx} className='text-gray-700'>
                                {productName} - الكمية: {item.quantity} - سعر
                                الوحدة: {item.unitPrice.toLocaleString()} ل.س
                              </li>
                            )
                          })}
                        </ul>
                      </details>

                      <details>
                        <summary className='cursor-pointer font-semibold text-gray-800 mb-2'>
                          الدفعات (0)
                        </summary>
                        <ul className='list-disc list-inside space-y-1'>
                          <li className='text-gray-500'>لا توجد دفعات مسجلة</li>
                        </ul>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>

      {/* سجل الأنشطة */}
      {canViewClientActivities && (
        <ClientActivities clientId={id} />
      )}

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
                  refetchClientDetails()
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
    </section>
  )
}

// Component for individual appointment card with treatment stages
const AppointmentCard: React.FC<{
  appointment: Appointment
  canViewTreatmentStages: boolean
}> = ({ appointment, canViewTreatmentStages }) => {
  const [treatmentStages, setTreatmentStages] = useState<TreatmentStage[]>([])
  const [loadingStages, setLoadingStages] = useState(false)
  const [openEditStage, setOpenEditStage] = useState(false)
  const [selectedStage, setSelectedStage] = useState<TreatmentStage | null>(null)
  const hasLoadedRef = useRef(false)
  const { hasPermission } = useUserPermissions()
  const canEditStage = hasPermission('treatment-stages.edit')

  const loadTreatmentStages = async (loadFullData = false) => {
    if (!canViewTreatmentStages) return
    // Only load if not already loaded (unless we're forcing a reload)
    if (hasLoadedRef.current && !loadFullData) return
    
    setLoadingStages(true)
    try {
      const { data } = await axios.get(`/treatment-stages/appointment/${appointment._id}`)
      setTreatmentStages((data?.data || []) as TreatmentStage[])
      hasLoadedRef.current = true
    } catch (error) {
      console.error('Error loading treatment stages:', error)
      setTreatmentStages([])
      hasLoadedRef.current = true // Mark as loaded even on error to prevent infinite retries
    } finally {
      setLoadingStages(false)
    }
  }

  // Load treatment stages count on mount
  useEffect(() => {
    // Reset ref when appointment changes
    hasLoadedRef.current = false
    if (canViewTreatmentStages) {
      loadTreatmentStages()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment._id, canViewTreatmentStages])

  const doctorName =
    typeof appointment.doctor === 'object' && appointment.doctor !== null
      ? appointment.doctor.name
      : '-'
  
  const serviceName =
    typeof appointment.service === 'object' && appointment.service !== null
      ? appointment.service.name
      : '-'
  
  const departmentName =
    typeof appointment.departmentId === 'object' && appointment.departmentId !== null
      ? appointment.departmentId.name
      : '-'

  return (
    <Card className='border border-gray-300 bg-white shadow-sm hover:shadow-md transition-shadow'>
      <CardContent className='p-4'>
        <div className='flex justify-between items-start mb-3'>
          <div>
            <h3 className='text-lg font-semibold text-gray-800 mb-1'>
              {appointment.date
                ? new Date(appointment.date).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-'}
            </h3>
            <div className='space-y-1 text-sm text-gray-600'>
              <p>
                <span className='font-medium'>الطبيب:</span> {doctorName}
              </p>
              <p>
                <span className='font-medium'>الخدمة:</span> {serviceName}
              </p>
              <p>
                <span className='font-medium'>القسم:</span> {departmentName}
              </p>
              <p>
                <span className='font-medium'>الحالة:</span>{' '}
                <span
                  className={cn(
                    'px-2 py-1 rounded text-xs font-semibold',
                    appointment.status === 'تم'
                      ? 'bg-green-100 text-green-700'
                      : appointment.status === 'ملغي'
                        ? 'bg-red-100 text-red-700'
                        : appointment.status === 'نشط'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                  )}
                >
                  {appointment.status}
                </span>
              </p>
            </div>
          </div>
        </div>
        {appointment.notes && (
          <p className='text-sm text-gray-600 mb-3 italic'>
            <span className='font-medium'>ملاحظات:</span> {appointment.notes}
          </p>
        )}
        {canViewTreatmentStages && (
          <Accordion type='single' collapsible className='w-full'>
            <AccordionItem value='treatment-stages'>
              <AccordionTrigger>
                المراحل العلاجية ({treatmentStages.length})
              </AccordionTrigger>
              <AccordionContent>
                {loadingStages ? (
                  <div className='flex justify-center items-center py-4'>
                    <Loader2 className='animate-spin w-4 h-4' />
                  </div>
                ) : treatmentStages.length === 0 ? (
                  <p className='text-center text-gray-500 py-4'>
                    لا توجد مراحل علاجية لهذا الموعد
                  </p>
                ) : (
                  <div className='space-y-3 pt-2'>
                    {treatmentStages.map((stage: TreatmentStage) => (
                      <div
                        key={stage._id}
                        className={cn(
                          'p-3 rounded-lg border',
                          stage.isCompleted
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-300 bg-gray-50'
                        )}
                      >
                        <div className='flex justify-between items-start mb-2'>
                          <h4 className='font-semibold text-gray-800'>{stage.title}</h4>
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
                                className='h-7 w-7 p-0'
                                title='تعديل المرحلة'
                              >
                                <Pencil className='w-3 h-3' />
                              </Button>
                            )}
                            {stage.isCompleted ? (
                              <CheckCircle2 className='text-green-600 w-5 h-5' />
                            ) : (
                              <XCircle className='text-red-600 w-5 h-5' />
                            )}
                          </div>
                        </div>
                        {stage.description && (
                          <p className='text-sm text-gray-700 mb-2'>{stage.description}</p>
                        )}
                        <div className='text-xs text-gray-600 space-y-1'>
                          {stage.date && (
                            <p>
                              التاريخ:{' '}
                              {new Date(stage.date).toLocaleDateString('ar-EG')}
                            </p>
                          )}
                          {stage.cost && (
                            <p>التكلفة: {(stage.cost || 0).toLocaleString()} ل.س</p>
                          )}
                          {typeof stage.doctor === 'object' && stage.doctor !== null && (
                            <p>الطبيب: {stage.doctor.name}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>

      {/* Edit Stage Dialog for AppointmentCard */}
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
                  hasLoadedRef.current = false // Reset to allow reload
                  loadTreatmentStages(true) // Force reload stages
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
    </Card>
  )
}

export default ClientDetailsClient

