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
        <p className="text-gray-600 dark:text-gray-400">You've reviewed all recommendations</p>
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
    } else if (swipeDirection === 'up') {
      triggerHaptic('medium')
      setDirection('up')
      onSchedule(person.id)
    }

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1)
      setDirection(null)
    }, 300)
  }

  const swipe = useSwipe({ onSwipe: handleSwipe, threshold: 70 })
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
        {...swipe}
        className="absolute inset-0 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden cursor-grab active:cursor-grabbing shadow-lg"
        style={{
          transform: swipe.swiping
            ? `translateX(${swipe.swipeOffset.x}px) translateY(${swipe.swipeOffset.y}px) rotate(${swipe.swipeOffset.x / 20}deg)`
            : direction
            ? direction === 'right'
              ? 'translateX(500px) rotate(20deg)'
              : direction === 'left'
              ? 'translateX(-500px) rotate(-20deg)'
              : 'translateY(-500px)'
            : 'none',
          transition: swipe.swiping ? 'none' : 'transform 0.3s ease-out',
          zIndex: 20,
        }}
      >
        {/* Swipe indicators */}
        {swipe.swipeOffset.x > 50 && (
          <div className="absolute top-8 right-8 bg-teal text-white px-6 py-3 rounded-full font-bold text-lg rotate-12 shadow-lg z-30 animate-fade-in">
            SHOOT! 🎯
          </div>
        )}
        {swipe.swipeOffset.x < -50 && (
          <div className="absolute top-8 left-8 bg-gray-500 text-white px-6 py-3 rounded-full font-bold text-lg -rotate-12 shadow-lg z-30 animate-fade-in">
            SKIP
          </div>
        )}
        {swipe.swipeOffset.y < -50 && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-purple text-white px-6 py-3 rounded-full font-bold text-lg shadow-lg z-30 animate-fade-in">
            SCHEDULE 📅
          </div>
        )}

        {/* Card content */}
        <div className="p-8 h-full flex flex-col overflow-y-auto">
          {/* Rank badge */}
          <div className="text-pink font-bold text-lg mb-4">
            #{currentIndex + 1} Tonight's Pick
          </div>

          {/* Avatar and name */}
          <div className="flex flex-col items-center mb-6">
            {person.avatar_url && person.avatar_url.trim() !== '' ? (
              <img
                src={person.avatar_url}
                alt={person.name}
                className="w-32 h-32 rounded-full border-4 border-pink mb-4 object-cover"
              />
            ) : (
              <div
                className="w-32 h-32 rounded-full border-4 border-pink mb-4 flex items-center justify-center text-white font-bold text-4xl"
                style={{ backgroundColor: person.avatar_color }}
              >
                {initials}
              </div>
            )}
            <h2 className="font-serif font-bold text-3xl mb-2 dark:text-gray-100">{person.name}</h2>
            <Badge variant="status" status={person.status}>
              {person.status}
            </Badge>
          </div>

          {/* Stats */}
          <div className="space-y-4 mb-6">
            <div className="bg-yellow-soft dark:bg-gray-700 rounded-xl p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-semibold">
                Why tonight:
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Composite Score</span>
                  <span className="font-bold">
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
                  <span className="text-sm">Reliability</span>
                  <span className="font-bold text-teal">{reasoning.reliability}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">ELO Rating</span>
                  <span className="font-bold">{reasoning.elo_rating}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Last Contact</span>
                  <span className="font-bold">
                    {reasoning.recency_days === 0
                      ? 'Today'
                      : `${reasoning.recency_days}d ago`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-auto text-center text-sm text-gray-500 dark:text-gray-400 space-y-2">
            <p>👉 Swipe right to shoot your shot</p>
            <p>👈 Swipe left to skip</p>
            <p>👆 Swipe up to schedule</p>
          </div>
        </div>
      </div>

      {/* Counter */}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-sm text-gray-500 dark:text-gray-400">
        {currentIndex + 1} / {recommendations.length}
      </div>
    </div>
  )
}
