'use client'

import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Permission } from '@/types/api'

type Props = {
  permissions: Permission[]
  selectedPermissionIds: string[]
  onSelectionChange: (permissionIds: string[]) => void
  isLoading?: boolean
}

export function PermissionAssignment({
  permissions,
  selectedPermissionIds,
  onSelectionChange,
  isLoading,
}: Props) {
  const [selected, setSelected] = useState<string[]>(selectedPermissionIds)

  useEffect(() => {
    setSelected(selectedPermissionIds)
  }, [selectedPermissionIds])

  // Category order matching sidebar order
  const categoryOrder: Record<string, number> = {
    patients: 1,
    appointments: 2,
    'treatment-stages': 3,
    invoices: 4, // الفواتير
    'financial-records': 5, // المشتريات
    payments: 6, // المدفوعات
    financial: 7, // General financial permissions (if any)
    products: 8,
    sales: 9,
    departments: 10,
    services: 11,
    users: 12,
    roles: 13,
    general: 14,
  }

  // Arabic display names for categories
  const categoryDisplayNames: Record<string, string> = {
    patients: 'المرضى',
    appointments: 'المواعيد',
    'treatment-stages': 'مراحل العلاج',
    invoices: 'الفواتير',
    'financial-records': 'المشتريات',
    payments: 'المدفوعات',
    financial: 'البيانات المالية',
    products: 'المنتجات',
    sales: 'المبيعات',
    departments: 'الأقسام',
    services: 'الخدمات',
    users: 'المستخدمين',
    roles: 'الأدوار والصلاحيات',
    general: 'عام',
  }

  // Permission type order within category
  const permissionTypeOrder: Record<string, number> = {
    view: 1,
    create: 2,
    edit: 3,
    delete: 4,
  }

  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = []
    }
    acc[permission.category].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  // Sort permissions within each category
  Object.keys(groupedPermissions).forEach((category) => {
    groupedPermissions[category].sort((a, b) => {
      // Extract permission type (view, create, edit, delete, etc.)
      const aType = a.name.split('.').pop() || ''
      const bType = b.name.split('.').pop() || ''
      
      // Get order for permission types
      const aOrder = permissionTypeOrder[aType] || 99
      const bOrder = permissionTypeOrder[bType] || 99
      
      // If same type, sort alphabetically
      if (aOrder === bOrder) {
        return a.name.localeCompare(b.name)
      }
      
      return aOrder - bOrder
    })
  })

  // Sort categories by sidebar order
  const sortedCategories = Object.keys(groupedPermissions).sort((a, b) => {
    const aOrder = categoryOrder[a] || 999
    const bOrder = categoryOrder[b] || 999
    return aOrder - bOrder
  })

  const handleToggle = (permissionId: string) => {
    const newSelected = selected.includes(permissionId)
      ? selected.filter((id) => id !== permissionId)
      : [...selected, permissionId]
    setSelected(newSelected)
    onSelectionChange(newSelected)
  }

  const handleSelectAll = (category: string) => {
    const categoryPermissions = groupedPermissions[category] || []
    const categoryIds = categoryPermissions.map((p) => p._id)
    const allSelected = categoryIds.every((id) => selected.includes(id))
    
    const newSelected = allSelected
      ? selected.filter((id) => !categoryIds.includes(id))
      : [...new Set([...selected, ...categoryIds])]
    setSelected(newSelected)
    onSelectionChange(newSelected)
  }

  return (
    <div className='space-y-4'>
      {sortedCategories.map((category) => {
        const categoryPermissions = groupedPermissions[category]
        return (
        <Card key={category}>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle className='text-lg'>
                {categoryDisplayNames[category] || category}
              </CardTitle>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => handleSelectAll(category)}
                disabled={isLoading}
              >
                {categoryPermissions.every((p) => selected.includes(p._id))
                  ? 'إلغاء تحديد الكل'
                  : 'تحديد الكل'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {categoryPermissions.map((permission) => (
                <div
                  key={permission._id}
                  className='flex items-center space-x-2 space-x-reverse'
                >
                  <Checkbox
                    id={permission._id}
                    checked={selected.includes(permission._id)}
                    onCheckedChange={() => handleToggle(permission._id)}
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor={permission._id}
                    className='text-sm font-normal cursor-pointer'
                  >
                    {permission.description || permission.name}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )
      })}
    </div>
  )
}

