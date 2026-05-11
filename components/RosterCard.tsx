import { memo } from 'react'
import Link from 'next/link'
import type { RosterPerson } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { getInitials } from '@/lib/utils/colors'
import { formatRelativeTime } from '@/lib/utils/dates'
import { calculateCompositeScore } from '@/lib/utils/scores'

interface RosterCardProps {
  person: RosterPerson
}

export const RosterCard = memo(function RosterCard({ person }: RosterCardProps) {
  const initials = getInitials(person.name)
  const compositeScore = calculateCompositeScore(person)

  return (
    <Link href={`/profile/${person.id}`}>
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 hover:border-yellow-400 hover:shadow-lg transition-all duration-200 cursor-pointer focus-within:ring-4 focus-within:ring-yellow-bright focus-within:ring-offset-2">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          {person.avatar_url ? (
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-pink">
              <img
                src={person.avatar_url}
                alt={person.name}
                className="w-full h-full object-cover"
                loading="lazy"
                width={48}
                height={48}
              />
            </div>
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ backgroundColor: person.avatar_color }}
            >
              {initials}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {person.name}
              </h3>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Badge variant="status" status={person.status}>
                {person.status}
              </Badge>
              <span className="text-sm text-gray-400">
                Composite: {compositeScore}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Elo: {person.elo_rating}</span>
              <span>Last contact: {formatRelativeTime(person.last_contact_date)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
})
