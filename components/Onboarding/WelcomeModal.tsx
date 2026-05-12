'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'

interface WelcomeModalProps {
  onStart: () => void
  onSkip: () => void
}

export function WelcomeModal({ onStart, onSkip }: WelcomeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Trap focus in modal
  useFocusTrap(modalRef, { active: true, returnFocus: false })

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'Enter',
        description: 'Start tour',
        handler: onStart,
      },
      {
        key: 'Escape',
        description: 'Skip tour',
        handler: onSkip,
      },
    ],
    enabled: true,
  })
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-pink via-purple to-yellow-bright dark:from-pink-900 dark:via-purple-900 dark:to-yellow-900"
      style={{
        zIndex: 10000
      }}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl"
        role="dialog"
        aria-labelledby="welcome-modal-title"
        aria-describedby="welcome-modal-description"
      >
        <div className="flex flex-col items-center text-center">
          {/* App Icon */}
          <img
            src="/icon.jpg"
            alt="When2Crack"
            className="w-20 h-20 rounded-full mb-6 border-2 border-yellow-bright"
          />

          {/* Tagline */}
          <h1 id="welcome-modal-title" className="font-serif text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
            Your roster, ranked. Your night, decided.
          </h1>

          {/* Description */}
          <p id="welcome-modal-description" className="text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
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
            className="text-sm text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 underline transition-colors"
          >
            Skip
          </button>

          {/* Keyboard hints */}
          <p className="text-xs text-gray-500 dark:text-gray-300 text-center mt-4">
            Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Enter</kbd> to start or <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Esc</kbd> to skip
          </p>
        </div>
      </div>
    </div>
  )
}
