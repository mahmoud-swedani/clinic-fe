// src/components/clients/client-test-results.tsx
'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useClientTestResults, useCreateClientTestResult, useUpdateClientTestResult, useDeleteClientTestResult } from '@/hooks/useClientTestResults'
import { ClientTestResult } from '@/types/api'
import { Skeleton } from '@/components/ui/skeleton'
import moment from 'moment'

moment.locale('ar')

interface ClientTestResultsProps {
  clientId: string
}

export function ClientTestResults({ clientId }: ClientTestResultsProps) {
  const [openDialog, setOpenDialog] = useState(false)
  const [editingTestResult, setEditingTestResult] = useState<ClientTestResult | null>(null)
  const [formData, setFormData] = useState({
    testName: '',
    testDate: '',
    results: '',
    doctor: '',
    notes: '',
  })

  const { data, isLoading } = useClientTestResults(clientId)
  const createMutation = useCreateClientTestResult()
  const updateMutation = useUpdateClientTestResult()
  const deleteMutation = useDeleteClientTestResult()

  const testResults = data?.data || []

  const handleOpenDialog = (testResult?: ClientTestResult) => {
    if (testResult) {
      setEditingTestResult(testResult)
      setFormData({
        testName: testResult.testName || '',
        testDate: testResult.testDate ? moment(testResult.testDate).format('YYYY-MM-DD') : '',
        results: testResult.results || '',
        doctor: typeof testResult.doctor === 'object' && testResult.doctor !== null
          ? testResult.doctor._id
          : testResult.doctor || '',
        notes: testResult.notes || '',
      })
    } else {
      setEditingTestResult(null)
      setFormData({
        testName: '',
        testDate: '',
        results: '',
        doctor: '',
        notes: '',
      })
    }
    setOpenDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.testName || !formData.testDate || !formData.results) {
      return
    }

    const testResultData = {
      ...formData,
      doctor: formData.doctor || undefined,
    }

    if (editingTestResult) {
      await updateMutation.mutateAsync({
        id: editingTestResult._id,
        testResultData,
      })
    } else {
      await createMutation.mutateAsync({
        clientId,
        testResultData,
      })
    }

    setOpenDialog(false)
    setEditingTestResult(null)
  }

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex justify-between items-center'>
          <CardTitle>نتائج الفحوصات</CardTitle>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button size='sm' onClick={() => handleOpenDialog()}>
                <Plus className='w-4 h-4 mr-1' />
                إضافة نتيجة فحص
              </Button>
            </DialogTrigger>
            <DialogContent className='max-w-2xl' dir='rtl'>
              <DialogHeader>
                <DialogTitle>
                  {editingTestResult ? 'تعديل نتيجة الفحص' : 'إضافة نتيجة فحص جديدة'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className='space-y-4'>
                <div>
                  <Label htmlFor='testName'>اسم الفحص *</Label>
                  <Input
                    id='testName'
                    value={formData.testName}
                    onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                    required
                  />
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label htmlFor='testDate'>تاريخ الفحص *</Label>
                    <Input
                      id='testDate'
                      type='date'
                      value={formData.testDate}
                      onChange={(e) => setFormData({ ...formData, testDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor='doctor'>الطبيب</Label>
                    <Input
                      id='doctor'
                      value={formData.doctor}
                      onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                      placeholder='معرف الطبيب'
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor='results'>النتائج *</Label>
                  <Textarea
                    id='results'
                    value={formData.results}
                    onChange={(e) => setFormData({ ...formData, results: e.target.value })}
                    rows={4}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor='notes'>ملاحظات</Label>
                  <Textarea
                    id='notes'
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className='flex justify-end gap-2'>
                  <Button type='button' variant='outline' onClick={() => setOpenDialog(false)}>
                    إلغاء
                  </Button>
                  <Button type='submit' disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingTestResult ? 'تحديث' : 'إضافة'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='space-y-3'>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className='h-20 w-full' />
            ))}
          </div>
        ) : testResults.length > 0 ? (
          <div className='space-y-3'>
            {testResults.map((testResult) => (
              <div
                key={testResult._id}
                className='border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors'
              >
                <div className='flex justify-between items-start'>
                  <div className='flex-1'>
                    <h4 className='font-semibold text-lg'>{testResult.testName}</h4>
                    <div className='grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600'>
                      <p>التاريخ: {moment(testResult.testDate).format('YYYY-MM-DD')}</p>
                      {testResult.doctor && (
                        <p>
                          الطبيب:{' '}
                          {typeof testResult.doctor === 'object' && testResult.doctor !== null
                            ? testResult.doctor.name
                            : testResult.doctor}
                        </p>
                      )}
                    </div>
                    <div className='mt-2'>
                      <p className='text-sm font-medium text-gray-700'>النتائج:</p>
                      <p className='text-sm text-gray-600 whitespace-pre-wrap'>{testResult.results}</p>
                    </div>
                    {testResult.notes && (
                      <p className='text-sm text-gray-500 mt-1'>ملاحظات: {testResult.notes}</p>
                    )}
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleOpenDialog(testResult)}
                    >
                      <Pencil className='w-4 h-4' />
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleDelete(testResult._id)}
                    >
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className='text-center text-gray-500 py-8'>لا توجد نتائج فحوصات</p>
        )}
      </CardContent>
    </Card>
  )
}

