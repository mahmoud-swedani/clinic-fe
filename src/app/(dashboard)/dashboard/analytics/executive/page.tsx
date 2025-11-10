// src/app/(dashboard)/dashboard/analytics/executive/page.tsx
'use client'

import { Suspense } from 'react'
import { useExecutiveAnalytics } from '@/hooks/useExecutiveAnalytics'
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters'
import { AnalyticsFilters } from '@/components/dashboard/analytics/AnalyticsFilters'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  LineChart,
  Line,
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

function ExecutiveAnalyticsContent() {
  const filters = useAnalyticsFilters()
  const { data, isLoading, isError, error } = useExecutiveAnalytics(filters)

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
        التحليل التنفيذي
      </h1>

      <AnalyticsFilters />

      {/* Summary Cards */}
      <section className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>
              إجمالي الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-bold text-indigo-600'>
              {data.summary?.totalRevenue?.toLocaleString() || 0} ل.س
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>
              إجمالي المصاريف
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-bold text-red-600'>
              {data.summary?.totalFinancialOut?.toLocaleString() || 0} ل.س
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>
              صافي الربح
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-bold text-green-600'>
              {data.summary?.netProfit?.toLocaleString() || 0} ل.س
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>
              إجمالي المواعيد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-bold text-blue-600'>
              {data.summary?.totalAppointments?.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Charts */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
        {/* Revenue Time Series */}
        <Card>
          <CardHeader>
            <CardTitle>الإيرادات على مر الزمن</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <LineChart data={data.revenueTimeSeries || []}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='date' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type='monotone'
                  dataKey='revenue'
                  stroke='#6366f1'
                  strokeWidth={2}
                  name='الإيرادات'
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expenses Time Series */}
        <Card>
          <CardHeader>
            <CardTitle>المصاريف على مر الزمن</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <LineChart data={data.expensesTimeSeries || []}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='date' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type='monotone'
                  dataKey='expenses'
                  stroke='#ef4444'
                  strokeWidth={2}
                  name='المصاريف'
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Appointments by Status */}
      <Card>
        <CardHeader>
          <CardTitle>المواعيد حسب الحالة</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width='100%' height={300}>
            <BarChart data={data.appointmentsByStatus || []}>
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
    </main>
  )
}

export default function ExecutiveAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <main className='p-8 bg-gradient-to-b from-white to-gray-100 min-h-screen'>
          <Skeleton className='h-12 w-64 mb-8' />
          <Skeleton className='h-32 w-full mb-6' />
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8'>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className='h-32 w-full' />
            ))}
          </div>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
            {[1, 2].map((i) => (
              <Skeleton key={i} className='h-96 w-full' />
            ))}
          </div>
          <Skeleton className='h-96 w-full' />
        </main>
      }
    >
      <ExecutiveAnalyticsContent />
    </Suspense>
  )
}







