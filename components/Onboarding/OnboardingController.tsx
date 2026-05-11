'use client'

import { useEffect, useState } from 'react'
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
  onForceTab?: (tab: 'tonight' | 'battle') => void
}

export function OnboardingController({ children, onForceTab }: OnboardingControllerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { loading: authLoading } = useAuth()
  const { state, startTour, skipTour, nextStep, previousStep, completeTour } = useOnboarding()
  const [showWelcome, setShowWelcome] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // Check if should show welcome on mount
  useEffect(() => {
    if (authLoading) return

    // Wait for auth to resolve (max 3s)
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
    if (!state.isActive || state.currentStep === 0) return

    const step = ONBOARDING_STEPS[state.currentStep - 1]
    if (!step) return

    // Navigate to correct route
    if (pathname !== step.route) {
      router.push(step.route)
    }

    // Handle tab state for Tonight page
    if (step.tabState && onForceTab) {
      onForceTab(step.tabState.activeTab)
    }
  }, [state.currentStep, state.isActive, pathname, router, onForceTab])

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
    if (state.currentStep === 7) {
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
  if (state.isActive && state.currentStep > 0 && state.currentStep <= 7) {
    const step = ONBOARDING_STEPS[state.currentStep - 1]

    // Special handling for step 7 (FAQ)
    if (state.currentStep === 7) {
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
              totalSteps={7}
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
            totalSteps={7}
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
