// src/app/(dashboard)/products/new/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ProductForm from '@/components/products/product-form'

export default function NewProductPage() {
  return (
    <div className='p-4'>
      <Card>
        <CardHeader>
          <CardTitle>إضافة منتج جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm />
        </CardContent>
      </Card>
    </div>
  )
}
