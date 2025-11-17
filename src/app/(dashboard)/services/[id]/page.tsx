'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import axios from '@/lib/axios'
import { Service, Department } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  ArrowRight,
  Banknote,
  Layers3,
  ShieldCheck,
  FileText,
} from 'lucide-react'

export default function ServiceDetailsPage() {
  const params = useParams()
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchService = async () => {
      try {
        const { data } = await axios.get(`/services/${params.id}`)
        setService(data?.data || data)
      } catch (err) {
        console.error('فشل في تحميل تفاصيل الخدمة', err)
        setError('حدث خطأ أثناء تحميل بيانات الخدمة')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) fetchService()
  }, [params.id])

  const departmentName = useMemo(() => {
    if (typeof service?.departmentId === 'object' && service.departmentId !== null) {
      return (service.departmentId as Department).name || 'غير محدد'
    }
    if (typeof service?.departmentId === 'string') {
      return service.departmentId
    }
    return 'غير محدد'
  }, [service])

  if (loading) {
    return (
      <div className='space-y-4 p-6 max-w-6xl mx-auto'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-6 w-64' />
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {[...Array(3)].map((_, idx) => (
            <Skeleton key={idx} className='h-36 w-full' />
          ))}
        </div>
        <Skeleton className='h-64 w-full' />
      </div>
    )
  }

  if (error) {
    return <p className='text-center text-red-500 mt-8'>{error}</p>
  }

  if (!service) {
    return <p className='text-center text-red-500 mt-8'>الخدمة غير موجودة</p>
  }

  const formattedPrice = service.price ? `${service.price.toLocaleString()} ل.س` : 'غير محدد'
  const formattedDuration = service.duration ? `${service.duration} دقيقة` : 'غير محددة'
  const createdAt = service.createdAt
    ? format(new Date(service.createdAt), 'dd MMM yyyy', { locale: ar })
    : 'غير متوفر'
  const updatedAt = service.updatedAt
    ? format(new Date(service.updatedAt), 'dd MMM yyyy', { locale: ar })
    : 'غير متوفر'

  return (
    <div className='p-4 lg:p-6 space-y-6 max-w-6xl mx-auto'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div className='space-y-2'>
          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
            <Layers3 className='w-4 h-4' />
            <span>{departmentName}</span>
          </div>
          <h1 className='text-3xl font-bold'>{service.name}</h1>
          <p className='text-muted-foreground'>
            {service.description || 'لا يوجد وصف متاح لهذه الخدمة حالياً.'}
          </p>
          <div className='flex flex-wrap gap-2 pt-1'>
            <Badge variant={service.isActive ? 'default' : 'secondary'}>
              {service.isActive ? 'مفعّلة' : 'غير مفعّلة'}
            </Badge>
            <Badge variant={service.requiresConsultation ? 'destructive' : 'outline'}>
              {service.requiresConsultation ? 'يتطلب استشارة' : 'لا يتطلب استشارة'}
            </Badge>
          </div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' asChild>
            <Link href='/services'>
              <ArrowRight className='w-4 h-4 ml-2' />
              العودة إلى قائمة الخدمات
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/services/${service._id}/edit`}>تعديل الخدمة</Link>
          </Button>
        </div>
      </div>

      {service.image && (
        <div className='relative w-full h-72 sm:h-96 rounded-xl overflow-hidden border'>
          <Image
            src={service.image}
            alt={service.name}
            fill
            className='object-cover'
            sizes='(max-width: 1024px) 100vw, 1024px'
          />
        </div>
      )}

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Banknote className='w-5 h-5 text-primary' />
              التسعير والمدة
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <Metric label='السعر' value={formattedPrice} />
            <Metric label='المدة' value={formattedDuration} />
            <Metric label='آخر تحديث' value={updatedAt} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <ShieldCheck className='w-5 h-5 text-primary' />
              حالة الخدمة
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <InfoRow label='الحالة' value={service.isActive ? 'متاحة للحجز' : 'غير متاحة'} />
            <InfoRow
              label='تتطلب استشارة'
              value={service.requiresConsultation ? 'نعم' : 'لا'}
            />
            <InfoRow label='تاريخ الإنشاء' value={createdAt} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Activity className='w-5 h-5 text-primary' />
              معلومات إضافية
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <InfoRow label='المعرف الداخلي' value={service._id} />
            <InfoRow label='رقم الخدمة' value={service.id || 'غير متوفر'} />
            <InfoRow label='الزيارات' value='—' />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <FileText className='w-5 h-5 text-primary' />
            وصف تفصيلي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='leading-7 text-muted-foreground'>
            {service.description ||
              'لا يوجد وصف تفصيلي متاح حالياً. يمكنك إضافة وصف من صفحة تعديل الخدمة.'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

interface MetricProps {
  label: string
  value: React.ReactNode
}

function Metric({ label, value }: MetricProps) {
  return (
    <div>
      <p className='text-sm text-muted-foreground mb-1'>{label}</p>
      <p className='text-lg font-semibold'>{value}</p>
    </div>
  )
}

interface InfoRowProps {
  label: string
  value: React.ReactNode
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className='flex items-center justify-between'>
      <span className='text-sm text-muted-foreground'>{label}</span>
      <span className='font-medium'>{value}</span>
    </div>
  )
}
