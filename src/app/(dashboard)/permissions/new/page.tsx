'use client'

import { useCreatePermission } from '@/hooks/usePermissions'
import { PermissionForm } from '@/components/permissions/permission-form'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function NewPermissionPage() {
  const router = useRouter()
  const createPermission = useCreatePermission()

  const handleSubmit = async (data: {
    name: string
    description: string
    category: string
  }) => {
    try {
      await createPermission.mutateAsync(data)
      toast.success('تم إنشاء الصلاحية بنجاح')
      router.push('/permissions')
    } catch (error: unknown) {
      const errorMessage = 
        (error && typeof error === 'object' && 'response' in error &&
         error.response && typeof error.response === 'object' && 'data' in error.response &&
         error.response.data && typeof error.response.data === 'object' &&
         'message' in error.response.data)
          ? String((error.response.data as { message?: unknown }).message)
          : 'فشل في إنشاء الصلاحية'
      toast.error(errorMessage)
    }
  }

  return (
    <div className='p-4 max-w-2xl'>
      <h1 className='text-2xl font-bold mb-4'>إنشاء صلاحية جديدة</h1>
      <PermissionForm onSubmit={handleSubmit} isLoading={createPermission.isPending} />
    </div>
  )
}

