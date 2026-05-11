import { useState, useCallback } from 'react'

export interface UseErrorHandlerOptions {
  onError?: (error: Error) => void
  logError?: boolean
}

/**
 * Hook for handling errors in async operations
 * Error boundaries don't catch errors in:
 * - Event handlers
 * - Async code (setTimeout, promises, async/await)
 * - Server-side rendering
 * - Errors thrown in the error boundary itself
 *
 * This hook helps handle those cases
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { onError, logError = true } = options
  const [error, setError] = useState<Error | null>(null)
  const [isError, setIsError] = useState(false)

  const handleError = useCallback(
    (err: unknown) => {
      const errorObj = err instanceof Error ? err : new Error(String(err))

      setError(errorObj)
      setIsError(true)

      if (logError) {
        console.error('Error handled:', errorObj)
      }

      if (onError) {
        onError(errorObj)
      }
    },
    [onError, logError]
  )

  const clearError = useCallback(() => {
    setError(null)
    setIsError(false)
  }, [])

  const withErrorHandler = useCallback(
    <T extends (...args: any[]) => Promise<any>>(fn: T) => {
      return async (...args: Parameters<T>) => {
        try {
          return await fn(...args)
        } catch (err) {
          handleError(err)
          throw err // Re-throw so calling code can handle it too
        }
      }
    },
    [handleError]
  )

  return {
    error,
    isError,
    handleError,
    clearError,
    withErrorHandler,
  }
}

/**
 * Hook for handling errors with retry logic
 */
export function useRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
) {
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const { error, isError, handleError, clearError } = useErrorHandler()

  const executeWithRetry = useCallback(async (): Promise<T | null> => {
    clearError()
    setRetryCount(0)
    setIsRetrying(false)

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn()
        setIsRetrying(false)
        return result
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        setRetryCount(attempt + 1)

        if (attempt < maxRetries) {
          setIsRetrying(true)
          await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)))
        }
      }
    }

    // All retries failed
    if (lastError) {
      handleError(lastError)
    }
    setIsRetrying(false)
    return null
  }, [fn, maxRetries, delayMs, handleError, clearError])

  return {
    execute: executeWithRetry,
    error,
    isError,
    retryCount,
    isRetrying,
    clearError,
  }
}
