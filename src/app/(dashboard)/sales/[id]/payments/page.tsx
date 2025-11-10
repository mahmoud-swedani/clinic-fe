'use client'

import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function AddPaymentPage() {
  const { id } = useParams()
  const router = useRouter()
  const [amount, setAmount] = useState('')

  // Fetch sale info to get remaining amount
  const {
    data: sale,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['sale', id],
    queryFn: async () => {
      const res = await axios.get(`/sales/${id}`)
      // The API returns { success: true, data: <sale> }
      return res.data?.data || res.data
    },
    enabled: !!id,
  })

  // Handle payment submit
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post(`/sales/${id}/payments`, {
        amount: parseFloat(amount),
      })
      return res.data
    },
    onSuccess: () => {
      toast.success('تمت إضافة الدفعة بنجاح')
      router.push(`/sales/${id}`)
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إضافة الدفعة')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || isNaN(Number(amount))) {
      toast.error('يرجى إدخال مبلغ صحيح')
      return
    }

    const enteredAmount = parseFloat(amount)
    const remainingAmount = sale?.remainingAmount || 0
    if (sale && enteredAmount > remainingAmount) {
      toast.error('المبلغ يتجاوز المتبقي')
      return
    }

    mutation.mutate()
  }

  if (isLoading) return <div className='p-4'>جارٍ التحميل...</div>
  if (error) return <div className='p-4 text-red-600'>حدث خطأ</div>
  if (!sale) return <div className='p-4'>لا توجد بيانات</div>

  const remainingAmount = sale?.remainingAmount || 0

  return (
    <div className='p-4 max-w-md mx-auto space-y-6'>
      <h1 className='text-2xl font-bold border-b pb-2'>إضافة دفعة</h1>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='amount'>
            المبلغ (المتبقي: {remainingAmount.toLocaleString()} ل.س)
          </Label>
          <Input
            id='amount'
            type='number'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={1}
            max={remainingAmount}
            step='0.01'
            required
          />
        </div>

        <Button type='submit' disabled={mutation.isPending}>
          {mutation.isPending ? 'جارٍ الحفظ...' : 'إضافة'}
        </Button>
      </form>
    </div>
  )
}
