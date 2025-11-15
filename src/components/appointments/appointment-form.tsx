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
import { Client, Service, Department, Appointment } from '@/types/api'
import axios from '@/lib/axios'
import { toast } from 'sonner'
import { useUsersByDepartment } from '@/hooks/useUsers'

interface AppointmentFormProps {
  clients: Client[]
  services: Service[]
  departments: Department[]
  onSuccess: () => void
  initialData?: Appointment | null
}

export function AppointmentForm({
  clients,
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

  // Fetch users by department
  const { data: departmentUsers = [], isLoading: loadingUsers } = useUsersByDepartment(selectedDepartment)

  const [clientId, setClientId] = useState<string>(
    initialData ? extractId(initialData.client) : ''
  )
  const [userId, setUserId] = useState<string>(
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

  // Track previous department to detect actual changes
  const prevDepartmentRef = React.useRef<string | null>(selectedDepartment)
  
  // Clear user selection when department actually changes (unless editing and user is still valid)
  useEffect(() => {
    const prevDepartment = prevDepartmentRef.current
    const currentDepartment = selectedDepartment
    
    // Only clear if department actually changed (not just on initial load)
    if (currentDepartment && prevDepartment !== null && prevDepartment !== currentDepartment) {
      if (!isEditing) {
        // When creating new appointment, clear user if department changes
        setUserId('')
      } else if (userId) {
        // When editing, check if current user is still in the new department
        const userStillValid = departmentUsers.some((user) => extractId(user) === userId)
        if (!userStillValid && departmentUsers.length > 0) {
          // User is no longer in this department, clear selection
          setUserId('')
        }
      }
    }
    
    // Update ref for next comparison
    prevDepartmentRef.current = currentDepartment
  }, [selectedDepartment, isEditing, userId, departmentUsers, extractId])

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

    if (!selectedDepartment) {
      errors.push('يرجى اختيار القسم أولاً')
    }

    if (!clientId || clientId.trim() === '') {
      errors.push('يرجى اختيار العميل')
    }

    // Validate userId - check both string and trimmed value
    const userIdStr = userId ? String(userId).trim() : ''
    if (!userIdStr || userIdStr === '') {
      errors.push('يرجى اختيار المستخدم')
    }

    // Validate that selected user belongs to selected department
    if (selectedDepartment && userId) {
      const userBelongsToDepartment = departmentUsers.some((user) => extractId(user) === userId)
      if (!userBelongsToDepartment) {
        errors.push('المستخدم المحدد لا ينتمي إلى القسم المحدد')
      }
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
      // Use the validated userIdStr from validation above
      const finalUserId = userIdStr || userId
      
      const appointmentData = {
        client: clientId,
        doctor: finalUserId, // Use validated userId
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
        setClientId('')
        setUserId('')
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
  const clientOptions = React.useMemo(
    () =>
      clients.map((client) => {
        // Format: "name - refNumber" or just "name" if no refNumber
        const displayLabel = client.refNumber
          ? `${client.fullName} - ${client.refNumber}`
          : client.fullName
        
        // Include phone and refNumber in searchable text
        const searchText = [
          client.fullName,
          client.refNumber,
          client.phone,
        ]
          .filter(Boolean)
          .join(' ')
        
        return {
          value: client._id,
          label: displayLabel,
          searchText: searchText,
        }
      }),
    [clients]
  )

  const userOptions = React.useMemo(
    () =>
      departmentUsers.map((user) => {
        const userId = extractId(user)
        const userName = typeof user === 'object' && user !== null ? user.name : 'غير معروف'
        const userRole = typeof user === 'object' && user !== null ? user.role : ''
        const displayLabel = userRole ? `${userName} (${userRole})` : userName
        return {
          value: userId,
          label: displayLabel,
        }
      }),
    [departmentUsers, extractId]
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
      {/* اختيار العميل - أولاً */}
      <SearchableSelect
        value={clientId}
        onValueChange={setClientId}
        options={clientOptions}
        placeholder='اختر العميل'
        searchPlaceholder='ابحث عن عميل...'
        emptyMessage='لا يوجد عملاء'
        required
        ariaLabel='اختر العميل'
      />

      {/* اختيار القسم - بعد اختيار العميل */}
      <SearchableSelect
        value={selectedDepartment || ''}
        onValueChange={(val) => {
          setSelectedDepartment(val || null)
          setUserId('') // Clear user selection when department changes
        }}
        options={departmentOptions}
        placeholder='اختر القسم'
        searchPlaceholder='ابحث عن قسم...'
        emptyMessage={departments.length === 0 ? 'جارٍ التحميل...' : 'لا يوجد أقسام'}
        required
        ariaLabel='اختر القسم'
      />

      {/* اختيار المستخدم - يظهر بعد اختيار القسم */}
      <SearchableSelect
        value={userId}
        onValueChange={setUserId}
        options={userOptions}
        placeholder={selectedDepartment ? (loadingUsers ? 'جارٍ التحميل...' : 'اختر المستخدم') : 'اختر القسم أولاً'}
        searchPlaceholder='ابحث عن مستخدم...'
        emptyMessage={
          !selectedDepartment
            ? 'اختر القسم أولاً'
            : loadingUsers
              ? 'جارٍ التحميل...'
              : departmentUsers.length === 0
                ? 'لا يوجد مستخدمين في هذا القسم'
                : 'لا يوجد نتائج'
        }
        required
        disabled={!selectedDepartment || loadingUsers}
        ariaLabel='اختر المستخدم'
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
