// src/components/ui/Pagination.tsx
'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PaginationMeta } from '@/hooks/usePagination'

interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
  onLimitChange?: (limit: number) => void
}

export function Pagination({ meta, onPageChange, onLimitChange }: PaginationProps) {
  const { page, limit, total, totalPages } = meta

  const handlePrevious = () => {
    if (page > 1) {
      onPageChange(page - 1)
    }
  }

  const handleNext = () => {
    if (page < totalPages) {
      onPageChange(page + 1)
    }
  }

  const handleLimitChange = (newLimit: number) => {
    if (onLimitChange) {
      onLimitChange(newLimit)
      onPageChange(1) // Reset to first page
    }
  }

  if (totalPages <= 1) {
    return null // Don't show pagination if only one page
  }

  return (
    <div className='flex items-center justify-between px-2 py-4 border-t'>
      <div className='flex items-center gap-2'>
        <p className='text-sm text-gray-700'>
          عرض {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} من {total}
        </p>
        {onLimitChange && (
          <select
            value={limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className='ml-4 px-2 py-1 border rounded text-sm'
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        )}
      </div>

      <div className='flex items-center gap-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={handlePrevious}
          disabled={page === 1}
        >
          <ChevronLeft className='h-4 w-4' />
          السابق
        </Button>

        <div className='flex items-center gap-1'>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (page <= 3) {
              pageNum = i + 1
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i
            } else {
              pageNum = page - 2 + i
            }

            return (
              <Button
                key={pageNum}
                variant={pageNum === page ? 'default' : 'outline'}
                size='sm'
                onClick={() => onPageChange(pageNum)}
                className='min-w-[2.5rem]'
              >
                {pageNum}
              </Button>
            )
          })}
        </div>

        <Button
          variant='outline'
          size='sm'
          onClick={handleNext}
          disabled={page === totalPages}
        >
          التالي
          <ChevronRight className='h-4 w-4' />
        </Button>
      </div>
    </div>
  )
}







