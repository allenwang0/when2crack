'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useOnboarding } from '@/lib/contexts/OnboardingContext'
import { ONBOARDING_STEPS } from '@/lib/constants/onboardingSteps'
import { ONBOARDING, trackOnboardingEvent, ONBOARDING_ANALYTICS_EVENTS } from '@/lib/constants'
import { WelcomeModal } from './WelcomeModal'
import { SpotlightOverlay } from './SpotlightOverlay'
import { OnboardingTooltip } from './OnboardingTooltip'
import { ConfettiAnimation } from './ConfettiAnimation'
import { SkipConfirmationModal } from './SkipConfirmationModal'
import { OnboardingErrorBoundary } from './OnboardingErrorBoundary'
import { ResumeModal } from './ResumeModal'

interface OnboardingControllerProps {
  children: React.ReactNode
}

export function OnboardingController({ children }: OnboardingControllerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { loading: authLoading } = useAuth()
  const { state, startTour, skipTour, nextStep, previousStep, completeTour } = useOnboarding()
  const [showWelcome, setShowWelcome] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false)
  const [showResumeModal, setShowResumeModal] = useState(false)
  const [resumeStep, setResumeStep] = useState(0)
  const [isMounted, setIsMounted] = useState(false)
  const tabEventTimeoutsRef = useRef<NodeJS.Timeout[]>([])

  // Track if component is mounted (for portal rendering)
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Check if should show welcome or resume modal on mount
  useEffect(() => {
    if (authLoading) return

    // Small delay to ensure auth state is settled
    const timeout = setTimeout(() => {
      const onboardingSeen = localStorage.getItem('onboarding_seen')
      const onboardingCompleted = localStorage.getItem('onboarding_completed')
      const onboardingSkipped = localStorage.getItem('onboarding_skipped')
      const savedStep = parseInt(localStorage.getItem('onboarding_current_step') || '0', 10)

      // Show resume modal if user was mid-tour (step > 0 but not completed/skipped)
      if (onboardingSeen && !onboardingCompleted && !onboardingSkipped && savedStep > 0) {
        setShowResumeModal(true)
        setResumeStep(savedStep)
      } else if (!onboardingSeen && !onboardingCompleted && !onboardingSkipped) {
        setShowWelcome(true)
      }
      setIsReady(true)
    }, ONBOARDING.AUTH_SETTLE_DELAY)

    return () => clearTimeout(timeout)
  }, [authLoading])

  // Save current step to localStorage for resume functionality
  useEffect(() => {
    if (state.isActive && state.currentStep > 0) {
      localStorage.setItem('onboarding_current_step', state.currentStep.toString())
    } else {
      localStorage.removeItem('onboarding_current_step')
    }
  }, [state.currentStep, state.isActive])

  // Handle step navigation
  useEffect(() => {
    // Clear any pending tab event timeouts from previous step
    tabEventTimeoutsRef.current.forEach(clearTimeout)
    tabEventTimeoutsRef.current = []

    if (!state.isActive || state.currentStep === 0) return

    const step = ONBOARDING_STEPS[state.currentStep - 1]
    if (!step) return

    // Track step view analytics
    trackOnboardingEvent(ONBOARDING_ANALYTICS_EVENTS.STEP_VIEW, {
      step: state.currentStep,
      route: step.route,
      title: step.title,
    })

    // Navigate to correct route
    if (pathname !== step.route) {
      router.push(step.route)
    }

    // Handle tab state for Tonight page via custom event
    if (step.tabState) {
      // Small delay to ensure route has loaded before forcing tab
      // Retry mechanism with exponential backoff to ensure the event is dispatched after listener is ready
      const dispatchTabEvent = (retries = 0) => {
        const event = new CustomEvent('onboarding:forceTab', {
          detail: { tab: step.tabState!.activeTab }
        })
        window.dispatchEvent(event)

        // Exponential backoff: 200ms, 400ms, 800ms
        if (retries < ONBOARDING.TAB_FORCE_MAX_RETRIES) {
          const delay = ONBOARDING.TAB_FORCE_RETRY_DELAY * Math.pow(2, retries)
          const timeout = setTimeout(() => dispatchTabEvent(retries + 1), delay)
          tabEventTimeoutsRef.current.push(timeout)
        }
      }

      const initialTimeout = setTimeout(() => dispatchTabEvent(), ONBOARDING.TAB_FORCE_INITIAL_DELAY)
      tabEventTimeoutsRef.current.push(initialTimeout)
    }

    // Cleanup on unmount or step change
    return () => {
      tabEventTimeoutsRef.current.forEach(clearTimeout)
      tabEventTimeoutsRef.current = []
    }
  }, [state.currentStep, state.isActive, pathname, router])

  const handleStart = () => {
    setShowWelcome(false)
    startTour()
    nextStep() // Move to step 1
  }

  const handleSkipRequest = () => {
    setShowSkipConfirmation(true)
  }

  const handleSkipConfirm = () => {
    setShowSkipConfirmation(false)
    setShowWelcome(false)
    skipTour()
  }

  const handleSkipCancel = () => {
    setShowSkipConfirmation(false)
  }

  const handleResume = () => {
    setShowResumeModal(false)
    // State is already loaded from localStorage via OnboardingContext
  }

  const handleResumeSkip = () => {
    setShowResumeModal(false)
    skipTour()
  }

  const handleNext = () => {
    if (state.currentStep === ONBOARDING_STEPS.length) {
      handleComplete()
    } else {
      nextStep()
    }
  }

  const handleComplete = () => {
    setShowConfetti(true)
    completeTour()

    setTimeout(() => {
      setShowConfetti(false)
      router.push('/roster')
    }, ONBOARDING.COMPLETION_REDIRECT_DELAY)
  }

  // Helper to render overlay content in a portal (outside scroll container)
  const renderInPortal = (content: React.ReactNode) => {
    if (!isMounted || typeof document === 'undefined') return null
    return createPortal(content, document.body)
  }

  // Don't render onboarding UI if not ready or inactive
  if (!isReady || (!showWelcome && !showResumeModal && !state.isActive)) {
    return <>{children}</>
  }

  // Show resume modal
  if (showResumeModal) {
    return (
      <>
        {children}
        {renderInPortal(
          <ResumeModal
            stepNumber={resumeStep}
            onResume={handleResume}
            onSkip={handleResumeSkip}
          />
        )}
      </>
    )
  }

  // Show welcome modal
  if (showWelcome) {
    return (
      <>
        {children}
        {renderInPortal(
          <>
            <WelcomeModal onStart={handleStart} onSkip={handleSkipRequest} />
            {showSkipConfirmation && (
              <SkipConfirmationModal
                onConfirm={handleSkipConfirm}
                onCancel={handleSkipCancel}
              />
            )}
          </>
        )}
      </>
    )
  }

  // Show tour steps
  if (state.isActive && state.currentStep > 0 && state.currentStep <= ONBOARDING_STEPS.length) {
    const step = ONBOARDING_STEPS[state.currentStep - 1]

    // Special handling for last step (FAQ)
    if (state.currentStep === ONBOARDING_STEPS.length) {
      return (
        <>
          {children}
          {renderInPortal(
            <>
              <OnboardingErrorBoundary onReset={handleSkipConfirm}>
                <SpotlightOverlay
                  targetSelector={null}
                  shape="none"
                  padding={0}
                  allowInteraction={true}
                  onAutoSkip={nextStep}
                >
                  <OnboardingTooltip
                    step={state.currentStep}
                    totalSteps={ONBOARDING_STEPS.length}
                    title={step.title}
                    description={step.description}
                    onNext={handleNext}
                    onPrevious={state.currentStep > 1 ? previousStep : undefined}
                    onSkip={handleSkipRequest}
                    targetSelector={null}
                  />
                </SpotlightOverlay>
              </OnboardingErrorBoundary>
              {showSkipConfirmation && (
                <SkipConfirmationModal
                  onConfirm={handleSkipConfirm}
                  onCancel={handleSkipCancel}
                />
              )}
            </>
          )}
        </>
      )
    }

    return (
      <>
        {children}
        {renderInPortal(
          <>
            <OnboardingErrorBoundary onReset={handleSkipConfirm}>
              <SpotlightOverlay
                targetSelector={step.spotlightTarget}
                shape={step.spotlightShape}
                padding={step.spotlightPadding}
                allowInteraction={step.allowInteraction}
                onAutoSkip={nextStep}
              >
                <OnboardingTooltip
                  step={state.currentStep}
                  totalSteps={ONBOARDING_STEPS.length}
                  title={step.title}
                  description={step.description}
                  onNext={handleNext}
                  onPrevious={state.currentStep > 1 ? previousStep : undefined}
                  onSkip={handleSkipRequest}
                  targetSelector={step.spotlightTarget}
                  customContent={step.customContent}
                />
              </SpotlightOverlay>
            </OnboardingErrorBoundary>
            {showSkipConfirmation && (
              <SkipConfirmationModal
                onConfirm={handleSkipConfirm}
                onCancel={handleSkipCancel}
              />
            )}
          </>
        )}
      </>
    )
  }

  // Show confetti on completion
  if (showConfetti) {
    return (
      <>
        {children}
        {renderInPortal(<ConfettiAnimation />)}
      </>
    )
  }

  return <>{children}</>
}
