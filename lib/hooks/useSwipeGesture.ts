import { useState } from 'react'

interface SwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50
}: SwipeOptions) {
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 })
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 })

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd({ x: 0, y: 0 })
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }

  const onTouchEnd = () => {
    if (!touchStart.x || !touchEnd.x) return

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY)

    if (isHorizontalSwipe) {
      const isLeftSwipe = distanceX > threshold
      const isRightSwipe = distanceX < -threshold

      if (isLeftSwipe) onSwipeLeft?.()
      if (isRightSwipe) onSwipeRight?.()
    } else {
      const isUpSwipe = distanceY > threshold
      const isDownSwipe = distanceY < -threshold

      if (isUpSwipe) onSwipeUp?.()
      if (isDownSwipe) onSwipeDown?.()
    }
  }

  return { onTouchStart, onTouchMove, onTouchEnd }
}
