// src/hooks/usePagination.ts
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export const usePagination = (defaultLimit: number = 10) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [page, setPage] = useState(
    parseInt(searchParams.get('page') || '1', 10)
  )
  const [limit, setLimit] = useState(
    parseInt(searchParams.get('limit') || String(defaultLimit), 10)
  )

  // Sync with URL params
  useEffect(() => {
    const urlPage = parseInt(searchParams.get('page') || '1', 10)
    const urlLimit = parseInt(searchParams.get('limit') || String(defaultLimit), 10)
    if (urlPage !== page) setPage(urlPage)
    if (urlLimit !== limit) setLimit(urlLimit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, defaultLimit])

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage)
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const changeLimit = useCallback((newLimit: number) => {
    setLimit(newLimit)
    setPage(1) // Reset to first page when changing limit
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', String(newLimit))
    params.set('page', '1')
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  return {
    page,
    limit,
    goToPage,
    changeLimit,
  }
}

