'use client'

import React from 'react'
import { logger } from '@/lib/utils/logger'
import { Button } from '@/components/ui/Button'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Error boundary caught error:', { error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button onClick={() => (window.location.href = '/')}>
              Return Home
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export function UnhandledPromiseHandler() {
  if (typeof window !== 'undefined') {
    React.useEffect(() => {
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        logger.error('Unhandled promise rejection:', event.reason)
        event.preventDefault()
      }

      window.addEventListener('unhandledrejection', handleUnhandledRejection)

      return () => {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      }
    }, [])
  }

  return null
}
