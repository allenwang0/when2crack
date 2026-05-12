'use client'

import { useState, useEffect } from 'react'
import { FloatingTooltip } from './FloatingTooltip'

interface InteractiveTipProps {
  targetSelector: string
  instruction: string
  successMessage?: string
  requiredAction: 'click' | 'tap'
  onActionComplete: () => void
  step: number
  totalSteps: number
}

export function InteractiveTip({
  targetSelector,
  instruction,
  successMessage = "Great! You got it! 🎉",
  requiredAction,
  onActionComplete,
  step,
  totalSteps
}: InteractiveTipProps) {
  const [actionDetected, setActionDetected] = useState(false)

  useEffect(() => {
    const target = document.querySelector(targetSelector)
    if (!target) return

    const handler = () => {
      setActionDetected(true)
      setTimeout(() => {
        onActionComplete()
      }, 1500) // Show success, then advance
    }

    const eventType = requiredAction === 'click' || requiredAction === 'tap' ? 'click' : requiredAction
    target.addEventListener(eventType, handler)

    return () => target.removeEventListener(eventType, handler)
  }, [targetSelector, requiredAction, onActionComplete])

  return (
    <div
      className="fixed z-[10003]"
    >
      {!actionDetected ? (
        <FloatingTooltip
          targetSelector={targetSelector}
          title={instruction}
          description="Try it now to continue"
          onNext={() => {}} // No manual next - must complete action
          onSkip={() => {}} // No skip - must complete action
          step={step}
          totalSteps={totalSteps}
          hideButtons={true}
        />
      ) : (
        <FloatingTooltip
          targetSelector={targetSelector}
          title={successMessage}
          description="Moving to next step..."
          onNext={() => {}}
          onSkip={() => {}}
          step={step}
          totalSteps={totalSteps}
          hideButtons={true}
        />
      )}
    </div>
  )
}
