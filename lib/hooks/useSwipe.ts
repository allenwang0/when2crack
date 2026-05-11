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
    setEnd(currentPos)

    // Calculate offset for visual feedback
    setSwipeOffset({
      x: currentPos.x - start.x,
      y: currentPos.y - start.y,
    })
  }

  const handleEnd = () => {
    if (!start || !end) {
      setSwiping(false)
      setSwipeOffset({ x: 0, y: 0 })
      setIsMouseDown(false)
      return
    }

    const distanceX = end.x - start.x
    const distanceY = end.y - start.y
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
    setStart(null)
    setEnd(null)
    setIsMouseDown(false)
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
    },
    // State
    swiping,
    swipeOffset,
  }
}
