'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const contactSchema = z.object({
  name: z.string().min(2, 'الاسم يجب أن يكون على الأقل حرفين'),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  phone: z.string().min(10, 'رقم الهاتف غير صحيح'),
  message: z.string().min(10, 'الرسالة يجب أن تكون على الأقل 10 أحرف'),
})

type ContactFormData = z.infer<typeof contactSchema>

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise((resolve) => setTimeout(resolve, 1000))
      
      console.log('Form data:', data)
      setSubmitStatus('success')
      reset()
      
      // Reset success message after 5 seconds
      setTimeout(() => setSubmitStatus('idle'), 5000)
    } catch {
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus('idle'), 5000)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6' suppressHydrationWarning>
      <div className='space-y-2'>
        <Label htmlFor='name'>الاسم</Label>
        <Input
          id='name'
          {...register('name')}
          placeholder='أدخل اسمك الكامل'
          className={errors.name ? 'border-red-500' : ''}
          suppressHydrationWarning
        />
        {errors.name && (
          <p className='text-sm text-red-500'>{errors.name.message}</p>
        )}
      </div>

      <div className='space-y-2'>
        <Label htmlFor='email'>البريد الإلكتروني</Label>
        <Input
          id='email'
          type='email'
          {...register('email')}
          placeholder='example@email.com'
          className={errors.email ? 'border-red-500' : ''}
          suppressHydrationWarning
        />
        {errors.email && (
          <p className='text-sm text-red-500'>{errors.email.message}</p>
        )}
      </div>

      <div className='space-y-2'>
        <Label htmlFor='phone'>رقم الهاتف</Label>
        <Input
          id='phone'
          type='tel'
          {...register('phone')}
          placeholder='05xxxxxxxx'
          className={errors.phone ? 'border-red-500' : ''}
          suppressHydrationWarning
        />
        {errors.phone && (
          <p className='text-sm text-red-500'>{errors.phone.message}</p>
        )}
      </div>

      <div className='space-y-2'>
        <Label htmlFor='message'>الرسالة</Label>
        <Textarea
          id='message'
          {...register('message')}
          placeholder='اكتب رسالتك هنا...'
          rows={5}
          className={errors.message ? 'border-red-500' : ''}
          suppressHydrationWarning
        />
        {errors.message && (
          <p className='text-sm text-red-500'>{errors.message.message}</p>
        )}
      </div>

      {submitStatus === 'success' && (
        <div className='p-4 bg-green-50 border border-green-200 rounded-md text-green-800'>
          تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.
        </div>
      )}

      {submitStatus === 'error' && (
        <div className='p-4 bg-red-50 border border-red-200 rounded-md text-red-800'>
          حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.
        </div>
      )}

      <Button
        type='submit'
        size='lg'
        className='w-full'
        disabled={isSubmitting}
        suppressHydrationWarning
      >
        {isSubmitting ? 'جاري الإرسال...' : 'إرسال الرسالة'}
      </Button>
    </form>
  )
}

