import { useState, useEffect, useRef } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.log(error)
      return initialValue
    }
  })

  // Ref to store debounce timeout
  const timeoutRef = useRef<NodeJS.Timeout>()
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
            console.log('localStorage flush error:', error)
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
            window.localStorage.setItem(key, JSON.stringify(valueToStore))
          } catch (error) {
            console.log('localStorage write error:', error)
          }
        }, 300) // 300ms debounce - increased to reduce event loop blocking
      }
    } catch (error) {
      console.log(error)
    }
  }

  return [storedValue, setValue] as const
}
