'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProducts } from '@/hooks/useProducts'
import { useClients } from '@/hooks/useClients'
import axios from '@/lib/axios'
import { Client, Product, PaginatedResponse } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

export default function SalesForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const {
    data: productsResponse,
    isLoading: productsLoading,
    error: productsError,
  } = useProducts()
  const { data: clientsResponse } = useClients()
  
  // Extract arrays from paginated responses
  const typedProductsResponse = productsResponse as PaginatedResponse<Product> | undefined
  const typedClientsResponse = clientsResponse as PaginatedResponse<Client> | undefined
  const products = typedProductsResponse?.data || []
  const clients = typedClientsResponse?.data || []

  const [client, setClient] = useState('')
  const [items, setItems] = useState<
    Array<{ product: string; quantity: number; unitPrice: number }>
  >([{ product: '', quantity: 1, unitPrice: 0 }])
  const [paidAmount, setPaidAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [salePayload, setSalePayload] = useState<{
    client: string
    items: Array<{ product: string; quantity: number; unitPrice: number }>
    totalAmount: number
    paidAmount: number
    remainingAmount: number
    paymentStatus: 'paid' | 'partial' | 'unpaid'
    paymentMethod: string
    notes?: string
  } | null>(null)

  const handleItemChange = (
    index: number,
    field: 'product' | 'quantity' | 'unitPrice',
    value: string | number
  ) => {
    const updatedItems = [...items]
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index][field] = Number(value) as number
    } else {
      updatedItems[index][field] = value as string
    }
    setItems(updatedItems)
  }

  const addItem = () => {
    setItems([...items, { product: '', quantity: 1, unitPrice: 0 }])
  }

  const removeItem = (index: number) => {
    const updatedItems = [...items]
    updatedItems.splice(index, 1)
    setItems(updatedItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!client) {
      toast.error('يرجى اختيار العميل')
      return
    }
    
    if (!items || items.length === 0 || items.some(item => !item.product)) {
      toast.error('يرجى إضافة منتجات على الأقل')
      return
    }
    
    // Calculate total amount from items
    const totalAmount = items.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity)
    }, 0)
    
    if (totalAmount <= 0) {
      toast.error('يرجى التأكد من إدخال أسعار المنتجات')
      return
    }
    
    // Filter and format items properly
    const validItems = items
      .filter(item => item.product && item.product.trim() !== '') // Only items with valid product
      .map(item => ({
        product: item.product,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
      }))
      .filter(item => item.quantity > 0 && item.unitPrice > 0) // Only items with valid quantities and prices
    
    if (validItems.length === 0) {
      toast.error('يرجى إضافة منتجات صحيحة مع كمية وسعر')
      return
    }
    
    // Recalculate with valid items only
    const recalculatedTotal = validItems.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity)
    }, 0)
    
    const recalculatedRemaining = recalculatedTotal - paidAmount
    
    if (recalculatedRemaining < 0) {
      toast.error('المبلغ المدفوع أكبر من المبلغ الإجمالي')
      return
    }
    
    // Determine payment status
    let finalPaymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid'
    if (recalculatedRemaining === 0) {
      finalPaymentStatus = 'paid'
    } else if (paidAmount > 0) {
      finalPaymentStatus = 'partial'
    }

    // Prepare payload for confirmation
    const payload = {
      client: client.trim(),
      items: validItems,
      totalAmount: recalculatedTotal,
      paidAmount: Number(paidAmount) || 0,
      remainingAmount: recalculatedRemaining,
      paymentStatus: finalPaymentStatus,
      paymentMethod: paymentMethod || 'cash',
      notes: notes?.trim() || undefined,
    }
    
    // Store payload and show confirmation dialog
    setSalePayload(payload)
    setConfirmOpen(true)
  }

  const handleConfirmSale = async () => {
    if (!salePayload) return

    try {
      console.log('Sending sale data:', salePayload)
      
      await axios.post('/sales', salePayload)
      toast.success('تم حفظ عملية البيع بنجاح')
      
      // Invalidate and refetch all sales queries to show the new sale immediately
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all })
      queryClient.refetchQueries({ queryKey: queryKeys.sales.all })
      
      setConfirmOpen(false)
      router.push('/sales')
    } catch (error: unknown) {
      console.error('فشل في إرسال البيانات:', error)
      
      // Try to get validation errors
      let errorMessage = 'حدث خطأ أثناء حفظ عملية البيع'
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: unknown } }).response
        if (response?.data && typeof response.data === 'object') {
          const data = response.data as Record<string, unknown>
          if (data.error && typeof data.error === 'string') {
            errorMessage = data.error
          } else if (data.message && typeof data.message === 'string') {
            errorMessage = data.message
          } else if (data.errors && Array.isArray(data.errors)) {
            errorMessage = data.errors
              .map((e: unknown) => 
                (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string')
                  ? e.message
                  : String(e)
              )
              .join(', ')
          }
        }
      }
      toast.error(errorMessage)
      setConfirmOpen(false)
    }
  }

  // Prepare client options for SearchableSelect
  const clientOptions = Array.isArray(clients)
    ? clients.map((p: Client) => {
        // Format: "name - refNumber" or just "name" if no refNumber
        const displayLabel = p.refNumber
          ? `${p.fullName} - ${p.refNumber}`
          : p.fullName
        
        // Include phone and refNumber in searchable text
        const searchText = [
          p.fullName,
          p.refNumber,
          p.phone,
        ]
          .filter(Boolean)
          .join(' ')
        
        return {
          value: p._id,
          label: displayLabel,
          searchText: searchText,
        }
      })
    : []

  // Prepare product options for SearchableSelect
  const productOptions = Array.isArray(products)
    ? products.map((product: Product) => ({
        value: product._id,
        label: `${product.name} - ${product.sellingPrice} ل.س`,
      }))
    : []

  return (
    <form onSubmit={handleSubmit} className='space-y-6 p-4'>
      <div>
        <Label>العميل</Label>
        <SearchableSelect
          value={client}
          onValueChange={setClient}
          options={clientOptions}
          placeholder='اختر عميل'
          searchPlaceholder='ابحث عن عميل...'
          emptyMessage='لا يوجد عملاء'
          required
          ariaLabel='اختر العميل'
        />
      </div>

      <div className='space-y-4'>
        <Label>المنتجات</Label>
        {items.map((item, index) => (
          <div key={index} className='grid grid-cols-12 items-end gap-2'>
            <div className='col-span-4'>
              <Label>المنتج</Label>
              <SearchableSelect
                value={item.product}
                onValueChange={(value) => handleItemChange(index, 'product', value)}
                options={productOptions}
                placeholder={productsLoading ? 'جاري التحميل...' : productsError ? 'حدث خطأ' : 'اختر منتج'}
                searchPlaceholder='ابحث عن منتج...'
                emptyMessage={productsLoading ? 'جاري التحميل...' : productsError ? 'حدث خطأ' : 'لا يوجد منتجات'}
                disabled={productsLoading}
                required
                ariaLabel='اختر المنتج'
              />
            </div>

            <div className='col-span-2'>
              <Label>الكمية</Label>
              <Input
                type='number'
                value={item.quantity}
                onChange={(e) =>
                  handleItemChange(index, 'quantity', e.target.value)
                }
              />
            </div>

            <div className='col-span-3'>
              <Label>سعر الوحدة</Label>
              <Input
                type='number'
                value={item.unitPrice}
                onChange={(e) =>
                  handleItemChange(index, 'unitPrice', e.target.value)
                }
              />
            </div>

            <div className='col-span-3'>
              <Button
                type='button'
                variant='destructive'
                onClick={() => removeItem(index)}
                className='w-full'
              >
                حذف
              </Button>
            </div>
          </div>
        ))}

        <Button type='button' onClick={addItem}>
          + إضافة منتج
        </Button>
      </div>

      <div>
        <Label>المبلغ المدفوع</Label>
        <Input
          type='number'
          value={paidAmount}
          onChange={(e) => setPaidAmount(Number(e.target.value))}
        />
      </div>

      <div>
        <Label>طريقة الدفع</Label>
        <select
          className='w-full border p-2 rounded'
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value='cash'>نقداً</option>
          <option value='card'>بطاقة</option>
          <option value='other'>أخرى</option>
        </select>
      </div>

      <div>
        <Label>ملاحظات</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder='أدخل ملاحظات إضافية'
        />
      </div>

      <div className='flex items-center gap-4'>
        <Button type='submit'>💾 حفظ العملية</Button>
        <Button
          type='button'
          variant='outline'
          onClick={() => router.push('/sales')}
        >
          ↩️ الرجوع إلى المبيعات
        </Button>
      </div>
      
      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent dir='rtl'>
          <DialogHeader>
            <DialogTitle>تأكيد حفظ عملية البيع</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حفظ عملية البيع التالية؟
            </DialogDescription>
          </DialogHeader>
          {salePayload && (
            <div className='space-y-2 text-sm'>
              <p>
                <strong>المبلغ الإجمالي:</strong> {salePayload.totalAmount.toLocaleString()} ل.س
              </p>
              <p>
                <strong>المبلغ المدفوع:</strong> {salePayload.paidAmount.toLocaleString()} ل.س
              </p>
              <p>
                <strong>المبلغ المتبقي:</strong> {salePayload.remainingAmount.toLocaleString()} ل.س
              </p>
              <p>
                <strong>حالة الدفع:</strong>{' '}
                {salePayload.paymentStatus === 'paid'
                  ? 'مدفوع بالكامل'
                  : salePayload.paymentStatus === 'partial'
                  ? 'مدفوع جزئي'
                  : 'غير مدفوع'}
              </p>
              <p>
                <strong>عدد المنتجات:</strong> {salePayload.items.length}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant='outline' onClick={() => setConfirmOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleConfirmSale}>تأكيد الحفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
