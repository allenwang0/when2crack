import { useEffect, useRef } from 'react'

interface UseFocusTrapOptions {
  active: boolean
  initialFocus?: HTMLElement | null
  returnFocus?: boolean
}

/**
 * Hook to trap focus within a container (WCAG 2.1 requirement)
 * Used for modal dialogs and onboarding tooltips
 *
 * @example
 * ```tsx
 * const modalRef = useRef<HTMLDivElement>(null)
 * useFocusTrap(modalRef, { active: true, returnFocus: true })
 * ```
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseFocusTrapOptions = { active: true, returnFocus: true }
) {
  const { active, initialFocus, returnFocus = true } = options
  const previouslyFocusedElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active || !containerRef.current) return

    // Store currently focused element
    previouslyFocusedElement.current = document.activeElement as HTMLElement

    // Get all focusable elements
    const getFocusableElements = (): HTMLElement[] => {
      if (!containerRef.current) return []

      const selector =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

      return Array.from(containerRef.current.querySelectorAll(selector))
    }

    // Focus first element or specified initial element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      const elementToFocus = initialFocus || focusableElements[0]
      elementToFocus?.focus()
    }

    // Handle tab key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown)

      // Return focus to previously focused element
      if (returnFocus && previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus()
      }
    }
  }, [active, containerRef, initialFocus, returnFocus])
}
