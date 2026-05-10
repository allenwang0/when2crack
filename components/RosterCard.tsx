import Link from 'next/link'
import type { RosterPerson } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { getInitials } from '@/lib/utils/colors'
import { formatRelativeTime } from '@/lib/utils/dates'
import { calculateCompositeScore } from '@/lib/utils/scores'
import { getAvailabilityIndicator } from '@/lib/algorithms/tonight'

interface RosterCardProps {
  person: RosterPerson
}

export function RosterCard({ person }: RosterCardProps) {
  const initials = getInitials(person.name)
  const compositeScore = calculateCompositeScore(person)
  const availability = getAvailabilityIndicator(person)

  const availabilityColors = {
    likely: 'bg-teal',
    uncertain: 'bg-amber',
    unlikely: 'bg-gray-500',
  }

  return (
    <Link href={`/profile/${person.id}`}>
      <div className="bg-card border border-border rounded-lg p-4 hover:bg-border transition-colors cursor-pointer">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
            style={{ backgroundColor: person.avatar_color }}
          >
            {initials}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {person.name}
              </h3>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Availability indicator */}
                <div
                  className={`w-2 h-2 rounded-full ${availabilityColors[availability]}`}
                  title={availability}
                />
                <Badge variant="tier" tier={person.tier}>
                  {person.tier}
                </Badge>
              </div>
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
}
