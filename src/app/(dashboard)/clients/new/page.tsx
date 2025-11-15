'use client'

import { useRouter } from 'next/navigation'
import { ClientForm } from '@/components/clients/client-form'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import axios from '@/lib/axios'
import { CreateClientRequest } from '@/types/api'
import { useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export default function NewClientPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isSubmittingRef = useRef(false)

  const handleClientSubmit = async (clientData: CreateClientRequest) => {
    // Prevent duplicate submissions
    if (isSubmittingRef.current) {
      return
    }

    isSubmittingRef.current = true
    try {
      await axios.post('/clients', clientData)
      toast.success('تم إضافة العميل بنجاح ✅')
      
      // Invalidate all client-related queries to ensure updates are reflected everywhere
      queryClient.invalidateQueries({ queryKey: ['clients'] }) // Invalidate paginated queries
      queryClient.invalidateQueries({ queryKey: ['form-data', 'clients'] }) // Invalidate form data cache
      // Force refetch of ALL queries (not just active) to immediately update the UI for all users
      queryClient.refetchQueries({ queryKey: ['clients'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['form-data', 'clients'], type: 'all' })
      
      router.push('/clients')
    } catch (error: unknown) {
      const errorMessage = 
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(errorMessage || 'حدث خطأ أثناء إضافة العميل')
      console.error('Error creating client:', error)
      isSubmittingRef.current = false
    }
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto p-6'>
        {/* Header */}
        <div className='mb-6'>
          <Button
            variant='ghost'
            onClick={() => router.push('/clients')}
            className='mb-4'
          >
            <ArrowRight className='w-4 h-4 ml-2' />
            العودة إلى قائمة العملاء
          </Button>
          <h1 className='text-3xl font-bold text-gray-900'>إضافة عميل جديد</h1>
          <p className='text-gray-600 mt-2'>قم بملء البيانات لإضافة عميل جديد إلى النظام</p>
        </div>

        {/* Form */}
        <ClientForm onSubmit={handleClientSubmit} isLoading={false} />
      </div>
    </div>
  )
}

