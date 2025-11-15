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
    staleTime: 10 * 60 * 1000, // 10 minutes - user list doesn't change frequently
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce rate limiting
    placeholderData: keepPreviousData,
    retry: (failureCount, error: { response?: { status?: number } }) => {
      // Don't retry on 429 (rate limit) errors
      if (error?.response?.status === 429) {
        return false
      }
      return failureCount < 1
    },
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
    staleTime: 10 * 60 * 1000, // 10 minutes - user data doesn't change frequently
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce rate limiting
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    retry: (failureCount, error: { response?: { status?: number } }) => {
      // Don't retry on 429 (rate limit) errors
      if (error?.response?.status === 429) {
        return false
      }
      return failureCount < 1
    },
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
    staleTime: 15 * 60 * 1000, // 15 minutes - doctor list doesn't change frequently
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce rate limiting
    retry: (failureCount, error: { response?: { status?: number } }) => {
      // Don't retry on 429 (rate limit) errors
      if (error?.response?.status === 429) {
        return false
      }
      return failureCount < 1
    },
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
    staleTime: 15 * 60 * 1000, // 15 minutes - manager list doesn't change frequently
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce rate limiting
    retry: (failureCount, error: { response?: { status?: number } }) => {
      // Don't retry on 429 (rate limit) errors
      if (error?.response?.status === 429) {
        return false
      }
      return failureCount < 1
    },
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
    staleTime: 15 * 60 * 1000, // 15 minutes - accountant list doesn't change frequently
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce rate limiting
    retry: (failureCount, error: { response?: { status?: number } }) => {
      // Don't retry on 429 (rate limit) errors
      if (error?.response?.status === 429) {
        return false
      }
      return failureCount < 1
    },
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
    staleTime: 15 * 60 * 1000, // 15 minutes - secretary list doesn't change frequently
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce rate limiting
    retry: (failureCount, error: { response?: { status?: number } }) => {
      // Don't retry on 429 (rate limit) errors
      if (error?.response?.status === 429) {
        return false
      }
      return failureCount < 1
    },
  })
}

// جلب المستخدمين في قسم معين
export function useUsersByDepartment(departmentId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.users.all, 'by-department', departmentId],
    queryFn: async () => {
      if (!departmentId) {
        return []
      }
      const { data } = await axios.get<ApiResponse<User[]>>(`/users/by-department/${departmentId}`)
      return data.data // Extract data from ApiResponse
    },
    enabled: !!departmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: { response?: { status?: number } }) => {
      if (error?.response?.status === 429) {
        return false
      }
      return failureCount < 1
    },
  })
}