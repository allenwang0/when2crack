export interface OnboardingStep {
  id: number
  route: string
  title: string
  description: string
  spotlightTarget: string | null
  spotlightShape: 'circle' | 'rect' | 'none'
  spotlightPadding: number
  allowInteraction: boolean
  requiresAction: boolean
  customContent?: React.ReactNode
  tabState?: {
    activeTab: 'tonight' | 'battle'
  }
  autoScroll: boolean
  edgeCase?: {
    condition: 'empty_roster' | 'has_roster'
    fallbackContent?: React.ReactNode
  }
}

export interface OnboardingState {
  version: number
  currentStep: number
  isActive: boolean
  hasCompleted: boolean
  hasSkipped: boolean
  startedAt: string | null
  completedAt: string | null
  pausedForAction: boolean
}

export interface OnboardingContextValue {
  state: OnboardingState
  startTour: () => void
  skipTour: () => void
  nextStep: () => void
  previousStep: () => void
  goToStep: (step: number) => void
  completeTour: () => void
  pauseForAction: (actionType: string) => void
  resumeFromAction: () => void
}
