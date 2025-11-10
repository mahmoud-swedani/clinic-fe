'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Permission } from '@/types/api'
import { usePermissionCategories } from '@/hooks/usePermissions'

type PermissionFormData = {
  name: string
  description: string
  category: string
}

type Props = {
  initialData?: Partial<Permission>
  onSubmit: (data: PermissionFormData) => void
  isLoading?: boolean
}

export function PermissionForm({ initialData, onSubmit, isLoading }: Props) {
  const router = useRouter()
  const isEditing = Boolean(initialData)
  const { data: categories } = usePermissionCategories()

  const [formData, setFormData] = useState<PermissionFormData>({
    name: '',
    description: '',
    category: '',
    ...initialData,
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        category: initialData.category || '',
      })
    }
  }, [initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <>
      <div className='flex justify-between items-center mb-4'>
        <button
          type='button'
          onClick={() => router.push('/permissions')}
          className={cn(
            'flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition'
          )}
        >
          <ArrowLeft className='w-4 h-4' />
          الرجوع إلى قائمة الصلاحيات
        </button>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* Name */}
        <div>
          <Label>اسم الصلاحية (مثال: patients.create)</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder='patients.create'
            disabled={isEditing}
          />
          {isEditing && (
            <p className='text-sm text-muted-foreground mt-1'>
              لا يمكن تعديل اسم الصلاحية
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <Label>الفئة</Label>
          {categories && categories.length > 0 ? (
            <Select
              value={formData.category || undefined}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder='اختر الفئة أو أدخل واحدة جديدة' />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
                {formData.category &&
                  formData.category.trim() !== '' &&
                  !categories.includes(formData.category) && (
                    <SelectItem value={formData.category}>
                      {formData.category} (جديد)
                    </SelectItem>
                  )}
              </SelectContent>
            </Select>
          ) : null}
          <Input
            className='mt-2'
            placeholder='أدخل اسم الفئة'
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            required
          />
          {formData.category &&
            formData.category.trim() !== '' &&
            !categories?.includes(formData.category) && (
              <p className='text-sm text-blue-600 mt-1'>
                سيتم إنشاء فئة جديدة: {formData.category}
              </p>
            )}
        </div>

        {/* Description */}
        <div>
          <Label>الوصف</Label>
          <Textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={4}
          />
        </div>

        {/* Submit Button */}
        <Button type='submit' disabled={isLoading}>
          {isEditing ? 'تحديث الصلاحية' : 'إنشاء الصلاحية'}
        </Button>
      </form>
    </>
  )
}

