'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
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

  // Persist to localStorage
  const [onboardingSeen, setOnboardingSeen] = useLocalStorage('onboarding_seen', false)
  const [onboardingCompleted, setOnboardingCompleted] = useLocalStorage('onboarding_completed', false)
  const [onboardingVersion, setOnboardingVersion] = useLocalStorage('onboarding_version', 0)
  const [onboardingSkipped, setOnboardingSkipped] = useLocalStorage('onboarding_skipped', false)

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
  }, [setOnboardingSeen, setOnboardingCompleted, setOnboardingSkipped])

  const skipTour = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: false,
      hasSkipped: true,
    }))
    setOnboardingSkipped(true)
    setOnboardingSeen(true)
  }, [setOnboardingSkipped, setOnboardingSeen])

  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 7),
    }))
  }, [])

  const previousStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }))
  }, [])

  const goToStep = useCallback((step: number) => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, Math.min(step, 7)),
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
    if (typeof window !== 'undefined' && (window as any).plausible) {
      (window as any).plausible('onboarding_completed', {
        props: {
          duration: state.startedAt ? Date.now() - new Date(state.startedAt).getTime() : 0,
        },
      })
    }
  }, [setOnboardingCompleted, setOnboardingVersion, state.startedAt])

  const pauseForAction = useCallback((actionType: string) => {
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
