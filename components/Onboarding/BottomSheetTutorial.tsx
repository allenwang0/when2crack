'use client'

import { Button } from '@/components/ui/Button'
import { useSwipeGesture } from '@/lib/hooks/useSwipeGesture'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  visual?: React.ReactNode
  primaryAction: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

export function BottomSheetTutorial({
  isOpen,
  onClose,
  title,
  description,
  visual,
  primaryAction,
  secondaryAction
}: BottomSheetProps) {
  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeGesture({
    onSwipeDown: onClose,
    threshold: 100
  })

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[10004] bg-black/40 animate-fade-in"
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[10005] bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto animate-slide-up"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mt-3 mb-4" />

        {/* Content */}
        <div className="px-6 pb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {title}
          </h2>

          {/* Visual */}
          {visual && (
            <div className="mb-6 flex justify-center">
              {visual}
            </div>
          )}

          <p className="text-base text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            {description}
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={primaryAction.onClick}
              className="w-full"
              size="lg"
            >
              {primaryAction.label}
            </Button>

            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant="tertiary"
                className="w-full"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
