// src/components/forms/financial-record-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useCreateFinancialRecord } from '@/hooks/useFinancialRecord'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const formSchema = z.object({
  recordType: z.enum(['purchase', 'expense', 'salary'], {
    // تم إضافة 'salary'
    required_error: 'اختر نوع السجل',
  }),
  description: z.string().min(1, 'الوصف مطلوب'),
  recordDate: z.string().min(1, 'التاريخ مطلوب'),
  totalAmount: z.coerce.number().min(0, 'أدخل المبلغ'),
  paymentAmount: z.coerce.number().min(0, 'أدخل مبلغ الدفعة'),
  paymentMethod: z.enum(['cash', 'card', 'bank', 'other'], {
    required_error: 'اختر طريقة الدفع',
  }),
  paymentNote: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export default function FinancialRecordForm({
  defaultType,
}: {
  defaultType?: 'purchase' | 'expense' | 'salary'
} = {}) {
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recordType: defaultType || 'purchase',
      description: '',
      recordDate: new Date().toISOString().split('T')[0],
      totalAmount: 0,
      paymentAmount: 0,
      paymentMethod: 'cash',
      paymentNote: '',
    },
  })

  const mutation = useCreateFinancialRecord()

  const onSubmit = (values: FormValues) => {
    // Map form payment method to API expected method
    const mapPaymentMethod = (
      method: 'cash' | 'card' | 'bank' | 'other'
    ): 'cash' | 'check' | 'transfer' | 'other' => {
      switch (method) {
        case 'cash':
          return 'cash'
        case 'card':
          return 'check'
        case 'bank':
          return 'transfer'
        case 'other':
          return 'other'
        default:
          return 'cash'
      }
    }

    mutation.mutate(
      {
        recordType: values.recordType,
        description: values.description,
        recordDate: values.recordDate,
        totalAmount: values.totalAmount,
        payments: [
          {
            amount: values.paymentAmount,
            method: mapPaymentMethod(values.paymentMethod),
            paymentDate: values.recordDate,
            notes: values.paymentNote,
          },
        ],
      },
      {
        onSuccess: () => {
          toast.success('تم إنشاء السجل المالي بنجاح')
          router.push('/financial-records')
        },
        onError: () => toast.error('حدث خطأ أثناء الحفظ'),
      }
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
      <Select
        value={form.watch('recordType')}
        onValueChange={(val) => form.setValue('recordType', val as 'purchase' | 'expense' | 'salary')}
      >
        <SelectTrigger>
          <SelectValue placeholder='نوع السجل' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='purchase'>مشتريات</SelectItem>
          <SelectItem value='expense'>مصروفات</SelectItem>
          <SelectItem value='salary'>راتب</SelectItem>
        </SelectContent>
      </Select>

      <Input {...form.register('description')} placeholder='وصف السجل' />
      <Input type='date' {...form.register('recordDate')} />
      <Input
        type='number'
        {...form.register('totalAmount')}
        placeholder='المبلغ الإجمالي'
      />
      <Input
        type='number'
        {...form.register('paymentAmount')}
        placeholder='مبلغ الدفعة'
      />

      <Select
        {...form.register('paymentMethod')}
        onValueChange={(val) => form.setValue('paymentMethod', val as 'cash' | 'card' | 'bank' | 'other')}
      >
        <SelectTrigger>
          <SelectValue placeholder='طريقة الدفع' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='cash'>نقدي</SelectItem>
          <SelectItem value='card'>بطاقة</SelectItem>
          <SelectItem value='bank'>تحويل بنكي</SelectItem>
          <SelectItem value='other'>أخرى</SelectItem>
        </SelectContent>
      </Select>

      <Textarea {...form.register('paymentNote')} placeholder='ملاحظة' />
      <Button type='submit' disabled={mutation.isPending}>
        {mutation.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
      </Button>
    </form>
  )
}
