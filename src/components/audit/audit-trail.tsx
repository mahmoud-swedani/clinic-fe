'use client'

import { AuditLog } from '@/types/api'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

type Props = {
  logs: AuditLog[]
  isLoading?: boolean
}

const actionLabels: Record<string, string> = {
  create: 'إنشاء',
  update: 'تحديث',
  delete: 'حذف',
  'assign-permission': 'تعيين صلاحية',
  'remove-permission': 'إزالة صلاحية',
  'assign-role': 'تعيين دور',
  'remove-role': 'إزالة دور',
  'toggle-status': 'تغيير الحالة',
}

export function AuditTrail({ logs, isLoading }: Props) {
  if (isLoading) {
    return <p className='p-4 text-center'>جار التحميل...</p>
  }

  if (!logs || logs.length === 0) {
    return <p className='p-4 text-center text-muted-foreground'>لا توجد سجلات</p>
  }

  return (
    <div className='space-y-2'>
      {logs.map((log) => (
        <div
          key={log._id}
          className='border rounded p-4 space-y-2 hover:bg-gray-50 transition'
        >
          <div className='flex justify-between items-start'>
            <div className='flex-1'>
              <div className='flex items-center gap-2'>
                <span className='font-medium'>
                  {typeof log.performedBy === 'object'
                    ? log.performedBy.name
                    : 'مستخدم غير معروف'}
                </span>
                <span className='text-sm text-muted-foreground'>
                  {actionLabels[log.action] || log.action}
                </span>
                <span className='text-sm text-muted-foreground'>
                  {log.entityType}
                </span>
              </div>
              {log.changes && (
                <div className='mt-2 text-sm text-muted-foreground'>
                  {log.changes.before != null && (
                    <div>
                      <span className='font-medium'>قبل:</span>{' '}
                      {JSON.stringify(log.changes.before, null, 2)}
                    </div>
                  )}
                  {log.changes.after != null && (
                    <div>
                      <span className='font-medium'>بعد:</span>{' '}
                      {JSON.stringify(log.changes.after, null, 2)}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className='text-sm text-muted-foreground'>
              {log.performedAt
                ? format(new Date(log.performedAt), 'yyyy-MM-dd HH:mm', {
                    locale: ar,
                  })
                : '-'}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

