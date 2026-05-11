'use client'

import { Button } from '@/components/ui/Button'

interface WelcomeModalProps {
  onStart: () => void
  onSkip: () => void
}

export function WelcomeModal({ onStart, onSkip }: WelcomeModalProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-pink via-purple to-yellow-bright dark:from-pink-900 dark:via-purple-900 dark:to-yellow-900"
      style={{
        zIndex: 10000
      }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex flex-col items-center text-center">
          {/* App Icon */}
          <img
            src="/icon.jpg"
            alt="When2Crack"
            className="w-20 h-20 rounded-full mb-6 border-2 border-yellow-bright"
          />

          {/* Tagline */}
          <h1 className="font-serif text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
            Your roster, ranked. Your night, decided.
          </h1>

          {/* Description */}
          <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
            When2Crack helps you manage your romantic prospects with smart rankings and recommendations. Take a 60-second tour to get started!
          </p>

          {/* Start Button */}
          <Button
            onClick={onStart}
            variant="primary"
            className="w-full mb-4"
          >
            Start Tour
          </Button>

          {/* Skip Link */}
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
