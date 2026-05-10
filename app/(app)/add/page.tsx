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
  const [tier, setTier] = useState<Tier>('B')
  const [status, setStatus] = useState<Status>('New')
  const [attractionScore, setAttractionScore] = useState(5)
  const [personalityScore, setPersonalityScore] = useState(5)
  const [reliabilityScore, setReliabilityScore] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setError('')

    try {
      const avatarColor = generateAvatarColor(name)

      // Guest mode: Use localStorage
      if (!user) {
        const newPerson: RosterPerson = {
          id: `guest-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          user_id: 'guest',
          name,
          tier,
          status,
          attraction_score: attractionScore,
          personality_score: personalityScore,
          reliability_score: reliabilityScore,
          avatar_color: avatarColor,
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
        name,
        tier,
        status,
        attraction_score: attractionScore,
        personality_score: personalityScore,
        reliability_score: reliabilityScore,
        avatar_color: avatarColor,
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
    <div className="py-6">
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

        {/* Tier Selection */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Tier
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['S', 'A', 'B', 'C'] as Tier[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`py-2 px-4 rounded-lg border-2 font-semibold transition-all ${
                  tier === t
                    ? 'border-pink bg-pink/10 text-pink'
                    : 'border-border text-gray-400 hover:border-pink/50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
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
        <div className="space-y-4">
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
