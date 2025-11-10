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
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
