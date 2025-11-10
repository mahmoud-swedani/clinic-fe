'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ServicesForm from '@/components/services/services-form'
import axios from '@/lib/axios'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { useDepartments } from '@/hooks/useDepartments'
import { Service, Department, PaginatedResponse } from '@/types/api'

function EditServiceContent() {
  const router = useRouter()
  const { id } = useParams() as { id?: string }
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)

  const { data: departmentsResponse, isLoading: isDepartmentsLoading } =
    useDepartments()
  
  const typedDepartmentsResponse = departmentsResponse as PaginatedResponse<Department> | undefined
  // Extract array from paginated response
  const departments = typedDepartmentsResponse?.data || []

  useEffect(() => {
    if (!id) return

    const fetchService = async () => {
      try {
        const res = await axios.get(`/services/${id}`)
        // The API returns { success: true, data: <service> }
        const serviceData = res.data?.data || res.data
        setService(serviceData)
      } catch {
        toast.error('فشل في تحميل بيانات الخدمة')
      } finally {
        setLoading(false)
      }
    }

    fetchService()
  }, [id])

  const handleSubmit = async (formData: Partial<Service>) => {
    if (!id) return
    try {
      await axios.put(`/services/${id}`, formData)
      toast.success('تم تعديل الخدمة بنجاح')
      router.push(`/services/${id}`)
    } catch {
      toast.error('حدث خطأ أثناء تعديل الخدمة')
    }
  }

  if (loading || isDepartmentsLoading) {
    return (
      <div className='space-y-4 p-4 max-w-3xl mx-auto'>
        <Skeleton className='h-10 w-1/3' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-2/3' />
        <Skeleton className='h-4 w-1/2' />
      </div>
    )
  }

  if (!service)
    return (
      <p className='text-center text-red-500 mt-8'>لم يتم العثور على الخدمة</p>
    )

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
          <CardTitle className='text-xl'>
            تعديل الخدمة: {service.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ServicesForm
            initialData={
              service
                ? {
                    name: service.name,
                    description: service.description,
                    price: service.price,
                    duration: service.duration,
                    image: service.image,
                    isActive: service.isActive,
                    requiresConsultation: service.requiresConsultation,
                    departmentId:
                      typeof service.departmentId === 'object' &&
                      service.departmentId !== null
                        ? service.departmentId._id
                        : service.departmentId || '',
                  }
                : undefined
            }
            departments={departments}
            onSubmit={handleSubmit}
            isLoading={loading || isDepartmentsLoading}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default function EditServicePage() {
  return (
    <Suspense
      fallback={
        <div className='space-y-4 p-4 max-w-3xl mx-auto'>
          <Skeleton className='h-10 w-1/3' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-2/3' />
          <Skeleton className='h-4 w-1/2' />
        </div>
      }
    >
      <EditServiceContent />
    </Suspense>
  )
}
