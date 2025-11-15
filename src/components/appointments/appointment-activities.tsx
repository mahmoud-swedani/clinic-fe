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

interface AppointmentActivitiesProps {
  appointmentId: string
}

export function AppointmentActivities({ appointmentId }: AppointmentActivitiesProps) {
  const [showAll, setShowAll] = useState(false)
  const { data: activities, isLoading, isError } = useQuery({
    queryKey: ['appointment-activities', appointmentId],
    queryFn: async () => {
      const { data } = await axios.get(`/audit-logs/appointments/${appointmentId}`)
      return (data?.data || []) as AuditLog[]
    },
    enabled: !!appointmentId,
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
      client: 'العميل',
      doctor: 'الطبيب',
      date: 'التاريخ والوقت',
      type: 'نوع الموعد',
      status: 'الحالة',
      notes: 'الملاحظات',
      service: 'الخدمة',
      departmentId: 'القسم',
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
    }
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return moment(value).format('YYYY-MM-DD HH:mm')
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
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className='h-20 w-full' />
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
          <p className='text-red-500 text-center'>حدث خطأ أثناء تحميل سجل الأنشطة</p>
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
          <p className='text-gray-500 text-center py-8'>لا توجد أنشطة مسجلة لهذا الموعد</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Clock className='w-5 h-5' />
          سجل الأنشطة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {displayedActivities.map((activity: AuditLog) => {
            // Helper to render update changes
            const renderUpdateChanges = () => {
              if (activity.action !== 'update' || !activity.changes) return null
              const before = activity.changes.before
              const after = activity.changes.after
              const beforeObj = before && typeof before === 'object' && !Array.isArray(before) 
                ? (before as Record<string, unknown>)
                : {}
              return (
                <div className='mt-3 pt-3 border-t border-gray-200'>
                  <p className='text-sm font-semibold text-gray-700 mb-2'>التغييرات:</p>
                  <div className='space-y-2'>
                    {Object.keys(beforeObj).map((field) => (
                      <div key={field} className='text-sm bg-gray-50 p-2 rounded'>
                        <p className='font-medium text-gray-800'>{formatFieldName(field)}:</p>
                        <div className='flex gap-4 mt-1'>
                          <div className='flex-1'>
                            <span className='text-red-600 font-medium'>قبل:</span>{' '}
                            {formatFieldValue(beforeObj[field])}
                          </div>
                          <div className='flex-1'>
                            <span className='text-green-600 font-medium'>بعد:</span>{' '}
                            {formatFieldValue(
                              after && typeof after === 'object' && !Array.isArray(after)
                                ? (after as Record<string, unknown>)[field]
                                : undefined
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }

            // Helper to render delete data
            const renderDeleteData = () => {
              if (activity.action !== 'delete' || !activity.changes?.before) return null
              const before = activity.changes.before
              const beforeObj = before && typeof before === 'object' && !Array.isArray(before)
                ? (before as Record<string, unknown>)
                : {}
              return (
                <div className='mt-3 pt-3 border-t border-gray-200'>
                  <p className='text-sm font-semibold text-gray-700 mb-2'>البيانات المحذوفة:</p>
                  <div className='text-sm bg-gray-50 p-2 rounded'>
                    <p>
                      <span className='font-medium'>العميل:</span>{' '}
                      {formatFieldValue(beforeObj.client)}
                    </p>
                    <p>
                      <span className='font-medium'>الطبيب:</span>{' '}
                      {formatFieldValue(beforeObj.doctor)}
                    </p>
                    <p>
                      <span className='font-medium'>التاريخ:</span>{' '}
                      {formatFieldValue(beforeObj.date)}
                    </p>
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
              className='w-full sm:w-auto'
            >
              {showAll ? (
                <>
                  <ChevronUp className='w-4 h-4 mr-2' />
                  إخفاء
                </>
              ) : (
                <>
                  <ChevronDown className='w-4 h-4 mr-2' />
                  عرض المزيد ({activities.length - 1} نشاط إضافي)
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


