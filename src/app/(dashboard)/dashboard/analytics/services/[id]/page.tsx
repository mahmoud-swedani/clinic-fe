// src/app/(dashboard)/dashboard/analytics/services/[id]/page.tsx
'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { useServiceAnalytics } from '@/hooks/useServiceAnalytics'
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters'
import { AnalyticsFilters } from '@/components/dashboard/analytics/AnalyticsFilters'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

function ServiceAnalyticsContent() {
  const params = useParams()
  const serviceId = params.id as string
  const filters = useAnalyticsFilters()
  const { data, isLoading, isError, error } = useServiceAnalytics(
    serviceId,
    filters
  )

  if (isLoading) {
    return (
      <div className='flex justify-center items-center h-[60vh]'>
        <p className='text-lg font-medium text-gray-600'>
          جاري تحميل بيانات التحليل...
        </p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className='flex justify-center items-center h-[60vh] text-red-600'>
        <p className='text-lg font-semibold'>
          حدث خطأ في تحميل البيانات: {(error as Error).message}
        </p>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <main className='p-8 bg-gradient-to-b from-white to-gray-100 min-h-screen'>
      <h1 className='text-4xl font-extrabold mb-8 text-gray-900 tracking-wide'>
        تحليل الخدمة
      </h1>

      <AnalyticsFilters />

      {/* Summary Cards */}
      <section className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>
              إجمالي المواعيد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-bold text-blue-600'>
              {data.totalAppointments?.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>
              إجمالي الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-bold text-indigo-600'>
              {data.totalRevenue?.toLocaleString() || 0} ل.س
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Appointments by Status Chart */}
      {data.appointmentsByStatus && data.appointmentsByStatus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>المواعيد حسب الحالة</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart data={data.appointmentsByStatus}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='status' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey='count' fill='#6366f1' name='عدد المواعيد' />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </main>
  )
}

export default function ServiceAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <main className='p-8 bg-gradient-to-b from-white to-gray-100 min-h-screen'>
          <Skeleton className='h-12 w-64 mb-8' />
          <Skeleton className='h-32 w-full mb-6' />
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8'>
            {[1, 2].map((i) => (
              <Skeleton key={i} className='h-32 w-full' />
            ))}
          </div>
          <Skeleton className='h-96 w-full' />
        </main>
      }
    >
      <ServiceAnalyticsContent />
    </Suspense>
  )
}

