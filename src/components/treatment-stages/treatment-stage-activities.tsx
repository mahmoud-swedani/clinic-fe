'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { AuditLog } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Clock, User, FileEdit, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import moment from 'moment'

moment.locale('ar')

interface TreatmentStageActivitiesProps {
  stageId: string
}

export function TreatmentStageActivities({ stageId }: TreatmentStageActivitiesProps) {
  const [showAll, setShowAll] = useState(false)
  const { data: activities, isLoading, isError } = useQuery({
    queryKey: ['treatment-stage-activities', stageId],
    queryFn: async () => {
      const { data } = await axios.get(`/audit-logs/treatment-stages/${stageId}`)
      return (data?.data || []) as AuditLog[]
    },
    enabled: !!stageId,
  })

  // Get activities to display
  const displayedActivities = showAll ? (activities || []) : (activities?.slice(0, 1) || [])
  const hasMoreActivities = (activities?.length || 0) > 1

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className='w-4 h-4 text-green-600' />
      case 'update':
        return <FileEdit className='w-4 h-4 text-blue-600' />
      case 'delete':
        return <Trash2 className='w-4 h-4 text-red-600' />
      default:
        return <Clock className='w-4 h-4 text-gray-600' />
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'create':
        return 'إنشاء'
      case 'update':
        return 'تعديل'
      case 'delete':
        return 'حذف'
      default:
        return action
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800'
      case 'update':
        return 'bg-blue-100 text-blue-800'
      case 'delete':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatFieldName = (field: string) => {
    const fieldNames: { [key: string]: string } = {
      title: 'العنوان',
      description: 'الوصف',
      date: 'التاريخ والوقت',
      cost: 'التكلفة',
      isCompleted: 'الحالة',
      patient: 'المريض',
      doctor: 'الطبيب',
      appointment: 'الموعد',
    }
    return fieldNames[field] || field
  }

  const formatFieldValue = (value: unknown): string => {
    if (!value) return '-'
    if (typeof value === 'object' && value !== null) {
      if ('fullName' in value && typeof (value as { fullName: unknown }).fullName === 'string') {
        return (value as { fullName: string }).fullName
      }
      if ('name' in value && typeof (value as { name: unknown }).name === 'string') {
        return (value as { name: string }).name
      }
      if ('_id' in value) {
        const id = (value as { _id: unknown })._id
        return id ? String(id) : '-'
      }
      return JSON.stringify(value)
    }
    if (typeof value === 'boolean') {
      return value ? 'نعم' : 'لا'
    }
    if (typeof value === 'string' && value.includes('T')) {
      // Try to format as date
      try {
        return moment(value).format('YYYY-MM-DD HH:mm')
      } catch {
        return value
      }
    }
    return String(value)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>سجل الأنشطة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className='h-24 w-full' />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>سجل الأنشطة</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-red-500 text-center py-4'>حدث خطأ أثناء جلب سجل الأنشطة</p>
        </CardContent>
      </Card>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>سجل الأنشطة</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-gray-500 text-center py-4'>لا توجد أنشطة مسجلة</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل الأنشطة</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {displayedActivities.map((activity: AuditLog) => {
            // Helper to render update changes
            const renderUpdateChanges = () => {
              if (activity.action !== 'update' || !activity.changes) {
                return null
              }

              return (
                <div className='mt-3 space-y-2'>
                  <p className='text-sm font-semibold text-gray-700'>التغييرات:</p>
                  <div className='space-y-1'>
                    {Object.entries(activity.changes).map(([field, change]) => {
                      const changeObj = change as { oldValue?: unknown; newValue?: unknown }
                      return (
                        <div key={field} className='text-sm text-gray-600'>
                          <span className='font-medium'>{formatFieldName(field)}:</span>{' '}
                          <span className='line-through text-red-600'>
                            {formatFieldValue(changeObj.oldValue)}
                          </span>{' '}
                          →{' '}
                          <span className='text-green-600'>{formatFieldValue(changeObj.newValue)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            }

            const renderDeleteData = () => {
              const activityWithDeletedData = activity as AuditLog & { deletedData?: Record<string, unknown> }
              if (activity.action !== 'delete' || !activityWithDeletedData.deletedData) {
                return null
              }

              return (
                <div className='mt-3 space-y-2'>
                  <p className='text-sm font-semibold text-gray-700'>البيانات المحذوفة:</p>
                  <div className='space-y-1'>
                    {Object.entries(activityWithDeletedData.deletedData).map(([field, value]) => (
                      <div key={field} className='text-sm text-gray-600'>
                        <span className='font-medium'>{formatFieldName(field)}:</span>{' '}
                        {formatFieldValue(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )
            }

            return (
              <div
                key={activity._id}
                className='border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors'
              >
                <div className='flex items-start justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    {getActionIcon(activity.action)}
                    <Badge className={getActionColor(activity.action)}>
                      {getActionLabel(activity.action)}
                    </Badge>
                  </div>
                  <div className='flex items-center gap-2 text-sm text-gray-600'>
                    <Clock className='w-4 h-4' />
                    {moment(activity.performedAt).format('YYYY-MM-DD HH:mm')}
                  </div>
                </div>

                <div className='flex items-center gap-2 mb-3 text-sm text-gray-700'>
                  <User className='w-4 h-4' />
                  <span>
                    بواسطة:{' '}
                    {typeof activity.performedBy === 'object' && activity.performedBy !== null
                      ? activity.performedBy.name || activity.performedBy.email
                      : 'غير معروف'}
                  </span>
                </div>

                {renderUpdateChanges()}
                {renderDeleteData()}
              </div>
            )
          })}
        </div>

        {/* Show More / Show Less Button */}
        {hasMoreActivities && (
          <div className='mt-4 flex justify-center'>
            <Button
              variant='outline'
              onClick={() => setShowAll(!showAll)}
              className='flex items-center gap-2'
            >
              {showAll ? (
                <>
                  <ChevronUp className='w-4 h-4' />
                  إخفاء
                </>
              ) : (
                <>
                  <ChevronDown className='w-4 h-4' />
                  عرض الكل ({activities.length})
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


