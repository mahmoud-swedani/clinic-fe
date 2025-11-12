// src/hooks/useCurrentUser.ts

import { useQuery } from '@tanstack/react-query'
import axios from '@/lib/axios'
import { queryKeys } from '@/lib/queryKeys'
import { ApiResponse, User } from '@/types/api'

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.currentUser.me(),
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<User>>('/auth/me')
      return data.data // Extract data from ApiResponse
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - user data doesn't change often
    refetchOnMount: false, // Don't refetch on mount if data is fresh
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
