// Date utility functions
import { logger } from './logger'

/**
 * Validates that a Date object is not Invalid Date
 * @param date - The date to validate
 * @param functionName - Name of the calling function for logging
 * @returns true if valid, false if invalid
 */
function isValidDate(date: Date, functionName: string): boolean {
  if (isNaN(date.getTime())) {
    logger.warn(`Invalid date in ${functionName}`, { date })
    return false
  }
  return true
}

export function daysBetween(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2

  // Validate dates
  if (!isValidDate(d1, 'daysBetween') || !isValidDate(d2, 'daysBetween')) {
    return 0 // Safe default
  }

  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date

  // Validate date
  if (!isValidDate(d, 'formatRelativeTime')) {
    return 'unknown'
  }

  const now = new Date()
  const days = daysBetween(d, now)

  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date

  // Validate date
  if (!isValidDate(d, 'formatDate')) {
    return 'Invalid date'
  }

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date

  // Validate date
  if (!isValidDate(d, 'formatTime')) {
    return 'Invalid time'
  }

  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
