'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { GuestBanner } from '@/components/GuestBanner'
import { Achievements } from '@/components/Achievements'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { calculateAchievements } from '@/lib/utils/achievements'
import type { RosterPerson } from '@/lib/types'

export default function ProfilePage() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const supabase = createClient()
  const [localRoster] = useLocalStorage<RosterPerson[]>('guest_roster', [])
  const [completedBattles] = useLocalStorage<string[]>('completed_battles', [])
  const [weekSchedule] = useLocalStorage<string[]>('week_schedule', [])
  const [displayName, setDisplayName] = useLocalStorage<string>('display_name', '')

  const [roster, setRoster] = useState<RosterPerson[]>([])
  const [totalHangs, setTotalHangs] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState('')

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) {
        setRoster(localRoster)
        setLoading(false)
        return
      }

      const safetyTimeout = setTimeout(() => {
        console.warn('Profile loading timeout - forcing completion')
        setLoading(false)
      }, 3000)

      try {
        // @ts-ignore
        const { data: rosterData } = await supabase
          .from('roster')
          .select('*')
          .eq('user_id', user.id)
          .neq('status', 'Archived')

        if (rosterData) {
          setRoster(rosterData as RosterPerson[])
        }

        // @ts-ignore
        const { data: hangsData } = await supabase
          .from('hangs')
          .select('id')
          .eq('user_id', user.id)

        if (hangsData) {
          setTotalHangs(hangsData.length)
        }

        clearTimeout(safetyTimeout)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching stats:', error)
        clearTimeout(safetyTimeout)
        setLoading(false)
      }
    }

    fetchStats()
  }, [user, localRoster, supabase])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const handleSaveName = () => {
    setDisplayName(tempName)
    setIsEditingName(false)
  }

  const handleEditName = () => {
    setTempName(displayName)
    setIsEditingName(true)
  }

  // Calculate stats
  const totalPeople = roster.length
  const totalBattles = user ? 0 : completedBattles.length
  const topTierCount = roster.filter(p => p.tier === 'S').length
  const avgCompositeScore = roster.length > 0
    ? Math.round(roster.reduce((acc, p) => acc + (p.attraction_score + p.personality_score + p.reliability_score) / 3, 0) / roster.length)
    : 0

  const achievements = calculateAchievements(
    totalPeople,
    completedBattles.length,
    weekSchedule.length > 0,
    0
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink"></div>
        <p className="text-gray-400">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      {!user && <GuestBanner />}

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-pink to-purple rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>

        {isEditingName ? (
          <div className="max-w-xs mx-auto mb-4">
            <Input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Enter your name"
              className="text-center text-xl font-bold mb-2"
            />
            <div className="flex gap-2 justify-center">
              <Button size="sm" onClick={handleSaveName}>Save</Button>
              <Button size="sm" variant="secondary" onClick={() => setIsEditingName(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 mb-2">
              <h1 className="text-3xl font-serif font-bold">
                {displayName || (user ? user.email?.split('@')[0] : 'Guest User')}
              </h1>
              <button
                onClick={handleEditName}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500">
              {user ? user.email : 'Browsing in guest mode'}
            </p>
          </>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white border-2 border-pink/20 rounded-2xl p-5 text-center hover:border-pink/40 transition-colors">
          <div className="text-4xl font-bold text-pink mb-2">{totalPeople}</div>
          <div className="text-sm font-medium text-gray-600">Total People</div>
        </div>
        <div className="bg-white border-2 border-purple/20 rounded-2xl p-5 text-center hover:border-purple/40 transition-colors">
          <div className="text-4xl font-bold text-purple mb-2">{topTierCount}</div>
          <div className="text-sm font-medium text-gray-600">S-Tier</div>
        </div>
        {!user && (
          <div className="bg-white border-2 border-teal/20 rounded-2xl p-5 text-center hover:border-teal/40 transition-colors">
            <div className="text-4xl font-bold text-teal mb-2">{totalBattles}</div>
            <div className="text-sm font-medium text-gray-600">Battles</div>
          </div>
        )}
        {user && (
          <div className="bg-white border-2 border-teal/20 rounded-2xl p-5 text-center hover:border-teal/40 transition-colors">
            <div className="text-4xl font-bold text-teal mb-2">{totalHangs}</div>
            <div className="text-sm font-medium text-gray-600">Total Hangs</div>
          </div>
        )}
        <div className="bg-white border-2 border-amber/20 rounded-2xl p-5 text-center hover:border-amber/40 transition-colors">
          <div className="text-4xl font-bold text-amber mb-2">{avgCompositeScore}</div>
          <div className="text-sm font-medium text-gray-600">Avg Score</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
        <h3 className="font-bold text-lg mb-4 text-gray-800">Quick Actions</h3>
        <div className="space-y-3">
          <Button
            variant="secondary"
            onClick={() => router.push('/schedule')}
            className="w-full justify-start text-left hover:bg-pink/5 hover:border-pink/30 transition-all"
          >
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-semibold">Set My Schedule</div>
              <div className="text-xs text-gray-500">Mark when you're free to hang</div>
            </div>
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push('/roster')}
            className="w-full justify-start text-left hover:bg-purple/5 hover:border-purple/30 transition-all"
          >
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div>
              <div className="font-semibold">View Roster</div>
              <div className="text-xs text-gray-500">See all your people</div>
            </div>
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push('/add')}
            className="w-full justify-start text-left hover:bg-teal/5 hover:border-teal/30 transition-all"
          >
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <div>
              <div className="font-semibold">Add Person</div>
              <div className="text-xs text-gray-500">Add someone new to your roster</div>
            </div>
          </Button>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="mb-6">
        <Achievements achievements={achievements} />
      </div>

      {/* Sign Out Button */}
      {user && (
        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={handleSignOut}
            className="w-full text-red-500 hover:bg-red-50 border-red-300 hover:border-red-400"
          >
            Sign Out
          </Button>
        </div>
      )}

      {/* Sign In CTA for Guest */}
      {!user && (
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink rounded-2xl p-6 text-center shadow-sm">
          <div className="text-4xl mb-3">✨</div>
          <h3 className="font-bold text-xl mb-2 text-gray-800">Unlock Full Features</h3>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            Sign in to sync your data across devices, log hangs, and track your progress!
          </p>
          <Button onClick={() => router.push('/')}>
            Sign In
          </Button>
        </div>
      )}
    </div>
  )
}
