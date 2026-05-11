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
      New: 'bg-teal/20 text-teal',
      Chatting: 'bg-blue-500/20 text-blue-400',
      'Met Once': 'bg-purple-500/20 text-purple-400',
      Regular: 'bg-pink/20 text-pink',
      Archived: 'bg-gray-500/20 text-gray-400',
    }
    variantStyles = status ? statusColors[status] : 'bg-gray-500/20 text-gray-400'
  } else if (variant === 'availability') {
    const availabilityColors = {
      likely: 'bg-teal/20 text-teal',
      uncertain: 'bg-amber/20 text-amber',
      unlikely: 'bg-gray-500/20 text-gray-400',
    }
    variantStyles = availability
      ? availabilityColors[availability]
      : 'bg-gray-500/20 text-gray-400'
  } else {
    variantStyles = 'bg-card border border-border text-foreground'
  }

  return <span className={`${baseStyles} ${variantStyles} ${className}`}>{children}</span>
}
