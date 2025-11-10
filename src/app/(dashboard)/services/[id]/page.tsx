'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Service } from '@/types/api'
import Image from 'next/image'

export default function ServiceDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchService = async () => {
      try {
        const res = await axios.get(`/services/${params.id}`)
        setService(res.data)
      } catch {
        console.error('فشل في تحميل تفاصيل الخدمة')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) fetchService()
  }, [params.id])

  if (loading) {
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
    return <p className='text-center text-red-500 mt-8'>الخدمة غير موجودة</p>

  return (
    <div className='max-w-3xl mx-auto p-4 space-y-4'>
      <h1 className='text-2xl font-semibold'>{service.name}</h1>

      {service.image && (
        <div className='relative w-full h-72 rounded-lg overflow-hidden'>
          <Image
            src={service.image}
            alt={service.name}
            fill
            className='object-cover'
            sizes='(max-width: 768px) 100vw, 768px'
          />
        </div>
      )}

      <p className='text-muted-foreground'>{service.description}</p>
      <p className='text-lg font-medium'>السعر: {service.price} ر.س</p>
      <p className='text-lg'>المدة: {service.duration} دقيقة</p>
      <p className='text-lg'>
        الحالة:{' '}
        <span className={service.isActive ? 'text-green-600' : 'text-red-600'}>
          {service.isActive ? 'مفعلة' : 'غير مفعلة'}
        </span>
      </p>
      <p className='text-lg'>
        تتطلب استشارة:{' '}
        <span>{service.requiresConsultation ? 'نعم' : 'لا'}</span>
      </p>
      <p className='text-lg text-gray-600'>
        القسم:{' '}
        {typeof service.departmentId === 'object' && service.departmentId !== null
          ? service.departmentId.name
          : 'غير معروف'}
      </p>

      <Button onClick={() => router.push(`/services/${params.id}/edit`)}>
        تعديل الخدمة
      </Button>
    </div>
  )
}
