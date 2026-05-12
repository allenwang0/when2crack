'use client'

import { useEffect, useState } from 'react'

interface SubtleSpotlightProps {
  targetSelector: string
}

export function SubtleSpotlight({ targetSelector }: SubtleSpotlightProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const updateRect = () => {
      const target = document.querySelector(targetSelector)
      if (!target) return

      setTargetRect(target.getBoundingClientRect())
    }

    updateRect()

    // Update on resize/scroll
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)

    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [targetSelector])

  if (!targetRect) return null

  return (
    <>
      {/* Subtle dark overlay (only 30% opacity) */}
      <div className="fixed inset-0 z-[10001] bg-black/30 pointer-events-none" />

      {/* Highlight ring around element */}
      <div
        className="fixed z-[10002] rounded-xl border-4 border-yellow-400 shadow-lg pointer-events-none animate-pulse-subtle"
        style={{
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16
        }}
      />
    </>
  )
}
