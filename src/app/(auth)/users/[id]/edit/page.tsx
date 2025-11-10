// src/app/(auth)/users/[id]/edit/page.tsx
'use client'

import { useUser, useUpdateUser } from '@/hooks/useUsers'
import { useParams } from 'next/navigation'
import { UsersForm } from '@/components/users/user-form'
import { Skeleton } from '@/components/ui/skeleton'
import { User } from '@/types/api'

export default function EditUserPage() {
  const { id } = useParams()
  const { data: user, isLoading } = useUser(id as string)
  const updateUser = useUpdateUser(id as string)

  if (isLoading) return <Skeleton className='h-48 w-full' />
  if (!user) return <p>المستخدم غير موجود</p>

  // Transform user to match UserFormData format
  const initialData = {
    name: user.name,
    email: user.email,
    role: user.role,
    branch: typeof user.branch === 'object' && user.branch !== null
      ? user.branch._id || user.branch.id || ''
      : user.branch || '',
    isActive: user.isActive,
  }

  return (
    <div className='max-w-xl mx-auto mt-8'>
      <UsersForm
        initialData={initialData}
        onSubmit={(values) => updateUser.mutate(values as Partial<User>)}
        isLoading={updateUser.isPending}
      />
    </div>
  )
}
