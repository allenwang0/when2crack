import { memo } from 'react'
import Image from 'next/image'
import type { RosterPerson } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { getInitials } from '@/lib/utils/colors'
import { calculateCompositeScore } from '@/lib/utils/scores'
import { triggerHaptic } from '@/lib/utils/haptics'

interface BattleCardProps {
  person: RosterPerson
  onClick: () => void
  disabled?: boolean
}

export const BattleCard = memo(function BattleCard({ person, onClick, disabled }: BattleCardProps) {
  const initials = getInitials(person.name)
  const compositeScore = calculateCompositeScore(person)

  const handleClick = () => {
    triggerHaptic('light')
    onClick()
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-3 sm:p-6 transition-all duration-200 transform ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-yellow-400 hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-bright focus-visible:ring-offset-2'
      }`}
      aria-label={`Choose ${person.name} as winner. Composite score: ${compositeScore}, ELO: ${person.elo_rating}`}
    >
      {/* Avatar */}
      {person.avatar_url && person.avatar_url.trim() !== '' && person.avatar_url !== 'null' && person.avatar_url !== 'undefined' ? (
        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full overflow-hidden mx-auto mb-4 sm:mb-5 border-2 border-pink relative bg-white dark:bg-gray-800">
          <Image
            src={person.avatar_url}
            alt={`${person.name}'s profile photo`}
            fill
            sizes="(max-width: 640px) 64px, 96px"
            className="object-cover"
            priority
            onError={(e) => {
              // Fallback to initials on error
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        </div>
      ) : (
        <div
          className="w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white font-bold text-2xl sm:text-3xl mx-auto mb-4 sm:mb-5"
          style={{ backgroundColor: person.avatar_color }}
        >
          {initials}
        </div>
      )}

      {/* Name */}
      <div className="mb-3 sm:mb-4 text-center">
        {person.name.split(' ').map((part, index, array) => {
          if (index === array.length - 1 && array.length > 1) {
            // Last name - slightly larger
            return (
              <h3 key={index} className="text-lg sm:text-2xl font-serif font-bold text-foreground dark:text-gray-100 leading-tight">
                {part}
              </h3>
            )
          } else {
            // First/middle names
            return (
              <h3 key={index} className="text-base sm:text-xl font-serif font-bold text-foreground dark:text-gray-100 leading-tight">
                {part}
              </h3>
            )
          }
        })}
      </div>

      {/* Scores */}
      <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-5">
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-600 dark:text-gray-400">Composite</span>
          <span className="font-semibold text-pink">{compositeScore}</span>
        </div>
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-600 dark:text-gray-400">Attraction</span>
          <span className="text-foreground dark:text-gray-200">{person.attraction_score}</span>
        </div>
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-600 dark:text-gray-400">Personality</span>
          <span className="text-foreground dark:text-gray-200">{person.personality_score}</span>
        </div>
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-600 dark:text-gray-400">Reliability</span>
          <span className="text-foreground dark:text-gray-200">{person.reliability_score}</span>
        </div>
      </div>

      {/* Elo Rating */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Elo: {person.elo_rating}
      </div>
    </button>
  )
})
