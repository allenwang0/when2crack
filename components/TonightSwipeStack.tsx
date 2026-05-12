'use client'

import { useState } from 'react'
import { useSwipe } from '@/lib/hooks/useSwipe'
import { triggerHaptic } from '@/lib/utils/haptics'
import type { TonightRecommendation } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { getInitials } from '@/lib/utils/colors'

interface TonightSwipeStackProps {
  recommendations: TonightRecommendation[]
  onShootShot: (personId: string) => void
  onSchedule: (personId: string) => void
  onSkip: (personId: string) => void
}

export function TonightSwipeStack({
  recommendations,
  onShootShot,
  onSchedule,
  onSkip,
}: TonightSwipeStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right' | 'up' | null>(null)

  if (currentIndex >= recommendations.length) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="font-serif font-bold text-2xl mb-2 dark:text-gray-100">All Done!</h3>
        <p className="text-gray-600 dark:text-gray-300">You've reviewed all recommendations</p>
      </div>
    )
  }

  const current = recommendations[currentIndex]
  const { person, reasoning } = current

  const handleSwipe = (swipeDirection: 'left' | 'right' | 'up' | 'down') => {
    if (swipeDirection === 'right') {
      triggerHaptic('success')
      setDirection('right')
      onShootShot(person.id)
    } else if (swipeDirection === 'left') {
      triggerHaptic('light')
      setDirection('left')
      onSkip(person.id)
    }
    // Removed vertical swipe handling to prevent scroll conflicts

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1)
      setDirection(null)
    }, 300)
  }

  const { swiping, swipeOffset, ...swipeHandlers } = useSwipe({ onSwipe: handleSwipe, threshold: 70 })
  const initials = getInitials(person.name)

  return (
    <div className="relative h-[600px]">
      {/* Stack preview (next 2 cards behind) */}
      {recommendations.slice(currentIndex + 1, currentIndex + 3).map((rec, i) => (
        <div
          key={rec.person.id}
          className="absolute inset-0 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700"
          style={{
            transform: `scale(${1 - (i + 1) * 0.05}) translateY(${(i + 1) * 10}px)`,
            opacity: 1 - (i + 1) * 0.3,
            zIndex: 10 - i,
          }}
        />
      ))}

      {/* Current card */}
      <div
        {...swipeHandlers}
        className="absolute inset-0 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden cursor-grab active:cursor-grabbing shadow-lg"
        style={{
          transform: swiping
            ? `translateX(${swipeOffset.x}px) rotate(${swipeOffset.x / 20}deg)`
            : direction === 'right'
            ? 'translateX(500px) rotate(20deg)'
            : direction === 'left'
            ? 'translateX(-500px) rotate(-20deg)'
            : 'none',
          transition: swiping ? 'none' : 'transform 0.3s ease-out',
          zIndex: 20,
        }}
      >
        {/* Swipe indicators */}
        {swipeOffset.x > 50 && (
          <div className="absolute top-8 right-8 bg-teal text-white px-6 py-3 rounded-full font-bold text-lg rotate-12 shadow-lg z-30 animate-fade-in">
            SHOOT! 🎯
          </div>
        )}
        {swipeOffset.x < -50 && (
          <div className="absolute top-8 left-8 bg-gray-500 text-white px-6 py-3 rounded-full font-bold text-lg -rotate-12 shadow-lg z-30 animate-fade-in">
            SKIP
          </div>
        )}

        {/* Card content */}
        <div className="p-6 h-full flex flex-col">
          {/* Rank badge */}
          <div className="text-pink font-bold text-base mb-3">
            #{currentIndex + 1} Tonight's Pick
          </div>

          {/* Avatar and name */}
          <div className="flex flex-col items-center mb-4">
            {person.avatar_url && person.avatar_url.trim() !== '' && person.avatar_url !== 'null' && person.avatar_url !== 'undefined' ? (
              <img
                src={person.avatar_url}
                alt={person.name}
                className="w-24 h-24 rounded-full border-4 border-pink mb-3 object-cover bg-white"
                onError={(e) => {
                  // Fallback to initials on error
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full border-4 border-pink mb-3 flex items-center justify-center text-white font-bold text-3xl"
                style={{ backgroundColor: person.avatar_color }}
              >
                {initials}
              </div>
            )}
            <h2 className="font-serif font-bold text-2xl mb-1 dark:text-gray-100">{person.name}</h2>
            <Badge variant="status" status={person.status}>
              {person.status}
            </Badge>
          </div>

          {/* Stats */}
          <div className="mb-4">
            <div className="bg-yellow-soft dark:bg-gray-700 rounded-xl p-3">
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 font-semibold">
                Why tonight:
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-xs">Composite Score</span>
                  <span className="font-bold text-sm">
                    {Math.round(
                      (person.attraction_score +
                        person.personality_score +
                        person.reliability_score) /
                        3
                    )}
                    /10
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs">Reliability</span>
                  <span className="font-bold text-sm text-teal">{reasoning.reliability}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs">ELO Rating</span>
                  <span className="font-bold text-sm">{reasoning.elo_rating}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs">Last Contact</span>
                  <span className="font-bold text-sm">
                    {reasoning.recency_days === 0
                      ? 'Today'
                      : `${reasoning.recency_days}d ago`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-auto">
            <button
              onClick={(e) => {
                e.stopPropagation()
                triggerHaptic('medium')
                onSchedule(person.id)
              }}
              className="w-full py-2.5 px-4 bg-purple hover:bg-purple/90 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-md mb-3"
            >
              📅 Schedule a Time
            </button>

            {/* Instructions */}
            <div className="text-center text-xs text-gray-500 dark:text-gray-300 space-y-0.5">
              <p>👉 Swipe right to shoot your shot</p>
              <p>👈 Swipe left to skip</p>
            </div>
          </div>
        </div>
      </div>

      {/* Counter */}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-sm text-gray-500 dark:text-gray-300">
        {currentIndex + 1} / {recommendations.length}
      </div>
    </div>
  )
}
