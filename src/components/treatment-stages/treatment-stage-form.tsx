'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import axios from '@/lib/axios'
import { toast } from 'sonner'

export function TreatmentStageForm({
  appointmentId,
  patientId,
  doctorId,
  onSuccess,
}: {
  appointmentId: string
  patientId: string
  doctorId: string
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
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {

    if (!patientId || !doctorId || !appointmentId) {
      console.error('[TreatmentStageForm] Missing required fields:', {
        appointmentId: appointmentId || 'MISSING',
        patientId: patientId || 'MISSING',
        doctorId: doctorId || 'MISSING',
      })
      toast.error('بيانات المريض أو الطبيب أو الموعد غير مكتملة')
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

    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        patient: patientId,
        title: title.trim(),
        description: description.trim(),
        date: dateObj.toISOString(),
        doctor: doctorId,
        appointment: appointmentId,
        isCompleted: false,
      }

      // Only include cost if it's a valid number
      if (cost && !isNaN(Number(cost)) && Number(cost) > 0) {
        payload.cost = Number(cost)
      }

      await axios.post('/treatment-stages', payload)

      // Reset form
      setTitle('')
      setDescription('')
      setDate('')
      setCost('')

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

  return (
    <div 
      className='space-y-4'
      onClick={handleContainerClick}
      onPointerDown={handleContainerClick}
    >
      <Input
        placeholder='عنوان المرحلة'
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
        required
      />
      <Input
        placeholder='وصف المرحلة'
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
      />
      <Input
        type='datetime-local'
        value={date}
        onChange={(e) => setDate(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
        required
      />
      <Input
        type='number'
        placeholder='التكلفة'
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
      />
      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? 'جارٍ الإضافة...' : 'إضافة المرحلة'}
      </Button>
    </div>
  )
}
