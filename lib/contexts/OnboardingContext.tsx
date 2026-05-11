'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { useToast } from '@/lib/hooks/useToast'
import { ONBOARDING_STEPS } from '@/lib/constants/onboardingSteps'
import { trackOnboardingEvent, ONBOARDING_ANALYTICS_EVENTS } from '@/lib/constants'
import type { OnboardingState, OnboardingContextValue } from '@/lib/types/onboarding'

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

const INITIAL_STATE: OnboardingState = {
  version: 1,
  currentStep: 0,
  isActive: false,
  hasCompleted: false,
  hasSkipped: false,
  startedAt: null,
  completedAt: null,
  pausedForAction: false,
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE)
  const { showToast } = useToast()

  // Persist to localStorage
  const [onboardingSeen, setOnboardingSeen, onboardingSeenError] = useLocalStorage('onboarding_seen', false)
  const [onboardingCompleted, setOnboardingCompleted, onboardingCompletedError] = useLocalStorage('onboarding_completed', false)
  const [onboardingVersion, setOnboardingVersion, onboardingVersionError] = useLocalStorage('onboarding_version', 0)
  const [onboardingSkipped, setOnboardingSkipped, onboardingSkippedError] = useLocalStorage('onboarding_skipped', false)

  // Handle localStorage quota errors
  useEffect(() => {
    const errors = [
      onboardingSeenError,
      onboardingCompletedError,
      onboardingVersionError,
      onboardingSkippedError,
    ]

    const hasQuotaError = errors.some(err => err === 'QUOTA_EXCEEDED')

    if (hasQuotaError) {
      showToast('Storage limit reached. Sign in to save your progress!', 'error')
      console.warn('LocalStorage quota exceeded in onboarding context')
    }
  }, [onboardingSeenError, onboardingCompletedError, onboardingVersionError, onboardingSkippedError, showToast])

  // Load saved state on mount
  useEffect(() => {
    if (onboardingCompleted) {
      setState(prev => ({
        ...prev,
        hasCompleted: true,
        isActive: false,
      }))
    }
    if (onboardingSkipped) {
      setState(prev => ({
        ...prev,
        hasSkipped: true,
        isActive: false,
      }))
    }
  }, [onboardingCompleted, onboardingSkipped])

  const startTour = useCallback(() => {
    const now = new Date().toISOString()
    setState({
      version: 1,
      currentStep: 0,
      isActive: true,
      hasCompleted: false,
      hasSkipped: false,
      startedAt: now,
      completedAt: null,
      pausedForAction: false,
    })
    setOnboardingSeen(true)
    setOnboardingCompleted(false)
    setOnboardingSkipped(false)

    // Track analytics
    trackOnboardingEvent(ONBOARDING_ANALYTICS_EVENTS.STARTED, { version: 1 })
  }, [setOnboardingSeen, setOnboardingCompleted, setOnboardingSkipped])

  const skipTour = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: false,
      hasSkipped: true,
    }))
    setOnboardingSkipped(true)
    setOnboardingSeen(true)

    // Track analytics
    trackOnboardingEvent(ONBOARDING_ANALYTICS_EVENTS.SKIPPED, { at_step: state.currentStep })
  }, [setOnboardingSkipped, setOnboardingSeen, state.currentStep])

  const nextStep = useCallback(() => {
    setState(prev => {
      const newStep = Math.min(prev.currentStep + 1, ONBOARDING_STEPS.length)

      // Track analytics
      trackOnboardingEvent(ONBOARDING_ANALYTICS_EVENTS.STEP_NEXT, {
        from_step: prev.currentStep,
        to_step: newStep,
      })

      return {
        ...prev,
        currentStep: newStep,
      }
    })
  }, [])

  const previousStep = useCallback(() => {
    setState(prev => {
      const newStep = Math.max(prev.currentStep - 1, 0)

      // Track analytics
      trackOnboardingEvent(ONBOARDING_ANALYTICS_EVENTS.STEP_PREVIOUS, {
        from_step: prev.currentStep,
        to_step: newStep,
      })

      return {
        ...prev,
        currentStep: newStep,
      }
    })
  }, [])

  const goToStep = useCallback((step: number) => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, Math.min(step, ONBOARDING_STEPS.length)),
    }))
  }, [])

  const completeTour = useCallback(() => {
    const now = new Date().toISOString()
    setState(prev => ({
      ...prev,
      isActive: false,
      hasCompleted: true,
      completedAt: now,
    }))
    setOnboardingCompleted(true)
    setOnboardingVersion(1)

    // Track analytics
    const duration = state.startedAt
      ? new Date(now).getTime() - new Date(state.startedAt).getTime()
      : 0

    trackOnboardingEvent(ONBOARDING_ANALYTICS_EVENTS.COMPLETED, {
      duration_ms: duration,
      duration_seconds: Math.round(duration / 1000),
    })
  }, [setOnboardingCompleted, setOnboardingVersion, state.startedAt])

  const pauseForAction = useCallback(() => {
    setState(prev => ({
      ...prev,
      pausedForAction: true,
    }))
  }, [])

  const resumeFromAction = useCallback(() => {
    setState(prev => ({
      ...prev,
      pausedForAction: false,
    }))
    nextStep()
  }, [nextStep])

  const value: OnboardingContextValue = {
    state,
    startTour,
    skipTour,
    nextStep,
    previousStep,
    goToStep,
    completeTour,
    pauseForAction,
    resumeFromAction,
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return context
}
