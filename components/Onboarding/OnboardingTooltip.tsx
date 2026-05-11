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
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
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
    if (!targetSelector || isMobile) {
      setTooltipStyle({})
      return
    }

    const calculatePosition = () => {
      const element = document.querySelector(targetSelector)
      if (!element) {
        // Reset styles when element not found to avoid stale positioning
        setTooltipStyle({})
        return
      }

      const rect = element.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const tooltipWidth = 400
      const tooltipHeight = 300
      const gap = 16

      let newPosition: 'bottom' | 'top' | 'left' | 'right' = 'bottom'
      let style: React.CSSProperties = {}

      // Try right first
      if (rect.right + tooltipWidth + gap < viewportWidth) {
        newPosition = 'right'
        style = {
          top: rect.top + rect.height / 2,
          left: rect.right + gap,
          transform: 'translateY(-50%)',
        }
      }
      // Try left
      else if (rect.left - tooltipWidth - gap > 0) {
        newPosition = 'left'
        style = {
          top: rect.top + rect.height / 2,
          right: viewportWidth - rect.left + gap,
          transform: 'translateY(-50%)',
        }
      }
      // Try bottom
      else if (rect.bottom + tooltipHeight + gap < viewportHeight) {
        newPosition = 'bottom'
        style = {
          top: rect.bottom + gap,
          left: rect.left + rect.width / 2,
          transform: 'translateX(-50%)',
        }
      }
      // Default to top
      else {
        newPosition = 'top'
        style = {
          bottom: viewportHeight - rect.top + gap,
          left: rect.left + rect.width / 2,
          transform: 'translateX(-50%)',
        }
      }

      setPosition(newPosition)
      setTooltipStyle(style)
    }

    // Delay initial calculation to let SpotlightOverlay render first (100ms + buffer)
    const initialDelay = setTimeout(calculatePosition, 150)
    window.addEventListener('resize', calculatePosition)
    return () => {
      clearTimeout(initialDelay)
      window.removeEventListener('resize', calculatePosition)
    }
  }, [targetSelector, isMobile])

  const getPositionClasses = () => {
    if (isMobile) {
      // Position above navigation bar (80px height)
      return 'fixed left-4 right-4'
    }

    // Desktop positioning - will be controlled by inline styles
    return 'fixed'
  }

  const getMobileStyle = (): React.CSSProperties => {
    if (!isMobile) return tooltipStyle

    // Fixed position above nav bar on mobile
    return {
      bottom: 'calc(80px + 1rem)', // nav height + gap
    }
  }

  return (
    <div
      className={`${getPositionClasses()} bg-white rounded-3xl shadow-2xl p-6 transition-all duration-300`}
      style={{
        border: '3px solid #FFD93D',
        zIndex: 10003,
        maxWidth: isMobile ? 'calc(100vw - 32px)' : '400px',
        animation: 'slideUp 300ms ease-out',
        ...getMobileStyle(),
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
            opacity: 0;
            margin-top: 20px;
          }
          to {
            opacity: 1;
            margin-top: 0;
          }
        }
      `}</style>
    </div>
  )
}
