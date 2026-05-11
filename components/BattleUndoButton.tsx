'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

interface BattleUndoButtonProps {
  isUndoable: boolean
  onUndo: () => void
  getRemainingTime: () => number
}

/**
 * Animated undo button with countdown timer
 */
export function BattleUndoButton({
  isUndoable,
  onUndo,
  getRemainingTime,
}: BattleUndoButtonProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(getRemainingTime())

  // Update countdown every second
  useEffect(() => {
    if (!isUndoable) return

    const interval = setInterval(() => {
      const remaining = getRemainingTime()
      setRemainingSeconds(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 100) // Update 10x per second for smooth animation

    return () => clearInterval(interval)
  }, [isUndoable, getRemainingTime])

  if (!isUndoable) {
    return null
  }

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-white dark:bg-gray-800 rounded-full shadow-2xl border-2 border-pink p-2 flex items-center gap-3">
        <Button
          onClick={onUndo}
          variant="tertiary"
          className="flex items-center gap-2 text-pink hover:bg-pink/10"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
          <span className="font-semibold">Undo Battle</span>
        </Button>

        <div className="relative w-10 h-10">
          {/* Circular countdown */}
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              className="stroke-gray-200 dark:stroke-gray-700"
              strokeWidth="4"
            />
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke="var(--pink)"
              strokeWidth="4"
              strokeDasharray={`${(remainingSeconds / 5) * 113} 113`}
              className="transition-all duration-100"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-pink">
              {remainingSeconds}s
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
