// src/hooks/useRoles.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { ApiResponse, PaginatedResponse, Role } from '@/types/api'

// Get all roles (paginated)
export function useRoles(page?: number, limit?: number) {
  const currentPage = page || 1
  const currentLimit = limit || 10

  return useQuery({
    queryKey: queryKeys.roles.list({ page: currentPage, limit: currentLimit }),
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<Role>>('/roles', {
        params: { page: currentPage, limit: currentLimit },
      })
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  })
}

// Get all roles without pagination (for management UI)
export function useAllRoles() {
  return useQuery({
    queryKey: queryKeys.roles.list({ page: 1, limit: 0, all: true }),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<Role[]>>('/roles', {
        params: { all: true },
      })
      return data.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get role by ID
export function useRole(id: string) {
  return useQuery({
    queryKey: queryKeys.roles.detail(id),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<Role>>(`/roles/${id}`)
      return data.data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create role
export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (newRole: {
      name: string
      description?: string
      permissionIds?: string[]
    }) => {
      const { data } = await axios.post<ApiResponse<Role>>('/roles', newRole)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
    },
  })
}

// Update role
export function useUpdateRole(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (updated: {
      name?: string
      description?: string
      permissionIds?: string[]
    }) => {
      const { data } = await axios.put<ApiResponse<Role>>(`/roles/${id}`, updated)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.detail(id) })
    },
  })
}

// Delete role
export function useDeleteRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/roles/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
    },
  })
}

