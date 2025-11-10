// src/app/(dashboard)/dashboard/analytics/departments/[id]/page.tsx
'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { useDepartmentAnalytics } from '@/hooks/useDepartmentAnalytics'
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

function DepartmentAnalyticsContent() {
  const params = useParams()
  const departmentId = params.id as string
  const filters = useAnalyticsFilters()
  const { data, isLoading, isError, error } = useDepartmentAnalytics(
    departmentId,
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
        تحليل القسم
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

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>
              عدد الخدمات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-bold text-green-600'>
              {data.servicesBreakdown?.length || 0}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Services Breakdown Chart */}
      {data.servicesBreakdown && data.servicesBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>الخدمات حسب الإيرادات</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart data={data.servicesBreakdown}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='serviceName' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey='revenue' fill='#6366f1' name='الإيرادات' />
                <Bar dataKey='count' fill='#8b5cf6' name='عدد المواعيد' />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </main>
  )
}

export default function DepartmentAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <main className='p-8 bg-gradient-to-b from-white to-gray-100 min-h-screen'>
          <Skeleton className='h-12 w-64 mb-8' />
          <Skeleton className='h-32 w-full mb-6' />
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8'>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className='h-32 w-full' />
            ))}
          </div>
          <Skeleton className='h-96 w-full' />
        </main>
      }
    >
      <DepartmentAnalyticsContent />
    </Suspense>
  )
}

