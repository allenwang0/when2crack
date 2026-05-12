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
  useFocusTrap(tooltipRef, { active: true, returnFocus: false })

  // Keyboard navigation
  useOnboardingKeyboardNav({
    onNext,
    onPrevious,
    onSkip,
  })

  // Ensure tooltip is scrolled into view when it appears
  useEffect(() => {
    if (tooltipRef.current) {
      tooltipRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [step])

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

      // Account for nav bar height when positioning at bottom
      const navBarHeight = 64 // h-16
      const bottomMargin = navBarHeight + 16 // nav + gap

      // Try bottom first (most common for large elements)
      if (rect.bottom + tooltipHeight + gap < viewportHeight - bottomMargin) {
        newPosition = 'bottom'
        style = {
          top: rect.bottom + gap,
          left: Math.max(gap, Math.min(rect.left + rect.width / 2, viewportWidth - tooltipWidth / 2 - gap)),
          transform: 'translateX(-50%)',
        }
      }
      // Try top
      else if (rect.top - tooltipHeight - gap > 0) {
        newPosition = 'top'
        style = {
          bottom: viewportHeight - rect.top + gap,
          left: Math.max(gap, Math.min(rect.left + rect.width / 2, viewportWidth - tooltipWidth / 2 - gap)),
          transform: 'translateX(-50%)',
        }
      }
      // Try right
      else if (rect.right + tooltipWidth + gap < viewportWidth) {
        newPosition = 'right'
        style = {
          top: Math.max(gap, Math.min(rect.top + rect.height / 2, viewportHeight - tooltipHeight / 2 - gap)),
          left: rect.right + gap,
          transform: 'translateY(-50%)',
        }
      }
      // Try left
      else if (rect.left - tooltipWidth - gap > 0) {
        newPosition = 'left'
        style = {
          top: Math.max(gap, Math.min(rect.top + rect.height / 2, viewportHeight - tooltipHeight / 2 - gap)),
          right: viewportWidth - rect.left + gap,
          transform: 'translateY(-50%)',
        }
      }
      // Fallback: center on screen above nav bar (if target takes up entire viewport)
      else {
        newPosition = 'bottom'
        style = {
          left: '50%',
          bottom: `${bottomMargin + 16}px`,
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
      // Position above navigation bar (64px height + safe area)
      // Use left-4 right-4 for proper margin on mobile
      return 'fixed left-4 right-4'
    }

    // Desktop positioning - will be controlled by inline styles
    // Ensure we don't exceed viewport bounds
    return 'fixed'
  }

  const getMobileStyle = (): React.CSSProperties => {
    if (!isMobile) return tooltipStyle

    // Fixed position above nav bar on mobile
    // Nav bar is h-16 (64px) + safe area padding
    // Force the tooltip to be visible above the nav bar
    return {
      bottom: 'calc(64px + 1rem + env(safe-area-inset-bottom))', // nav height + gap + safe area
      left: '1rem',
      right: '1rem',
      transform: 'none', // Override any desktop transforms
      maxHeight: 'calc(100vh - 64px - 56px - 2rem)', // viewport - nav - header - gaps
      overflowY: 'auto',
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
        visibility: 'visible',
        opacity: 1,
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
