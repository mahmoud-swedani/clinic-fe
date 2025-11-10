'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Patient, User, Service, Department, Appointment } from '@/types/api'
import axios from '@/lib/axios'
import { toast } from 'sonner'

interface AppointmentFormProps {
  patients: Patient[]
  doctors: User[]
  services: Service[]
  departments: Department[]
  onSuccess: () => void
  initialData?: Appointment | null
}

export function AppointmentForm({
  patients,
  doctors,
  services,
  departments,
  onSuccess,
  initialData,
}: AppointmentFormProps) {
  const isEditing = !!initialData
  
  // Helper to extract ID
  const extractId = useCallback((value: string | { _id?: string; id?: string } | null | undefined): string => {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'object' && value !== null) {
      return value._id || value.id || ''
    }
    return ''
  }, [])

  // Initialize department directly from initialData
  // Use a function to ensure it's calculated once on mount
  const getInitialDepartment = () => {
    if (initialData?.departmentId) {
      const deptId = extractId(initialData.departmentId)
      return deptId || null
    }
    return null
  }
  
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(
    getInitialDepartment()
  )
  const [filteredServices, setFilteredServices] = useState<Service[]>([])

  const [patientId, setPatientId] = useState<string>(
    initialData ? extractId(initialData.patient) : ''
  )
  const [doctorId, setDoctorId] = useState<string>(
    initialData ? extractId(initialData.doctor) : ''
  )
  const [serviceId, setServiceId] = useState<string>(
    initialData ? extractId(initialData.service) : ''
  )
  const [type, setType] = useState<string>(initialData?.type || '')
  const [date, setDate] = useState<string>(
    initialData?.date
      ? new Date(initialData.date).toISOString().slice(0, 16)
      : ''
  )
  const [notes, setNotes] = useState<string>(initialData?.notes || '')
  const [status, setStatus] = useState<string>(
    initialData?.status || 'محجوز'
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update department and service when initialData changes
  useEffect(() => {
    if (initialData) {
      if (initialData.departmentId) {
        const deptId = extractId(initialData.departmentId)
        // Always update to ensure it's set correctly
        if (deptId) {
          setSelectedDepartment(deptId)
          // Debug log
          if (process.env.NODE_ENV === 'development') {
            console.log('[AppointmentForm] Setting department:', deptId, 'from initialData:', initialData.departmentId)
          }
        }
      }
      if (initialData.service) {
        const servId = extractId(initialData.service)
        if (servId) {
          setServiceId(servId)
        }
      }
    }
  }, [initialData, extractId])

  // فلترة الخدمات بناء على القسم
  useEffect(() => {
    if (!selectedDepartment) {
      setFilteredServices([])
      // Only clear serviceId if we're not editing
      if (!initialData) {
        setServiceId('')
      }
      return
    }

    const filtered = services.filter((service) => {
      if (typeof service.departmentId === 'string') {
        return service.departmentId === selectedDepartment
      } else if (
        typeof service.departmentId === 'object' &&
        service.departmentId?._id
      ) {
        return service.departmentId._id === selectedDepartment
      }
      return false
    })

    setFilteredServices(filtered)
    
    // When editing, preserve the serviceId even if it's not in filtered list yet
    // This handles the case where services are still loading
    if (initialData && serviceId && !filtered.some(s => extractId(s) === serviceId)) {
      // Keep the serviceId - it will be shown in the select even if not in filtered list
      return
    }
    
    // Only clear serviceId if we're creating new appointment and service doesn't match department
    if (!initialData && serviceId && !filtered.some(s => extractId(s) === serviceId)) {
      setServiceId('')
    }
  }, [selectedDepartment, services, initialData, serviceId, extractId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent double submission
    if (isSubmitting) {
      return
    }

    // Validate all required fields
    const errors: string[] = []

    if (!patientId || patientId.trim() === '') {
      errors.push('يرجى اختيار المريض')
    }

    if (!doctorId || doctorId.trim() === '') {
      errors.push('يرجى اختيار الطبيب')
    }

    if (!selectedDepartment) {
      errors.push('يرجى اختيار القسم')
    }

    if (!serviceId || serviceId.trim() === '') {
      errors.push('يرجى اختيار الخدمة')
    }

    if (!type || type.trim() === '') {
      errors.push('يرجى اختيار نوع الكشف')
    }

    if (!date || date.trim() === '') {
      errors.push('يرجى إدخال تاريخ ووقت الموعد')
    }

    // Show toast for each validation error
    if (errors.length > 0) {
      errors.forEach((error) => {
        toast.error(error)
      })
      return
    }

    setIsSubmitting(true)
    try {
      const appointmentData = {
        patient: patientId,
        doctor: doctorId,
        service: serviceId,
        date,
        notes,
        type,
        departmentId: selectedDepartment,
        ...(isEditing && { status }),
      }

      if (isEditing && initialData?._id) {
        await axios.put(`/appointments/${initialData._id}`, appointmentData)
        toast.success('تم تحديث الموعد بنجاح')
      } else {
        await axios.post('/appointments', appointmentData)
        toast.success('تم إضافة الموعد بنجاح')
      }

      onSuccess()
      if (!isEditing) {
        setPatientId('')
        setDoctorId('')
        setSelectedDepartment(null)
        setServiceId('')
        setDate('')
        setNotes('')
        setType('')
      }
    } catch (error: unknown) {
      console.error('حدث خطأ أثناء حفظ الموعد:', error)
      let errorMessage = isEditing ? 'حدث خطأ أثناء تحديث الموعد' : 'حدث خطأ أثناء حفظ الموعد'
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string; error?: string } } }).response
        if (response?.data?.message) {
          errorMessage = response.data.message
        } else if (response?.data?.error) {
          errorMessage = response.data.error
        }
      }
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Convert data to options format for SearchableSelect
  const patientOptions = React.useMemo(
    () =>
      patients.map((patient) => {
        // Format: "name - refNumber" or just "name" if no refNumber
        const displayLabel = patient.refNumber
          ? `${patient.fullName} - ${patient.refNumber}`
          : patient.fullName
        
        // Include phone and refNumber in searchable text
        const searchText = [
          patient.fullName,
          patient.refNumber,
          patient.phone,
        ]
          .filter(Boolean)
          .join(' ')
        
        return {
          value: patient._id,
          label: displayLabel,
          searchText: searchText,
        }
      }),
    [patients]
  )

  const doctorOptions = React.useMemo(
    () =>
      doctors.map((doctor) => ({
        value: doctor._id,
        label: doctor.name,
      })),
    [doctors]
  )

  const departmentOptions = React.useMemo(
    () =>
      departments.map((dept) => ({
        value: dept._id,
        label: dept.name,
      })),
    [departments]
  )

  const serviceOptions = React.useMemo(() => {
    const options = filteredServices.map((service) => ({
      value: service._id,
      label: service.name,
    }))
    
    // If editing and serviceId is set but not in filtered list yet, add it
    if (serviceId && initialData) {
      const currentService = services.find((s) => extractId(s) === serviceId)
      if (currentService && !options.some((opt) => opt.value === serviceId)) {
        options.unshift({
          value: serviceId,
          label: currentService.name,
        })
      }
    }
    
    return options
  }, [filteredServices, serviceId, initialData, services, extractId])

  return (
    <form onSubmit={handleSubmit} className='space-y-4' dir='rtl'>
      {/* اختيار المريض */}
      <SearchableSelect
        value={patientId}
        onValueChange={setPatientId}
        options={patientOptions}
        placeholder='اختر المريض'
        searchPlaceholder='ابحث عن مريض...'
        emptyMessage='لا يوجد مرضى'
        required
        ariaLabel='اختر المريض'
      />

      {/* اختيار الطبيب */}
      <SearchableSelect
        value={doctorId}
        onValueChange={setDoctorId}
        options={doctorOptions}
        placeholder='اختر الطبيب'
        searchPlaceholder='ابحث عن طبيب...'
        emptyMessage='لا يوجد أطباء'
        required
        ariaLabel='اختر الطبيب'
      />

      {/* اختيار القسم */}
      <SearchableSelect
        value={selectedDepartment || ''}
        onValueChange={(val) => {
          setSelectedDepartment(val || null)
        }}
        options={departmentOptions}
        placeholder='اختر القسم'
        searchPlaceholder='ابحث عن قسم...'
        emptyMessage={departments.length === 0 ? 'جارٍ التحميل...' : 'لا يوجد أقسام'}
        required
        ariaLabel='اختر القسم'
      />

      {/* اختيار الخدمة */}
      <SearchableSelect
        value={serviceId}
        onValueChange={setServiceId}
        options={serviceOptions}
        placeholder={selectedDepartment ? 'اختر الخدمة' : 'اختر القسم أولاً'}
        searchPlaceholder='ابحث عن خدمة...'
        emptyMessage={
          !selectedDepartment
            ? 'اختر القسم أولاً'
            : filteredServices.length === 0
              ? 'لا توجد خدمات متاحة'
              : 'لا توجد نتائج'
        }
        required
        disabled={!selectedDepartment}
        ariaLabel='اختر الخدمة'
      />

      {/* نوع الكشف */}
      <Select value={type} onValueChange={setType} required>
        <SelectTrigger aria-label='اختر نوع الكشف'>
          <SelectValue placeholder='اختر نوع الكشف' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem key="type-general" value='كشف عام'>كشف عام</SelectItem>
          <SelectItem key="type-special" value='كشف خاص'>كشف خاص</SelectItem>
        </SelectContent>
      </Select>

      {/* التاريخ */}
      <Input
        type='datetime-local'
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
        aria-label='تاريخ ووقت الموعد'
      />

      {/* الملاحظات */}
      <Input
        type='text'
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder='ملاحظات إضافية'
        aria-label='ملاحظات إضافية'
      />

      {/* الحالة - فقط عند التعديل */}
      {isEditing && (
        <Select value={status} onValueChange={setStatus} required>
          <SelectTrigger aria-label='اختر الحالة'>
            <SelectValue placeholder='اختر الحالة' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='محجوز'>محجوز</SelectItem>
            <SelectItem value='نشط'>نشط</SelectItem>
            <SelectItem value='تم'>تم</SelectItem>
            <SelectItem value='ملغي'>ملغي</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Button type='submit' className='w-full' aria-label={isEditing ? 'تحديث الموعد' : 'حفظ الموعد'} disabled={isSubmitting}>
        {isSubmitting ? 'جاري الحفظ...' : isEditing ? 'تحديث الموعد' : 'حفظ الموعد'}
      </Button>
    </form>
  )
}
