// src/app/(dashboard)/dashboard/page.tsx
'use client'

import React, { useEffect } from 'react'
import { useDashboard } from '@/hooks/useDashboard'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useRouter } from 'next/navigation'

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

import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'

const DashboardPage = () => {
  const router = useRouter()
  const { data, isLoading, isError, error } = useDashboard()
  const { data: user } = useCurrentUser()
  const userRole = user?.role

  // Redirect to role-specific dashboards
  useEffect(() => {
    if (user?.role) {
      if (userRole === 'طبيب') {
        router.replace('/dashboard/doctor')
      } else if (userRole === 'سكرتير') {
        router.replace('/dashboard/reception')
      } else if (userRole === 'محاسب') {
        router.replace('/dashboard/accountant')
      }
      // Owner and Manager stay on main dashboard
    }
  }, [user, userRole, router])

  if (isLoading)
    return (
      <div className='flex justify-center items-center h-[60vh]'>
        <p className='text-lg font-medium text-gray-600'>
          جاري تحميل بيانات الداشبورد...
        </p>
      </div>
    )

  if (isError)
    return (
      <div className='flex justify-center items-center h-[60vh] text-red-600'>
        <p className='text-lg font-semibold'>
          حدث خطأ في تحميل البيانات: {(error as Error).message}
        </p>
      </div>
    )

  // Helper function to check if stat should be shown based on role
  const shouldShowStat = (statKey: string): boolean => {
    if (!userRole || userRole === 'مالك' || userRole === 'مدير') {
      return true // Owner/Manager see all stats
    }

    // Doctor: Hide financial stats
    if (userRole === 'طبيب') {
      const hiddenStats = [
        'totalRevenue',
        'totalExpenses',
        'totalPurchases',
        'totalSalaries',
        'netProfit',
        'totalProductCapital',
      ]
      return !hiddenStats.includes(statKey)
    }

    // Reception: Hide financial stats, user count, branch count
    if (userRole === 'سكرتير') {
      const hiddenStats = [
        'totalRevenue',
        'totalExpenses',
        'totalPurchases',
        'totalSalaries',
        'netProfit',
        'totalProductCapital',
        'totalUsers',
        'totalBranches',
      ]
      return !hiddenStats.includes(statKey)
    }

    // Accountant: Hide medical stats
    if (userRole === 'محاسب') {
      const hiddenStats = [
        'totalPatients',
        'totalAppointments',
        'totalStages',
      ]
      return !hiddenStats.includes(statKey)
    }

    return true
  }

  const chartData = [
    { name: 'الإيرادات', القيمة: data?.stats?.totalRevenue || 0 },
    { name: 'المصاريف', القيمة: data?.stats?.totalExpenses || 0 },
    { name: 'المشتريات', القيمة: data?.stats?.totalPurchases || 0 },
    { name: 'الرواتب', القيمة: data?.stats?.totalSalaries || 0 },
  ]

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return format(date, 'dd MMM yyyy, HH:mm', { locale: arSA })
  }

  // Define all stats with their keys for filtering
  const allStats = [
    { key: 'totalClients', title: 'العملاء', value: data?.stats?.totalClients },
    { key: 'totalAppointments', title: 'المواعيد', value: data?.stats?.totalAppointments },
    { key: 'totalUsers', title: 'المستخدمين', value: data?.stats?.totalUsers },
    { key: 'totalBranches', title: 'الفروع', value: data?.stats?.totalBranches },
    { key: 'totalInvoices', title: 'الفواتير', value: data?.stats?.totalInvoices },
    { key: 'totalStages', title: 'مراحل العلاج', value: data?.stats?.totalStages },
    { key: 'totalProducts', title: 'عدد المنتجات', value: data?.stats?.totalProducts },
    {
      key: 'totalProductCapital',
      title: 'رأس مال المنتجات',
      value: data?.stats?.totalProductCapital,
      suffix: 'ل.س',
    },
    {
      key: 'totalRevenue',
      title: 'الإيرادات',
      value: data?.stats?.totalRevenue,
      suffix: 'ل.س',
    },
    {
      key: 'totalExpenses',
      title: 'المصاريف',
      value: data?.stats?.totalExpenses,
      suffix: 'ل.س',
    },
    {
      key: 'totalPurchases',
      title: 'المشتريات',
      value: data?.stats?.totalPurchases,
      suffix: 'ل.س',
    },
    { key: 'totalSalaries', title: 'الرواتب', value: data?.stats?.totalSalaries, suffix: 'ل.س' },
    { key: 'netProfit', title: 'صافي الربح', value: data?.stats?.netProfit, suffix: 'ل.س' },
  ]

  // Filter stats based on role
  const visibleStats = allStats.filter((stat) => shouldShowStat(stat.key))

  return (
    <main className='p-8 bg-gradient-to-b from-white to-gray-100 min-h-screen'>
      <h1 className='text-4xl font-extrabold mb-8 text-gray-900 tracking-wide'>
        لوحة التحكم
      </h1>

      {/* إحصائيات في بطاقات */}
      <section className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8'>
        {visibleStats.map(({ title, value, suffix, key }, idx) => {
          // Determine color based on stat type
          let textColor = 'text-indigo-600'
          if (key?.includes('Expense') || key?.includes('expense') || key?.includes('Purchase')) {
            textColor = 'text-red-600'
          } else if (key?.includes('Profit') || key?.includes('profit')) {
            textColor = 'text-green-600'
          } else if (key?.includes('Appointment')) {
            textColor = 'text-blue-600'
          }

          return (
            <Card key={idx}>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm font-medium text-gray-600'>
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${textColor}`}>
                  {value !== undefined && value !== null
                    ? suffix
                      ? value.toLocaleString() + ' ' + suffix
                      : value.toLocaleString()
                    : '-'}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </section>

      {/* الرسم البياني - Hide for Doctor and Reception */}
      {(userRole === 'مالك' || userRole === 'مدير' || userRole === 'محاسب') && (
        <Card className='mb-8'>
          <CardHeader>
            <CardTitle>تحليل مالي</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart
                data={chartData}
                margin={{ top: 25, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='name' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey='القيمة' fill='#6366f1' name='القيمة' />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* نشاطات حديثة */}
      <Card>
        <CardHeader>
          <CardTitle>النشاطات الحديثة</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentActivities && data.recentActivities.length === 0 ? (
            <p className='text-gray-600 text-center py-6'>
              لا توجد نشاطات حديثة.
            </p>
          ) : (
            <ul className='space-y-0'>
              {data?.recentActivities?.map((activity, idx) => (
                <li
                  key={idx}
                  className='border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0'
                >
                  <div className='flex justify-between items-start'>
                    <div>
                      <p className='font-semibold text-gray-900 mb-1'>
                        {activity.description} - {activity.name}
                      </p>
                      {activity.type === 'payment' && (
                        <p className='text-sm text-gray-600'>
                          المبلغ:{' '}
                          <span className='font-medium'>
                            {activity.amount?.toLocaleString()}
                          </span>{' '}
                          ل.س
                        </p>
                      )}
                      {activity.type === 'invoice' && (
                        <p className='text-sm text-gray-600'>
                          إجمالي الفاتورة:{' '}
                          <span className='font-medium'>
                            {activity.total?.toLocaleString()}
                          </span>{' '}
                          ل.س
                        </p>
                      )}
                      {activity.type === 'appointment' && (
                        <p className='text-sm text-gray-600'>نوع الموعد: جديد</p>
                      )}
                    </div>
                    <div className='text-sm text-gray-500 whitespace-nowrap'>
                      {formatDate(activity.time)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

export default DashboardPage
