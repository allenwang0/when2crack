'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useOnboarding } from '@/lib/contexts/OnboardingContext'
import { ONBOARDING_STEPS } from '@/lib/constants/onboardingSteps'
import { WelcomeModal } from './WelcomeModal'
import { SpotlightOverlay } from './SpotlightOverlay'
import { OnboardingTooltip } from './OnboardingTooltip'
import { ConfettiAnimation } from './ConfettiAnimation'

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
  const tabEventTimeoutsRef = useRef<NodeJS.Timeout[]>([])

  // Check if should show welcome on mount
  useEffect(() => {
    if (authLoading) return

    // Small delay to ensure auth state is settled
    const timeout = setTimeout(() => {
      const onboardingSeen = localStorage.getItem('onboarding_seen')
      const onboardingCompleted = localStorage.getItem('onboarding_completed')
      const onboardingSkipped = localStorage.getItem('onboarding_skipped')

      if (!onboardingSeen && !onboardingCompleted && !onboardingSkipped) {
        setShowWelcome(true)
      }
      setIsReady(true)
    }, 500)

    return () => clearTimeout(timeout)
  }, [authLoading])

  // Handle step navigation
  useEffect(() => {
    // Clear any pending tab event timeouts from previous step
    tabEventTimeoutsRef.current.forEach(clearTimeout)
    tabEventTimeoutsRef.current = []

    if (!state.isActive || state.currentStep === 0) return

    const step = ONBOARDING_STEPS[state.currentStep - 1]
    if (!step) return

    // Navigate to correct route
    if (pathname !== step.route) {
      router.push(step.route)
    }

    // Handle tab state for Tonight page via custom event
    if (step.tabState) {
      // Small delay to ensure route has loaded before forcing tab
      // Retry mechanism to ensure the event is dispatched after listener is ready
      const dispatchTabEvent = (retries = 0) => {
        const event = new CustomEvent('onboarding:forceTab', {
          detail: { tab: step.tabState!.activeTab }
        })
        window.dispatchEvent(event)

        // Retry up to 3 times if page might still be loading
        if (retries < 3) {
          const timeout = setTimeout(() => dispatchTabEvent(retries + 1), 200)
          tabEventTimeoutsRef.current.push(timeout)
        }
      }

      const initialTimeout = setTimeout(() => dispatchTabEvent(), 300)
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

  const handleSkip = () => {
    setShowWelcome(false)
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
    }, 2000)
  }

  // Don't render onboarding UI if not ready or inactive
  if (!isReady || (!showWelcome && !state.isActive)) {
    return <>{children}</>
  }

  // Show welcome modal
  if (showWelcome) {
    return (
      <>
        {children}
        <WelcomeModal onStart={handleStart} onSkip={handleSkip} />
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
          <SpotlightOverlay
            targetSelector={null}
            shape="none"
            padding={0}
            allowInteraction={true}
          >
            <OnboardingTooltip
              step={state.currentStep}
              totalSteps={ONBOARDING_STEPS.length}
              title={step.title}
              description={step.description}
              onNext={handleNext}
              onPrevious={state.currentStep > 1 ? previousStep : undefined}
              onSkip={handleSkip}
              targetSelector={null}
            />
          </SpotlightOverlay>
        </>
      )
    }

    return (
      <>
        {children}
        <SpotlightOverlay
          targetSelector={step.spotlightTarget}
          shape={step.spotlightShape}
          padding={step.spotlightPadding}
          allowInteraction={step.allowInteraction}
        >
          <OnboardingTooltip
            step={state.currentStep}
            totalSteps={ONBOARDING_STEPS.length}
            title={step.title}
            description={step.description}
            onNext={handleNext}
            onPrevious={state.currentStep > 1 ? previousStep : undefined}
            onSkip={handleSkip}
            targetSelector={step.spotlightTarget}
            customContent={step.customContent}
          />
        </SpotlightOverlay>
      </>
    )
  }

  // Show confetti on completion
  if (showConfetti) {
    return (
      <>
        {children}
        <ConfettiAnimation />
      </>
    )
  }

  return <>{children}</>
}
