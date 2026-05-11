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
import { calculateInitialElo } from '@/lib/algorithms/elo'
import { MAX_IMAGE_SIZE_BYTES, ALLOWED_IMAGE_TYPES, ROSTER_INITIAL_TIER } from '@/lib/constants'
import { logger } from '@/lib/utils/logger'

export default function AddPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
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

    // Check file size
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError('Image must be less than 5MB')
      return
    }

    // Check file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, GIF, or WebP)')
      return
    }

    try {
      // Compress and resize image
      const { compressImage } = await import('@/lib/utils/imageCompression')
      const compressedBase64 = await compressImage(file)
      setAvatarUrl(compressedBase64)
    } catch (err) {
      logger.error('Image compression error:', err)
      setError('Failed to process image. Please try another.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    logger.debug('Submit started, user:', user ? user.id : 'Guest')

    // Prevent submission during auth loading to avoid race conditions
    if (authLoading) {
      setError('Please wait for authentication to complete')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Sanitize inputs
      const { sanitizeName, sanitizeScore } = await import('@/lib/utils/sanitize')
      const sanitizedName = sanitizeName(name)
      // Ensure scores are at least 1 (DB constraint requires >= 1)
      const sanitizedAttractionScore = Math.max(1, sanitizeScore(attractionScore))
      const sanitizedPersonalityScore = Math.max(1, sanitizeScore(personalityScore))
      const sanitizedReliabilityScore = Math.max(1, sanitizeScore(reliabilityScore))

      logger.debug('Sanitized scores:', {
        attraction: sanitizedAttractionScore,
        personality: sanitizedPersonalityScore,
        reliability: sanitizedReliabilityScore
      })

      if (!sanitizedName) {
        setError('Please enter a valid name')
        setLoading(false)
        return
      }

      const avatarColor = generateAvatarColor(sanitizedName)

      // Guest mode: Use localStorage
      if (!user) {
        logger.debug('Guest mode - saving to localStorage')

        try {
          const newPerson: RosterPerson = {
            id: `guest-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            user_id: 'guest',
            name: sanitizedName,
            tier: ROSTER_INITIAL_TIER,
            status,
            attraction_score: sanitizedAttractionScore,
            personality_score: sanitizedPersonalityScore,
            reliability_score: sanitizedReliabilityScore,
            avatar_color: avatarColor,
            avatar_url: avatarUrl,
            notes: null,
            last_contact_date: null, // Don't set until actual contact
            elo_rating: calculateInitialElo(
              sanitizedAttractionScore,
              sanitizedPersonalityScore,
              sanitizedReliabilityScore
            ),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          setLocalRoster([...localRoster, newPerson])
          router.push('/roster')
          return
        } catch (err) {
          logger.error('Guest mode localStorage error:', err)
          setError('Failed to save locally. Your browser storage might be full.')
          setLoading(false)
          return
        }
      }

      // Authenticated mode: Use Supabase

      // Validate user data first
      if (!user.id || !user.email) {
        throw new Error('User authentication data is incomplete. Please sign in again.')
      }

      // First, ensure user profile exists in public.users
      const { data: userProfile, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      // If user profile doesn't exist, create it
      if (userCheckError && userCheckError.code === 'PGRST116') {
        logger.info('User profile not found, creating...')
        const { error: createUserError } = await supabase.from('users').insert({
          id: user.id,
          email: user.email,
        } as any)

        if (createUserError) {
          logger.error('Failed to create user profile:', createUserError)
          throw new Error(`Failed to create user profile: ${createUserError.message}`)
        }
        logger.info('User profile created successfully')
      } else if (userCheckError) {
        logger.error('Error checking user profile:', userCheckError)
        throw new Error(`Error checking user profile: ${userCheckError.message}`)
      }

      // Now insert into roster
      logger.debug('Inserting into roster...')

      // Prepare insert data (excluding avatar_url if it's null to avoid schema issues)
      const insertData: any = {
        user_id: user.id,
        name: sanitizedName,
        tier: ROSTER_INITIAL_TIER,
        status,
        attraction_score: sanitizedAttractionScore,
        personality_score: sanitizedPersonalityScore,
        reliability_score: sanitizedReliabilityScore,
        avatar_color: avatarColor,
        last_contact_date: null, // Don't set until actual contact
      }

      // Only include avatar_url if it exists (column might not exist in DB yet)
      if (avatarUrl) {
        insertData.avatar_url = avatarUrl
      }

      // @ts-ignore - Supabase types not fully configured
      const { error: insertError } = await supabase.from('roster').insert(insertData)

      if (insertError) {
        logger.error('Insert error:', insertError)
        throw new Error(`Failed to add to roster: ${insertError.message}`)
      }

      logger.info('Successfully added to roster')
      router.push('/roster')
    } catch (err: unknown) {
      logger.error('Add person error:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="py-6">
      {!user && !authLoading && <GuestBanner />}

      <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-6 text-gray-900">Add Person</h2>

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
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Photo (optional)
          </label>
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-pink flex-shrink-0">
                <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm shadow-md hover:bg-red-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <Button type="button" variant="secondary" className="w-full">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Choose Photo
              </Button>
            </label>
          </div>
          <p className="text-xs text-gray-600 mt-2">Max 5MB • JPG, PNG, or GIF</p>
        </div>

        {/* Status Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-2xl text-gray-900 font-medium focus:outline-none focus:ring-4 focus:ring-yellow-bright focus:border-yellow-bright transition-all"
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
            label="Attraction"
            value={attractionScore}
            onChange={setAttractionScore}
            min={1}
            max={10}
          />
          <Slider
            label="Personality"
            value={personalityScore}
            onChange={setPersonalityScore}
            min={1}
            max={10}
          />
          <Slider
            label="Reliability"
            value={reliabilityScore}
            onChange={setReliabilityScore}
            min={1}
            max={10}
          />
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border-2 border-red-500/50 rounded-2xl text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" className="flex-1" disabled={loading || authLoading}>
            {loading ? 'Adding...' : authLoading ? 'Loading...' : 'Add to Roster'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
