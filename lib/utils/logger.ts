/**
 * Centralized logging utility
 * Only logs in development, silent in production unless explicitly enabled
 */

const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

export const logger = {
  /**
   * Development only logs
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args)
    }
  },

  /**
   * General information
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args)
    }
  },

  /**
   * Warning messages (shown in both dev and prod)
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args)
  },

  /**
   * Error messages (shown in both dev and prod)
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args)

    // In production, could send to error tracking service
    if (isProduction) {
      // TODO: Send to Sentry or other error tracking service
      // Example: Sentry.captureException(args[0])
    }
  },

  /**
   * Log authentication events
   */
  auth: (event: string, details?: any) => {
    if (isDevelopment) {
      console.log(`[AUTH] ${event}`, details || '')
    }
  },

  /**
   * Log database operations (dev only)
   */
  db: (operation: string, details?: any) => {
    if (isDevelopment) {
      console.log(`[DB] ${operation}`, details || '')
    }
  },

  /**
   * Log API calls (dev only)
   */
  api: (method: string, endpoint: string, status?: number) => {
    if (isDevelopment) {
      console.log(`[API] ${method} ${endpoint}`, status ? `(${status})` : '')
    }
  },

  /**
   * Performance timing
   */
  time: (label: string) => {
    if (isDevelopment) {
      console.time(`[PERF] ${label}`)
    }
  },

  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(`[PERF] ${label}`)
    }
  },

  /**
   * Group logs together
   */
  group: (label: string) => {
    if (isDevelopment) {
      console.group(label)
    }
  },

  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd()
    }
  },
}

/**
 * Assert helper for development
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    logger.error('Assertion failed:', message)
    if (isDevelopment) {
      throw new Error(`Assertion failed: ${message}`)
    }
  }
}

/**
 * Type guard logger
 */
export function logTypeError(expected: string, received: any): void {
  logger.error(`Type error: Expected ${expected}, received:`, typeof received, received)
}
