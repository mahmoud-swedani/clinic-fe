'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'

interface Department {
  _id: string
  name: string
  description?: string
}

export default function DepartmentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [department, setDepartment] = useState<Department | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDepartment = async () => {
      try {
        const res = await axios.get(`/departments/${params.id}`)
        setDepartment(res.data)
      } catch {
        toast.error('فشل في تحميل بيانات القسم')
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
    <div className='max-w-3xl mx-auto p-4'>
      <Button
        variant='ghost'
        className='mb-4 flex items-center gap-2'
        onClick={() => router.push('/departments')}
      >
        <ChevronLeft size={20} />
        العودة للأقسام
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{department.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{department.description || 'لا يوجد وصف لهذا القسم.'}</p>
        </CardContent>
      </Card>
    </div>
  )
}
