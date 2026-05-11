'use client'

import { useEffect, useState } from 'react'

interface SpotlightOverlayProps {
  targetSelector: string | null
  shape: 'circle' | 'rect' | 'none'
  padding: number
  allowInteraction: boolean
  children?: React.ReactNode
}

interface SpotlightPosition {
  top: number
  left: number
  width: number
  height: number
}

export function SpotlightOverlay({
  targetSelector,
  shape,
  padding,
  allowInteraction,
  children,
}: SpotlightOverlayProps) {
  const [position, setPosition] = useState<SpotlightPosition | null>(null)

  useEffect(() => {
    if (!targetSelector) return

    const calculatePosition = () => {
      const element = document.querySelector(targetSelector)
      if (!element) {
        console.warn(`Spotlight target not found: ${targetSelector}`)
        return
      }

      const rect = element.getBoundingClientRect()
      setPosition({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      })

      // Auto-scroll into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    // Initial calculation
    calculatePosition()

    // Recalculate on resize (debounced)
    let resizeTimeout: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(calculatePosition, 200)
    }

    window.addEventListener('resize', handleResize)

    // Recalculate on any DOM mutations (for dynamic content)
    const observer = new MutationObserver(() => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(calculatePosition, 300)
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    })

    return () => {
      window.removeEventListener('resize', handleResize)
      observer.disconnect()
      clearTimeout(resizeTimeout)
    }
  }, [targetSelector, padding])

  if (shape === 'none') {
    return (
      <div
        className="fixed inset-0 bg-black/75 flex items-center justify-center"
        style={{ zIndex: 10000 }}
      >
        {children}
      </div>
    )
  }

  if (!position) {
    return (
      <div
        className="fixed inset-0 bg-black/75"
        style={{ zIndex: 10000, pointerEvents: 'auto' }}
      >
        {children}
      </div>
    )
  }

  const borderRadius = shape === 'circle' ? '50%' : '24px'

  return (
    <>
      {/* Overlay with spotlight cutout */}
      <div
        className="fixed inset-0 transition-all duration-400"
        style={{
          zIndex: 10000,
          background: 'rgba(0, 0, 0, 0.75)',
          clipPath: `polygon(
            0% 0%,
            0% 100%,
            100% 100%,
            100% 0%,
            0% 0%,
            ${position.left}px ${position.top}px,
            ${position.left}px ${position.top + position.height}px,
            ${position.left + position.width}px ${position.top + position.height}px,
            ${position.left + position.width}px ${position.top}px,
            ${position.left}px ${position.top}px
          )`,
          pointerEvents: 'auto',
        }}
      />

      {/* Spotlight highlight (pulsing border) */}
      <div
        className="fixed transition-all duration-400 pointer-events-none"
        style={{
          zIndex: 10001,
          top: position.top,
          left: position.left,
          width: position.width,
          height: position.height,
          borderRadius,
          boxShadow: '0 0 0 3px rgba(255, 217, 61, 0.5), 0 0 20px rgba(255, 217, 61, 0.3)',
          animation: 'pulse 2s ease-in-out infinite',
        }}
      />

      {/* Interaction layer */}
      {allowInteraction && (
        <div
          className="fixed"
          style={{
            zIndex: 10002,
            top: position.top,
            left: position.left,
            width: position.width,
            height: position.height,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              pointerEvents: 'auto',
            }}
          />
        </div>
      )}

      {/* Tooltip content */}
      {children}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.02);
            opacity: 0.8;
          }
        }
      `}</style>
    </>
  )
}
