// src/hooks/usePermissions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCurrentUser } from './useCurrentUser'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { ApiResponse, PaginatedResponse, Permission } from '@/types/api'

// Get all permissions
export function usePermissions(page?: number, limit?: number, category?: string) {
  const currentPage = page || 1
  const currentLimit = limit || 10

  return useQuery({
    queryKey: queryKeys.permissions.list({
      page: currentPage,
      limit: currentLimit,
      category,
    }),
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<Permission>>(
        '/permissions',
        {
          params: { page: currentPage, limit: currentLimit, category },
        }
      )
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get permissions grouped by category
export function usePermissionsByCategory() {
  return useQuery({
    queryKey: queryKeys.permissions.byCategory(),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<Record<string, Permission[]>>>(
        '/permissions/categories'
      )
      return data.data
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get permission by ID
export function usePermission(id: string) {
  return useQuery({
    queryKey: queryKeys.permissions.detail(id),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<Permission>>(
        `/permissions/${id}`
      )
      return data.data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create permission
export function useCreatePermission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (newPermission: {
      name: string
      description?: string
      category: string
    }) => {
      const { data } = await axios.post<ApiResponse<Permission>>(
        '/permissions',
        newPermission
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all })
    },
  })
}

// Update permission
export function useUpdatePermission(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (updated: {
      name?: string
      description?: string
      category?: string
    }) => {
      const { data } = await axios.put<ApiResponse<Permission>>(
        `/permissions/${id}`,
        updated
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.permissions.detail(id),
      })
    },
  })
}

// Delete permission
export function useDeletePermission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/permissions/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all })
    },
  })
}

// Get categories
export function usePermissionCategories() {
  return useQuery({
    queryKey: queryKeys.permissions.categories(),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<string[]>>(
        '/permissions/categories/list'
      )
      return data.data
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to check user permissions based on role (now fetches from API)
 * This replaces the hardcoded permission logic
 */
export function useUserPermissions() {
  const { data: user } = useCurrentUser()
  
  // Use permissions directly from user object (returned by /api/auth/me)
  // This avoids needing to fetch all roles which requires admin permissions
  const permissions = useMemo<string[]>(() => {
    if (user?.permissions && Array.isArray(user.permissions)) {
      return user.permissions
    }
    return []
  }, [user?.permissions])

  // Debug logging removed for cleaner console

  return {
    // Expose permissions array for role-based fallbacks
    permissions,
    // Check individual permissions
    hasPermission: (permission: string) => permissions.includes(permission),
    hasAnyPermission: (permissionList: string[]) =>
      permissionList.some((perm) => permissions.includes(perm)),
    hasAllPermissions: (permissionList: string[]) =>
      permissionList.every((perm) => permissions.includes(perm)),

    // Legacy permission checks (for backward compatibility)
    canDelete: permissions.includes('delete') || permissions.includes('users.delete'),
    canEditFinancial:
      permissions.includes('financial.edit') ||
      permissions.includes('financial-records.edit') ||
      permissions.includes('invoices.edit'),
    canManagePatients:
      permissions.includes('patients.create') ||
      permissions.includes('patients.edit'),
    canManageAppointments:
      permissions.includes('appointments.create') ||
      permissions.includes('appointments.edit'),
    canAddTreatmentStageFromAppointment:
      permissions.includes('appointments.add-treatment-stage'),
    canViewAppointmentActivities:
      permissions.includes('appointments.view-activities'),
    canViewTreatmentStageActivities:
      permissions.includes('treatment-stages.view-activities'),
    canManageProducts:
      permissions.includes('products.create') ||
      permissions.includes('products.edit'),
    canManageSales:
      permissions.includes('sales.create') || permissions.includes('sales.edit'),
    canManageFinancialRecords:
      permissions.includes('financial-records.create') ||
      permissions.includes('financial-records.edit'),
    canManageInvoices:
      permissions.includes('invoices.create') ||
      permissions.includes('invoices.edit'),
    canAddPayments: permissions.includes('payments.create'),
    canManageTreatmentStages:
      permissions.includes('treatment-stages.create') ||
      permissions.includes('treatment-stages.edit'),
    canManageDepartments:
      permissions.includes('departments.create') ||
      permissions.includes('departments.edit'),
    canManageServices:
      permissions.includes('services.create') ||
      permissions.includes('services.edit'),

    // Patient detail page permissions
    canViewPatientAppointments: permissions.includes('patients.view-appointments'),
    canViewPatientTreatmentStages: permissions.includes('patients.view-treatment-stages'),
    canViewPatientSales: permissions.includes('patients.view-sales'),
    canViewPatientActivities: permissions.includes('patients.view-activities'),

    // User role
    role: user?.role,
  }
}
