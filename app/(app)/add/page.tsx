'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/Slider'
import { GuestBanner } from '@/components/GuestBanner'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { generateAvatarColor } from '@/lib/utils/colors'
import type { Tier, Status, RosterPerson } from '@/lib/types'

export default function AddPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const [localRoster, setLocalRoster] = useLocalStorage<RosterPerson[]>('guest_roster', [])

  const [name, setName] = useState('')
  const [status, setStatus] = useState<Status>('New')
  const [attractionScore, setAttractionScore] = useState(5)
  const [personalityScore, setPersonalityScore] = useState(5)
  const [reliabilityScore, setReliabilityScore] = useState(5)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    try {
      // Compress and resize image
      const { compressImage } = await import('@/lib/utils/imageCompression')
      const compressedBase64 = await compressImage(file)
      setAvatarUrl(compressedBase64)
    } catch (err) {
      console.error('Image compression error:', err)
      setError('Failed to process image. Please try another.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setError('')

    try {
      // Sanitize inputs
      const { sanitizeName, sanitizeScore } = await import('@/lib/utils/sanitize')
      const sanitizedName = sanitizeName(name)
      const sanitizedAttractionScore = sanitizeScore(attractionScore)
      const sanitizedPersonalityScore = sanitizeScore(personalityScore)
      const sanitizedReliabilityScore = sanitizeScore(reliabilityScore)

      if (!sanitizedName) {
        setError('Please enter a valid name')
        setLoading(false)
        return
      }

      const avatarColor = generateAvatarColor(sanitizedName)

      // Guest mode: Use localStorage
      if (!user) {
        const newPerson: RosterPerson = {
          id: `guest-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          user_id: 'guest',
          name: sanitizedName,
          tier: 'A', // Default tier, not shown in UI
          status,
          attraction_score: sanitizedAttractionScore,
          personality_score: sanitizedPersonalityScore,
          reliability_score: sanitizedReliabilityScore,
          avatar_color: avatarColor,
          avatar_url: avatarUrl,
          notes: null,
          last_contact_date: new Date().toISOString(),
          elo_rating: 1000 + (attractionScore + personalityScore + reliabilityScore) * 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        setLocalRoster([...localRoster, newPerson])
        router.push('/roster')
        return
      }

      // Authenticated mode: Use Supabase
      // @ts-ignore - Supabase types not fully configured
      const { error: insertError } = await supabase.from('roster').insert({
        user_id: user.id,
        name: sanitizedName,
        tier: 'A', // Default tier, not shown in UI
        status,
        attraction_score: sanitizedAttractionScore,
        personality_score: sanitizedPersonalityScore,
        reliability_score: sanitizedReliabilityScore,
        avatar_color: avatarColor,
        avatar_url: avatarUrl,
        last_contact_date: new Date().toISOString(),
      })

      if (insertError) throw insertError

      router.push('/roster')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      {!user && <GuestBanner />}

      <h2 className="text-2xl font-serif font-bold mb-6">Add Person</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name"
          required
        />

        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Photo (optional)
          </label>
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-pink flex-shrink-0">
                <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <div className="px-4 py-2 bg-white border-2 border-black rounded-full text-center cursor-pointer hover:bg-gray-50 transition-colors">
                <span className="text-sm font-semibold">Choose Photo</span>
              </div>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2">Max 5MB • JPG, PNG, or GIF</p>
        </div>

        {/* Status Selection */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-pink"
          >
            <option value="New">New</option>
            <option value="Chatting">Chatting</option>
            <option value="Met Once">Met Once</option>
            <option value="Regular">Regular</option>
          </select>
        </div>

        {/* Score Sliders */}
        <div className="space-y-6">
          <Slider
            label="Looks"
            value={attractionScore}
            onChange={setAttractionScore}
            min={0}
            max={10}
          />
          <Slider
            label="Personality"
            value={personalityScore}
            onChange={setPersonalityScore}
            min={0}
            max={10}
          />
          <Slider
            label="Values"
            value={reliabilityScore}
            onChange={setReliabilityScore}
            min={0}
            max={10}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? 'Adding...' : 'Add to Roster'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
