'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { GuestBanner } from '@/components/GuestBanner'
import { SkeletonAvatar, SkeletonText, SkeletonRectangle } from '@/components/skeletons/Skeleton'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Slider } from '@/components/ui/Slider'
import { Badge } from '@/components/ui/Badge'
import { PostHangPrompt } from '@/components/PostHangPrompt'
import { getInitials } from '@/lib/utils/colors'
import { calculateCompositeScore } from '@/lib/utils/scores'
import { formatDate, formatRelativeTime } from '@/lib/utils/dates'
import { logger } from '@/lib/utils/logger'
import type { RosterPerson, Hang } from '@/lib/types'

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const { toasts, showToast, removeToast } = useToast()
  const [localRoster, setLocalRoster] = useLocalStorage<RosterPerson[]>('guest_roster', [])

  const [person, setPerson] = useState<RosterPerson | null>(null)
  const [hangs, setHangs] = useState<Hang[]>([])
  const [notes, setNotes] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showHangPrompt, setShowHangPrompt] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedStatus, setEditedStatus] = useState<'New' | 'Chatting' | 'Met Once' | 'Regular' | 'Archived'>('New')
  const [editedAttractionScore, setEditedAttractionScore] = useState(5)
  const [editedPersonalityScore, setEditedPersonalityScore] = useState(5)
  const [editedReliabilityScore, setEditedReliabilityScore] = useState(5)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !person) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error')
      return
    }

    try {
      // Compress and resize image
      const { compressImage } = await import('@/lib/utils/imageCompression')
      const compressedBase64 = await compressImage(file)
      setAvatarUrl(compressedBase64)

      // Save immediately
      if (!user) {
        // Guest mode: Update localStorage
        const updatedRoster = localRoster.map(p =>
          p.id === person.id ? { ...p, avatar_url: compressedBase64 } : p
        )
        setLocalRoster(updatedRoster)
        setPerson({ ...person, avatar_url: compressedBase64 })
      } else {
        // Authenticated mode: Update Supabase
        const { error: updateError } = await (supabase
          .from('roster') as any)
          .update({ avatar_url: compressedBase64 })
          .eq('id', person.id)
          .eq('user_id', user.id)

        if (updateError) {
          logger.error('Failed to update avatar:', updateError)
          showToast('Failed to save photo. Please try again.', 'error')
          return
        }

        setPerson({ ...person, avatar_url: compressedBase64 })
      }

      showToast('Photo updated!', 'success')
    } catch (err) {
      logger.error('Image compression error:', err)
      showToast('Failed to process image. Please try another.', 'error')
    }
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
      const { error: updateError } = await (supabase
        .from('roster') as any)
        .update({ avatar_url: null })
        .eq('id', person.id)
        .eq('user_id', user.id)

      if (updateError) {
        logger.error('Failed to remove avatar:', updateError)
        showToast('Failed to remove photo. Please try again.', 'error')
        // Restore the avatar in UI
        setAvatarUrl(person.avatar_url)
        return
      }

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
      // Initialize edit state
      setEditedName(guestPerson.name)
      setEditedStatus(guestPerson.status)
      setEditedAttractionScore(guestPerson.attraction_score)
      setEditedPersonalityScore(guestPerson.personality_score)
      setEditedReliabilityScore(guestPerson.reliability_score)
      setLoading(false)
      return
    }

    // Authenticated mode: Load from Supabase
    const fetchProfile = async () => {
      // Fetch person
      const { data: personDataRaw, error: personError } = await supabase
        .from('roster')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (personError) {
        logger.error('Error fetching person:', personError)
        router.push('/roster')
        return
      }

      const personData = personDataRaw as RosterPerson
      setPerson(personData)
      setNotes(personData.notes || '')
      setAvatarUrl(personData.avatar_url || null)
      // Initialize edit state
      setEditedName(personData.name)
      setEditedStatus(personData.status)
      setEditedAttractionScore(personData.attraction_score)
      setEditedPersonalityScore(personData.personality_score)
      setEditedReliabilityScore(personData.reliability_score)

      // Fetch hangs
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
    // supabase is now a singleton, no need to track as dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user, router, localRoster])

  const handleSaveNotes = async () => {
    if (!person) return

    setSaving(true)

    // Sanitize notes
    const { sanitizeNotes } = await import('@/lib/utils/sanitize')
    const sanitizedNotes = sanitizeNotes(notes)
    setNotes(sanitizedNotes) // Update state with sanitized version

    // Guest mode: Update localStorage
    if (!user) {
      const updatedRoster = localRoster.map(p =>
        p.id === person.id ? { ...p, notes: sanitizedNotes } : p
      )
      setLocalRoster(updatedRoster)
      setSaving(false)
      return
    }

    // Authenticated mode: Update Supabase
    await (supabase
      .from('roster') as any)
      .update({ notes: sanitizedNotes })
      .eq('id', person.id)
      .eq('user_id', user.id)

    setSaving(false)
  }

  const handleHangLogged = () => {
    setShowHangPrompt(false)
    // Refresh the profile data
    router.refresh()
  }

  const handleShareLink = async () => {
    // Get user's current schedule from localStorage
    const storedSchedule = localStorage.getItem('week_schedule')
    let mySchedule: string[] = []
    try {
      mySchedule = storedSchedule ? JSON.parse(storedSchedule) : []
    } catch (e) {
      logger.error('Failed to parse schedule:', e)
    }

    // Encode schedule with timezone information
    const { encodeScheduleWithTimezone } = await import('@/lib/utils/timezone')
    const encodedSchedule = encodeScheduleWithTimezone(mySchedule)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const shareUrl = `${baseUrl}/schedule?for=${encodeURIComponent(person?.name || '')}&schedule=${encodedSchedule}`

    try {
      await navigator.clipboard.writeText(shareUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      logger.error('Failed to copy:', err)
    }
  }

  const handleSaveEdit = async () => {
    if (!person) return

    setSaving(true)

    // Ensure scores are at least 1 (DB constraint requires >= 1)
    const updatedPerson = {
      ...person,
      name: editedName,
      status: editedStatus,
      attraction_score: Math.max(1, editedAttractionScore),
      personality_score: Math.max(1, editedPersonalityScore),
      reliability_score: Math.max(1, editedReliabilityScore),
    }

    if (!user) {
      // Guest mode: Update localStorage
      const updatedRoster = localRoster.map(p =>
        p.id === person.id ? updatedPerson : p
      )
      setLocalRoster(updatedRoster)
      setPerson(updatedPerson)
    } else {
      // Authenticated mode: Update Supabase
      const { error: updateError } = await (supabase
        .from('roster') as any)
        .update({
          name: editedName,
          status: editedStatus,
          attraction_score: editedAttractionScore,
          personality_score: editedPersonalityScore,
          reliability_score: editedReliabilityScore,
        })
        .eq('id', person.id)
        .eq('user_id', user.id)

      if (updateError) {
        logger.error('Failed to save changes:', updateError)
        showToast('Failed to save changes. Please try again.', 'error')
        setSaving(false)
        return
      }

      setPerson(updatedPerson)
    }

    setIsEditing(false)
    setSaving(false)
    showToast('Changes saved!', 'success')
  }

  const handleDelete = async () => {
    if (!person) return

    if (!user) {
      // Guest mode: Remove from localStorage
      const updatedRoster = localRoster.filter(p => p.id !== person.id)
      setLocalRoster(updatedRoster)
      router.push('/roster')
    } else {
      // Authenticated mode: Delete from Supabase
      const { error: deleteError } = await supabase
        .from('roster')
        .delete()
        .eq('id', person.id)
        .eq('user_id', user.id)

      if (deleteError) {
        logger.error('Failed to delete person:', deleteError)
        showToast('Failed to delete. Please try again.', 'error')
        return
      }

      router.push('/roster')
    }
  }

  if (loading) {
    return (
      <div className="py-6" aria-label="Loading profile" aria-busy="true">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <SkeletonAvatar size="md" />
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <SkeletonText width="w-48" height="h-6" />
            </div>
            <SkeletonText width="w-20" height="h-5" className="rounded-full" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <SkeletonRectangle height="h-20" rounded="2xl" />
          <SkeletonRectangle height="h-20" rounded="2xl" />
          <SkeletonRectangle height="h-20" rounded="2xl" />
          <SkeletonRectangle height="h-20" rounded="2xl" />
        </div>

        {/* Notes Section */}
        <SkeletonRectangle height="h-32" rounded="2xl" className="mb-6" />

        {/* Hangs Section */}
        <SkeletonRectangle height="h-48" rounded="2xl" />
      </div>
    )
  }

  if (!person) {
    return null
  }

  const initials = getInitials(person.name)
  const compositeScore = calculateCompositeScore(person)

  return (
    <div className="py-6">
      {!user && !authLoading && <GuestBanner />}

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="relative flex-shrink-0">
          {avatarUrl && avatarUrl.trim() !== '' ? (
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
          {avatarUrl && avatarUrl.trim() !== '' && (
            <button
              onClick={handleRemovePhoto}
              className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-serif font-bold">{isEditing ? 'Edit Profile' : person.name}</h1>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-gray-500 hover:text-black transition-colors"
              >
                ✏️ Edit
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="status" status={person.status}>
              {person.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Edit Mode Form */}
      {isEditing && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-4">Edit Details</h3>

          <div className="space-y-4">
            <Input
              label="Name"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder="Enter name"
            />

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Status
              </label>
              <select
                value={editedStatus}
                onChange={(e) => setEditedStatus(e.target.value as any)}
                className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-pink"
              >
                <option value="New">New</option>
                <option value="Chatting">Chatting</option>
                <option value="Met Once">Met Once</option>
                <option value="Regular">Regular</option>
              </select>
            </div>

            <Slider
              label="Looks"
              value={editedAttractionScore}
              onChange={setEditedAttractionScore}
              min={0}
              max={10}
            />

            <Slider
              label="Personality"
              value={editedPersonalityScore}
              onChange={setEditedPersonalityScore}
              min={0}
              max={10}
            />

            <Slider
              label="Values"
              value={editedReliabilityScore}
              onChange={setEditedReliabilityScore}
              min={0}
              max={10}
            />

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSaveEdit}
                className="flex-1"
                disabled={saving || !editedName.trim()}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditing(false)
                  // Reset to original values
                  setEditedName(person.name)
                  setEditedStatus(person.status)
                  setEditedAttractionScore(person.attraction_score)
                  setEditedPersonalityScore(person.personality_score)
                  setEditedReliabilityScore(person.reliability_score)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Composite Score */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6 text-center">
        <p className="text-sm text-gray-600 mb-2">Composite Score</p>
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
          <div className="flex justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-gray-600">Looks</span>
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
          <div className="flex justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-gray-600">Personality</span>
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
          <div className="flex justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm text-gray-600">Values</span>
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
            {person.last_contact_date ? formatRelativeTime(person.last_contact_date) : 'Never'}
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
          <p className="text-sm text-gray-600 text-center py-4">
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
                  <p className="text-xs text-gray-600 mt-1">{hang.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
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

        {/* Share When2Crack Link */}
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink/30 rounded-2xl p-5">
          <div className="text-center mb-3">
            <div className="text-3xl mb-2">💌</div>
            <h4 className="font-bold text-lg text-gray-800 mb-1">
              Send {person.name} a when2crack
            </h4>
            <p className="text-xs text-gray-600">
              Share your availability and find the perfect time to hang
            </p>
          </div>
          <Button
            onClick={handleShareLink}
            className="w-full bg-gradient-to-r from-pink to-purple hover:opacity-90 transition-opacity"
          >
            {linkCopied ? (
              <>
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Link Copied!
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Copy Link to Share
              </>
            )}
          </Button>
        </div>

        {/* Delete Button */}
        <Button
          variant="secondary"
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full text-red-500 hover:bg-red-50 border-red-300"
        >
          🗑️ Delete Person
        </Button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full" style={{ border: '3px solid #FFD93D' }}>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">⚠️</div>
              <h3 className="font-bold text-lg mb-2">Delete {person.name}?</h3>
              <p className="text-sm text-gray-600">
                This will permanently remove this person from your roster. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Hang Prompt Modal */}
      {showHangPrompt && user && (
        <PostHangPrompt
          person={person}
          onClose={() => setShowHangPrompt(false)}
          onSuccess={handleHangLogged}
          showToast={showToast}
        />
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
