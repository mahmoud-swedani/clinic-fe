'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Role } from '@/types/api'
import { usePermissionsByCategory } from '@/hooks/usePermissions'
import { PermissionAssignment } from './permission-assignment'

type RoleFormData = {
  name: string
  description: string
  permissionIds?: string[]
}

type Props = {
  initialData?: Partial<Role>
  onSubmit: (data: RoleFormData) => void
  isLoading?: boolean
}

export function RoleForm({ initialData, onSubmit, isLoading }: Props) {
  const router = useRouter()
  const isEditing = Boolean(initialData)
  const { data: permissionsByCategory, isLoading: permissionsLoading } =
    usePermissionsByCategory()

  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    permissionIds: [],
    ...initialData,
  })

  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([])

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        permissionIds: initialData.permissions?.map((p) => p._id) || [],
      })
      // Pre-select permissions when editing
      if (initialData.permissions) {
        setSelectedPermissionIds(
          initialData.permissions.map((p) => p._id || p.id || '').filter(Boolean)
        )
      }
    }
  }, [initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      permissionIds: selectedPermissionIds,
    })
  }

  // Flatten permissions from grouped object
  const allPermissions = permissionsByCategory
    ? Object.values(permissionsByCategory).flat()
    : []

  return (
    <>
      <div className='flex justify-between items-center mb-4'>
        <button
          type='button'
          onClick={() => router.push('/roles')}
          className={cn(
            'flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition'
          )}
        >
          <ArrowLeft className='w-4 h-4' />
          الرجوع إلى قائمة الأدوار
        </button>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* Name */}
        <div>
          <Label>اسم الدور</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            disabled={isEditing && initialData?.isSystemRole}
          />
          {isEditing && initialData?.isSystemRole && (
            <p className='text-sm text-muted-foreground mt-1'>
              لا يمكن تعديل اسم دور النظام
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

        {/* Permissions */}
        <div>
          <Label className='mb-2 block'>الصلاحيات</Label>
          {permissionsLoading ? (
            <p className='text-sm text-muted-foreground'>جار تحميل الصلاحيات...</p>
          ) : allPermissions.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              لا توجد صلاحيات متاحة. يرجى إنشاء صلاحيات أولاً.
            </p>
          ) : (
            <PermissionAssignment
              permissions={allPermissions}
              selectedPermissionIds={selectedPermissionIds}
              onSelectionChange={setSelectedPermissionIds}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Submit Button */}
        <Button type='submit' disabled={isLoading || permissionsLoading}>
          {isEditing ? 'تحديث الدور' : 'إنشاء الدور'}
        </Button>
      </form>
    </>
  )
}

