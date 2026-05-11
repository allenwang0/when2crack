'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ProgressIndicator } from './ProgressIndicator'

interface OnboardingTooltipProps {
  step: number
  totalSteps: number
  title: string
  description: string
  onNext: () => void
  onPrevious?: () => void
  onSkip: () => void
  targetSelector: string | null
  customContent?: React.ReactNode
}

export function OnboardingTooltip({
  step,
  totalSteps,
  title,
  description,
  onNext,
  onPrevious,
  onSkip,
  targetSelector,
  customContent,
}: OnboardingTooltipProps) {
  const [position, setPosition] = useState<'bottom' | 'top' | 'left' | 'right'>('bottom')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!targetSelector || isMobile) return

    const calculatePosition = () => {
      const element = document.querySelector(targetSelector)
      if (!element) return

      const rect = element.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Try right first
      if (rect.right + 420 < viewportWidth) {
        setPosition('right')
      }
      // Try left
      else if (rect.left - 420 > 0) {
        setPosition('left')
      }
      // Try bottom
      else if (rect.bottom + 300 < viewportHeight) {
        setPosition('bottom')
      }
      // Default to top
      else {
        setPosition('top')
      }
    }

    calculatePosition()
  }, [targetSelector, isMobile])

  const getPositionClasses = () => {
    if (isMobile) {
      return 'fixed left-4 right-4 bottom-24' // 96px from bottom
    }

    // Desktop positioning relative to spotlight
    return 'fixed'
  }

  return (
    <div
      className={`${getPositionClasses()} bg-white rounded-3xl shadow-2xl p-6 transition-all duration-300`}
      style={{
        border: '3px solid #FFD93D',
        zIndex: 10003,
        maxWidth: isMobile ? 'calc(100vw - 32px)' : '400px',
        animation: 'slideUp 300ms ease-out',
      }}
      role="dialog"
      aria-label={`Onboarding tour, Step ${step} of ${totalSteps}`}
      aria-describedby="onboarding-description"
    >
      <ProgressIndicator currentStep={step} totalSteps={totalSteps} />

      <h3 className="text-xl font-bold text-gray-800 mb-3">
        {title}
      </h3>

      <p id="onboarding-description" className="text-sm text-gray-600 leading-relaxed mb-4">
        {description}
      </p>

      {customContent && (
        <div className="mb-4">
          {customContent}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {step > 1 && onPrevious && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrevious}
            className="mb-2"
          >
            ← Previous
          </Button>
        )}

        <Button
          variant="primary"
          onClick={onNext}
          className="w-full"
        >
          {step === totalSteps ? 'Finish Tour' : 'Next'}
        </Button>

        <button
          onClick={onSkip}
          className="text-xs text-gray-500 hover:text-gray-700 underline transition-colors text-center py-2"
        >
          Skip Tour
        </button>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
