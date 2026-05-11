'use client'

import { Achievements } from '@/components/Achievements'
import { GuestBanner } from '@/components/GuestBanner'
import { useAuth } from '@/lib/contexts/AuthContext'

export default function AchievementsPage() {
  const { user } = useAuth()

  return (
    <div className="py-6">
      {!user && <GuestBanner />}
      <Achievements />
    </div>
  )
}
