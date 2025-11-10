// src/app/(auth)/users/new/page.tsx
'use client'

import { Suspense } from 'react'
import { useCreateUser } from '@/hooks/useUsers'
import { UsersForm } from '@/components/users/user-form'
import { User } from '@/types/api'
import { Skeleton } from '@/components/ui/skeleton'

function NewUserContent() {
  const createUser = useCreateUser()

  return (
    <div className='max-w-xl mx-auto mt-8'>
      <UsersForm
        onSubmit={(data) => createUser.mutate(data as Partial<User>)}
        isLoading={createUser.isPending}
      />
    </div>
  )
}

export default function NewUserPage() {
  return (
    <Suspense
      fallback={
        <div className='max-w-xl mx-auto mt-8'>
          <Skeleton className='h-96 w-full' />
        </div>
      }
    >
      <NewUserContent />
    </Suspense>
  )
}
