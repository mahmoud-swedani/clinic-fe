// src/components/clients/client-immunizations.tsx
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
import { useClientImmunizations, useCreateClientImmunization, useUpdateClientImmunization, useDeleteClientImmunization } from '@/hooks/useClientImmunizations'
import { ClientImmunization } from '@/types/api'
import { Skeleton } from '@/components/ui/skeleton'
import moment from 'moment'

moment.locale('ar')

interface ClientImmunizationsProps {
  clientId: string
}

export function ClientImmunizations({ clientId }: ClientImmunizationsProps) {
  const [openDialog, setOpenDialog] = useState(false)
  const [editingImmunization, setEditingImmunization] = useState<ClientImmunization | null>(null)
  const [formData, setFormData] = useState({
    vaccineName: '',
    date: '',
    batchNumber: '',
    nextDueDate: '',
    notes: '',
  })

  const { data, isLoading } = useClientImmunizations(clientId)
  const createMutation = useCreateClientImmunization()
  const updateMutation = useUpdateClientImmunization()
  const deleteMutation = useDeleteClientImmunization()

  const immunizations = data?.data || []

  const handleOpenDialog = (immunization?: ClientImmunization) => {
    if (immunization) {
      setEditingImmunization(immunization)
      setFormData({
        vaccineName: immunization.vaccineName || '',
        date: immunization.date ? moment(immunization.date).format('YYYY-MM-DD') : '',
        batchNumber: immunization.batchNumber || '',
        nextDueDate: immunization.nextDueDate ? moment(immunization.nextDueDate).format('YYYY-MM-DD') : '',
        notes: immunization.notes || '',
      })
    } else {
      setEditingImmunization(null)
      setFormData({
        vaccineName: '',
        date: '',
        batchNumber: '',
        nextDueDate: '',
        notes: '',
      })
    }
    setOpenDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.vaccineName || !formData.date) {
      return
    }

    const immunizationData = {
      ...formData,
      nextDueDate: formData.nextDueDate || undefined,
    }

    if (editingImmunization) {
      await updateMutation.mutateAsync({
        id: editingImmunization._id,
        immunizationData,
      })
    } else {
      await createMutation.mutateAsync({
        clientId,
        immunizationData,
      })
    }

    setOpenDialog(false)
    setEditingImmunization(null)
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
          <CardTitle>سجلات التطعيمات</CardTitle>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button size='sm' onClick={() => handleOpenDialog()}>
                <Plus className='w-4 h-4 mr-1' />
                إضافة تطعيم
              </Button>
            </DialogTrigger>
            <DialogContent className='max-w-2xl' dir='rtl'>
              <DialogHeader>
                <DialogTitle>
                  {editingImmunization ? 'تعديل سجل التطعيم' : 'إضافة سجل تطعيم جديد'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className='space-y-4'>
                <div>
                  <Label htmlFor='vaccineName'>اسم اللقاح *</Label>
                  <Input
                    id='vaccineName'
                    value={formData.vaccineName}
                    onChange={(e) => setFormData({ ...formData, vaccineName: e.target.value })}
                    required
                  />
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label htmlFor='date'>تاريخ التطعيم *</Label>
                    <Input
                      id='date'
                      type='date'
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor='batchNumber'>رقم الدفعة</Label>
                    <Input
                      id='batchNumber'
                      value={formData.batchNumber}
                      onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor='nextDueDate'>تاريخ الجرعة القادمة</Label>
                  <Input
                    id='nextDueDate'
                    type='date'
                    value={formData.nextDueDate}
                    onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
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
                    {editingImmunization ? 'تحديث' : 'إضافة'}
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
        ) : immunizations.length > 0 ? (
          <div className='space-y-3'>
            {immunizations.map((immunization) => (
              <div
                key={immunization._id}
                className='border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors'
              >
                <div className='flex justify-between items-start'>
                  <div className='flex-1'>
                    <h4 className='font-semibold text-lg'>{immunization.vaccineName}</h4>
                    <div className='grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600'>
                      <p>التاريخ: {moment(immunization.date).format('YYYY-MM-DD')}</p>
                      {immunization.batchNumber && <p>رقم الدفعة: {immunization.batchNumber}</p>}
                      {immunization.nextDueDate && (
                        <p>الجرعة القادمة: {moment(immunization.nextDueDate).format('YYYY-MM-DD')}</p>
                      )}
                    </div>
                    {immunization.notes && (
                      <p className='text-sm text-gray-500 mt-1'>ملاحظات: {immunization.notes}</p>
                    )}
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleOpenDialog(immunization)}
                    >
                      <Pencil className='w-4 h-4' />
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleDelete(immunization._id)}
                    >
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className='text-center text-gray-500 py-8'>لا توجد سجلات تطعيمات</p>
        )}
      </CardContent>
    </Card>
  )
}

