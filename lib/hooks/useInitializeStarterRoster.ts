import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { STARTER_ROSTER_PEOPLE } from '@/lib/constants/starterRoster'
import type { RosterPerson } from '@/lib/types'
import { useAuth } from '@/lib/contexts/AuthContext'
import { logger } from '@/lib/utils/logger'

/**
 * Hook to automatically add starter roster people for new guest users
 * This runs once on first app load to give users something to work with
 */
export function useInitializeStarterRoster() {
  const { user, loading: authLoading } = useAuth()
  const [localRoster, setLocalRoster] = useLocalStorage<RosterPerson[]>('guest_roster', [])
  const [hasInitialized, setHasInitialized] = useLocalStorage<boolean>('starter_roster_initialized', false)

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (authLoading) {
      logger.debug('useInitializeStarterRoster: waiting for auth to load')
      return
    }

    // Log the current state
    logger.debug('useInitializeStarterRoster:', {
      isGuest: !user,
      hasInitialized,
      rosterLength: localRoster.length,
    })

    // Only initialize for guest users who haven't been initialized yet
    if (!user && !hasInitialized && localRoster.length === 0) {
      logger.info('Initializing starter roster with default people (Shane & Ilya)')
      setLocalRoster(STARTER_ROSTER_PEOPLE)
      setHasInitialized(true)
    }
  }, [user, authLoading, hasInitialized, localRoster, setLocalRoster, setHasInitialized])
}
