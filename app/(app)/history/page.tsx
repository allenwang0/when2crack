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

type When2CrackShare = {
  id: string
  recipient_name: string
  share_url: string
  viewed: boolean
  viewed_at: string | null
  responded: boolean
  responded_at: string | null
  created_at: string
}

export default function HistoryPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<'hangs' | 'when2cracks'>('hangs')
  const [hangs, setHangs] = useState<HangWithPerson[]>([])
  const [when2cracks, setWhen2cracks] = useState<When2CrackShare[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetchHangs()
    fetchWhen2cracks()
  }, [user])

  const fetchHangs = async () => {
    if (!user) return

    setLoading(true)

    // Fetch all hangs - only needed columns
    const { data: hangsData, error: hangsError } = await supabase
      .from('hangs')
      .select('id, roster_id, hang_date, attraction_change, personality_change, reliability_change, notes, created_at')
      .eq('user_id', user.id)
      .order('hang_date', { ascending: false })

    if (hangsError) {
      console.error('Error fetching hangs:', hangsError)
      setLoading(false)
      return
    }

    // Fetch all roster people - only name and avatar needed for display
    const { data: rosterData, error: rosterError } = await supabase
      .from('roster')
      .select('id, name, avatar_url, avatar_color')
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

  const fetchWhen2cracks = async () => {
    if (!user) return

    try {
      // @ts-ignore
      const { data, error } = await supabase
        .from('when2crack_shares')
        .select('*')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching when2cracks:', error)
        return
      }

      setWhen2cracks((data as When2CrackShare[]) || [])
    } catch (err) {
      console.error('Error fetching when2cracks:', err)
    }
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
      <div className="py-6">
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
    <div className="py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink to-purple bg-clip-text text-transparent">
            History
          </h1>
          <p className="text-gray-500 text-sm">Your encounter log & when2cracks</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('hangs')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              activeTab === 'hangs'
                ? 'bg-gradient-to-r from-pink to-purple text-white shadow-md'
                : 'bg-card text-gray-600 hover:bg-gray-50'
            }`}
          >
            Hangs ({hangs.length})
          </button>
          <button
            onClick={() => setActiveTab('when2cracks')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              activeTab === 'when2cracks'
                ? 'bg-gradient-to-r from-pink to-purple text-white shadow-md'
                : 'bg-card text-gray-600 hover:bg-gray-50'
            }`}
          >
            When2Cracks ({when2cracks.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink"></div>
          </div>
        ) : activeTab === 'hangs' ? (
          hangs.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <p className="text-gray-600 mb-2">No encounters logged yet</p>
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
          )
        ) : (
          // When2Cracks Tab
          when2cracks.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <p className="text-gray-600 mb-2">No when2cracks sent yet</p>
              <p className="text-sm text-gray-500">
                Share your schedule from the Schedule page or profile pages
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {when2cracks.map((share) => (
                <div
                  key={share.id}
                  className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        📅 {share.recipient_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatRelativeTime(share.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {share.viewed && (
                        <span className="text-xs bg-teal/10 text-teal px-2 py-1 rounded-full">
                          ✓ Viewed
                        </span>
                      )}
                      {share.responded && (
                        <span className="text-xs bg-purple/10 text-purple px-2 py-1 rounded-full">
                          💬 Responded
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(share.share_url)
                          // Note: This page already has useToast imported via tonight page pattern
                          // Consider adding toast notification here in future iteration
                          if (typeof window !== 'undefined') {
                            // Temporary: Use native notification
                            const toast = document.createElement('div')
                            toast.textContent = 'Link copied!'
                            toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#10b981;color:white;padding:12px 24px;border-radius:8px;z-index:9999;'
                            document.body.appendChild(toast)
                            setTimeout(() => toast.remove(), 2000)
                          }
                        } catch (err) {
                          if (process.env.NODE_ENV === 'development') {
                            console.error('Failed to copy:', err)
                          }
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      📋 Copy Link
                    </button>
                    <button
                      onClick={() => window.open(share.share_url, '_blank')}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-pink to-purple text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      👁️ View
                    </button>
                  </div>

                  {share.responded && share.responded_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      Responded {formatRelativeTime(share.responded_at)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        )}
    </div>
  )
}
