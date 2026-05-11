'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { WeekSchedule } from '@/components/WeekSchedule'
import { GuestBanner } from '@/components/GuestBanner'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { encodeScheduleWithTimezone } from '@/lib/utils/timezone'

export default function SchedulePage() {
  const { user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const sharedFor = searchParams.get('for')
  const { toasts, showToast, removeToast } = useToast()
  const [linkCopied, setLinkCopied] = useState(false)

  const handleShareSchedule = async () => {
    try {
      // Get current week's Monday date
      const getMonday = (date: Date): Date => {
        const d = new Date(date)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        return new Date(d.setDate(diff))
      }

      const formatDate = (date: Date): string => {
        return date.toISOString().split('T')[0]
      }

      const currentWeekStart = getMonday(new Date())
      const weekKey = `week_schedule_${formatDate(currentWeekStart)}`

      // Get user's schedule from localStorage for current week
      const storedSchedule = localStorage.getItem(weekKey)
      let mySchedule: string[] = []

      try {
        mySchedule = storedSchedule ? JSON.parse(storedSchedule) : []
      } catch (e) {
        console.error('Failed to parse schedule:', e)
      }

      if (mySchedule.length === 0) {
        showToast('Mark some times as available first!', 'error')
        return
      }

      // Encode schedule with timezone
      const encodedSchedule = encodeScheduleWithTimezone(mySchedule)

      // Get display name if set
      const displayName = localStorage.getItem('display_name') || 'Someone'
      const cleanName = displayName ? JSON.parse(displayName) : 'Someone'

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const shareUrl = `${baseUrl}/schedule?for=${encodeURIComponent(cleanName)}&schedule=${encodedSchedule}`

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl)

      setLinkCopied(true)
      showToast('Link copied! Send it to coordinate a time', 'success')

      setTimeout(() => setLinkCopied(false), 3000)
    } catch (err) {
      console.error('Failed to share schedule:', err)
      showToast('Failed to copy link. Please try again.', 'error')
    }
  }

  return (
    <div className="py-6">
      {!user && !authLoading && <GuestBanner />}

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">This Week's Availability</h2>
      </div>

      {sharedFor && (
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink rounded-2xl p-4 mb-6 text-center">
          <p className="text-sm font-semibold text-gray-800">
            📅 Scheduling with <span className="text-pink">{sharedFor}</span>
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Mark your free times below to coordinate a hangout
          </p>
        </div>
      )}

      <WeekSchedule comparisonMode={!!sharedFor} comparisonName={sharedFor || undefined} />

      {/* Share Schedule Section - Only show when NOT in comparison mode */}
      {!sharedFor && (
        <div className="mt-8 bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink/30 rounded-2xl p-6 text-center">
          <div className="mb-4">
            <div className="text-4xl mb-3">💌</div>
            <h3 className="font-bold text-lg text-gray-800 mb-3">
              Share Your When2Crack
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Send your availability to coordinate a hangout
            </p>
          </div>

          <button
            onClick={handleShareSchedule}
            className="w-full bg-gradient-to-r from-pink to-purple hover:opacity-90 transition-opacity px-6 py-3 rounded-full text-white font-semibold shadow-md hover:shadow-lg"
          >
            {linkCopied ? '✓ Link Copied!' : 'Copy Link to Share'}
          </button>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
