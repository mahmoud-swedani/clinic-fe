// src/app/(dashboard)/services/page.tsx
'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useServices } from '@/hooks/useServices'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { Service, PaginatedResponse } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserPermissions } from '@/hooks/usePermissions'

function ServicesContent() {
  const { page, limit, goToPage, changeLimit } = usePagination(10)
  const { data: servicesResponse, isLoading } = useServices()
  const { canManageServices } = useUserPermissions()

  // Extract array from paginated response
  const typedServicesResponse = servicesResponse as PaginatedResponse<Service> | undefined
  const services = typedServicesResponse?.data || []
  
  const paginationMeta = typedServicesResponse?.pagination
    ? {
        page: typedServicesResponse.pagination.page,
        limit: typedServicesResponse.pagination.limit,
        total: typedServicesResponse.pagination.total,
        totalPages: typedServicesResponse.pagination.totalPages,
      }
    : { page, limit, total: 0, totalPages: 0 }

  return (
    <div className='p-4 space-y-4'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>الخدمات</h1>
        {canManageServices && (
          <Button asChild>
            <Link href='/services/new' aria-label='إضافة خدمة جديدة'>إضافة خدمة</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الخدمات</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='space-y-2'>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className='h-10 w-full' />
              ))}
            </div>
          ) : !Array.isArray(services) || services.length === 0 ? (
            <p className='text-center text-gray-500 py-8'>
              لا توجد خدمات حتى الآن
            </p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='min-w-full text-sm'>
                <thead>
                  <tr className='border-b bg-gray-100 text-right'>
                    <th className='px-4 py-2'>اسم الخدمة</th>
                    <th className='px-4 py-2'>الوصف</th>
                    <th className='px-4 py-2'>السعر</th>
                    <th className='px-4 py-2'>المدة (دقيقة)</th>
                    <th className='px-4 py-2'>الحالة</th>
                    <th className='px-4 py-2'>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service: Service) => (
                    <tr key={service._id} className='border-b hover:bg-gray-50'>
                      <td className='px-4 py-2'>
                        <Link
                          href={`/services/${service._id}`}
                          className='text-blue-600 hover:underline font-medium'
                        >
                          {service.name}
                        </Link>
                      </td>
                      <td className='px-4 py-2 text-gray-600 max-w-xs truncate'>
                        {service.description || '-'}
                      </td>
                      <td className='px-4 py-2'>
                        {service.price?.toLocaleString() || '0'} ر.س
                      </td>
                      <td className='px-4 py-2'>{service.duration || '-'}</td>
                      <td className='px-4 py-2'>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            service.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {service.isActive ? 'مفعّل' : 'معطّل'}
                        </span>
                      </td>
                      <td className='px-4 py-2'>
                        <Button asChild size='sm' variant='outline'>
                          <Link href={`/services/${service._id}`}>
                            عرض التفاصيل
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {paginationMeta.totalPages > 1 && (
        <Pagination
          meta={paginationMeta}
          onPageChange={goToPage}
          onLimitChange={changeLimit}
        />
      )}
    </div>
  )
}

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className='p-4 space-y-4'>
          <div className='flex justify-between items-center'>
            <Skeleton className='h-8 w-32' />
            <Skeleton className='h-10 w-32' />
          </div>
          <Skeleton className='h-96 w-full' />
        </div>
      }
    >
      <ServicesContent />
    </Suspense>
  )
}
