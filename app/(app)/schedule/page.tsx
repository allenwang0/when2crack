'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { WeekSchedule } from '@/components/WeekSchedule'
import { GuestBanner } from '@/components/GuestBanner'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'

export default function SchedulePage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sharedFor = searchParams.get('for')
  const { toasts, showToast, removeToast } = useToast()
  const [linkCopied, setLinkCopied] = useState(false)

  const handleShareSchedule = async () => {
    try {
      // Get user's schedule from localStorage
      const storedSchedule = localStorage.getItem('week_schedule')
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
      const { encodeScheduleWithTimezone } = await import('@/lib/utils/timezone')
      const encodedSchedule = encodeScheduleWithTimezone(mySchedule)

      // Get display name if set
      const displayName = localStorage.getItem('display_name') || 'Someone'
      const cleanName = displayName ? JSON.parse(displayName) : 'Someone'

      const baseUrl = window.location.origin
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
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      {!user && <GuestBanner />}

      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4"
      >
        ← Back
      </Button>

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

      {/* Share Schedule Section - Only show when NOT in comparison mode */}
      {!sharedFor && (
        <div className="mt-8 bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink/30 rounded-2xl p-6 text-center">
          <div className="mb-4">
            <div className="text-4xl mb-2">💌</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">
              Share Your When2Crack
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Send your availability to coordinate a hangout
            </p>
          </div>

          <Button
            onClick={handleShareSchedule}
            className="w-full bg-gradient-to-r from-pink to-purple hover:opacity-90 transition-opacity"
          >
            {linkCopied ? '✓ Link Copied!' : 'Copy Link to Share'}
          </Button>

          <p className="text-xs text-gray-500 mt-3">
            They'll see when you're free and can mark their availability too
          </p>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
