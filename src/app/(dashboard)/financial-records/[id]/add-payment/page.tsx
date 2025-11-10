'use client'

import React, { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  useFinancialRecord,
  useAddPaymentToRecord,
} from '@/hooks/useFinancialRecord'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight } from 'lucide-react'

export default function AddPaymentPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const { data: record, isLoading, isError } = useFinancialRecord(id)
  const addPaymentMutation = useAddPaymentToRecord()

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'cash' | 'check' | 'transfer' | 'other'>('cash')
  const [note, setNote] = useState('')

  if (isLoading) return <p>جاري التحميل...</p>
  if (isError || !record) return <p>حدث خطأ أثناء جلب البيانات</p>

  const paidAmount = record.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const remaining = record.totalAmount - paidAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const paymentAmount = Number(amount)
    if (paymentAmount <= 0 || paymentAmount > remaining) {
      alert('يرجى إدخال مبلغ صحيح لا يتجاوز المبلغ المتبقي')
      return
    }
    addPaymentMutation.mutate(
      { id, payment: { amount: paymentAmount, method, notes: note } },
      {
        onSuccess() {
          router.back()
        },
        onError(error: unknown) {
          const errorMessage = 
            (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string')
              ? error.message
              : 'حدث خطأ غير معروف'
          alert('حدث خطأ أثناء إضافة الدفعة: ' + errorMessage)
        },
      }
    )
  }

  return (
    <div className='max-w-md mx-auto p-4'>
      {/* ✅ زر العودة في الأعلى */}
      <Button
        variant='ghost'
        onClick={() => router.back()}
        className='mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-all duration-200 group'
      >
        <ArrowRight className='w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200' />
        <span className='text-base font-medium'>الرجوع إلى الصفحة السابقة</span>
      </Button>

      <h1 className='text-xl font-bold mb-4'>
        إضافة دفعة لسجل: {record.description || '---'} - نوع السجل:{' '}
        {record.recordType === 'salary'
          ? 'راتب'
          : record.recordType === 'purchase'
          ? 'مشتريات'
          : 'مصروف'}
      </h1>

      <p className='mb-2'>المبلغ الإجمالي: {record.totalAmount} د.ع</p>
      <p className='mb-4'>المبلغ المدفوع: {paidAmount} د.ع</p>
      <p className='mb-4 text-red-600 font-semibold'>
        المبلغ المتبقي: {remaining} د.ع
      </p>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <Label htmlFor='amount'>المبلغ</Label>
          <Input
            id='amount'
            type='number'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={1}
            max={remaining}
            required
          />
        </div>

        <div>
          <Label htmlFor='method'>طريقة الدفع</Label>
          <select
            id='method'
            value={method}
            onChange={(e) => setMethod(e.target.value as 'cash' | 'check' | 'transfer' | 'other')}
            className='w-full border rounded px-2 py-1'
          >
            <option value='cash'>نقدي</option>
            <option value='check'>شيك</option>
            <option value='transfer'>تحويل</option>
            <option value='other'>أخرى</option>
          </select>
        </div>

        <div>
          <Label htmlFor='note'>ملاحظة (اختياري)</Label>
          <Input
            id='note'
            type='text'
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className='flex items-center gap-2'>
          <Button type='submit' disabled={addPaymentMutation.isPending}>
            {addPaymentMutation.isPending ? 'جارٍ الإضافة...' : 'إضافة الدفعة'}
          </Button>
        </div>
      </form>
    </div>
  )
}
