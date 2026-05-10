'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { GuestBanner } from '@/components/GuestBanner'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { PostHangPrompt } from '@/components/PostHangPrompt'
import { getInitials } from '@/lib/utils/colors'
import { calculateCompositeScore } from '@/lib/utils/scores'
import { formatDate, formatRelativeTime } from '@/lib/utils/dates'
import type { RosterPerson, Hang } from '@/lib/types'

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const [localRoster, setLocalRoster] = useLocalStorage<RosterPerson[]>('guest_roster', [])

  const [person, setPerson] = useState<RosterPerson | null>(null)
  const [hangs, setHangs] = useState<Hang[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showHangPrompt, setShowHangPrompt] = useState(false)

  useEffect(() => {
    // Guest mode: Load from localStorage
    if (!user) {
      const guestPerson = localRoster.find(p => p.id === id)
      if (!guestPerson) {
        router.push('/roster')
        return
      }
      setPerson(guestPerson)
      setNotes(guestPerson.notes || '')
      setLoading(false)
      return
    }

    // Authenticated mode: Load from Supabase
    const fetchProfile = async () => {
      // Fetch person
      // @ts-ignore
      const { data: personData, error: personError } = await supabase
        .from('roster')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (personError) {
        console.error('Error fetching person:', personError)
        router.push('/roster')
        return
      }

      setPerson(personData as RosterPerson)
      setNotes(personData.notes || '')

      // Fetch hangs
      // @ts-ignore
      const { data: hangsData } = await supabase
        .from('hangs')
        .select('*')
        .eq('roster_id', id)
        .eq('user_id', user.id)
        .order('hang_date', { ascending: false })

      if (hangsData) {
        setHangs(hangsData as Hang[])
      }

      setLoading(false)
    }

    fetchProfile()
  }, [id, user, supabase, router, localRoster])

  const handleSaveNotes = async () => {
    if (!person) return

    setSaving(true)

    // Guest mode: Update localStorage
    if (!user) {
      const updatedRoster = localRoster.map(p =>
        p.id === person.id ? { ...p, notes } : p
      )
      setLocalRoster(updatedRoster)
      setSaving(false)
      return
    }

    // Authenticated mode: Update Supabase
    // @ts-ignore
    await supabase
      .from('roster')
      .update({ notes })
      .eq('id', person.id)
      .eq('user_id', user.id)

    setSaving(false)
  }

  const handleHangLogged = () => {
    setShowHangPrompt(false)
    // Refresh the profile data
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="py-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!person) {
    return null
  }

  const initials = getInitials(person.name)
  const compositeScore = calculateCompositeScore(person)

  return (
    <div className="py-6 pb-20">
      {!user && <GuestBanner />}

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0"
          style={{ backgroundColor: person.avatar_color }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-serif font-bold mb-1">{person.name}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="tier" tier={person.tier}>
              {person.tier} Tier
            </Badge>
            <Badge variant="status" status={person.status}>
              {person.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Composite Score */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6 text-center">
        <p className="text-sm text-gray-400 mb-1">Composite Score</p>
        <p className="text-4xl font-serif font-bold text-pink">{compositeScore}</p>
        <p className="text-xs text-gray-500 mt-1">
          Average of Attraction, Personality, Reliability
        </p>
      </div>

      {/* Dimension Scores */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h3 className="font-semibold mb-4">Scores</h3>

        {/* Attraction */}
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">Attraction</span>
            <span className="font-semibold">{person.attraction_score}/10</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-pink rounded-full transition-all"
              style={{ width: `${(person.attraction_score / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Personality */}
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">Personality</span>
            <span className="font-semibold">{person.personality_score}/10</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-teal rounded-full transition-all"
              style={{ width: `${(person.personality_score / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Reliability */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">Reliability</span>
            <span className="font-semibold">{person.reliability_score}/10</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-coral rounded-full transition-all"
              style={{ width: `${(person.reliability_score / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{person.elo_rating}</p>
          <p className="text-xs text-gray-500">Elo Rating</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{hangs.length}</p>
          <p className="text-xs text-gray-500">Hangs</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-sm font-bold text-foreground">
            {formatRelativeTime(person.last_contact_date)}
          </p>
          <p className="text-xs text-gray-500">Last Contact</p>
        </div>
      </div>

      {/* Field Notes */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h3 className="font-semibold mb-3">Field Notes</h3>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSaveNotes}
          placeholder="Private notes about this person..."
          rows={4}
          className="mb-3"
        />
        {saving && (
          <p className="text-xs text-gray-500">Saving...</p>
        )}
      </div>

      {/* Contact History */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h3 className="font-semibold mb-4">Contact History</h3>

        {hangs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No hangs logged yet
          </p>
        ) : (
          <div className="space-y-3">
            {hangs.map((hang) => (
              <div
                key={hang.id}
                className="border-l-2 border-pink pl-3 py-1"
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-medium">
                    {formatDate(hang.hang_date)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatRelativeTime(hang.hang_date)}
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  {hang.attraction_change !== 0 && (
                    <span
                      className={
                        hang.attraction_change > 0
                          ? 'text-teal'
                          : 'text-red-400'
                      }
                    >
                      Attraction {hang.attraction_change > 0 ? '+' : ''}
                      {hang.attraction_change}
                    </span>
                  )}
                  {hang.personality_change !== 0 && (
                    <span
                      className={
                        hang.personality_change > 0
                          ? 'text-teal'
                          : 'text-red-400'
                      }
                    >
                      Personality {hang.personality_change > 0 ? '+' : ''}
                      {hang.personality_change}
                    </span>
                  )}
                  {hang.reliability_change !== 0 && (
                    <span
                      className={
                        hang.reliability_change > 0
                          ? 'text-teal'
                          : 'text-red-400'
                      }
                    >
                      Reliability {hang.reliability_change > 0 ? '+' : ''}
                      {hang.reliability_change}
                    </span>
                  )}
                </div>
                {hang.notes && (
                  <p className="text-xs text-gray-400 mt-1">{hang.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {user && (
          <Button className="flex-1" onClick={() => setShowHangPrompt(true)}>
            Log Hang
          </Button>
        )}
        <Button variant="secondary" onClick={() => router.push('/roster')} className={user ? '' : 'flex-1'}>
          Back
        </Button>
      </div>

      {/* Post-Hang Prompt Modal */}
      {showHangPrompt && user && (
        <PostHangPrompt
          person={person}
          onClose={() => setShowHangPrompt(false)}
          onSuccess={handleHangLogged}
        />
      )}
    </div>
  )
}
