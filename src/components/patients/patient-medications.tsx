// src/components/patients/patient-medications.tsx
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
import { usePatientMedications, useCreatePatientMedication, useUpdatePatientMedication, useDeletePatientMedication } from '@/hooks/usePatientMedications'
import { PatientMedication } from '@/types/api'
import { Skeleton } from '@/components/ui/skeleton'
import moment from 'moment'

moment.locale('ar')

interface PatientMedicationsProps {
  patientId: string
}

export function PatientMedications({ patientId }: PatientMedicationsProps) {
  const [openDialog, setOpenDialog] = useState(false)
  const [editingMedication, setEditingMedication] = useState<PatientMedication | null>(null)
  const [formData, setFormData] = useState({
    medicationName: '',
    dosage: '',
    frequency: '',
    startDate: '',
    endDate: '',
    results: '',
    notes: '',
  })

  const { data, isLoading } = usePatientMedications(patientId)
  const createMutation = useCreatePatientMedication()
  const updateMutation = useUpdatePatientMedication()
  const deleteMutation = useDeletePatientMedication()

  const medications = data?.data || []

  const handleOpenDialog = (medication?: PatientMedication) => {
    if (medication) {
      setEditingMedication(medication)
      setFormData({
        medicationName: medication.medicationName || '',
        dosage: medication.dosage || '',
        frequency: medication.frequency || '',
        startDate: medication.startDate ? moment(medication.startDate).format('YYYY-MM-DD') : '',
        endDate: medication.endDate ? moment(medication.endDate).format('YYYY-MM-DD') : '',
        results: medication.results || '',
        notes: medication.notes || '',
      })
    } else {
      setEditingMedication(null)
      setFormData({
        medicationName: '',
        dosage: '',
        frequency: '',
        startDate: '',
        endDate: '',
        results: '',
        notes: '',
      })
    }
    setOpenDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.medicationName) {
      return
    }

    const medicationData = {
      ...formData,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
    }

    if (editingMedication) {
      await updateMutation.mutateAsync({
        id: editingMedication._id,
        medicationData,
      })
    } else {
      await createMutation.mutateAsync({
        patientId,
        medicationData,
      })
    }

    setOpenDialog(false)
    setEditingMedication(null)
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
          <CardTitle>سجلات الأدوية والعلاجات</CardTitle>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button size='sm' onClick={() => handleOpenDialog()}>
                <Plus className='w-4 h-4 mr-1' />
                إضافة دواء
              </Button>
            </DialogTrigger>
            <DialogContent className='max-w-2xl' dir='rtl'>
              <DialogHeader>
                <DialogTitle>
                  {editingMedication ? 'تعديل سجل الدواء' : 'إضافة سجل دواء جديد'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className='space-y-4'>
                <div>
                  <Label htmlFor='medicationName'>اسم الدواء *</Label>
                  <Input
                    id='medicationName'
                    value={formData.medicationName}
                    onChange={(e) => setFormData({ ...formData, medicationName: e.target.value })}
                    required
                  />
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label htmlFor='dosage'>الجرعة</Label>
                    <Input
                      id='dosage'
                      value={formData.dosage}
                      onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor='frequency'>التكرار</Label>
                    <Input
                      id='frequency'
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    />
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label htmlFor='startDate'>تاريخ البدء</Label>
                    <Input
                      id='startDate'
                      type='date'
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor='endDate'>تاريخ الانتهاء</Label>
                    <Input
                      id='endDate'
                      type='date'
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor='results'>النتائج</Label>
                  <Textarea
                    id='results'
                    value={formData.results}
                    onChange={(e) => setFormData({ ...formData, results: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor='notes'>ملاحظات</Label>
                  <Textarea
                    id='notes'
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className='flex justify-end gap-2'>
                  <Button type='button' variant='outline' onClick={() => setOpenDialog(false)}>
                    إلغاء
                  </Button>
                  <Button type='submit' disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingMedication ? 'تحديث' : 'إضافة'}
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
        ) : medications.length > 0 ? (
          <div className='space-y-3'>
            {medications.map((medication) => (
              <div
                key={medication._id}
                className='border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors'
              >
                <div className='flex justify-between items-start'>
                  <div className='flex-1'>
                    <h4 className='font-semibold text-lg'>{medication.medicationName}</h4>
                    <div className='grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600'>
                      {medication.dosage && <p>الجرعة: {medication.dosage}</p>}
                      {medication.frequency && <p>التكرار: {medication.frequency}</p>}
                      {medication.startDate && (
                        <p>تاريخ البدء: {moment(medication.startDate).format('YYYY-MM-DD')}</p>
                      )}
                      {medication.endDate && (
                        <p>تاريخ الانتهاء: {moment(medication.endDate).format('YYYY-MM-DD')}</p>
                      )}
                    </div>
                    {medication.results && (
                      <p className='text-sm text-gray-700 mt-2'>النتائج: {medication.results}</p>
                    )}
                    {medication.notes && (
                      <p className='text-sm text-gray-500 mt-1'>ملاحظات: {medication.notes}</p>
                    )}
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleOpenDialog(medication)}
                    >
                      <Pencil className='w-4 h-4' />
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleDelete(medication._id)}
                    >
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className='text-center text-gray-500 py-8'>لا توجد سجلات أدوية</p>
        )}
      </CardContent>
    </Card>
  )
}

