'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { WeekSchedule } from '@/components/WeekSchedule'
import { GuestBanner } from '@/components/GuestBanner'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { encodeScheduleWithTimezone } from '@/lib/utils/timezone'

export default function SchedulePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
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

      // Copy to clipboard with fallback support
      const { copyToClipboard, getClipboardErrorMessage } = await import('@/lib/utils/clipboard')
      await copyToClipboard(shareUrl)

      setLinkCopied(true)
      showToast('Link copied! Send it to coordinate a time', 'success')

      setTimeout(() => setLinkCopied(false), 3000)
    } catch (err) {
      console.error('Failed to share schedule:', err)
      const { getClipboardErrorMessage } = await import('@/lib/utils/clipboard')
      const errorMessage = getClipboardErrorMessage(err)
      showToast(errorMessage, 'error')
    }
  }

  return (
    <div className="py-6">
      {!user && !authLoading && <GuestBanner />}

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-yellow-soft rounded-xl transition-colors active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Go back"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900">This Week's Availability</h2>
      </div>

      {sharedFor && (
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink/60 rounded-2xl p-5 mb-6 text-center shadow-sm">
          <div className="text-2xl mb-2">📅</div>
          <p className="text-sm font-bold text-gray-900 mb-1">
            Scheduling with <span className="text-pink">{sharedFor}</span>
          </p>
          <p className="text-xs text-gray-700">
            Mark your free times below to coordinate a hangout
          </p>
        </div>
      )}

      <WeekSchedule comparisonMode={!!sharedFor} comparisonName={sharedFor || undefined} />

      {/* Share Schedule Section - Only show when NOT in comparison mode */}
      {!sharedFor && (
        <div className="mt-8 bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink/60 rounded-2xl p-6 text-center shadow-sm">
          <div className="mb-5">
            <div className="text-4xl mb-3">💌</div>
            <h3 className="font-bold text-lg text-gray-900 mb-2">
              Share Your When2Crack
            </h3>
            <p className="text-sm text-gray-700">
              Send your availability to coordinate a hangout
            </p>
          </div>

          <Button
            onClick={handleShareSchedule}
            variant="secondary"
            className="w-full"
          >
            {linkCopied ? '✓ Link Copied!' : 'Copy Link to Share'}
          </Button>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
