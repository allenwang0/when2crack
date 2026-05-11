'use client'

import { useEffect, useState, useRef } from 'react'
import { ONBOARDING, trackOnboardingEvent, ONBOARDING_ANALYTICS_EVENTS } from '@/lib/constants'

interface SpotlightOverlayProps {
  targetSelector: string | null
  shape: 'circle' | 'rect' | 'none'
  padding: number
  allowInteraction: boolean
  children?: React.ReactNode
  onAutoSkip?: () => void
}

interface SpotlightPosition {
  top: number
  left: number
  width: number
  height: number
}

const MAX_RETRIES = ONBOARDING.SPOTLIGHT_MAX_RETRIES
const RETRY_DELAY = ONBOARDING.SPOTLIGHT_RETRY_DELAY

export function SpotlightOverlay({
  targetSelector,
  shape,
  padding,
  allowInteraction,
  children,
  onAutoSkip,
}: SpotlightOverlayProps) {
  const [position, setPosition] = useState<SpotlightPosition | null>(null)
  const [targetFound, setTargetFound] = useState(true)
  const hasScrolledRef = useRef(false)
  const retryCountRef = useRef(0)
  const previousTargetRef = useRef<string | null>(null)
  const observerRef = useRef<MutationObserver | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const resizeTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    if (!targetSelector) return

    // Reset when target changes
    if (previousTargetRef.current !== targetSelector) {
      hasScrolledRef.current = false
      retryCountRef.current = 0
      setTargetFound(true)
      previousTargetRef.current = targetSelector

      // Disconnect old observer when target changes
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }

      // Clear any pending retry timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = undefined
      }
    }

    const calculatePosition = () => {
      const element = document.querySelector(targetSelector)
      if (!element) {
        // Retry logic for missing elements
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++
          retryTimeoutRef.current = setTimeout(calculatePosition, RETRY_DELAY)
          return
        }

        // MAX RETRIES REACHED - AUTO-SKIP
        console.warn(`Spotlight target not found after ${MAX_RETRIES} attempts: ${targetSelector}`)

        // Track analytics
        trackOnboardingEvent(ONBOARDING_ANALYTICS_EVENTS.TARGET_NOT_FOUND, {
          selector: targetSelector,
          retries: MAX_RETRIES,
        })

        // Auto-skip to next step if enabled
        if (ONBOARDING.AUTO_SKIP_AFTER_RETRIES && onAutoSkip) {
          console.info('Auto-skipping to next step due to missing target')

          trackOnboardingEvent(ONBOARDING_ANALYTICS_EVENTS.STEP_SKIP_AUTO, {
            reason: 'target_not_found',
            selector: targetSelector,
          })

          setTimeout(() => onAutoSkip(), 1000) // Delay for user to see message
        }

        setTargetFound(false)
        setPosition(null)
        return
      }

      setTargetFound(true)
      const rect = element.getBoundingClientRect()
      setPosition({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      })

      // Only scroll once when target first appears
      if (!hasScrolledRef.current) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        hasScrolledRef.current = true
      }
    }

    // Initial calculation with small delay to let DOM settle
    const initialTimeout = setTimeout(calculatePosition, ONBOARDING.INITIAL_CALCULATION_DELAY)

    // Recalculate on resize (debounced)
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      resizeTimeoutRef.current = setTimeout(calculatePosition, RETRY_DELAY)
    }

    window.addEventListener('resize', handleResize)

    // Optimized MutationObserver - only watch the likely container
    const observer = new MutationObserver(() => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      resizeTimeoutRef.current = setTimeout(calculatePosition, ONBOARDING.MUTATION_DEBOUNCE_MS)
    })

    // Store observer ref for cleanup on target change
    observerRef.current = observer

    // Watch only the main content area, not entire body
    const mainContent = document.querySelector('main') || document.body
    observer.observe(mainContent, {
      childList: true,
      subtree: true,
      attributes: false, // Don't watch attribute changes for performance
    })

    return () => {
      window.removeEventListener('resize', handleResize)
      observer.disconnect()
      if (observerRef.current === observer) {
        observerRef.current = null
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      clearTimeout(initialTimeout)
      console.debug('SpotlightOverlay cleanup complete for target:', targetSelector)
    }
  }, [targetSelector, padding, onAutoSkip])

  if (shape === 'none') {
    return (
      <div
        className="fixed inset-0 bg-black/75 dark:bg-black/60 flex items-center justify-center"
        style={{ zIndex: 10000 }}
      >
        {children}
      </div>
    )
  }

  // Show loading/error state when target not found
  if (!position) {
    return (
      <div
        className="fixed inset-0 bg-black/75 dark:bg-black/60 flex items-center justify-center"
        style={{ zIndex: 10000, pointerEvents: 'none' }}
      >
        {!targetFound && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm mx-4 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {ONBOARDING.AUTO_SKIP_AFTER_RETRIES
                ? 'Target element not found. Skipping to next step...'
                : 'Looking for the next element...'}
            </p>
            {!ONBOARDING.AUTO_SKIP_AFTER_RETRIES && (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink mx-auto"></div>
            )}
          </div>
        )}
        {children}
      </div>
    )
  }

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const borderRadius = shape === 'circle' ? '50%' : '24px'

  return (
    <>
      {/* Overlay with spotlight cutout */}
      <div
        className={`fixed inset-0 ${prefersReducedMotion ? '' : 'transition-all duration-400'}`}
        style={{
          zIndex: 10000,
          background: 'rgba(0, 0, 0, 0.75)',
          clipPath: `polygon(
            0% 0%,
            0% 100%,
            100% 100%,
            100% 0%,
            0% 0%,
            ${position.left}px ${position.top}px,
            ${position.left}px ${position.top + position.height}px,
            ${position.left + position.width}px ${position.top + position.height}px,
            ${position.left + position.width}px ${position.top}px,
            ${position.left}px ${position.top}px
          )`,
          pointerEvents: 'auto',
        }}
      />

      {/* Spotlight highlight (pulsing border) */}
      <div
        className={`fixed ${prefersReducedMotion ? '' : 'transition-all duration-400'} pointer-events-none`}
        style={{
          zIndex: 10001,
          top: position.top,
          left: position.left,
          width: position.width,
          height: position.height,
          borderRadius,
          boxShadow: '0 0 0 3px rgba(255, 217, 61, 0.5), 0 0 20px rgba(255, 217, 61, 0.3)',
          animation: prefersReducedMotion ? 'none' : 'pulse 2s ease-in-out infinite',
        }}
      />

      {/* Interaction layer */}
      {allowInteraction && (
        <div
          className="fixed"
          style={{
            zIndex: 10002,
            top: position.top,
            left: position.left,
            width: position.width,
            height: position.height,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              pointerEvents: 'auto',
            }}
          />
        </div>
      )}

      {/* Tooltip content */}
      {children}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.02);
            opacity: 0.8;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .fixed {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </>
  )
}
