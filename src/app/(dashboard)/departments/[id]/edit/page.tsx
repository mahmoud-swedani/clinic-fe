'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import axios from '@/lib/axios'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DepartmentForm from '@/components/departments/departments-form'

export default function EditDepartmentPage() {
  const params = useParams()
  const [department, setDepartment] = useState<{
    _id?: string
    name: string
    description?: string
    branch: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDepartment = async () => {
      try {
        const res = await axios.get(`/departments/${params.id}`)
        // The API returns { success: true, data: <department> }
        const departmentData = res.data?.data || res.data
        
        if (departmentData) {
          // Extract branch ID if it's an object
          const branchId = typeof departmentData.branch === 'object' && departmentData.branch !== null
            ? departmentData.branch._id
            : departmentData.branch
          
          setDepartment({
            _id: departmentData._id || params.id as string,
            name: departmentData.name || '',
            description: departmentData.description || '',
            branch: branchId || '',
          })
        }
      } catch (error: unknown) {
        console.error('Error fetching department:', error)
        const errorMessage = 
          (error && typeof error === 'object' && 'response' in error && 
           error.response && typeof error.response === 'object' && 'data' in error.response &&
           error.response.data && typeof error.response.data === 'object' &&
           ('error' in error.response.data || 'message' in error.response.data))
            ? (error.response.data as { error?: string; message?: string }).error || 
              (error.response.data as { error?: string; message?: string }).message || 
              'فشل في تحميل بيانات القسم'
            : 'فشل في تحميل بيانات القسم'
        toast.error(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) fetchDepartment()
  }, [params.id])

  if (loading) return <p className='p-4'>جاري التحميل...</p>

  if (!department)
    return <p className='text-center p-4 text-red-600'>القسم غير موجود</p>

  return (
    <div className='p-4 max-w-3xl mx-auto'>
      <Card>
        <CardHeader>
          <CardTitle>تعديل القسم</CardTitle>
        </CardHeader>
        <CardContent>
          <DepartmentForm department={department} />
        </CardContent>
      </Card>
    </div>
  )
}
