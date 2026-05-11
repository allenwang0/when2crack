'use client'

import { Button } from '@/components/ui/Button'

interface WelcomeModalProps {
  onStart: () => void
  onSkip: () => void
}

export function WelcomeModal({ onStart, onSkip }: WelcomeModalProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #FFB6D9 0%, #E4C1F9 50%, #FFD93D 100%)',
        zIndex: 10000
      }}
    >
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex flex-col items-center text-center">
          {/* App Icon */}
          <img
            src="/icon.jpg"
            alt="When2Crack"
            className="w-20 h-20 rounded-full mb-6"
            style={{ border: '2px solid #FFD93D' }}
          />

          {/* Tagline */}
          <h1 className="font-serif text-2xl font-bold text-gray-800 mb-3">
            Your roster, ranked. Your night, decided.
          </h1>

          {/* Description */}
          <p className="text-base text-gray-600 leading-relaxed mb-8">
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
            className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
