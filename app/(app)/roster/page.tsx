'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { RosterCard } from '@/components/RosterCard'
import { SkeletonRosterCard } from '@/components/skeletons/SkeletonRosterCard'
import { GuestBanner } from '@/components/GuestBanner'
import { Button } from '@/components/ui/Button'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { useScroll } from '@/lib/hooks/useScroll'
import { updateLoginStreak } from '@/lib/utils/loginStreak'
import { sortByDiscover, sortByRecent, filterNeedsTLC } from '@/lib/algorithms/discover'
import { logger } from '@/lib/utils/logger'
import type { RosterPerson, Tier } from '@/lib/types'

export default function RosterPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const { scrollToTop } = useScroll()
  const [roster, setRoster] = useState<RosterPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState('Loading...')
  const [viewMode, setViewMode] = useState<'ranked' | 'discover' | 'recent' | 'tlc'>('ranked')

  // Load guest roster immediately on mount (optimistic loading)
  useEffect(() => {
    const storedRoster = localStorage.getItem('guest_roster')
    if (storedRoster) {
      try {
        setRoster(JSON.parse(storedRoster))
        setLoading(false) // Show content immediately
      } catch (e) {
        logger.error('Error parsing guest roster:', e)
      }
    } else {
      setLoading(false) // Show empty state immediately
    }

    // Update login streak
    updateLoginStreak()
  }, [])

  useEffect(() => {
    // Wait for auth to complete
    if (authLoading) {
      return
    }

    const loadGuestRoster = () => {
      const storedRoster = localStorage.getItem('guest_roster')
      if (storedRoster) {
        try {
          setRoster(JSON.parse(storedRoster))
        } catch (e) {
          logger.error('Error parsing guest roster:', e)
          setRoster([])
        }
      } else {
        setRoster([])
      }
      setLoading(false)
    }

    // Guest mode: Use localStorage
    if (!user) {
      loadGuestRoster()

      // Listen for storage changes (when other tabs/windows update)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'guest_roster') {
          loadGuestRoster()
        }
      }

      // Listen for focus (when navigating back to this page)
      const handleFocus = () => {
        loadGuestRoster()
      }

      window.addEventListener('storage', handleStorageChange)
      window.addEventListener('focus', handleFocus)

      return () => {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('focus', handleFocus)
      }
    }

    // Authenticated mode: Use Supabase
    const fetchRoster = async () => {
      try {
        setLoadingMessage('Loading your roster...')

        // Fetch roster with only needed columns for RosterCard display
        const { data, error } = await supabase
          .from('roster')
          .select('id, name, status, elo_rating, avatar_url, avatar_color, last_contact_date, attraction_score, personality_score, reliability_score')
          .eq('user_id', user.id)
          .neq('status', 'Archived')
          .order('elo_rating', { ascending: false })

        if (!error && data) {
          setRoster(data as RosterPerson[])
        } else {
          logger.error('Roster fetch error:', error)
          setRoster([])
        }
      } catch (error) {
        logger.error('Error fetching roster:', error)
        setRoster([])
      } finally {
        setLoading(false)
      }
    }

    fetchRoster()

    // Subscribe to realtime changes with smart delta updates
    const channel = supabase
      .channel('roster_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'roster',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const newPerson = payload.new as RosterPerson
          if (newPerson.status !== 'Archived') {
            setRoster((prev) => [...prev, newPerson].sort((a, b) => b.elo_rating - a.elo_rating))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'roster',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const updatedPerson = payload.new as RosterPerson
          setRoster((prev) => {
            // Remove if archived, otherwise update
            if (updatedPerson.status === 'Archived') {
              return prev.filter((p) => p.id !== updatedPerson.id)
            }
            return prev
              .map((p) => (p.id === updatedPerson.id ? updatedPerson : p))
              .sort((a, b) => b.elo_rating - a.elo_rating)
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'roster',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const deletedId = payload.old.id
          setRoster((prev) => prev.filter((p) => p.id !== deletedId))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // supabase is now a singleton, no need to track as dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading])

  // Get sorted roster based on view mode
  const getSortedRoster = () => {
    switch (viewMode) {
      case 'discover':
        return sortByDiscover(roster)
      case 'recent':
        return sortByRecent(roster)
      case 'tlc':
        return filterNeedsTLC(roster)
      case 'ranked':
      default:
        return [...roster].sort((a, b) => b.elo_rating - a.elo_rating)
    }
  }

  const displayRoster = getSortedRoster()

  if (loading) {
    return (
      <div className="py-6 roster-section" aria-label="Loading roster" aria-busy="true">
        <div className="flex items-center justify-between mb-8">
          <div className="w-48 h-10 skeleton rounded-2xl" />
          <div className="w-20 h-10 skeleton rounded-2xl" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonRosterCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="py-6 roster-section">
      {!user && !authLoading && <GuestBanner />}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-gray-100">
            Your Roster
          </h2>
          <span className="text-sm text-gray-600 dark:text-gray-300 mt-1 block">
            {roster.length} {roster.length === 1 ? 'person' : 'people'}
          </span>
        </div>
        <Button
          onClick={() => router.push('/add')}
          variant="primary"
          size="sm"
          className="flex items-center gap-2 onboarding-add-button"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Add Person</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* View mode tabs */}
      {roster.length > 0 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => {
              setViewMode('ranked')
              scrollToTop()
            }}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              viewMode === 'ranked'
                ? 'bg-pink text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-pink'
            }`}
          >
            🏆 Ranked
          </button>
          <button
            onClick={() => {
              setViewMode('discover')
              scrollToTop()
            }}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              viewMode === 'discover'
                ? 'bg-purple text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-purple'
            }`}
          >
            ✨ Discover
          </button>
          <button
            onClick={() => {
              setViewMode('recent')
              scrollToTop()
            }}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              viewMode === 'recent'
                ? 'bg-teal text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-teal'
            }`}
          >
            🕐 Recent
          </button>
          <button
            onClick={() => {
              setViewMode('tlc')
              scrollToTop()
            }}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              viewMode === 'tlc'
                ? 'bg-amber text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-amber'
            }`}
          >
            💛 Needs TLC
          </button>
        </div>
      )}

      {roster.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 sm:p-12 text-center">
          <div className="text-5xl sm:text-6xl mb-4 sm:mb-6">👥</div>
          <p className="text-gray-900 dark:text-gray-100 font-semibold text-base sm:text-lg mb-2">
            Add your first person to start
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            Build your roster and rank them with battles
          </p>
        </div>
      ) : displayRoster.length === 0 && viewMode === 'tlc' ? (
        <div className="bg-teal/10 dark:bg-teal/20 border-2 border-teal rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-semibold text-teal-dark dark:text-teal mb-1">All caught up!</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            You've been in touch with everyone recently
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayRoster.map((person) => (
            <RosterCard key={person.id} person={person} />
          ))}
        </div>
      )}
    </div>
  )
}
