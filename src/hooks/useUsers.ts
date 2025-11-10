// src/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { ApiResponse, PaginatedResponse, User } from '@/types/api'

// جلب كل المستخدمين
export function useUsers(page?: number, limit?: number) {
  const currentPage = page || 1
  const currentLimit = limit || 10

  return useQuery({
    queryKey: queryKeys.users.list({ page: currentPage, limit: currentLimit }),
    queryFn: async () => {
      const { data } = await axios.get<PaginatedResponse<User>>('/users', {
        params: { page: currentPage, limit: currentLimit },
      })
      return data // Return full PaginatedResponse
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  })
}

// جلب مستخدم واحد
export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<User>>(`/users/${id}`)
      return data.data // Extract data from ApiResponse
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// إنشاء مستخدم
export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (newUser: Partial<User>) => {
      const { data } = await axios.post<ApiResponse<User>>('/users', newUser)
      return data.data // Extract data from ApiResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

// تحديث مستخدم
export function useUpdateUser(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (updated: Partial<User>) => {
      const { data } = await axios.put<ApiResponse<User>>(`/users/${id}`, updated)
      return data.data // Extract data from ApiResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) })
    },
  })
}

// حذف مستخدم
export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/users/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

// تفعيل/تعطيل مستخدم
export function useToggleUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.patch<ApiResponse<User>>(`/users/${id}/toggle-status`)
      return data.data // Extract data from ApiResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

// جلب الأطباء
export function useDoctors() {
  return useQuery({
    queryKey: queryKeys.users.doctors(),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<User[]>>('/user-roles/doctors')
      return data.data // Extract data from ApiResponse
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// جلب المديرين
export function useManagers() {
  return useQuery({
    queryKey: queryKeys.users.managers(),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<User[]>>('/user-roles/managers')
      return data.data // Extract data from ApiResponse
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// جلب المحاسبين
export function useAccountants() {
  return useQuery({
    queryKey: queryKeys.users.accountants(),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<User[]>>('/user-roles/accountants')
      return data.data // Extract data from ApiResponse
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// جلب السكرتيرين
export function useSecretaries() {
  return useQuery({
    queryKey: queryKeys.users.secretaries(),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<User[]>>('/user-roles/secretaries')
      return data.data // Extract data from ApiResponse
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
