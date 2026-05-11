import React from 'react'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />
}

interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function SkeletonAvatar({ size = 'md', className = '' }: SkeletonAvatarProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  }

  return (
    <div
      className={`skeleton rounded-full ${sizeClasses[size]} ${className}`}
      aria-hidden="true"
    />
  )
}

interface SkeletonTextProps {
  width?: string
  height?: string
  className?: string
}

export function SkeletonText({
  width = 'w-full',
  height = 'h-4',
  className = ''
}: SkeletonTextProps) {
  return (
    <div
      className={`skeleton rounded ${width} ${height} ${className}`}
      aria-hidden="true"
    />
  )
}

interface SkeletonRectangleProps {
  width?: string
  height?: string
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  className?: string
}

export function SkeletonRectangle({
  width = 'w-full',
  height = 'h-20',
  rounded = 'md',
  className = ''
}: SkeletonRectangleProps) {
  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full'
  }

  return (
    <div
      className={`skeleton ${roundedClasses[rounded]} ${width} ${height} ${className}`}
      aria-hidden="true"
    />
  )
}
