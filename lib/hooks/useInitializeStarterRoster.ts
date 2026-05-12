import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { STARTER_ROSTER_PEOPLE } from '@/lib/constants/starterRoster'
import type { RosterPerson } from '@/lib/types'
import { useAuth } from '@/lib/contexts/AuthContext'

/**
 * Hook to automatically add starter roster people for new guest users
 * This runs once on first app load to give users something to work with
 */
export function useInitializeStarterRoster() {
  const { user } = useAuth()
  const [localRoster, setLocalRoster] = useLocalStorage<RosterPerson[]>('guest_roster', [])
  const [hasInitialized, setHasInitialized] = useLocalStorage<boolean>('starter_roster_initialized', false)

  useEffect(() => {
    // Only initialize for guest users who haven't been initialized yet
    if (!user && !hasInitialized && localRoster.length === 0) {
      setLocalRoster(STARTER_ROSTER_PEOPLE)
      setHasInitialized(true)
    }
  }, [user, hasInitialized, localRoster, setLocalRoster, setHasInitialized])
}
