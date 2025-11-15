// ✅ src/app/(dashboard)/products/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

interface Product {
  name: string
  category?: string
  unit: string
  purchasePrice: number
  sellingPrice?: number
  stock: number
  notes?: string
  _id: string
}

export default function ProductDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`/products/${params.id}`)
        setProduct(res.data)
      } catch {
        toast.error('فشل في تحميل بيانات المنتج')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) fetchProduct()
  }, [params.id])

  if (loading) {
    return (
      <div className='space-y-4 p-4 max-w-3xl mx-auto'>
        <Skeleton className='h-10 w-1/3' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-2/3' />
        <Skeleton className='h-4 w-1/2' />
        <Skeleton className='h-4 w-1/4' />
      </div>
    )
  }

  if (!product)
    return (
      <p className='text-center text-red-500 mt-8'>لم يتم العثور على المنتج</p>
    )

  return (
    <div className='max-w-3xl mx-auto p-4'>
      <Button
        variant='ghost'
        className='mb-6 flex items-center gap-2'
        onClick={() => router.push('/products')}
      >
        <ChevronLeft size={20} />
        العودة إلى المنتجات
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className='text-xl'>
            تفاصيل المنتج: {product.name}
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4 text-right'>
          <div>
            <strong>التصنيف:</strong> {product.category || '—'}
          </div>
          <div>
            <strong>الوحدة:</strong> {product.unit}
          </div>
          <div>
            <strong>سعر الشراء:</strong> {product.purchasePrice} ل.س
          </div>
          <div>
            <strong>سعر البيع:</strong>{' '}
            {product.sellingPrice ? `${product.sellingPrice} ل.س` : '—'}
          </div>
          <div>
            <strong>المخزون:</strong> {product.stock} {product.unit}
          </div>
          {product.notes && (
            <>
              <Separator />
              <div>
                <strong>ملاحظات:</strong>
                <p className='text-muted-foreground mt-1'>{product.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
