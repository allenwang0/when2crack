'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'

interface TooltipPosition {
  top?: number
  left?: number
  bottom?: number
  right?: number
  arrowPosition: 'top' | 'bottom' | 'left' | 'right'
  arrowOffset: number
}

interface FloatingTooltipProps {
  targetSelector: string
  title: string
  description: string
  onNext: () => void
  onSkip: () => void
  step: number
  totalSteps: number
  hideButtons?: boolean
}

function calculateSmartPosition(
  targetRect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number
): TooltipPosition {
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth
  const isMobile = viewportWidth < 640

  const MARGIN = 16
  const ARROW_SIZE = 12

  // Element in top 30%? Place below
  if (targetRect.top < viewportHeight * 0.3) {
    const left = isMobile
      ? MARGIN
      : Math.max(MARGIN, Math.min(
          targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
          viewportWidth - tooltipWidth - MARGIN
        ))

    return {
      top: targetRect.bottom + ARROW_SIZE,
      left,
      ...(isMobile && { right: MARGIN }),
      arrowPosition: 'top',
      arrowOffset: targetRect.left + targetRect.width / 2 - left
    }
  }

  // Element in bottom 30%? Place above
  if (targetRect.bottom > viewportHeight * 0.7) {
    const left = isMobile
      ? MARGIN
      : Math.max(MARGIN, Math.min(
          targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
          viewportWidth - tooltipWidth - MARGIN
        ))

    return {
      bottom: viewportHeight - targetRect.top + ARROW_SIZE,
      left,
      ...(isMobile && { right: MARGIN }),
      arrowPosition: 'bottom',
      arrowOffset: targetRect.left + targetRect.width / 2 - left
    }
  }

  // Middle: place below on mobile, to right on desktop
  if (isMobile) {
    return {
      top: targetRect.bottom + ARROW_SIZE,
      left: MARGIN,
      right: MARGIN,
      arrowPosition: 'top',
      arrowOffset: targetRect.left + targetRect.width / 2 - MARGIN
    }
  } else {
    // Desktop: place to right if room, otherwise left
    const hasRoomOnRight = targetRect.right + tooltipWidth + ARROW_SIZE + MARGIN < viewportWidth

    if (hasRoomOnRight) {
      return {
        top: Math.max(MARGIN, targetRect.top + targetRect.height / 2 - tooltipHeight / 2),
        left: targetRect.right + ARROW_SIZE,
        arrowPosition: 'left',
        arrowOffset: targetRect.top + targetRect.height / 2
      }
    } else {
      return {
        top: Math.max(MARGIN, targetRect.top + targetRect.height / 2 - tooltipHeight / 2),
        right: viewportWidth - targetRect.left + ARROW_SIZE,
        arrowPosition: 'right',
        arrowOffset: targetRect.top + targetRect.height / 2
      }
    }
  }
}

export function FloatingTooltip({
  targetSelector,
  title,
  description,
  onNext,
  onSkip,
  step,
  totalSteps,
  hideButtons = false
}: FloatingTooltipProps) {
  const [position, setPosition] = useState<TooltipPosition | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = document.querySelector(targetSelector)
    if (!target) {
      console.warn(`Onboarding: Target not found: ${targetSelector}`)
      return
    }

    // Scroll element to center of screen
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    })

    // Calculate position after scroll completes
    const timeout = setTimeout(() => {
      const rect = target.getBoundingClientRect()
      const tooltipWidth = tooltipRef.current?.offsetWidth || 280
      const tooltipHeight = tooltipRef.current?.offsetHeight || 150
      const pos = calculateSmartPosition(rect, tooltipWidth, tooltipHeight)
      setPosition(pos)
    }, 400)

    return () => clearTimeout(timeout)
  }, [targetSelector])

  if (!position) return null

  const arrowClasses = {
    top: 'absolute -top-2 left-0 w-4 h-4 bg-white dark:bg-gray-800 border-yellow-400 border-t-2 border-l-2 rotate-45',
    bottom: 'absolute -bottom-2 left-0 w-4 h-4 bg-white dark:bg-gray-800 border-yellow-400 border-b-2 border-r-2 rotate-45',
    left: 'absolute -left-2 top-0 w-4 h-4 bg-white dark:bg-gray-800 border-yellow-400 border-l-2 border-b-2 rotate-45',
    right: 'absolute -right-2 top-0 w-4 h-4 bg-white dark:bg-gray-800 border-yellow-400 border-r-2 border-t-2 rotate-45'
  }

  const positionStyle: React.CSSProperties = {
    ...(position.top !== undefined && { top: `${position.top}px` }),
    ...(position.left !== undefined && { left: `${position.left}px` }),
    ...(position.bottom !== undefined && { bottom: `${position.bottom}px` }),
    ...(position.right !== undefined && { right: `${position.right}px` })
  }

  const arrowStyle: React.CSSProperties = {}
  if (position.arrowPosition === 'top' || position.arrowPosition === 'bottom') {
    arrowStyle.left = `${position.arrowOffset}px`
  } else {
    arrowStyle.top = `${position.arrowOffset}px`
  }

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[10003] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-yellow-400 p-4 max-w-[280px] sm:max-w-[350px] animate-scale-in"
      style={positionStyle}
    >
      {/* Arrow */}
      <div
        className={arrowClasses[position.arrowPosition]}
        style={arrowStyle}
      />

      {/* Content */}
      <div className="relative z-10">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
          {step} of {totalSteps}
        </p>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {description}
        </p>

        {!hideButtons && (
          <div className="flex gap-2">
            <Button
              onClick={onNext}
              size="sm"
              className="flex-1"
            >
              Got it
            </Button>
            <button
              onClick={onSkip}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3"
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
