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

function getReasons(person: RosterPerson): string[] {
  const reasons: string[] = []

  // Reliability check
  if ((person.reliability_score || 0) >= 7) {
    reasons.push("Usually responds quickly")
  } else if ((person.reliability_score || 0) <= 4) {
    reasons.push("Sometimes hard to reach")
  }

  // Recency check
  const lastContact = person.last_contact_date ? new Date(person.last_contact_date) : null
  if (lastContact) {
    const daysSince = Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSince <= 7) {
      reasons.push(`Chatted ${daysSince} ${daysSince === 1 ? 'day' : 'days'} ago`)
    } else if (daysSince >= 28) {
      reasons.push("Haven't connected in a while")
    }
  }

  // Connection strength
  const composite = calculateCompositeScore(person)
  if (composite >= 7) {
    reasons.push("Strong connection")
  } else if (composite >= 6) {
    reasons.push("Good vibe")
  }

  // ELO/preference check
  if ((person.elo_rating || 1500) >= 1550) {
    reasons.push("One of your top picks")
  }

  // If no reasons yet, add a default
  if (reasons.length === 0) {
    reasons.push("Worth reaching out to")
  }

  return reasons.slice(0, 3) // Max 3 reasons
}

export const BattleCard = memo(function BattleCard({ person, onClick, disabled }: BattleCardProps) {
  const initials = getInitials(person.name)
  const compositeScore = calculateCompositeScore(person)
  const reasons = getReasons(person)

  const handleClick = () => {
    triggerHaptic('light')
    onClick()
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-4 sm:p-6 transition-all duration-200 transform ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-yellow-400 hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-bright focus-visible:ring-offset-2'
      }`}
      aria-label={`Choose ${person.name}. ${reasons.join(', ')}`}
    >
      {/* Avatar */}
      {person.avatar_url && person.avatar_url.trim() !== '' && person.avatar_url !== 'null' && person.avatar_url !== 'undefined' ? (
        <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden mx-auto mb-4 sm:mb-5 border-4 border-pink relative bg-white dark:bg-gray-800">
          <Image
            src={person.avatar_url}
            alt={`${person.name}'s profile photo`}
            fill
            sizes="(max-width: 640px) 80px, 112px"
            className="object-cover"
            priority
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        </div>
      ) : (
        <div
          className="w-20 h-20 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-white font-bold text-3xl sm:text-4xl mx-auto mb-4 sm:mb-5"
          style={{ backgroundColor: person.avatar_color }}
        >
          {initials}
        </div>
      )}

      {/* Name */}
      <div className="mb-4 text-center">
        {person.name.split(' ').map((part, index, array) => {
          if (index === array.length - 1 && array.length > 1) {
            return (
              <h3 key={index} className="text-xl sm:text-2xl font-serif font-bold text-foreground dark:text-gray-100 leading-tight">
                {part}
              </h3>
            )
          } else {
            return (
              <h3 key={index} className="text-lg sm:text-xl font-serif font-bold text-foreground dark:text-gray-100 leading-tight">
                {part}
              </h3>
            )
          }
        })}
      </div>

      {/* Status Badge */}
      {person.status && person.status !== 'Regular' && (
        <div className="flex justify-center mb-4">
          <Badge status={person.status} />
        </div>
      )}

      {/* Overall Score */}
      <div className="mb-4 text-center">
        <div className="inline-block bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-full px-4 py-1">
          <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
            ⭐ {compositeScore}/10
          </span>
        </div>
      </div>

      {/* Why Reach Out? */}
      <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-3 sm:p-4">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wide">
          Why reach out?
        </p>
        <div className="space-y-1.5">
          {reasons.map((reason, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="text-green-500 text-sm mt-0.5">✓</span>
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-snug">
                {reason}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tap hint */}
      <div className="mt-4 text-center">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          Tap to choose
        </span>
      </div>
    </button>
  )
})
