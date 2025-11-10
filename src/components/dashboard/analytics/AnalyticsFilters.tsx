// src/components/dashboard/analytics/AnalyticsFilters.tsx
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBranches } from '@/hooks/useBranches'
import { useDepartments } from '@/hooks/useDepartments'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Branch, Department, PaginatedResponse } from '@/types/api'

export function AnalyticsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: branches } = useBranches()
  const { data: user } = useCurrentUser()
  const { data: departments } = useDepartments()

  const [branchId, setBranchId] = useState(
    searchParams.get('branchId') || 'all'
  )
  const [departmentId, setDepartmentId] = useState(
    searchParams.get('departmentId') || 'all'
  )
  const [startDate, setStartDate] = useState(
    searchParams.get('startDate') || ''
  )
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '')

  const handleApplyFilters = () => {
    const params = new URLSearchParams()

    if (branchId && branchId !== 'all') params.set('branchId', branchId)
    if (departmentId && departmentId !== 'all') params.set('departmentId', departmentId)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)

    router.push(`?${params.toString()}`)
  }

  const handleResetFilters = () => {
    setBranchId('all')
    setDepartmentId('all')
    setStartDate('')
    setEndDate('')
    router.push('?')
  }

  // Filter branches based on user role
  const typedBranches = branches as PaginatedResponse<Branch> | undefined
  const typedDepartments = departments as PaginatedResponse<Department> | undefined
  const availableBranches = typedBranches?.data || []
  const canSelectBranch =
    user?.role === 'مالك' || user?.role === 'مدير'

  return (
    <Card className='mb-6'>
      <CardHeader>
        <CardTitle>فلاتر التحليل</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {canSelectBranch && (
            <div>
              <Label htmlFor='branch'>الفرع</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger id='branch'>
                  <SelectValue placeholder='اختر الفرع' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>جميع الفروع</SelectItem>
                {availableBranches
                  .filter((branch: Branch) => branch._id || branch.id)
                  .map((branch: Branch) => (
                    <SelectItem
                      key={branch._id || branch.id || ''}
                      value={branch._id || branch.id || ''}
                    >
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor='department'>القسم</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger id='department'>
                <SelectValue placeholder='اختر القسم' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>جميع الأقسام</SelectItem>
                {(typedDepartments?.data || [])
                  .filter((dept: Department) => dept._id || dept.id)
                  .map((dept: Department) => (
                    <SelectItem
                      key={dept._id || dept.id || ''}
                      value={dept._id || dept.id || ''}
                    >
                      {dept.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor='startDate'>من تاريخ</Label>
            <Input
              id='startDate'
              type='date'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor='endDate'>إلى تاريخ</Label>
            <Input
              id='endDate'
              type='date'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className='flex gap-2 mt-4'>
          <Button onClick={handleApplyFilters}>تطبيق الفلاتر</Button>
          <Button onClick={handleResetFilters} variant='outline'>
            إعادة تعيين
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

