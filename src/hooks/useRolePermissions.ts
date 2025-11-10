// src/hooks/useRolePermissions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { ApiResponse, Permission, RolePermission } from '@/types/api'

// Get permissions for a role
export function useRolePermissions(roleId: string) {
  return useQuery({
    queryKey: queryKeys.roles.permissions(roleId),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<Permission[]>>(
        `/roles/${roleId}/permissions`
      )
      return data.data
    },
    enabled: !!roleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Assign permissions to role
export function useAssignPermissions(roleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (permissionIds: string[]) => {
      const { data } = await axios.post<ApiResponse<RolePermission[]>>(
        `/roles/${roleId}/permissions`,
        { permissionIds }
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.roles.permissions(roleId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.roles.detail(roleId),
      })
    },
  })
}

// Remove permission from role
export function useRemovePermission(roleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (permissionId: string) => {
      await axios.delete(`/roles/${roleId}/permissions/${permissionId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.roles.permissions(roleId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.roles.detail(roleId),
      })
    },
  })
}

// Replace all permissions for a role
export function useReplaceRolePermissions(roleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (permissionIds: string[]) => {
      const { data } = await axios.put<ApiResponse<RolePermission[]>>(
        `/roles/${roleId}/permissions`,
        { permissionIds }
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.roles.permissions(roleId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.roles.detail(roleId),
      })
    },
  })
}

