import { memo } from 'react'
import type { RosterPerson } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { getInitials } from '@/lib/utils/colors'
import { calculateCompositeScore } from '@/lib/utils/scores'

interface BattleCardProps {
  person: RosterPerson
  onClick: () => void
  disabled?: boolean
}

export const BattleCard = memo(function BattleCard({ person, onClick, disabled }: BattleCardProps) {
  const initials = getInitials(person.name)
  const compositeScore = calculateCompositeScore(person)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full bg-white border-2 border-gray-200 rounded-2xl p-3 sm:p-6 transition-all duration-200 ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-yellow-400 hover:shadow-lg active:scale-98 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-bright focus-visible:ring-offset-2'
      }`}
    >
      {/* Avatar */}
      {person.avatar_url ? (
        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full overflow-hidden mx-auto mb-3 sm:mb-4 border-2 border-pink">
          <img
            src={person.avatar_url}
            alt={person.name}
            className="w-full h-full object-cover"
            loading="lazy"
            width={96}
            height={96}
          />
        </div>
      ) : (
        <div
          className="w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white font-bold text-2xl sm:text-3xl mx-auto mb-3 sm:mb-4"
          style={{ backgroundColor: person.avatar_color }}
        >
          {initials}
        </div>
      )}

      {/* Name */}
      <div className="mb-2 text-center">
        {person.name.split(' ').map((part, index, array) => {
          if (index === array.length - 1 && array.length > 1) {
            // Last name - slightly larger
            return (
              <h3 key={index} className="text-lg sm:text-2xl font-serif font-bold text-foreground leading-tight">
                {part}
              </h3>
            )
          } else {
            // First/middle names
            return (
              <h3 key={index} className="text-base sm:text-xl font-serif font-bold text-foreground leading-tight">
                {part}
              </h3>
            )
          }
        })}
      </div>

      {/* Scores */}
      <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-400">Composite</span>
          <span className="font-semibold text-pink">{compositeScore}</span>
        </div>
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-400">Attraction</span>
          <span className="text-foreground">{person.attraction_score}</span>
        </div>
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-400">Personality</span>
          <span className="text-foreground">{person.personality_score}</span>
        </div>
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-400">Reliability</span>
          <span className="text-foreground">{person.reliability_score}</span>
        </div>
      </div>

      {/* Elo Rating */}
      <div className="text-xs text-gray-500 mb-2">
        Elo: {person.elo_rating}
      </div>

      {/* Tap instruction */}
      {!disabled && (
        <div className="mt-2 sm:mt-4 text-xs sm:text-sm text-pink font-medium">
          Tap to choose
        </div>
      )}
    </button>
  )
})
