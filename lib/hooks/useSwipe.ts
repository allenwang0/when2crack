'use client'

import { useState, TouchEvent, MouseEvent } from 'react'

export type SwipeDirection = 'left' | 'right' | 'up' | 'down'

interface UseSwipeOptions {
  onSwipe: (direction: SwipeDirection) => void
  threshold?: number // Minimum distance for swipe (px)
}

export function useSwipe({ onSwipe, threshold = 50 }: UseSwipeOptions) {
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)
  const [end, setEnd] = useState<{ x: number; y: number } | null>(null)
  const [swiping, setSwiping] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 })
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [isHorizontalSwipe, setIsHorizontalSwipe] = useState<boolean | null>(null)

  // Extract coordinates from touch or mouse event
  const getCoordinates = (e: TouchEvent | MouseEvent): { x: number; y: number } => {
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      }
    } else {
      return {
        x: e.clientX,
        y: e.clientY,
      }
    }
  }

  const handleStart = (e: TouchEvent | MouseEvent) => {
    const coords = getCoordinates(e)
    setEnd(null)
    setStart(coords)
    setSwiping(true)
    setIsHorizontalSwipe(null) // Reset direction detection

    if ('clientX' in e) {
      // Mouse event
      setIsMouseDown(true)
    }
  }

  const handleMove = (e: TouchEvent | MouseEvent) => {
    if (!start) return

    // For mouse events, only handle if mouse is down
    if ('clientX' in e && !isMouseDown) return

    const currentPos = getCoordinates(e)
    const deltaX = currentPos.x - start.x
    const deltaY = currentPos.y - start.y

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      setIsHorizontalSwipe(Math.abs(deltaX) > Math.abs(deltaY))
    }

    // Only engage swipe handler for horizontal movements
    // This allows vertical scrolling to work normally
    if (isHorizontalSwipe === false) {
      return
    }

    setEnd(currentPos)

    // Calculate offset for visual feedback (only horizontal for swipe cards)
    setSwipeOffset({
      x: deltaX,
      y: 0, // Don't move card vertically to avoid conflict with scrolling
    })
  }

  const handleEnd = () => {
    if (!start || !end || isHorizontalSwipe === false) {
      // Reset everything if no swipe or if it was a vertical scroll
      setSwiping(false)
      setSwipeOffset({ x: 0, y: 0 })
      setIsMouseDown(false)
      setIsHorizontalSwipe(null)
      setStart(null)
      setEnd(null)
      return
    }

    const distanceX = end.x - start.x
    const absX = Math.abs(distanceX)

    // Only detect horizontal swipes to avoid conflict with vertical scrolling
    if (absX > threshold) {
      // Horizontal swipe
      onSwipe(distanceX > 0 ? 'right' : 'left')
    }

    // Reset
    setSwiping(false)
    setSwipeOffset({ x: 0, y: 0 })
    setStart(null)
    setEnd(null)
    setIsMouseDown(false)
    setIsHorizontalSwipe(null)
  }

  return {
    // Touch events
    onTouchStart: handleStart,
    onTouchMove: handleMove,
    onTouchEnd: handleEnd,
    // Mouse events
    onMouseDown: handleStart,
    onMouseMove: handleMove,
    onMouseUp: handleEnd,
    onMouseLeave: () => {
      // End swipe if mouse leaves the element while dragging
      if (isMouseDown) {
        handleEnd()
      }
      // Also reset state if just hovering
      if (!isMouseDown) {
        setIsHorizontalSwipe(null)
      }
    },
    // State
    swiping,
    swipeOffset,
  }
}
