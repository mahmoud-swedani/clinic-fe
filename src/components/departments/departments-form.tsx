'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import axios from '@/lib/axios'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

interface Branch {
  _id: string
  name: string
}

interface DepartmentFormProps {
  department?: {
    _id?: string
    name: string
    description?: string
    branch: string
  }
  onSuccess?: () => void
}

export default function DepartmentForm({
  department,
  onSuccess,
}: DepartmentFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [formData, setFormData] = useState({
    name: department?.name || '',
    description: department?.description || '',
    branch: department?.branch || '',
  })

  // Update form data when department prop changes (for edit mode)
  useEffect(() => {
    if (department) {
      // Extract branch ID if it's an object
      const branchId = typeof department.branch === 'object' && department.branch !== null
        ? (department.branch as Branch)._id
        : department.branch
      
      setFormData({
        name: department.name || '',
        description: department.description || '',
        branch: branchId || '',
      })
    }
  }, [department])

  // جلب قائمة الفروع من API عند تحميل المكون
  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await axios.get('/branches')
        // The API returns { success: true, data: Branch[], pagination: {...} }
        const branchesData = res.data?.data || res.data || []
        setBranches(Array.isArray(branchesData) ? branchesData : [])
      } catch (error) {
        console.error('Error fetching branches:', error)
        toast.error('تعذر جلب قائمة الفروع')
      }
    }
    fetchBranches()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (department && department._id) {
        // تعديل القسم
        await axios.put(`/departments/${department._id}`, formData)
        toast.success('تم تعديل القسم بنجاح')
      } else {
        // إضافة قسم جديد
        await axios.post('/departments', formData)
        toast.success('تم إضافة القسم بنجاح')
      }
      
      // Invalidate and refetch all departments queries to show the new/updated department immediately
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.all })
      queryClient.refetchQueries({ queryKey: queryKeys.departments.all })
      
      if (onSuccess) onSuccess()
      else router.push('/departments')
    } catch {
      toast.error('حدث خطأ أثناء العملية')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6 max-w-xl mx-auto'>
      <div>
        <Label htmlFor='name'>اسم القسم</Label>
        <Input
          id='name'
          name='name'
          value={formData.name}
          onChange={handleChange}
          required
          disabled={!!department} // تعطيل تعديل الاسم لو تريد
        />
      </div>

      <div>
        <Label htmlFor='description'>الوصف</Label>
        <Textarea
          id='description'
          name='description'
          value={formData.description}
          onChange={handleChange}
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor='branch'>الفرع</Label>
        <select
          id='branch'
          name='branch'
          value={formData.branch}
          onChange={handleChange}
          required
          disabled={!!department} // تعطيل تعديل الفرع لو تريد
          className='w-full rounded-md border border-gray-300 px-3 py-2'
        >
          <option value='' disabled>
            اختر الفرع
          </option>
          {Array.isArray(branches) && branches.map((branch) => (
            <option key={branch._id} value={branch._id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      <div className='flex justify-end'>
        <Button type='submit' disabled={loading}>
          {loading
            ? department
              ? 'جارٍ التعديل...'
              : 'جارٍ الإضافة...'
            : department
            ? 'تعديل القسم'
            : 'إضافة القسم'}
        </Button>
      </div>
    </form>
  )
}
