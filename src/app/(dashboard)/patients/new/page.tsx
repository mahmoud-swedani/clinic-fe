'use client'

import { useRouter } from 'next/navigation'
import { PatientForm } from '@/components/patients/patient-form'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import axios from '@/lib/axios'
import { CreatePatientRequest } from '@/types/api'
import { useRef } from 'react'

export default function NewPatientPage() {
  const router = useRouter()
  const isSubmittingRef = useRef(false)

  const handlePatientSubmit = async (patientData: CreatePatientRequest) => {
    // Prevent duplicate submissions
    if (isSubmittingRef.current) {
      return
    }

    isSubmittingRef.current = true
    try {
      await axios.post('/patients', patientData)
      toast.success('تم إضافة المريض بنجاح ✅')
      router.push('/patients')
    } catch (error: unknown) {
      const errorMessage = 
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(errorMessage || 'حدث خطأ أثناء إضافة المريض')
      console.error('Error creating patient:', error)
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
            onClick={() => router.push('/patients')}
            className='mb-4'
          >
            <ArrowRight className='w-4 h-4 ml-2' />
            العودة إلى قائمة المرضى
          </Button>
          <h1 className='text-3xl font-bold text-gray-900'>إضافة مريض جديد</h1>
          <p className='text-gray-600 mt-2'>قم بملء البيانات لإضافة مريض جديد إلى النظام</p>
        </div>

        {/* Form */}
        <PatientForm onSubmit={handlePatientSubmit} isLoading={false} />
      </div>
    </div>
  )
}

