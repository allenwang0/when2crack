import React from 'react'
import type { Tier, Status } from '@/lib/types'
import { getTierColor } from '@/lib/utils/colors'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'tier' | 'status' | 'availability' | 'default'
  tier?: Tier
  status?: Status
  availability?: 'likely' | 'uncertain' | 'unlikely'
  className?: string
}

export function Badge({
  children,
  variant = 'default',
  tier,
  status,
  availability,
  className = '',
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium'

  let variantStyles = ''

  if (variant === 'tier' && tier) {
    const color = getTierColor(tier)
    variantStyles = `border border-current`
    return (
      <span
        className={`${baseStyles} ${variantStyles} ${className}`}
        style={{ color, borderColor: color }}
      >
        {children}
      </span>
    )
  }

  if (variant === 'status') {
    const statusColors = {
      New: 'bg-teal/20 dark:bg-teal/30 text-teal dark:text-teal',
      Chatting: 'bg-blue-500/20 dark:bg-blue-500/30 text-blue-400 dark:text-blue-300',
      'Met Once': 'bg-purple-500/20 dark:bg-purple-500/30 text-purple-400 dark:text-purple-300',
      Regular: 'bg-pink/20 dark:bg-pink/30 text-pink dark:text-pink',
      Archived: 'bg-gray-500/20 dark:bg-gray-500/30 text-gray-400 dark:text-gray-300',
    }
    variantStyles = status ? statusColors[status] : 'bg-gray-500/20 dark:bg-gray-500/30 text-gray-400 dark:text-gray-300'
  } else if (variant === 'availability') {
    const availabilityColors = {
      likely: 'bg-teal/20 dark:bg-teal/30 text-teal dark:text-teal',
      uncertain: 'bg-amber/20 dark:bg-amber/30 text-amber dark:text-amber',
      unlikely: 'bg-gray-500/20 dark:bg-gray-500/30 text-gray-400 dark:text-gray-300',
    }
    variantStyles = availability
      ? availabilityColors[availability]
      : 'bg-gray-500/20 dark:bg-gray-500/30 text-gray-400 dark:text-gray-300'
  } else {
    variantStyles = 'bg-card dark:bg-gray-800 border border-border dark:border-gray-700 text-foreground dark:text-gray-100'
  }

  return <span className={`${baseStyles} ${variantStyles} ${className}`}>{children}</span>
}
