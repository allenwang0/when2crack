'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { trackOnboardingEvent, ONBOARDING_ANALYTICS_EVENTS } from '@/lib/constants'

interface Props {
  children: ReactNode
  onReset: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary for onboarding flow
 * Provides graceful fallback when spotlight/tooltip fails
 */
export class OnboardingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Onboarding error caught:', error, errorInfo)

    // Track analytics
    trackOnboardingEvent(ONBOARDING_ANALYTICS_EVENTS.ERROR, {
      error: error.message,
      stack: error.stack?.substring(0, 100) || '',
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    })
    this.props.onReset()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 10005,
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Tour Paused
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                The onboarding tour encountered an issue. You can skip the tour or try again.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <p className="text-sm font-mono text-red-800 dark:text-red-200 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={this.handleReset}
                variant="primary"
                className="w-full"
              >
                Skip Tour
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="tertiary"
                className="w-full"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
