import { useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'

/**
 * Hook to sync schedule between localStorage and database
 * - Guest users: localStorage only
 * - Authenticated users: sync to database, with localStorage as cache
 */
export function useScheduleSync(
  localSchedule: Set<string>,
  setLocalSchedule: (schedule: Set<string>) => void
) {
  const { user } = useAuth()

  // Load schedule from database when user logs in
  useEffect(() => {
    if (!user) return

    const loadScheduleFromDB = async () => {
      try {
        const response = await fetch('/api/schedule')
        if (!response.ok) {
          if (response.status === 404 || response.status === 401) {
            // No schedule in DB yet, or not authorized
            return
          }
          throw new Error('Failed to load schedule')
        }

        const data = await response.json()
        if (data.schedule) {
          // Merge with local schedule (local takes precedence for conflicts)
          const dbSchedule = new Set<string>(data.schedule)
          const mergedSchedule = new Set([...localSchedule, ...dbSchedule])
          setLocalSchedule(mergedSchedule)

          // Save merged schedule back to DB
          await saveScheduleToDB(mergedSchedule)
        }
      } catch (error) {
        console.error('Error loading schedule from database:', error)
      }
    }

    loadScheduleFromDB()
    // Only run on mount when user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Save to database (debounced)
  const saveScheduleToDB = useCallback(
    async (schedule: Set<string>) => {
      if (!user) return

      try {
        const response = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schedule: Array.from(schedule),
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to save schedule')
        }
      } catch (error) {
        console.error('Error saving schedule to database:', error)
      }
    },
    [user]
  )

  // Sync to database when local schedule changes (with debounce)
  useEffect(() => {
    if (!user) return

    const timeoutId = setTimeout(() => {
      saveScheduleToDB(localSchedule)
    }, 2000) // 2 second debounce

    return () => clearTimeout(timeoutId)
  }, [localSchedule, saveScheduleToDB, user])

  return {
    saveToDatabase: saveScheduleToDB,
  }
}
