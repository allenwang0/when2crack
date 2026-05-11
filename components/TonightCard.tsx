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

export function TonightCard({ recommendation, rank, onShootShot }: TonightCardProps) {
  const { person, reasoning } = recommendation
  const initials = getInitials(person.name)

  const rankColors = {
    1: 'text-pink',
    2: 'text-teal',
    3: 'text-amber',
  }

  const rankLabels = {
    1: '🥇 Top Pick',
    2: '🥈 Second Best',
    3: '🥉 Third Best',
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      {/* Rank */}
      <div className={`text-sm font-semibold mb-3 ${rankColors[rank as 1 | 2 | 3]}`}>
        {rankLabels[rank as 1 | 2 | 3]}
      </div>

      {/* Person Info */}
      <div className="flex items-start gap-3 mb-4">
        {person.avatar_url ? (
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-pink">
            <img src={person.avatar_url} alt={person.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
            style={{ backgroundColor: person.avatar_color }}
          >
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-bold text-lg mb-1">{person.name}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="tier" tier={person.tier}>
              {person.tier}
            </Badge>
            <span className="text-xs text-gray-500">
              Elo {reasoning.elo_rating}
            </span>
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="bg-background rounded-lg p-3 mb-4 space-y-1.5">
        <p className="text-xs text-gray-400 font-medium">Why tonight:</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Tier</span>
          <span className="font-semibold">{reasoning.tier}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Reliability</span>
          <span className="font-semibold">{reasoning.reliability}/10</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Last contact</span>
          <span className="font-semibold">
            {reasoning.recency_days === 0
              ? 'Today'
              : `${reasoning.recency_days}d ago`}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={() => onShootShot(person.id)}
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
}
