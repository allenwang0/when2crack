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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showHangPrompt, setShowHangPrompt] = useState(false)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !person) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB')
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = async () => {
      const newAvatarUrl = reader.result as string
      setAvatarUrl(newAvatarUrl)

      // Save immediately
      if (!user) {
        // Guest mode: Update localStorage
        const updatedRoster = localRoster.map(p =>
          p.id === person.id ? { ...p, avatar_url: newAvatarUrl } : p
        )
        setLocalRoster(updatedRoster)
        setPerson({ ...person, avatar_url: newAvatarUrl })
      } else {
        // Authenticated mode: Update Supabase
        // @ts-ignore
        await supabase
          .from('roster')
          .update({ avatar_url: newAvatarUrl })
          .eq('id', person.id)
          .eq('user_id', user.id)

        setPerson({ ...person, avatar_url: newAvatarUrl })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = async () => {
    if (!person) return

    setAvatarUrl(null)

    if (!user) {
      // Guest mode: Update localStorage
      const updatedRoster = localRoster.map(p =>
        p.id === person.id ? { ...p, avatar_url: null } : p
      )
      setLocalRoster(updatedRoster)
      setPerson({ ...person, avatar_url: null })
    } else {
      // Authenticated mode: Update Supabase
      // @ts-ignore
      await supabase
        .from('roster')
        .update({ avatar_url: null })
        .eq('id', person.id)
        .eq('user_id', user.id)

      setPerson({ ...person, avatar_url: null })
    }
  }

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
      setAvatarUrl(guestPerson.avatar_url || null)
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
      setAvatarUrl(personData.avatar_url || null)

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
        <div className="relative flex-shrink-0">
          {avatarUrl ? (
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-pink">
              <img src={avatarUrl} alt={person.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl"
              style={{ backgroundColor: person.avatar_color }}
            >
              {initials}
            </div>
          )}
          <label className="absolute bottom-0 right-0 w-6 h-6 bg-black rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-800 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <svg className="w-4 h-4 text-yellow-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </label>
          {avatarUrl && (
            <button
              onClick={handleRemovePhoto}
              className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
            >
              ✕
            </button>
          )}
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
        <p className="text-4xl font-serif font-bold" style={{ color: '#FFB6C1' }}>{compositeScore}</p>
        <p className="text-xs text-gray-500 mt-1">
          Average of Looks, Personality, Values
        </p>
      </div>

      {/* Dimension Scores */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h3 className="font-semibold mb-4">Scores</h3>

        {/* Looks */}
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-gray-400">Looks</span>
            </div>
            <span className="font-semibold" style={{ color: '#FFB6C1' }}>{person.attraction_score}/10</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(person.attraction_score / 10) * 100}%`,
                background: 'linear-gradient(90deg, #FFB6C1, #DDA0DD)'
              }}
            />
          </div>
        </div>

        {/* Personality */}
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-gray-400">Personality</span>
            </div>
            <span className="font-semibold" style={{ color: '#98D8C8' }}>{person.personality_score}/10</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(person.personality_score / 10) * 100}%`,
                background: 'linear-gradient(90deg, #98D8C8, #87CEEB)'
              }}
            />
          </div>
        </div>

        {/* Values */}
        <div>
          <div className="flex justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm text-gray-400">Values</span>
            </div>
            <span className="font-semibold" style={{ color: '#F0E68C' }}>{person.reliability_score}/10</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(person.reliability_score / 10) * 100}%`,
                background: 'linear-gradient(90deg, #F0E68C, #FFD700)'
              }}
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
