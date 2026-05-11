import { memo } from 'react'
import Link from 'next/link'
import type { TonightRecommendation } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getInitials } from '@/lib/utils/colors'

interface TonightCardProps {
  recommendation: TonightRecommendation
  rank: number
  onShootShot: (personId: string) => void
}

export const TonightCard = memo(function TonightCard({ recommendation, rank, onShootShot }: TonightCardProps) {
  const { person, reasoning } = recommendation
  const initials = getInitials(person.name)

  const rankColors: Record<number, string> = {
    1: 'text-pink',
    2: 'text-purple',
    3: 'text-amber',
    4: 'text-teal',
    5: 'text-blue',
  }

  const rankLabels: Record<number, string> = {
    1: '🥇 Top Pick',
    2: '🥈 Second Best',
    3: '🥉 Third Best',
    4: '4️⃣ Fourth Best',
    5: '5️⃣ Fifth Best',
  }

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:border-yellow-400 hover:shadow-lg transition-all duration-200">
      {/* Rank */}
      <div className={`text-sm font-semibold mb-3 ${rankColors[rank] || 'text-gray-600 dark:text-gray-400'}`}>
        {rankLabels[rank] || `#${rank}`}
      </div>

      {/* Person Info */}
      <div className="flex items-start gap-4 mb-4">
        {person.avatar_url && person.avatar_url.trim() !== '' && person.avatar_url !== 'null' && person.avatar_url !== 'undefined' ? (
          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-pink bg-white dark:bg-gray-800">
            <img
              src={person.avatar_url}
              alt={person.name}
              className="w-full h-full object-cover"
              loading="lazy"
              width={64}
              height={64}
              onError={(e) => {
                // Fallback to initials on error
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
            style={{ backgroundColor: person.avatar_color }}
          >
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-bold text-lg mb-2 text-gray-900 dark:text-gray-100">{person.name}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="status" status={person.status}>
              {person.status}
            </Badge>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Elo {reasoning.elo_rating}
            </span>
          </div>
        </div>
      </div>

      {/* Reasoning - Increased Contrast */}
      <div className="bg-yellow-soft dark:bg-yellow-900/20 rounded-xl p-4 mb-4 space-y-3 border border-yellow-bright/20 dark:border-yellow-bright/30">
        <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold mb-2">Why tonight:</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700 dark:text-gray-300">Composite</span>
          <span className="font-bold text-gray-900 dark:text-gray-100">{Math.round((person.attraction_score + person.personality_score + person.reliability_score) / 3)}/10</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700 dark:text-gray-300 font-medium">Reliability</span>
          <span className="font-bold text-teal dark:text-teal">{reasoning.reliability}/10</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700 dark:text-gray-300">Last contact</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {reasoning.recency_days === 0
              ? 'Today'
              : `${reasoning.recency_days}d ago`}
          </span>
        </div>
      </div>

      {/* Actions - Primary gradient for main CTA */}
      <div className="flex gap-3">
        <Button
          onClick={() => onShootShot(person.id)}
          variant="primary"
          className="flex-1"
          size="sm"
        >
          Shoot Shot
        </Button>
        <Link href={`/profile/${person.id}`} className="flex-1">
          <Button variant="secondary" size="sm" className="w-full">
            View Profile
          </Button>
        </Link>
      </div>
    </div>
  )
})
