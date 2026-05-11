import { useState, useEffect, useRef } from 'react'
import { logger } from '@/lib/utils/logger'

// Check available localStorage space
function checkStorageQuota(): number {
  if (typeof window === 'undefined') return Infinity

  let total = 0
  try {
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += (localStorage[key].length + key.length) * 2 // UTF-16 encoding
      }
    }
  } catch (error) {
    return 0
  }

  // Most browsers have 5-10MB limit
  const ESTIMATED_LIMIT = 5 * 1024 * 1024
  return ESTIMATED_LIMIT - total
}

// Show user-friendly error message
function showQuotaError() {
  if (typeof window === 'undefined') return

  const message =
    'Storage limit reached! Your data might not be saved.\n\n' +
    'Options:\n' +
    '1. Sign in to sync data to the cloud\n' +
    '2. Clear old battle history to free up space\n' +
    '3. Remove some people from your roster'

  alert(message)
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  // State to store error
  const [error, setError] = useState<string | null>(null)
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      logger.debug(error)
      return initialValue
    }
  })

  // Ref to store debounce timeout
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  // Ref to store the latest value for flushing on unmount
  const latestValueRef = useRef<T>(storedValue)

  // Cleanup on unmount - flush any pending writes
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        // Flush pending write immediately on unmount
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(key, JSON.stringify(latestValueRef.current))
          } catch (error) {
            logger.debug('localStorage flush error:', error)
          }
        }
      }
    }
  }, [key])

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value

      // Update state immediately for responsive UI
      setStoredValue(valueToStore)
      // Store latest value for potential unmount flush
      latestValueRef.current = valueToStore

      // Debounce localStorage writes to avoid jank
      if (typeof window !== 'undefined') {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
          try {
            const serialized = JSON.stringify(valueToStore)
            const dataSize = serialized.length * 2 // UTF-16 encoding
            const available = checkStorageQuota()

            // Check if we have enough space
            if (dataSize > available) {
              setError('QUOTA_EXCEEDED')
              showQuotaError()
              return
            }

            window.localStorage.setItem(key, serialized)
            setError(null)
          } catch (error: any) {
            logger.error('localStorage write error:', error)

            // Handle quota exceeded error
            if (error.name === 'QuotaExceededError' || error.code === 22) {
              setError('QUOTA_EXCEEDED')
              showQuotaError()
            } else {
              logger.error('localStorage error:', error)
            }
          }
        }, 300) // 300ms debounce - increased to reduce event loop blocking
      }
    } catch (error) {
      logger.debug(error)
    }
  }

  return [storedValue, setValue, error] as const
}
