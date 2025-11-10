// src/app/(dashboard)/products/page.tsx
'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useProducts } from '@/hooks/useProducts'
import { Product, PaginatedResponse } from '@/types/api'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Pencil } from 'lucide-react'
import { useUserPermissions } from '@/hooks/usePermissions'

function ProductsContent() {
  const { page, limit, goToPage, changeLimit } = usePagination(10)
  const { data: productsResponse, isLoading, isError, error } = useProducts()
  const { canManageProducts } = useUserPermissions()
  
  const typedProductsResponse = productsResponse as PaginatedResponse<Product> | undefined
  const products = typedProductsResponse?.data || []
  
  const paginationMeta = typedProductsResponse?.pagination
    ? {
        page: typedProductsResponse.pagination.page,
        limit: typedProductsResponse.pagination.limit,
        total: typedProductsResponse.pagination.total,
        totalPages: typedProductsResponse.pagination.totalPages,
      }
    : { page, limit, total: 0, totalPages: 0 }

  return (
    <div className='p-4 space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold'>المنتجات</h2>
        {canManageProducts && (
          <Link href='/products/new'>
            <Button>إضافة منتج جديد</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة المنتجات</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='space-y-2'>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className='h-10 w-full' />
              ))}
            </div>
          ) : isError ? (
            <p className='text-red-600'>
              حدث خطأ أثناء جلب المنتجات: {(error as Error).message}
            </p>
          ) : products.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='min-w-full text-sm'>
                <thead>
                  <tr className='border-b bg-gray-100 text-right'>
                    <th className='px-4 py-2'>الاسم</th>
                    <th className='px-4 py-2'>السعر</th>
                    <th className='px-4 py-2'>المخزون</th>
                    <th className='px-4 py-2'>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product._id} className='border-b hover:bg-gray-50'>
                      <td className='px-4 py-2'>
                        <Link
                          href={`/products/${product._id}`}
                          className='text-blue-600 hover:underline'
                        >
                          {product.name}
                        </Link>
                      </td>
                      <td className='px-4 py-2'>
                        {product.sellingPrice ?? product.purchasePrice} ل.س
                      </td>
                      <td className='px-4 py-2'>{product.stock}</td>
                      {canManageProducts && (
                        <td className='px-4 py-2'>
                          <Link href={`/products/${product._id}/edit`}>
                            <Button
                              variant='outline'
                              size='sm'
                              className='flex gap-1 items-center'
                            >
                              <Pencil size={16} /> تعديل
                            </Button>
                          </Link>
                        </td>
                      )}
                      {!canManageProducts && <td className='px-4 py-2'></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className='text-center text-gray-600'>لا توجد منتجات حالياً.</p>
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

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className='p-4 space-y-4'>
          <div className='flex items-center justify-between'>
            <Skeleton className='h-8 w-32' />
            <Skeleton className='h-10 w-32' />
          </div>
          <Skeleton className='h-96 w-full' />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  )
}
