'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'

interface SkipConfirmationModalProps {
  onConfirm: () => void
  onCancel: () => void
}

export function SkipConfirmationModal({ onConfirm, onCancel }: SkipConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Trap focus in modal
  useFocusTrap(modalRef, { active: true, returnFocus: true })

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'Escape',
        description: 'Cancel',
        handler: onCancel,
      },
      {
        key: 'Enter',
        description: 'Confirm',
        handler: onConfirm,
      },
    ],
    enabled: true,
  })

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.75)',
        zIndex: 10004, // Above onboarding overlay
      }}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl"
        role="dialog"
        aria-labelledby="skip-modal-title"
        aria-describedby="skip-modal-description"
      >
        <h2 id="skip-modal-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Skip the tour?
        </h2>

        <p id="skip-modal-description" className="text-gray-600 dark:text-gray-300 mb-6">
          You can always restart the tour from the yellow info button (?) in the bottom-right corner.
        </p>

        <div className="flex gap-3">
          <Button
            variant="tertiary"
            onClick={onCancel}
            className="flex-1"
          >
            Continue Tour
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            className="flex-1"
          >
            Skip Tour
          </Button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-300 text-center mt-4">
          Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Esc</kbd> to cancel or <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Enter</kbd> to confirm
        </p>
      </div>
    </div>
  )
}
