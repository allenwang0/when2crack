'use client'

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

/**
 * Trigger haptic feedback on supported devices
 * Works on iOS Safari, Android Chrome, and other supporting browsers
 */
export function triggerHaptic(pattern: HapticPattern = 'light') {
  // Check if Vibration API is supported
  if (!('vibrate' in navigator)) {
    return
  }

  // Vibration patterns (in milliseconds)
  const patterns: Record<HapticPattern, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 10],
    warning: [20, 100, 20],
    error: [30, 100, 30, 100, 30],
  }

  const vibrationPattern = patterns[pattern]

  try {
    if (Array.isArray(vibrationPattern)) {
      navigator.vibrate(vibrationPattern)
    } else {
      navigator.vibrate(vibrationPattern)
    }
  } catch (error) {
    // Silently fail on unsupported devices
    if (process.env.NODE_ENV === 'development') {
      console.debug('Haptic feedback not supported:', error)
    }
  }
}

/**
 * Stop any ongoing vibration
 */
export function stopHaptic() {
  if ('vibrate' in navigator) {
    navigator.vibrate(0)
  }
}
