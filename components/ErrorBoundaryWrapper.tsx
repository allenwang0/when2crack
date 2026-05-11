'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '@/lib/utils/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Enhanced Error Boundary with logging and recovery
 */
export class ErrorBoundaryWrapper extends Component<Props, State> {
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
    // Log to console
    logger.error('Error caught by boundary:', error, errorInfo)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg border-2 border-red-200">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-600">
                We're sorry for the inconvenience. The error has been logged and we'll look into it.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-mono text-red-800 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full bg-pink text-white px-4 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-100 text-gray-900 px-4 py-3 rounded-full font-semibold hover:bg-gray-200 transition-colors"
              >
                Go to Home
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-6">
              If the problem persists, try refreshing the page or clearing your browser cache.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
