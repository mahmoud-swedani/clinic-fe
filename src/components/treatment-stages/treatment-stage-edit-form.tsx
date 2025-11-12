'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useState, useEffect } from 'react'
import { useUpdateTreatmentStage } from '@/hooks/useTreatmentStage'
import { TreatmentStage } from '@/types/api'
import { toast } from 'sonner'

export function TreatmentStageEditForm({
  stage,
  onSuccess,
  onCancel,
}: {
  stage: TreatmentStage | null
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const updateMutation = useUpdateTreatmentStage()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [cost, setCost] = useState('')
  const [isCompleted, setIsCompleted] = useState(false)

  // Populate form when stage data is available
  useEffect(() => {
    if (stage) {
      setTitle(stage.title || '')
      setDescription(stage.description || '')
      setDate(
        stage.date
          ? new Date(stage.date).toISOString().slice(0, 16) // Format for datetime-local input
          : ''
      )
      setCost(stage.cost?.toString() || '')
      setIsCompleted(stage.isCompleted || false)
    }
  }, [stage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stage?._id) {
      toast.error('المرحلة غير موجودة')
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

    const payload: Partial<TreatmentStage> = {
      title: title.trim(),
      description: description.trim(),
      date: dateObj.toISOString(),
      isCompleted,
    }

    // Only include cost if it's a valid number
    if (cost && !isNaN(Number(cost)) && Number(cost) >= 0) {
      payload.cost = Number(cost)
    } else if (cost === '') {
      payload.cost = 0
    }

    updateMutation.mutate(
      { id: stage._id, data: payload },
      {
        onSuccess: () => {
          onSuccess?.()
        },
      }
    )
  }

  if (!stage) {
    return <div className='text-gray-500'>لا توجد بيانات المرحلة</div>
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div>
        <Label htmlFor='title'>عنوان المرحلة</Label>
        <Input
          id='title'
          placeholder='عنوان المرحلة'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor='description'>وصف المرحلة</Label>
        <Input
          id='description'
          placeholder='وصف المرحلة'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor='date'>تاريخ المرحلة</Label>
        <Input
          id='date'
          type='datetime-local'
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor='cost'>التكلفة</Label>
        <Input
          id='cost'
          type='number'
          placeholder='التكلفة'
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          min='0'
          step='0.01'
        />
      </div>

      <div className='flex items-center space-x-2 space-x-reverse'>
        <Checkbox
          id='isCompleted'
          checked={isCompleted}
          onCheckedChange={(checked) => setIsCompleted(checked === true)}
        />
        <Label htmlFor='isCompleted' className='cursor-pointer'>
          المرحلة مكتملة
        </Label>
      </div>

      <div className='flex gap-2 justify-end'>
        {onCancel && (
          <Button type='button' variant='outline' onClick={onCancel}>
            إلغاء
          </Button>
        )}
        <Button type='submit' disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'جارٍ التحديث...' : 'تحديث المرحلة'}
        </Button>
      </div>
    </form>
  )
}


