'use client'

import { useEffect } from 'react'

export function SuppressJSXWarning() {
  useEffect(() => {
    // Suppress React warnings about outdated JSX transform from dependencies
    const originalError = console.error
    console.error = (...args: unknown[]) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('outdated JSX transform')
      ) {
        return
      }
      originalError(...args)
    }

    return () => {
      console.error = originalError
    }
  }, [])

  return null
}
