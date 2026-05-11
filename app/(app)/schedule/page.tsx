'use client'

import { useSearchParams } from 'next/navigation'
import { WeekSchedule } from '@/components/WeekSchedule'
import { GuestBanner } from '@/components/GuestBanner'
import { useAuth } from '@/lib/contexts/AuthContext'

export default function SchedulePage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const sharedFor = searchParams.get('for')

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      {!user && <GuestBanner />}

      {sharedFor && (
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink rounded-2xl p-4 mb-6 text-center">
          <p className="text-sm font-semibold text-gray-800">
            📅 Scheduling with <span className="text-pink">{sharedFor}</span>
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Mark your free times below to coordinate a hangout
          </p>
        </div>
      )}

      <div className="text-center mb-6">
        <div className="inline-block bg-black text-yellow-bright px-6 py-3 rounded-full mb-3">
          <span className="font-bold text-xl">📅 {sharedFor ? 'Your Availability' : 'My Schedule'}</span>
        </div>
        <p className="text-sm text-gray-600">
          Mark when you're free this week (6pm-2am)
        </p>
      </div>

      <WeekSchedule comparisonMode={!!sharedFor} comparisonName={sharedFor || undefined} />
    </div>
  )
}
