'use client'

import { WeekSchedule } from '@/components/WeekSchedule'
import { GuestBanner } from '@/components/GuestBanner'
import { useAuth } from '@/lib/contexts/AuthContext'

export default function SchedulePage() {
  const { user } = useAuth()

  return (
    <div className="py-6">
      {!user && <GuestBanner />}

      <div className="text-center mb-6">
        <div className="inline-block bg-black text-yellow-bright px-6 py-3 rounded-full mb-3">
          <span className="font-bold text-xl">📅 My Schedule</span>
        </div>
        <p className="text-sm text-gray-600">
          Mark when you're free this week (6pm-2am)
        </p>
      </div>

      <WeekSchedule />
    </div>
  )
}
