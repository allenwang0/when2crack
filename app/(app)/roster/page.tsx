'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { RosterCard } from '@/components/RosterCard'
import { GuestBanner } from '@/components/GuestBanner'
import { Button } from '@/components/ui/Button'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { updateLoginStreak } from '@/lib/utils/loginStreak'
import type { RosterPerson, Tier } from '@/lib/types'

export default function RosterPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [roster, setRoster] = useState<RosterPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState('Loading...')

  useEffect(() => {
    // Update login streak (roster is main entry point)
    if (typeof window !== 'undefined') {
      updateLoginStreak()
    }

    // If auth is still loading, wait
    if (authLoading) {
      setLoadingMessage('Checking authentication...')
      setLoading(true)
      return
    }

    const loadGuestRoster = () => {
      const storedRoster = localStorage.getItem('guest_roster')
      if (storedRoster) {
        try {
          setRoster(JSON.parse(storedRoster))
        } catch (e) {
          console.error('Error parsing guest roster:', e)
          setRoster([])
        }
      } else {
        setRoster([])
      }
    }

    // Guest mode: Use localStorage
    if (!user) {
      setLoadingMessage('Loading roster...')
      loadGuestRoster()
      setLoading(false)

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

        // Fetch roster
        // @ts-ignore
        const { data, error } = await supabase
          .from('roster')
          .select('*')
          .eq('user_id', user.id)
          .neq('status', 'Archived')
          .order('elo_rating', { ascending: false })

        if (!error && data) {
          setRoster(data as RosterPerson[])
        } else {
          console.error('Roster fetch error:', error)
          setRoster([])
        }
      } catch (error) {
        console.error('Error fetching roster:', error)
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
        (payload) => {
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
        (payload) => {
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
        (payload) => {
          const deletedId = payload.old.id
          setRoster((prev) => prev.filter((p) => p.id !== deletedId))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, authLoading, supabase])

  if (loading) {
    return (
      <div className="py-6 flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink"></div>
        <p className="text-gray-400">{loadingMessage}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      {!user && !authLoading && <GuestBanner />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-serif font-bold text-gray-800">Your Roster</h2>
          <span className="text-sm text-gray-500 mt-1 block">{roster.length} {roster.length === 1 ? 'person' : 'people'}</span>
        </div>
        <Button onClick={() => router.push('/add')} className="flex items-center gap-2 shadow-md">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </Button>
      </div>

      {roster.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <p className="text-gray-800 font-semibold text-lg mb-2">Your roster is empty</p>
          <p className="text-sm text-gray-500 mb-6">
            Add your first person to get started
          </p>
          <Button onClick={() => router.push('/add')} className="shadow-md">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Person
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {roster.map((person) => (
            <RosterCard key={person.id} person={person} />
          ))}
        </div>
      )}
    </div>
  )
}
