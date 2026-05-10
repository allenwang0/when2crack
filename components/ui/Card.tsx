import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
}

export function Card({ children, className = '', onClick, hover = false }: CardProps) {
  const baseStyles = 'bg-card border border-border rounded-lg p-4'
  const hoverStyles = hover ? 'cursor-pointer hover:bg-border transition-colors' : ''
  const clickableStyles = onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''

  return (
    <div
      className={`${baseStyles} ${hoverStyles} ${clickableStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
