'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: Array<{ value: string; label: string; searchText?: string }>
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  required?: boolean
  disabled?: boolean
  ariaLabel?: string
  className?: string
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'اختر...',
  searchPlaceholder = 'ابحث...',
  emptyMessage = 'لا توجد نتائج',
  required = false,
  disabled = false,
  ariaLabel,
  className,
}: SearchableSelectProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return options
    }
    const query = searchQuery.toLowerCase()
    return options.filter((option) => {
      // Search in label
      if (option.label.toLowerCase().includes(query)) {
        return true
      }
      // Search in additional searchText if provided
      if (option.searchText && option.searchText.toLowerCase().includes(query)) {
        return true
      }
      return false
    })
  }, [options, searchQuery])

  // Get selected option label
  const selectedLabel = React.useMemo(() => {
    const selected = options.find((opt) => opt.value === value)
    return selected?.label || ''
  }, [options, value])

  // Reset search when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery('')
    } else {
      // Focus search input when dialog opens
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [open])

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      required={required}
      disabled={disabled}
      open={open}
      onOpenChange={setOpen}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn('w-full', className)}
      >
        <SelectValue placeholder={placeholder}>
          {value && selectedLabel ? selectedLabel : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className='p-0 max-h-[400px]' dir='rtl'>
        {/* Search Input */}
        <div className='sticky top-0 z-10 border-b bg-background p-2'>
          <div className='relative'>
            <Search className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4 pointer-events-none' />
            <Input
              ref={searchInputRef}
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                // Prevent closing dropdown when typing
                e.stopPropagation()
                // Prevent Enter from submitting form
                if (e.key === 'Enter') {
                  e.preventDefault()
                }
              }}
              className='pr-9'
              dir='rtl'
            />
          </div>
        </div>

        {/* Options List with Scroll */}
        <div className='max-h-[300px] overflow-y-auto p-1'>
          {filteredOptions.length === 0 ? (
            <div className='py-6 text-center text-sm text-muted-foreground'>
              {emptyMessage}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className='cursor-pointer'
              >
                {option.label}
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  )
}

