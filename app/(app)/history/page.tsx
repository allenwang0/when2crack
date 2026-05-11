'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { GuestBanner } from '@/components/GuestBanner'
import { Badge } from '@/components/ui/Badge'
import { getInitials, getTierColor } from '@/lib/utils/colors'
import { formatDate, formatRelativeTime } from '@/lib/utils/dates'
import { calculateCompositeScore } from '@/lib/utils/scores'
import type { RosterPerson, Hang } from '@/lib/types'

type HangWithPerson = Hang & {
  person: RosterPerson
}

export default function HistoryPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [hangs, setHangs] = useState<HangWithPerson[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetchHangs()
  }, [user])

  const fetchHangs = async () => {
    if (!user) return

    setLoading(true)

    // Fetch all hangs
    const { data: hangsData, error: hangsError } = await supabase
      .from('hangs')
      .select('*')
      .eq('user_id', user.id)
      .order('hang_date', { ascending: false })

    if (hangsError) {
      console.error('Error fetching hangs:', hangsError)
      setLoading(false)
      return
    }

    // Fetch all roster people
    const { data: rosterData, error: rosterError } = await supabase
      .from('roster')
      .select('*')
      .eq('user_id', user.id)

    if (rosterError) {
      console.error('Error fetching roster:', rosterError)
      setLoading(false)
      return
    }

    // Create a map of roster people by ID for quick lookup
    const rosterMap = new Map(
      (rosterData as RosterPerson[] | null)?.map(person => [person.id, person]) || []
    )

    // Combine hangs with their corresponding person
    const hangsWithPerson: HangWithPerson[] = ((hangsData as Hang[] | null) || [])
      .map(hang => {
        const person = rosterMap.get(hang.roster_id)
        if (!person) return null
        return {
          ...hang,
          person
        }
      })
      .filter((hang): hang is HangWithPerson => hang !== null)

    setHangs(hangsWithPerson)
    setLoading(false)
  }

  const getScoreIcon = (dimension: string) => {
    switch (dimension) {
      case 'attraction': return '🔥'
      case 'personality': return '💬'
      case 'reliability': return '⏰'
      default: return ''
    }
  }

  const getScoreLabel = (dimension: string) => {
    switch (dimension) {
      case 'attraction': return 'Attraction'
      case 'personality': return 'Personality'
      case 'reliability': return 'Reliability'
      default: return ''
    }
  }


  if (!user && !authLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink to-purple bg-clip-text text-transparent">
              History
            </h1>
            <p className="text-gray-500 text-sm">Your encounter log</p>
          </div>
          <GuestBanner />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink to-purple bg-clip-text text-transparent">
            History
          </h1>
          <p className="text-gray-500 text-sm">Your encounter log</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink"></div>
          </div>
        ) : hangs.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-gray-400 mb-2">No encounters logged yet</p>
            <p className="text-sm text-gray-500">
              Start logging hangs from individual profiles
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {hangs.map((hang) => {
              const person = hang.person
              const compositeScore = calculateCompositeScore(person)

              return (
                <div
                  key={hang.id}
                  className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/profile/${person.id}`)}
                >
                  {/* Header: Avatar, Name, Date */}
                  <div className="flex items-start gap-3 mb-3">
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                      style={{ backgroundColor: person.avatar_color }}
                    >
                      {person.avatar_url ? (
                        <img
                          src={person.avatar_url}
                          alt={person.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(person.name)
                      )}
                    </div>

                    {/* Name and Date */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">
                          {person.name}
                        </h3>
                        <Badge variant="tier" tier={person.tier}>
                          {person.tier}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{formatDate(hang.hang_date)}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(hang.hang_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Score Changes */}
                  {(hang.attraction_change !== 0 ||
                    hang.personality_change !== 0 ||
                    hang.reliability_change !== 0) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[
                        {
                          dim: 'attraction',
                          change: hang.attraction_change,
                        },
                        {
                          dim: 'personality',
                          change: hang.personality_change,
                        },
                        {
                          dim: 'reliability',
                          change: hang.reliability_change,
                        },
                      ]
                        .filter((item) => item.change !== 0)
                        .map((item) => (
                          <div
                            key={item.dim}
                            className={`text-xs px-2 py-1 rounded-full border ${
                              item.change > 0
                                ? 'bg-teal/10 text-teal border-teal/20'
                                : 'bg-red-400/10 text-red-400 border-red-400/20'
                            }`}
                          >
                            {getScoreIcon(item.dim)}{' '}
                            {getScoreLabel(item.dim)}{' '}
                            {item.change > 0 ? '↑' : '↓'} {Math.abs(item.change)}
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Current Rating */}
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">Overall Rating</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pink to-purple transition-all"
                          style={{ width: `${compositeScore * 10}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {compositeScore.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  {hang.notes && (
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {hang.notes}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
