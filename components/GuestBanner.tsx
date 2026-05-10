'use client'

import { useRouter } from 'next/navigation'
import { Button } from './ui/Button'

export function GuestBanner() {
  const router = useRouter()

  return (
    <div className="bg-gradient-to-r from-pink/20 to-purple/20 border border-pink/30 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 text-pink flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium">You're using Guest Mode</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Your data is saved locally and won't persist across devices. Sign up to save your progress.
            </p>
          </div>
        </div>
        <Button
          onClick={() => router.push('/?signup=true')}
          className="text-sm px-4 py-2 whitespace-nowrap"
        >
          Sign Up to Save
        </Button>
      </div>
    </div>
  )
}
