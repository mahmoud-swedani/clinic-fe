// This file runs at module load time to suppress JSX transform warnings
// from dependencies like react-big-calendar

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Store original console methods before anything else can intercept them
  const originalConsoleError = console.error.bind(console)
  const originalConsoleWarn = console.warn.bind(console)

  const checkForJSXWarning = (...args: unknown[]): boolean => {
    // Check all arguments for the warning message
    const allMessages = args
      .map((arg) => {
        if (typeof arg === 'string') return arg
        if (typeof arg === 'object' && arg !== null) {
          const obj = arg as { message?: unknown; toString?: () => string }
          if (obj.message) return String(obj.message)
          if (obj.toString) return obj.toString()
          try {
            return JSON.stringify(arg)
          } catch {
            return String(arg)
          }
        }
        return String(arg)
      })
      .join(' ')

    return (
      allMessages.includes('outdated JSX transform') ||
      allMessages.includes('new-jsx-transform') ||
      allMessages.includes('react.dev/link/new-jsx-transform') ||
      allMessages.includes('Update to the modern JSX transform')
    )
  }

  // Override console.error
  console.error = (...args: unknown[]) => {
    if (checkForJSXWarning(...args)) {
      return // Suppress the warning
    }
    originalConsoleError(...args)
  }

  // Override console.warn
  console.warn = (...args: unknown[]) => {
    if (checkForJSXWarning(...args)) {
      return // Suppress the warning
    }
    originalConsoleWarn(...args)
  }
}

