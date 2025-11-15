'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import ServicesForm from '@/components/services/services-form'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { useDepartments } from '@/hooks/useDepartments'
import { Service, Department, PaginatedResponse } from '@/types/api'
import axios from '@/lib/axios'
import { Skeleton } from '@/components/ui/skeleton'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

function NewServiceContent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: departmentsResponse, isLoading } = useDepartments()
  
  const typedDepartmentsResponse = departmentsResponse as PaginatedResponse<Department> | undefined
  // Extract array from paginated response
  const departments = typedDepartmentsResponse?.data || []

  const handleSubmit = async (formData: Partial<Service>) => {
    try {
      await axios.post('/services', formData)
      toast.success('تمت إضافة الخدمة بنجاح')
      
      // Invalidate and refetch all services queries to show the new service immediately
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
      queryClient.refetchQueries({ queryKey: queryKeys.services.all })
      
      router.push('/services')
    } catch {
      toast.error('حدث خطأ أثناء إضافة الخدمة')
    }
  }

  return (
    <div className='max-w-3xl mx-auto p-4'>
      <Button
        variant='ghost'
        className='mb-6 flex items-center gap-2'
        onClick={() => router.push('/services')}
      >
        <ChevronLeft size={20} />
        العودة إلى الخدمات
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className='text-xl'>إضافة خدمة جديدة</CardTitle>
        </CardHeader>
        <CardContent>
          <ServicesForm
            onSubmit={handleSubmit}
            departments={departments}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default function NewServicePage() {
  return (
    <Suspense
      fallback={
        <div className='max-w-3xl mx-auto p-4'>
          <Skeleton className='h-10 w-32 mb-6' />
          <Skeleton className='h-96 w-full' />
        </div>
      }
    >
      <NewServiceContent />
    </Suspense>
  )
}
