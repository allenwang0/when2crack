'use client'

import { useState } from 'react'
import { useSwipeGesture } from '@/lib/hooks/useSwipeGesture'
import { CarouselCard } from './CarouselCard'
import { Button } from '@/components/ui/Button'

interface CarouselData {
  id: number
  title: string
  description: string
  icon: string | React.ReactNode
  illustration?: React.ReactNode
}

const CARDS: CarouselData[] = [
  {
    id: 1,
    title: "when2crack",
    description: "Rank your roster. Plan your night.",
    icon: "🎯"
  },
  {
    id: 2,
    title: "How It Works",
    description: "Compare people to help decide who to reach out to",
    icon: "👥"
  },
  {
    id: 3,
    title: "Try with Demo Data",
    description: "We've pre-filled sample people so you can explore",
    icon: "📝"
  }
]

interface WelcomeCarouselProps {
  onComplete: () => void
  onSkip: () => void
}

export function WelcomeCarousel({ onComplete, onSkip }: WelcomeCarouselProps) {
  const [currentCard, setCurrentCard] = useState(0)

  const nextCard = () => {
    if (currentCard < CARDS.length - 1) {
      setCurrentCard(prev => prev + 1)
    } else {
      onComplete()
    }
  }

  const prevCard = () => {
    if (currentCard > 0) {
      setCurrentCard(prev => prev - 1)
    }
  }

  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeGesture({
    onSwipeLeft: nextCard,
    onSwipeRight: prevCard,
    threshold: 50
  })

  const isFirstCard = currentCard === 0
  const isLastCard = currentCard === CARDS.length - 1

  return (
    <div className="fixed inset-0 z-[10005] bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-400 overflow-hidden">
      <div
        className="h-full flex flex-col items-center justify-between py-8"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Skip Button (Top Right) */}
        <div className="w-full px-6 flex justify-end">
          <button
            onClick={onSkip}
            className="text-white/80 hover:text-white font-medium text-lg transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Card Content (Center) */}
        <div className="flex-1 flex items-center justify-center w-full">
          <div
            key={currentCard}
            className="animate-fade-in"
          >
            <CarouselCard {...CARDS[currentCard]} />
          </div>
        </div>

        {/* Bottom Section (Progress + Navigation) */}
        <div className="w-full px-6 space-y-6">
          {/* Progress Dots */}
          <div className="flex justify-center gap-2">
            {CARDS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentCard(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentCard
                    ? 'w-8 bg-white'
                    : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {!isFirstCard && (
              <Button
                onClick={prevCard}
                variant="secondary"
                size="lg"
                className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/40"
              >
                Back
              </Button>
            )}
            <Button
              onClick={nextCard}
              size="lg"
              className="flex-1 bg-white text-purple-600 hover:bg-white/90 font-semibold"
            >
              {isLastCard ? 'Get Started' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
