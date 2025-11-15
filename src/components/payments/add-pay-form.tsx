'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import axios from '@/lib/axios'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

export function AddPayForm({
  invoiceId,
  clientId,
  appointmentId,
  refetchInvoices,
  onClose,
  payments = [],
  remainingAmount = 0,
}: {
  invoiceId: string
  clientId?: string
  appointmentId?: string
  refetchInvoices?: () => void
  onClose?: () => void
  payments?: {
    _id: string
    amount: number
    method: string
    createdAt: string
  }[]
  remainingAmount?: number
}) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('نقدًا')
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const numericAmount = parseFloat(amount)
    if (numericAmount > remainingAmount) {
      toast.error('لا يمكن دفع أكثر من المبلغ المتبقي')
      return
    }

    setLoading(true)

    try {
      await axios.post('/payments', {
        invoiceId,
        client: clientId,
        appointment: appointmentId,
        amount: numericAmount,
        method,
      })

      toast.success('تمت إضافة الدفعة بنجاح')

      // Invalidate and refetch all relevant caches
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(invoiceId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.byInvoice(invoiceId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs.entity('Invoice', invoiceId) })
      
      // Explicitly refetch to ensure immediate updates
      queryClient.refetchQueries({ queryKey: ['invoices'], type: 'all' })
      queryClient.refetchQueries({ queryKey: queryKeys.invoices.detail(invoiceId) })
      queryClient.refetchQueries({ queryKey: queryKeys.payments.byInvoice(invoiceId) })
      queryClient.refetchQueries({ queryKey: queryKeys.auditLogs.entity('Invoice', invoiceId) })

      setAmount('')
      setMethod('نقدًا')

      if (refetchInvoices) refetchInvoices()
      if (onClose) onClose()
    } catch (error) {
      console.error(error)
      toast.error('فشل في إضافة الدفعة. تحقق من البيانات.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      {/* سجل الدفعات السابقة */}
      <div className='space-y-2'>
        <h4 className='text-sm font-medium'>سجل الدفعات السابقة</h4>
        {payments.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            لا توجد دفعات حتى الآن.
          </p>
        ) : (
          <ul className='space-y-1 text-sm'>
            {payments.map((pay) => (
              <li key={pay._id} className='flex justify-between border-b pb-1'>
                <span>
                  {pay.createdAt
                    ? new Date(pay.createdAt).toLocaleDateString()
                    : '-'}{' '}
                  - {pay.method}
                </span>
                <span>{pay.amount} ل.س</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* نموذج الدفع */}
      <form onSubmit={handleSubmit} className='space-y-4'>
        <div className='space-y-1'>
          <Label>المبلغ (المتبقي: {remainingAmount} ل.س)</Label>
          <Input
            type='number'
            placeholder='أدخل المبلغ'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            max={remainingAmount}
            required
          />
        </div>

        <div className='space-y-1'>
          <Label>طريقة الدفع</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger>
              <SelectValue placeholder='اختر طريقة الدفع' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='نقدًا'>نقدًا</SelectItem>
              <SelectItem value='بطاقة'>بطاقة</SelectItem>
              <SelectItem value='تحويل بنكي'>تحويل بنكي</SelectItem>
              <SelectItem value='أخرى'>أخرى</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type='submit' disabled={loading}>
          {loading ? 'جاري الإضافة...' : 'إضافة'}
        </Button>
      </form>
    </div>
  )
}
