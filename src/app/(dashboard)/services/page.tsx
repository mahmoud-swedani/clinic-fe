// src/app/(dashboard)/services/page.tsx
'use client'

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useServices, ServiceFilters } from '@/hooks/useServices'
import { usePagination } from '@/hooks/usePagination'
import { useDepartments } from '@/hooks/useDepartments'
import { Pagination } from '@/components/ui/Pagination'
import { Service, Department } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserPermissions } from '@/hooks/usePermissions'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, X, Filter, Edit, Trash2 } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

function ServicesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { page, limit, goToPage, changeLimit } = usePagination(10)
  const { canManageServices } = useUserPermissions()
  const { data: departmentsData } = useDepartments()
  const departments = useMemo(() => departmentsData?.data || [], [departmentsData?.data])

  // Helper function to parse filters from URL
  const parseFiltersFromURL = useCallback((): ServiceFilters => {
    const search = searchParams.get('search') || undefined
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined
    const minDuration = searchParams.get('minDuration') ? Number(searchParams.get('minDuration')) : undefined
    const maxDuration = searchParams.get('maxDuration') ? Number(searchParams.get('maxDuration')) : undefined
    const isActive = searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined
    const requiresConsultation = searchParams.get('requiresConsultation') ? searchParams.get('requiresConsultation') === 'true' : undefined
    const departmentId = searchParams.get('departmentId') || undefined

    return {
      search,
      minPrice,
      maxPrice,
      minDuration,
      maxDuration,
      isActive,
      requiresConsultation,
      departmentId,
    }
  }, [searchParams])

  // Filter state from URL params - parse on initial mount
  const getInitialFilters = (): ServiceFilters => {
    const search = searchParams.get('search') || undefined
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined
    const minDuration = searchParams.get('minDuration') ? Number(searchParams.get('minDuration')) : undefined
    const maxDuration = searchParams.get('maxDuration') ? Number(searchParams.get('maxDuration')) : undefined
    const isActive = searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined
    const requiresConsultation = searchParams.get('requiresConsultation') ? searchParams.get('requiresConsultation') === 'true' : undefined
    const departmentId = searchParams.get('departmentId') || undefined

    return {
      search,
      minPrice,
      maxPrice,
      minDuration,
      maxDuration,
      isActive,
      requiresConsultation,
      departmentId,
    }
  }

  const [filters, setFilters] = useState<ServiceFilters>(getInitialFilters)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState<ServiceFilters>(getInitialFilters)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null)
  const queryClient = useQueryClient()

  // Update URL params when filters change
  const updateFilters = useCallback((newFilters: ServiceFilters) => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Remove all filter params first
    params.delete('search')
    params.delete('minPrice')
    params.delete('maxPrice')
    params.delete('minDuration')
    params.delete('maxDuration')
    params.delete('isActive')
    params.delete('requiresConsultation')
    params.delete('departmentId')
    
    // Add new filter params
    if (newFilters.search) params.set('search', newFilters.search)
    if (newFilters.minPrice !== undefined && newFilters.minPrice !== null) {
      params.set('minPrice', String(newFilters.minPrice))
    }
    if (newFilters.maxPrice !== undefined && newFilters.maxPrice !== null) {
      params.set('maxPrice', String(newFilters.maxPrice))
    }
    if (newFilters.minDuration !== undefined && newFilters.minDuration !== null) {
      params.set('minDuration', String(newFilters.minDuration))
    }
    if (newFilters.maxDuration !== undefined && newFilters.maxDuration !== null) {
      params.set('maxDuration', String(newFilters.maxDuration))
    }
    if (newFilters.isActive !== undefined && newFilters.isActive !== null) {
      params.set('isActive', String(newFilters.isActive))
    }
    if (newFilters.requiresConsultation !== undefined && newFilters.requiresConsultation !== null) {
      params.set('requiresConsultation', String(newFilters.requiresConsultation))
    }
    if (newFilters.departmentId) params.set('departmentId', newFilters.departmentId)
    
    // Reset to page 1 when filters change
    params.set('page', '1')
    
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  // Sync filters from URL on mount/change (but only if URL actually changed)
  useEffect(() => {
    const urlFilters = parseFiltersFromURL()
    setFilters((prevFilters) => {
      const prevFiltersStr = JSON.stringify(prevFilters)
      const urlFiltersStr = JSON.stringify(urlFilters)
      
      // Only update if filters actually changed (avoid unnecessary updates)
      if (prevFiltersStr !== urlFiltersStr) {
        setDraftFilters(urlFilters)
        return urlFilters
      }
      return prevFilters
    })
  }, [searchParams, parseFiltersFromURL])

  const { data: servicesResponse, isLoading } = useServices()
  const servicesData = useMemo(() => servicesResponse?.data || [], [servicesResponse?.data])

  const getDepartmentId = useCallback((service: Service): string | undefined => {
    if (typeof service.departmentId === 'object' && service.departmentId !== null) {
      const dept = service.departmentId as Department
      return dept._id || dept.id || undefined
    }
    if (typeof service.departmentId === 'string') {
      return service.departmentId
    }
    return undefined
  }, [])

  const getDepartmentName = useCallback(
    (service: Service): string => {
      if (typeof service.departmentId === 'object' && service.departmentId !== null) {
        return ((service.departmentId as Department).name as string) || 'غير معروف'
      }
      if (typeof service.departmentId === 'string' && departments.length > 0) {
        const dept = departments.find((d) => d._id === service.departmentId)
        return dept?.name || 'غير معروف'
      }
      return 'غير معروف'
    },
    [departments]
  )

  const filteredServices = useMemo(() => {
    return servicesData.filter((service) => {
      if (filters.search) {
        const query = filters.search.toLowerCase().trim()
        const text = `${service.name ?? ''} ${service.description ?? ''}`.toLowerCase()
        if (!text.includes(query)) {
          return false
        }
      }

      if (filters.departmentId) {
        if (getDepartmentId(service) !== filters.departmentId) {
          return false
        }
      }

      if (filters.minPrice !== undefined) {
        if (service.price === undefined || service.price < filters.minPrice) {
          return false
        }
      }
      if (filters.maxPrice !== undefined) {
        if (service.price === undefined || service.price > filters.maxPrice) {
          return false
        }
      }

      if (filters.minDuration !== undefined) {
        if (service.duration === undefined || service.duration < filters.minDuration) {
          return false
        }
      }
      if (filters.maxDuration !== undefined) {
        if (service.duration === undefined || service.duration > filters.maxDuration) {
          return false
        }
      }

      if (filters.isActive !== undefined && service.isActive !== filters.isActive) {
        return false
      }

      if (
        filters.requiresConsultation !== undefined &&
        service.requiresConsultation !== filters.requiresConsultation
      ) {
        return false
      }

      return true
    })
  }, [servicesData, filters, getDepartmentId])

  const totalFiltered = filteredServices.length
  const totalPages = Math.ceil(totalFiltered / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedServices = filteredServices.slice(startIndex, endIndex)

  const paginationMeta = {
    page,
    limit,
    total: totalFiltered,
    totalPages,
  }

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      await axios.delete(`/services/${serviceId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast.success('تم حذف الخدمة بنجاح')
      setDeleteDialogOpen(false)
      setServiceToDelete(null)
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { message?: string } } }
      toast.error(axiosError.response?.data?.message || 'فشل في حذف الخدمة')
    },
  })

  const handleDeleteClick = (service: Service) => {
    setServiceToDelete(service)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (serviceToDelete) {
      deleteServiceMutation.mutate(serviceToDelete._id)
    }
  }

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.minDuration !== undefined ||
    filters.maxDuration !== undefined ||
    filters.isActive !== undefined ||
    filters.requiresConsultation !== undefined ||
    filters.departmentId
  )

  const clearFilters = () => {
    updateFilters({})
  }

  const handleApplyFilters = () => {
    updateFilters(draftFilters)
  }

  const hasDraftChanges = JSON.stringify(draftFilters) !== JSON.stringify(filters)

  useEffect(() => {
    if (isLoading) return
    if (paginationMeta.totalPages > 0 && page > paginationMeta.totalPages) {
      goToPage(paginationMeta.totalPages)
    } else if (paginationMeta.totalPages === 0 && page !== 1) {
      goToPage(1)
    }
  }, [isLoading, page, paginationMeta.totalPages, goToPage])

  return (
    <div className='p-4 space-y-4'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>الخدمات</h1>
        {canManageServices && (
          <Button asChild>
            <Link href='/services/new' aria-label='إضافة خدمة جديدة'>إضافة خدمة</Link>
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      <Card>
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle className='flex items-center gap-2'>
                <Filter className='w-5 h-5' />
              الفلاتر المتقدمة
              </CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant='outline' size='sm'>
                  {isFiltersOpen ? 'إخفاء الفلاتر' : 'إظهار الفلاتر'}
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className='space-y-4'>
              <p className='text-sm text-muted-foreground'>
                يمكنك التصفية حسب الاسم، القسم، الحالة، الاستشارة، السعر والمدة.
              </p>

              {/* Search and Quick Filters Row */}
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                {/* Search */}
                <div className='relative'>
                  <Search className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    type='text'
                    placeholder='ابحث بالاسم أو الوصف...'
                    value={draftFilters.search || ''}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        search: e.target.value || undefined,
                      }))
                    }
                    className='pr-10'
                  />
                </div>

                {/* Department */}
                <Select
                  value={draftFilters.departmentId || 'all'}
                  onValueChange={(value) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      departmentId: value === 'all' ? undefined : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='القسم' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>جميع الأقسام</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept._id} value={dept._id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status */}
                <Select
                  value={
                    draftFilters.isActive === undefined
                      ? 'all'
                      : draftFilters.isActive
                      ? 'active'
                      : 'inactive'
                  }
                  onValueChange={(value) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      isActive: value === 'all' ? undefined : value === 'active',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='الحالة' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>جميع الحالات</SelectItem>
                    <SelectItem value='active'>مفعّل</SelectItem>
                    <SelectItem value='inactive'>معطّل</SelectItem>
                  </SelectContent>
                </Select>

                {/* Requires Consultation */}
                <Select
                  value={
                    draftFilters.requiresConsultation === undefined
                      ? 'all'
                      : draftFilters.requiresConsultation
                      ? 'yes'
                      : 'no'
                  }
                  onValueChange={(value) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      requiresConsultation: value === 'all' ? undefined : value === 'yes',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='يتطلب استشارة' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>الكل</SelectItem>
                    <SelectItem value='yes'>نعم</SelectItem>
                    <SelectItem value='no'>لا</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='text-sm font-medium mb-2 block'>السعر الأدنى (ل.س)</label>
                  <Input
                    type='number'
                    placeholder='0'
                    value={draftFilters.minPrice ?? ''}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        minPrice: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    min={0}
                  />
                </div>
                <div>
                  <label className='text-sm font-medium mb-2 block'>السعر الأعلى (ل.س)</label>
                  <Input
                    type='number'
                    placeholder='لا يوجد حد'
                    value={draftFilters.maxPrice ?? ''}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        maxPrice: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    min={0}
                  />
                </div>
              </div>

              {/* Duration Range */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='text-sm font-medium mb-2 block'>المدة الأدنى (دقيقة)</label>
                  <Input
                    type='number'
                    placeholder='0'
                    value={draftFilters.minDuration ?? ''}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        minDuration: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    min={0}
                  />
                </div>
                <div>
                  <label className='text-sm font-medium mb-2 block'>المدة الأعلى (دقيقة)</label>
                  <Input
                    type='number'
                    placeholder='لا يوجد حد'
                    value={draftFilters.maxDuration ?? ''}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        maxDuration: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    min={0}
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='flex flex-wrap gap-2'>
                  {hasActiveFilters &&
                    Object.entries(filters).map(([key, value]) => {
                      if (value === undefined) return null
                      let label = ''
                      switch (key) {
                        case 'search':
                          label = `بحث: ${value}`
                          break
                        case 'departmentId': {
                          const deptName = departments.find((d) => d._id === value)?.name
                          label = `القسم: ${deptName || value}`
                          break
                        }
                        case 'isActive':
                          label = value ? 'الحالة: مفعّل' : 'الحالة: معطّل'
                          break
                        case 'requiresConsultation':
                          label = value ? 'يتطلب استشارة' : 'لا يتطلب استشارة'
                          break
                        case 'minPrice':
                          label = `السعر الأدنى: ${value} ل.س`
                          break
                        case 'maxPrice':
                          label = `السعر الأعلى: ${value} ل.س`
                          break
                        case 'minDuration':
                          label = `المدة الأدنى: ${value} دقيقة`
                          break
                        case 'maxDuration':
                          label = `المدة الأعلى: ${value} دقيقة`
                          break
                        default:
                          label = `${key}: ${value}`
                      }
                      return (
                        <span
                          key={key}
                          className='px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full'
                        >
                          {label}
                        </span>
                      )
                    })}
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='default'
                    onClick={handleApplyFilters}
                    disabled={!hasDraftChanges}
                  >
                    تطبيق الفلاتر
                  </Button>
                  {hasActiveFilters && (
                    <Button variant='outline' onClick={clearFilters} className='flex items-center gap-2'>
                      <X className='w-4 h-4' />
                      مسح جميع الفلاتر
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الخدمات</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='space-y-2'>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className='h-10 w-full' />
              ))}
            </div>
          ) : totalFiltered === 0 ? (
            <p className='text-center text-gray-500 py-8'>
              {hasActiveFilters ? 'لا توجد نتائج تطابق الفلاتر المحددة' : 'لا توجد خدمات حتى الآن'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='text-right'>اسم الخدمة</TableHead>
                  <TableHead className='text-right'>الوصف</TableHead>
                  <TableHead className='text-right'>القسم</TableHead>
                  <TableHead className='text-right'>السعر</TableHead>
                  <TableHead className='text-right'>المدة (دقيقة)</TableHead>
                  <TableHead className='text-right'>الحالة</TableHead>
                  <TableHead className='text-right'>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedServices.map((service: Service) => (
                  <TableRow key={service._id} className='hover:bg-gray-50 transition-colors'>
                    <TableCell>
                      <Link
                        href={`/services/${service._id}`}
                        className='text-blue-600 hover:underline font-medium'
                      >
                        {service.name}
                      </Link>
                    </TableCell>
                    <TableCell className='text-gray-600 max-w-xs truncate'>
                      {service.description || '-'}
                    </TableCell>
                    <TableCell>
                      {getDepartmentName(service)}
                    </TableCell>
                    <TableCell>
                      {service.price?.toLocaleString() || '0'} ل.س
                    </TableCell>
                    <TableCell>{service.duration || '-'}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          service.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {service.isActive ? 'مفعّل' : 'معطّل'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2 justify-end'>
                        {canManageServices && (
                          <>
                            <Button
                              asChild
                              size='sm'
                              variant='outline'
                              className='h-8 w-8 p-0'
                              title='تعديل'
                            >
                              <Link href={`/services/${service._id}/edit`}>
                                <Edit className='h-4 w-4' />
                              </Link>
                            </Button>
                            <Button
                              size='sm'
                              variant='outline'
                              className='h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50'
                              onClick={() => handleDeleteClick(service)}
                              title='حذف'
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </>
                        )}
                        <Button asChild size='sm' variant='outline'>
                          <Link href={`/services/${service._id}`}>
                            عرض التفاصيل
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {paginationMeta.totalPages > 0 && (
        <Pagination
          meta={paginationMeta}
          onPageChange={goToPage}
          onLimitChange={changeLimit}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد أنك تريد حذف الخدمة &quot;{serviceToDelete?.name}&quot;؟ لا يمكن
              التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className='bg-red-600 hover:bg-red-700'
              disabled={deleteServiceMutation.isPending}
            >
              {deleteServiceMutation.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className='p-4 space-y-4'>
          <div className='flex justify-between items-center'>
            <Skeleton className='h-8 w-32' />
            <Skeleton className='h-10 w-32' />
          </div>
          <Skeleton className='h-96 w-full' />
        </div>
      }
    >
      <ServicesContent />
    </Suspense>
  )
}
