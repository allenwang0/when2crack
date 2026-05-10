'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { RosterCard } from '@/components/RosterCard'
import { GuestBanner } from '@/components/GuestBanner'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import type { RosterPerson, Tier } from '@/lib/types'

export default function RosterPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [roster, setRoster] = useState<RosterPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [panicMode, setPanicMode] = useState(false)

  useEffect(() => {
    const loadGuestRoster = () => {
      const storedRoster = localStorage.getItem('guest_roster')
      if (storedRoster) {
        try {
          setRoster(JSON.parse(storedRoster))
        } catch (e) {
          console.error('Error parsing guest roster:', e)
        }
      } else {
        setRoster([])
      }
    }

    // Guest mode: Use localStorage
    if (!user) {
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
      // Fetch user's panic mode status
      // @ts-ignore
      const { data: userData } = await supabase
        .from('users')
        .select('panic_mode')
        .eq('id', user.id)
        .single()

      if (userData?.panic_mode) {
        setPanicMode(true)
        setLoading(false)
        return
      }

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
      }

      setLoading(false)
    }

    fetchRoster()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('roster_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roster',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchRoster()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  if (loading) {
    return (
      <div className="py-6 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (panicMode) {
    return (
      <div className="py-6">
        <h2 className="text-2xl font-serif font-bold mb-4">Roster</h2>
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            />
          </svg>
          <p className="text-gray-400">
            Panic Mode Active
            <br />
            <span className="text-sm">Disable in settings to view your roster</span>
          </p>
        </div>
      </div>
    )
  }

  // Group roster by tier
  const rosterByTier = roster.reduce(
    (acc, person) => {
      if (!acc[person.tier]) {
        acc[person.tier] = []
      }
      acc[person.tier].push(person)
      return acc
    },
    {} as Record<Tier, RosterPerson[]>
  )

  const tiers: Tier[] = ['S', 'A', 'B', 'C']

  return (
    <div className="py-6">
      {!user && <GuestBanner />}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-serif font-bold">Your Roster</h2>
        <span className="text-sm text-gray-400">{roster.length} people</span>
      </div>

      {roster.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-4">Your roster is empty</p>
          <p className="text-sm text-gray-500">
            Tap the + button below to add your first person
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {tiers.map((tier) => {
            const people = rosterByTier[tier] || []
            if (people.length === 0) return null

            return (
              <div key={tier}>
                <h3 className="text-lg font-serif font-semibold mb-3 flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: {
                        S: '#ff6b9d',
                        A: '#a78bfa',
                        B: '#60a5fa',
                        C: '#9ca3af',
                      }[tier],
                    }}
                  />
                  {tier} Tier
                  <span className="text-sm text-gray-500 font-normal">
                    ({people.length})
                  </span>
                </h3>
                <div className="space-y-3">
                  {people.map((person) => (
                    <RosterCard key={person.id} person={person} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
