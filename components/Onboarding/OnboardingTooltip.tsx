'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { ProgressIndicator } from './ProgressIndicator'
import { ONBOARDING } from '@/lib/constants'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'
import { useOnboardingKeyboardNav } from '@/lib/hooks/useKeyboardShortcuts'

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
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Trap focus in tooltip
  useFocusTrap(tooltipRef as React.RefObject<HTMLElement>, { active: true, returnFocus: false })

  // Keyboard navigation
  useOnboardingKeyboardNav({
    onNext,
    onPrevious,
    onSkip,
  })

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
      const tooltipWidth = ONBOARDING.TOOLTIP_WIDTH
      const tooltipHeight = ONBOARDING.TOOLTIP_HEIGHT
      const gap = ONBOARDING.TOOLTIP_GAP

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

    // Delay initial calculation to let SpotlightOverlay render first
    const initialDelay = setTimeout(calculatePosition, ONBOARDING.TOOLTIP_POSITION_DELAY)
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

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div
      ref={tooltipRef}
      className={`${getPositionClasses()} bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 transition-all duration-300 border-[3px] border-yellow-bright`}
      style={{
        zIndex: 10003,
        maxWidth: isMobile ? 'calc(100vw - 32px)' : '400px',
        animation: prefersReducedMotion ? 'none' : 'slideUp 300ms ease-out',
        pointerEvents: 'auto',
        ...getMobileStyle(),
      }}
      role="dialog"
      aria-label={`Onboarding tour, Step ${step} of ${totalSteps}`}
      aria-describedby="onboarding-description"
    >
      {/* ARIA live region for screen readers */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Step {step} of {totalSteps}: {title}
      </div>

      <ProgressIndicator currentStep={step} totalSteps={totalSteps} />

      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">
        {title}
      </h3>

      <p id="onboarding-description" className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
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
            variant="tertiary"
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
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline transition-colors text-center py-2"
        >
          Skip Tour
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">→</kbd> Next ·{' '}
        {onPrevious && (
          <>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">←</kbd> Back ·{' '}
          </>
        )}
        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Esc</kbd> Skip
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

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  )
}
