'use client'

import { createContext, useContext, useState, ReactNode, useMemo } from 'react'

interface NavigationContextType {
  isNavigating: boolean
  setIsNavigating: (value: boolean) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false)

  // Memoize context value to prevent unnecessary re-renders and Fast Refresh issues
  // setIsNavigating is stable from useState, so we only need isNavigating in deps
  const value = useMemo(
    () => ({ isNavigating, setIsNavigating }),
    [isNavigating, setIsNavigating]
  )

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  // Return default values if context is not available (e.g., when Sidebar is rendered in a portal)
  // This allows the Sidebar to work even when rendered outside the provider
  if (context === undefined) {
    return {
      isNavigating: false,
      setIsNavigating: () => {
        // No-op when context is not available
      },
    }
  }
  return context
}

