'use client'

import { useRouter, useParams } from 'next/navigation'
import { PatientForm } from '@/components/patients/patient-form'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import axios from '@/lib/axios'
import { CreatePatientRequest } from '@/types/api'
import { useQuery } from '@tanstack/react-query'
import { Patient } from '@/types/api'
import { Skeleton } from '@/components/ui/skeleton'
import { useRef } from 'react'

export default function EditPatientPage() {
  const router = useRouter()
  const params = useParams()
  const patientId = params.id as string
  const isSubmittingRef = useRef(false)

  // Fetch patient data
  const { data: patient, isLoading, isError } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const { data } = await axios.get<{ data: Patient }>(`/patients/${patientId}`)
      return data.data
    },
    enabled: !!patientId,
  })

  const handlePatientSubmit = async (patientData: CreatePatientRequest) => {
    // Prevent duplicate submissions
    if (isSubmittingRef.current) {
      return
    }

    isSubmittingRef.current = true
    try {
      await axios.put(`/patients/${patientId}`, patientData)
      toast.success('تم تحديث بيانات المريض بنجاح ✅')
      router.push(`/patients/${patientId}`)
    } catch (error: unknown) {
      const errorMessage = 
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(errorMessage || 'حدث خطأ أثناء تحديث بيانات المريض')
      console.error('Error updating patient:', error)
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

  if (isError || !patient) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto p-6'>
          <div className='text-red-600 text-center py-10 font-semibold'>
            حدث خطأ أثناء تحميل بيانات المريض
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
            onClick={() => router.push(`/patients/${patientId}`)}
            className='mb-4'
          >
            <ArrowRight className='w-4 h-4 ml-2' />
            العودة إلى تفاصيل المريض
          </Button>
          <h1 className='text-3xl font-bold text-gray-900'>تعديل بيانات المريض</h1>
          <p className='text-gray-600 mt-2'>قم بتعديل بيانات المريض</p>
        </div>

        {/* Form */}
        <PatientForm 
          initialData={patient} 
          onSubmit={handlePatientSubmit} 
          isLoading={false} 
        />
      </div>
    </div>
  )
}

