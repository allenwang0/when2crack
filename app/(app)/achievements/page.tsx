'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Achievements } from '@/components/Achievements'
import { GuestBanner } from '@/components/GuestBanner'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { getLoginStreak } from '@/lib/utils/loginStreak'
import type { RosterPerson } from '@/lib/types'
import type { Achievement } from '@/lib/utils/achievements'
import { calculateAchievements } from '@/lib/utils/achievements'

export default function AchievementsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [localRoster] = useLocalStorage<RosterPerson[]>('guest_roster', [])
  const [completedBattles] = useLocalStorage<string[]>('completed_battles', [])
  const [weekSchedule] = useLocalStorage<string[]>('week_schedule', [])
  const [achievements, setAchievements] = useState<Achievement[]>([])

  useEffect(() => {
    // For guest mode, calculate from localStorage
    if (!user) {
      const rosterCount = localRoster.length
      const battleCount = completedBattles.length
      const hasSchedule = weekSchedule.length > 0
      const loginStreak = getLoginStreak()

      const calculated = calculateAchievements(rosterCount, battleCount, hasSchedule, loginStreak)
      setAchievements(calculated)
    }
    // TODO: For authenticated users, fetch from database
  }, [user, localRoster, completedBattles, weekSchedule])

  return (
    <div className="py-6">
      {!user && !authLoading && <GuestBanner />}

      <Button
        variant="tertiary"
        onClick={() => router.back()}
        className="mb-4"
      >
        ← Back
      </Button>

      <Achievements achievements={achievements} />
    </div>
  )
}
