'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { Department } from '@/types/api'

interface ServicesFormProps {
  initialData?: {
    name: string
    description?: string
    price: number
    duration: number
    image?: string
    isActive: boolean
    requiresConsultation: boolean
    departmentId: string | Department
  }
  departments: Department[]
  onSubmit: (data: {
    name: string
    description?: string
    price: number
    duration: number
    image?: string
    isActive: boolean
    requiresConsultation: boolean
    departmentId: string
  }) => void
  isLoading?: boolean
}

export default function ServicesForm({
  initialData,
  departments,
  onSubmit,
  isLoading,
}: ServicesFormProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [price, setPrice] = useState(initialData?.price?.toString() || '')
  const [duration, setDuration] = useState(
    initialData?.duration?.toString() || ''
  )
  const [image, setImage] = useState(initialData?.image || '')
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true)
  const [requiresConsultation, setRequiresConsultation] = useState(
    initialData?.requiresConsultation ?? false
  )
  const [departmentId, setDepartmentId] = useState<string>(
    typeof initialData?.departmentId === 'string'
      ? initialData.departmentId
      : typeof initialData?.departmentId === 'object' && initialData.departmentId !== null
      ? (initialData.departmentId as Department)._id || (initialData.departmentId as Department).id || ''
      : ''
  )

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setDescription(initialData.description || '')
      setPrice(initialData.price?.toString() || '')
      setDuration(initialData.duration?.toString() || '')
      setImage(initialData.image || '')
      setIsActive(initialData.isActive ?? true)
      setRequiresConsultation(initialData.requiresConsultation ?? false)
      // Extract departmentId if it's an object
      let deptId: string = ''
      if (typeof initialData.departmentId === 'object' && initialData.departmentId !== null) {
        const dept = initialData.departmentId as Department
        deptId = dept._id || dept.id || ''
      } else if (typeof initialData.departmentId === 'string') {
        deptId = initialData.departmentId
      }
      setDepartmentId(deptId)
    }
  }, [initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!departmentId) {
      alert('يرجى اختيار القسم')
      return
    }

    onSubmit({
      name,
      description,
      price: Number(price),
      duration: Number(duration),
      image,
      isActive,
      requiresConsultation,
      departmentId,
    })
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4 max-w-lg'>
      <div>
        <label className='block mb-1 font-medium'>اسم الخدمة</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label className='block mb-1 font-medium'>الوصف</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          disabled={isLoading}
        />
      </div>

      <div>
        <label className='block mb-1 font-medium'>السعر (ل.س)</label>
        <Input
          type='number'
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          min={0}
          step={0.01}
          disabled={isLoading}
          required
        />
      </div>

      <div>
        <label className='block mb-1 font-medium'>المدة (بالدقائق)</label>
        <Input
          type='number'
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          min={1}
          step={1}
          disabled={isLoading}
          required
        />
      </div>

      <div>
        <label className='block mb-1 font-medium'>رابط الصورة (اختياري)</label>
        <Input
          type='text'
          value={image}
          onChange={(e) => setImage(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div>
        <label className='block mb-1 font-medium'>القسم</label>
        <Select
          value={departmentId}
          onValueChange={setDepartmentId}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder='اختر القسم' />
          </SelectTrigger>
          <SelectContent>
            {Array.isArray(departments) && departments.length > 0 ? (
              departments.map((dept) => (
                <SelectItem key={dept._id} value={dept._id}>
                  {dept.name}
                </SelectItem>
              ))
            ) : (
              <div className='px-2 py-1.5 text-sm text-gray-500 text-center'>
                لا توجد أقسام متاحة
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className='flex items-center space-x-2'>
        <Checkbox
          checked={isActive}
          onCheckedChange={(val) => setIsActive(!!val)}
          disabled={isLoading}
        />
        <label>الخدمة مفعلة</label>
      </div>

      <div className='flex items-center space-x-2'>
        <Checkbox
          checked={requiresConsultation}
          onCheckedChange={(val) => setRequiresConsultation(!!val)}
          disabled={isLoading}
        />
        <label>تتطلب استشارة أولية</label>
      </div>

      <Button type='submit' disabled={isLoading}>
        {isLoading ? 'جاري الحفظ...' : 'حفظ'}
      </Button>
    </form>
  )
}
