'use client'

import { useState, TouchEvent } from 'react'

export type SwipeDirection = 'left' | 'right' | 'up' | 'down'

interface UseSwipeOptions {
  onSwipe: (direction: SwipeDirection) => void
  threshold?: number // Minimum distance for swipe (px)
}

export function useSwipe({ onSwipe, threshold = 50 }: UseSwipeOptions) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  const [swiping, setSwiping] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 })

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    })
    setSwiping(true)
  }

  const onTouchMove = (e: TouchEvent) => {
    if (!touchStart) return

    const currentTouch = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    }

    setTouchEnd(currentTouch)

    // Calculate offset for visual feedback
    setSwipeOffset({
      x: currentTouch.x - touchStart.x,
      y: currentTouch.y - touchStart.y,
    })
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setSwiping(false)
      setSwipeOffset({ x: 0, y: 0 })
      return
    }

    const distanceX = touchEnd.x - touchStart.x
    const distanceY = touchEnd.y - touchStart.y
    const absX = Math.abs(distanceX)
    const absY = Math.abs(distanceY)

    // Determine if horizontal or vertical swipe
    if (absX > absY && absX > threshold) {
      // Horizontal swipe
      onSwipe(distanceX > 0 ? 'right' : 'left')
    } else if (absY > absX && absY > threshold) {
      // Vertical swipe
      onSwipe(distanceY > 0 ? 'down' : 'up')
    }

    // Reset
    setSwiping(false)
    setSwipeOffset({ x: 0, y: 0 })
    setTouchStart(null)
    setTouchEnd(null)
  }

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    swiping,
    swipeOffset,
  }
}
