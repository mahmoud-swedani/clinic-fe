'use client'

import { Suspense } from 'react'
import { useClients } from '@/hooks/useClients'
import { usePagination } from '@/hooks/usePagination'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/Pagination'
import { format } from 'date-fns'
import { useUserPermissions } from '@/hooks/usePermissions'
import { Client, PaginatedResponse } from '@/types/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Pencil } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function ClientsContent() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const { page, limit, goToPage, changeLimit } = usePagination(10)
  const { data, isLoading } = useClients(page, limit)
  const { canManageClients, hasPermission } = useUserPermissions()

  const typedData = data as PaginatedResponse<Client> | undefined
  // فلترة البيانات حسب الاسم أو الجوال مع تجاهل حالة الأحرف
  const clients = typedData?.data || []
  const filteredClients = clients.filter(
    (client) =>
      client.fullName.toLowerCase().includes(search.toLowerCase()) ||
      client.phone.includes(search)
  )
  const paginationMeta = typedData?.pagination
    ? {
        page: typedData.pagination.page,
        limit: typedData.pagination.limit,
        total: typedData.pagination.total,
        totalPages: typedData.pagination.totalPages,
      }
    : { page, limit, total: 0, totalPages: 0 }

  return (
    <main className='p-6 max-w-7xl mx-auto'>
      {/* شريط البحث وزر الإضافة */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6'>
        <Input
          placeholder='ابحث بالاسم أو الجوال...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='max-w-md w-full'
          aria-label='بحث عن عميل'
          type='search'
        />

        <Button 
          className='whitespace-nowrap px-6 py-2 text-lg font-semibold' 
          aria-label='إضافة عميل جديد'
          onClick={() => router.push('/clients/new')}
        >
          ➕ إضافة عميل {canManageClients ? '(✓)' : '(✗)'}
        </Button>
      </div>

      {/* حالة التحميل */}
      {isLoading ? (
        <div className='flex justify-center items-center h-48 text-gray-600 text-lg'>
          جاري التحميل...
        </div>
      ) : (
        <Card>
          <CardContent className='p-0'>
            {filteredClients.length === 0 ? (
              <p className='text-center text-gray-500 text-lg py-12'>
                لا توجد نتائج مطابقة.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-right'>رقم الملف</TableHead>
                    <TableHead className='text-right'>الاسم</TableHead>
                    <TableHead className='text-right'>الجوال</TableHead>
                    <TableHead className='text-right'>الجنس</TableHead>
                    <TableHead className='text-right'>تاريخ الميلاد</TableHead>
                    <TableHead className='text-right'>التصنيف</TableHead>
                    <TableHead className='text-right'>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client: Client) => {
                    const classificationLabels: { [key: string]: string } = {
                      new: 'جديد',
                      regular: 'عادي',
                      chronic: 'مزمن',
                      VIP: 'VIP',
                    }

                    return (
                      <TableRow
                        key={client._id}
                        className='hover:bg-gray-50 transition-colors'
                      >
                        <TableCell className='font-mono text-sm'>
                          {client.refNumber || '-'}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/clients/${client._id}`}
                            className='text-blue-600 hover:underline font-medium'
                          >
                            {client.fullName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <a
                            href={`tel:${client.phone}`}
                            className='text-indigo-600 hover:underline'
                          >
                            {client.phone}
                          </a>
                        </TableCell>
                        <TableCell>
                          {client.gender === 'male' ? 'ذكر' : 'أنثى'}
                        </TableCell>
                        <TableCell>
                          {client.dateOfBirth
                            ? format(new Date(client.dateOfBirth), 'yyyy-MM-dd')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {client.clientClassification
                            ? classificationLabels[client.clientClassification] || client.clientClassification
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className='flex gap-2'>
                            <Button
                              asChild
                              variant='outline'
                              size='sm'
                            >
                              <Link href={`/clients/${client._id}`}>
                                عرض التفاصيل
                              </Link>
                            </Button>
                            {hasPermission('clients.edit') && (
                              <Button
                                asChild
                                variant='outline'
                                size='sm'
                                className='gap-1'
                              >
                                <Link href={`/clients/${client._id}/edit`}>
                                  <Pencil className='w-4 h-4' />
                                  تعديل
                                </Link>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {paginationMeta.totalPages > 1 && (
        <Pagination
          meta={paginationMeta}
          onPageChange={goToPage}
          onLimitChange={changeLimit}
        />
      )}
    </main>
  )
}

export default function ClientsPage() {
  return (
    <Suspense
      fallback={
        <main className='p-4 space-y-4'>
          <div className='flex justify-between items-center'>
            <Skeleton className='h-8 w-32' />
            <Skeleton className='h-10 w-32' />
          </div>
          <Skeleton className='h-10 w-64' />
          <Skeleton className='h-96 w-full' />
        </main>
      }
    >
      <ClientsContent />
    </Suspense>
  )
}
