import { useEffect } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  description: string
  handler: (e: KeyboardEvent) => void
  preventDefault?: boolean
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

/**
 * Hook for keyboard shortcuts
 * Follows WCAG keyboard navigation guidelines
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     { key: 'Escape', description: 'Close modal', handler: onClose },
 *     { key: 'Enter', description: 'Submit', handler: onSubmit },
 *   ],
 *   enabled: isModalOpen,
 * })
 * ```
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const matchesKey = e.key === shortcut.key
        const matchesCtrl = shortcut.ctrlKey === undefined || e.ctrlKey === shortcut.ctrlKey
        const matchesShift = shortcut.shiftKey === undefined || e.shiftKey === shortcut.shiftKey
        const matchesAlt = shortcut.altKey === undefined || e.altKey === shortcut.altKey

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault()
          }
          shortcut.handler(e)
          break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, enabled])
}

/**
 * Standard onboarding keyboard shortcuts
 * - Enter / Arrow Right: Next step
 * - Arrow Left: Previous step
 * - Escape / s: Skip tour
 *
 * @example
 * ```tsx
 * useOnboardingKeyboardNav({
 *   onNext: handleNext,
 *   onPrevious: handlePrevious,
 *   onSkip: handleSkip,
 * })
 * ```
 */
export function useOnboardingKeyboardNav(handlers: {
  onNext?: () => void
  onPrevious?: () => void
  onSkip?: () => void
  onClose?: () => void
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'Enter',
      description: 'Next step',
      handler: () => handlers.onNext?.(),
    },
    {
      key: 'ArrowRight',
      description: 'Next step',
      handler: () => handlers.onNext?.(),
    },
    {
      key: 'ArrowLeft',
      description: 'Previous step',
      handler: () => handlers.onPrevious?.(),
    },
    {
      key: 'Escape',
      description: 'Skip tour',
      handler: () => handlers.onSkip?.(),
    },
    {
      key: 's',
      description: 'Skip tour',
      handler: () => handlers.onSkip?.(),
    },
  ].filter(s => {
    // Only include shortcuts with defined handlers
    if (s.key === 'Enter' || s.key === 'ArrowRight') return !!handlers.onNext
    if (s.key === 'ArrowLeft') return !!handlers.onPrevious
    if (s.key === 'Escape' || s.key === 's') return !!handlers.onSkip
    return true
  })

  useKeyboardShortcuts({ shortcuts, enabled: true })
}
