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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='text-right'>اسم الخدمة</TableHead>
                  <TableHead className='text-right'>الوصف</TableHead>
                  <TableHead className='text-right'>السعر</TableHead>
                  <TableHead className='text-right'>المدة (دقيقة)</TableHead>
                  <TableHead className='text-right'>الحالة</TableHead>
                  <TableHead className='text-right'>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service: Service) => (
                  <TableRow key={service._id} className='hover:bg-gray-50 transition-colors'>
                    <TableCell>
                      <Link
                        href={`/services/${service._id}`}
                        className='text-blue-600 hover:underline font-medium'
                      >
                        {service.name}
                      </Link>
                    </TableCell>
                    <TableCell className='text-gray-600 max-w-xs truncate'>
                      {service.description || '-'}
                    </TableCell>
                    <TableCell>
                      {service.price?.toLocaleString() || '0'} ر.س
                    </TableCell>
                    <TableCell>{service.duration || '-'}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          service.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {service.isActive ? 'مفعّل' : 'معطّل'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button asChild size='sm' variant='outline'>
                        <Link href={`/services/${service._id}`}>
                          عرض التفاصيل
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
