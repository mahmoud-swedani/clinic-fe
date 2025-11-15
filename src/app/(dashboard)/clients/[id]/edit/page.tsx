'use client'

import { useRouter, useParams } from 'next/navigation'
import { ClientForm } from '@/components/clients/client-form'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import axios from '@/lib/axios'
import { CreateClientRequest } from '@/types/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Client } from '@/types/api'
import { Skeleton } from '@/components/ui/skeleton'
import { useRef } from 'react'
import { queryKeys } from '@/lib/queryKeys'

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string
  const queryClient = useQueryClient()
  const isSubmittingRef = useRef(false)

  // Fetch client data
  const { data: client, isLoading, isError, refetch: refetchClient } = useQuery({
    queryKey: queryKeys.clients.detail(clientId),
    queryFn: async () => {
      const { data } = await axios.get<{ data: Client }>(`/clients/${clientId}`)
      return data.data
    },
    enabled: !!clientId,
  })

  const handleClientSubmit = async (clientData: CreateClientRequest) => {
    // Prevent duplicate submissions
    if (isSubmittingRef.current) {
      return
    }

    isSubmittingRef.current = true
    try {
      await axios.put(`/clients/${clientId}`, clientData)
      toast.success('تم تحديث بيانات العميل بنجاح ✅')
      
      // Invalidate all client-related queries to ensure updates are reflected everywhere
      queryClient.invalidateQueries({ queryKey: ['clients'] }) // Invalidate paginated queries
      queryClient.invalidateQueries({ queryKey: ['form-data', 'clients'] }) // Invalidate form data cache
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) }) // Invalidate client detail
      // Force refetch of ALL queries (not just active) to immediately update the UI for all users
      queryClient.refetchQueries({ queryKey: ['clients'], type: 'all' })
      queryClient.refetchQueries({ queryKey: ['form-data', 'clients'], type: 'all' })
      // Refetch the current client detail
      refetchClient()
      
      router.push(`/clients/${clientId}`)
    } catch (error: unknown) {
      const errorMessage = 
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(errorMessage || 'حدث خطأ أثناء تحديث بيانات العميل')
      console.error('Error updating client:', error)
      isSubmittingRef.current = false
    }
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto p-6'>
          <Skeleton className='h-10 w-64 mb-4' />
          <Skeleton className='h-96 w-full' />
        </div>
      </div>
    )
  }

  if (isError || !client) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto p-6'>
          <div className='text-red-600 text-center py-10 font-semibold'>
            حدث خطأ أثناء تحميل بيانات العميل
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto p-6'>
        {/* Header */}
        <div className='mb-6'>
          <Button
            variant='ghost'
            onClick={() => router.push(`/clients/${clientId}`)}
            className='mb-4'
          >
            <ArrowRight className='w-4 h-4 ml-2' />
            العودة إلى تفاصيل العميل
          </Button>
          <h1 className='text-3xl font-bold text-gray-900'>تعديل بيانات العميل</h1>
          <p className='text-gray-600 mt-2'>قم بتعديل بيانات العميل</p>
        </div>

        {/* Form */}
        <ClientForm 
          initialData={client} 
          onSubmit={handleClientSubmit} 
          isLoading={false} 
        />
      </div>
    </div>
  )
}

