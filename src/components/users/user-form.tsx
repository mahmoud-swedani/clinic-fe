'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

import { useBranches } from '@/hooks/useBranches'
import { useAllRoles } from '@/hooks/useRoles'
import { cn } from '@/lib/utils'
import { PaginatedResponse } from '@/types/api'

type Branch = {
  _id: string
  name: string
}

type UserFormData = {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: string
  branch: string
  isActive: boolean
}

type Props = {
  initialData?: Partial<UserFormData>
  onSubmit: (data: Partial<UserFormData>) => void
  isLoading?: boolean
}

export function UsersForm({ initialData, onSubmit, isLoading }: Props) {
  const router = useRouter()
  const { data: branchesResponse } = useBranches()
  const { data: roles, isLoading: rolesLoading, error: rolesError } = useAllRoles()
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Extract branches array from paginated response
  const typedBranchesResponse = branchesResponse as PaginatedResponse<Branch> | undefined
  const branches = typedBranchesResponse?.data || []

  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    branch: '',
    isActive: true,
    ...initialData,
  })

  const isEditing = Boolean(initialData)

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        password: '',
        confirmPassword: '',
      }))
    }
  }, [initialData])

  const handleConfirm = () => {
    let dataToSend: Partial<UserFormData>

    if (isEditing) {
      // Omit password fields when editing
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, confirmPassword, ...rest } = formData
      dataToSend = rest
    } else {
      dataToSend = { ...formData }
    }

    onSubmit(dataToSend)
    toast.success(
      isEditing ? 'تم تحديث المستخدم بنجاح ✅' : 'تم إنشاء المستخدم بنجاح ✅'
    )
    setConfirmOpen(false)
    router.push('/users')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!isEditing && formData.password !== formData.confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين')
      return
    }

    if (!isEditing) {
      setConfirmOpen(true)
    } else {
      handleConfirm()
    }
  }

  return (
    <>
      <div className='flex justify-between items-center mb-4'>
        <button
          type='button'
          onClick={() => router.push('/users')}
          className={cn(
            'flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition'
          )}
        >
          <ArrowLeft className='w-4 h-4' />
          الرجوع إلى قائمة المستخدمين
        </button>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* الاسم */}
        <div>
          <Label>الاسم</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        {/* البريد الإلكتروني */}
        <div>
          <Label>البريد الإلكتروني</Label>
          <Input
            type='email'
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />
        </div>

        {/* كلمة المرور */}
        {!isEditing && (
          <>
            <div>
              <Label>كلمة المرور</Label>
              <Input
                type='password'
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label>تأكيد كلمة المرور</Label>
              <Input
                type='password'
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmPassword: e.target.value,
                  })
                }
                required
              />
            </div>
          </>
        )}

        {/* الدور */}
        <div>
          <Label>الدور</Label>
          {rolesLoading ? (
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder='جار تحميل الأدوار...' />
              </SelectTrigger>
            </Select>
          ) : rolesError ? (
            <div className='text-sm text-red-600'>
              فشل في تحميل الأدوار. يرجى تحديث الصفحة.
            </div>
          ) : !roles || roles.length === 0 ? (
            <div className='text-sm text-yellow-600'>
              لا توجد أدوار متاحة. يرجى إنشاء أدوار أولاً.
            </div>
          ) : (
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder='اختر الدور' />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role._id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* الفرع */}
        <div>
          <Label>الفرع</Label>
          <Select
            value={formData.branch}
            onValueChange={(value) =>
              setFormData({ ...formData, branch: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder='اختر الفرع' />
            </SelectTrigger>
            <SelectContent>
              {branches && branches.length > 0 ? (
                branches.map((branch: Branch) => (
                  <SelectItem key={branch._id} value={branch._id}>
                    {branch.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value='empty-branch' disabled>
                  لا توجد فروع متاحة
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* الحالة (نشط أم لا) */}
        <div className='flex items-center space-x-2 rtl:space-x-reverse'>
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, isActive: checked })
            }
            id='isActive'
          />
          <Label htmlFor='isActive'>الحساب نشط</Label>
        </div>

        {/* زر الإرسال */}
        <Button type='submit' disabled={isLoading}>
          {isEditing ? 'تحديث المستخدم' : 'إنشاء المستخدم'}
        </Button>
      </form>

      {/* نافذة التأكيد */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد إنشاء المستخدم</DialogTitle>
            <DialogDescription>
              هل أنت متأكد أنك تريد إنشاء هذا المستخدم؟
            </DialogDescription>
          </DialogHeader>
          <p>هل أنت متأكد أنك تريد إنشاء هذا المستخدم؟</p>
          <DialogFooter>
            <Button variant='outline' onClick={() => setConfirmOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleConfirm}>تأكيد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
