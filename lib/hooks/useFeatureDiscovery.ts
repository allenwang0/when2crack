import { useState, useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'

export function useFeatureDiscovery(featureId: string, delayMs: number = 1000) {
  const [hasSeenTip, setHasSeenTip] = useLocalStorage(
    `feature_tip_${featureId}`,
    false
  )

  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    if (!hasSeenTip) {
      // Show tip after delay on this page
      const timer = setTimeout(() => {
        setShouldShow(true)
      }, delayMs)
      return () => clearTimeout(timer)
    }
  }, [hasSeenTip, delayMs])

  const markAsSeen = () => {
    setHasSeenTip(true)
    setShouldShow(false)
  }

  return { shouldShow, markAsSeen, hasSeenTip }
}
