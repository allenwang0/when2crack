import { memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { RosterPerson } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { getInitials } from '@/lib/utils/colors'
import { formatRelativeTime } from '@/lib/utils/dates'
import { calculateCompositeScore } from '@/lib/utils/scores'

interface RosterCardProps {
  person: RosterPerson
}

export const RosterCard = memo(function RosterCard({ person }: RosterCardProps) {
  if (!person || !person.name) {
    return null // Don't render if person data is invalid
  }

  const initials = getInitials(person.name)
  const compositeScore = calculateCompositeScore(person)

  return (
    <Link href={`/profile/${person.id}`}>
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 hover:border-yellow-400 hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer focus-within:ring-4 focus-within:ring-yellow-bright focus-within:ring-offset-2">
        <div className="flex items-start gap-4">
          {/* Avatar - Increased to 64px */}
          {person.avatar_url && person.avatar_url.trim() !== '' ? (
            <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-pink relative">
              <Image
                src={person.avatar_url}
                alt={`${person.name}'s profile photo`}
                fill
                sizes="64px"
                className="object-cover"
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

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-lg text-gray-900 truncate">
                {person.name}
              </h3>
            </div>

            {/* Status Badge - Separate Row */}
            <div className="mb-2">
              <Badge variant="status" status={person.status}>
                {person.status}
              </Badge>
            </div>

            {/* Scores Row - Prominent Elo */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-base font-bold text-gray-900">
                Elo {person.elo_rating}
              </span>
              <span className="text-sm text-gray-600">
                Score: {compositeScore}/10
              </span>
            </div>

            {/* Last Contact */}
            <div className="text-xs text-gray-500">
              Last contact: {person.last_contact_date ? formatRelativeTime(person.last_contact_date) : 'Never'}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
})
