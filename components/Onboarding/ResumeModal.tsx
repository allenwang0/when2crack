'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'

interface ResumeModalProps {
  stepNumber: number
  onResume: () => void
  onSkip: () => void
}

export function ResumeModal({ stepNumber, onResume, onSkip }: ResumeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useFocusTrap(modalRef, { active: true, returnFocus: false })

  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'Enter',
        description: 'Resume tour',
        handler: onResume,
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
        aria-labelledby="resume-modal-title"
        aria-describedby="resume-modal-description"
      >
        <div className="flex flex-col items-center text-center">
          <div className="text-6xl mb-6">👋</div>

          <h1 id="resume-modal-title" className="font-serif text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
            Welcome back!
          </h1>

          <p id="resume-modal-description" className="text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
            You were on step {stepNumber} of the tour. Would you like to continue where you left off?
          </p>

          <Button
            onClick={onResume}
            variant="primary"
            className="w-full mb-4"
          >
            Continue Tour
          </Button>

          <button
            onClick={onSkip}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline transition-colors"
          >
            Skip
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
            Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Enter</kbd> to continue or <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Esc</kbd> to skip
          </p>
        </div>
      </div>
    </div>
  )
}
