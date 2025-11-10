// src/components/products/product-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import axios from '@/lib/axios'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ProductForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: 'قطعة',
    purchasePrice: '',
    sellingPrice: '',
    stock: '',
    notes: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleUnitChange = (value: string) => {
    setFormData({ ...formData, unit: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post('/products', {
        ...formData,
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: formData.sellingPrice
          ? Number(formData.sellingPrice)
          : undefined,
        stock: Number(formData.stock || 0),
      })
      toast.success('تم إضافة المنتج بنجاح')
      router.push('/products')
    } catch {
      toast.error('حدث خطأ أثناء الإضافة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      {/* الصف الأول */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div>
          <Label>اسم المنتج</Label>
          <Input
            name='name'
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label>التصنيف</Label>
          <Input
            name='category'
            value={formData.category}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* الصف الثاني */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div>
          <Label>الوحدة</Label>
          <Select value={formData.unit} onValueChange={handleUnitChange}>
            <SelectTrigger>
              <SelectValue placeholder='اختر الوحدة' />
            </SelectTrigger>
            <SelectContent>
              {['قطعة', 'كغم', 'لتر', 'علبة', 'أخرى'].map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>سعر الشراء</Label>
          <Input
            name='purchasePrice'
            type='number'
            value={formData.purchasePrice}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label>سعر البيع</Label>
          <Input
            name='sellingPrice'
            type='number'
            value={formData.sellingPrice}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* الصف الثالث */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div>
          <Label>المخزون</Label>
          <Input
            name='stock'
            type='number'
            value={formData.stock}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label>ملاحظات</Label>
          <Textarea
            name='notes'
            value={formData.notes}
            onChange={handleChange}
            rows={3}
          />
        </div>
      </div>

      {/* الزر */}
      <div className='flex justify-end'>
        <Button type='submit' disabled={loading}>
          {loading ? 'جارٍ الإضافة...' : 'إضافة المنتج'}
        </Button>
      </div>
    </form>
  )
}
