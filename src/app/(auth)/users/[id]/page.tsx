// src/app/(auth)/users/[id]/page.tsx
'use client'

import { useUser } from '@/hooks/useUsers'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function UserDetailsPage() {
  const { id } = useParams()
  const { data: user, isLoading } = useUser(id as string)

  if (isLoading) return <Skeleton className='h-48 w-full' />

  if (!user) return <p>المستخدم غير موجود</p>

  return (
    <Card className='max-w-xl mx-auto mt-8'>
      <CardContent className='space-y-4 pt-6'>
        <h2 className='text-xl font-semibold'>تفاصيل المستخدم</h2>
        <p>
          <strong>الاسم:</strong> {user.name}
        </p>
        <p>
          <strong>البريد الإلكتروني:</strong> {user.email}
        </p>
        <p>
          <strong>الدور:</strong> {user.role}
        </p>
        <p>
          <strong>الحالة:</strong> {user.isActive ? 'مفعل' : 'معطل'}
        </p>
        <p>
          <strong>الفرع:</strong>{' '}
          {typeof user.branch === 'object' && user.branch !== null
            ? user.branch.name
            : user.branch || 'غير محدد'}
        </p>
      </CardContent>
    </Card>
  )
}
