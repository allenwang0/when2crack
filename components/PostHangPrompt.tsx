'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import type { RosterPerson } from '@/lib/types'

interface PostHangPromptProps {
  person: RosterPerson
  onClose: () => void
  onSuccess: () => void
}

export function PostHangPrompt({ person, onClose, onSuccess }: PostHangPromptProps) {
  const { user } = useAuth()
  const supabase = createClient()

  const [attractionChange, setAttractionChange] = useState<-1 | 0 | 1>(0)
  const [personalityChange, setPersonalityChange] = useState<-1 | 0 | 1>(0)
  const [reliabilityChange, setReliabilityChange] = useState<-1 | 0 | 1>(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    try {
      // Calculate new scores
      const newAttractionScore = Math.max(
        1,
        Math.min(10, person.attraction_score + attractionChange)
      )
      const newPersonalityScore = Math.max(
        1,
        Math.min(10, person.personality_score + personalityChange)
      )
      const newReliabilityScore = Math.max(
        1,
        Math.min(10, person.reliability_score + reliabilityChange)
      )

      // Log the hang
      // @ts-ignore
      const { error: hangError } = await supabase.from('hangs').insert({
        roster_id: person.id,
        user_id: user.id,
        hang_date: new Date().toISOString(),
        attraction_change: attractionChange,
        personality_change: personalityChange,
        reliability_change: reliabilityChange,
        notes: notes || null,
      })

      if (hangError) throw hangError

      // Update roster scores
      // @ts-ignore
      const { error: updateError } = await supabase
        .from('roster')
        .update({
          attraction_score: newAttractionScore,
          personality_score: newPersonalityScore,
          reliability_score: newReliabilityScore,
          last_contact_date: new Date().toISOString(),
        })
        .eq('id', person.id)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      onSuccess()
    } catch (error) {
      console.error('Error logging hang:', error)
      alert('Failed to log hang. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const ChangeButton = ({
    value,
    current,
    onChange,
    label,
  }: {
    value: -1 | 0 | 1
    current: -1 | 0 | 1
    onChange: (v: -1 | 0 | 1) => void
    label: string
  }) => (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all ${
        current === value
          ? 'border-pink bg-pink/10 text-pink font-semibold'
          : 'border-border text-gray-400 hover:border-pink/50'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4">
          <h2 className="text-xl font-serif font-bold">Log Hang</h2>
          <p className="text-sm text-gray-400">How was it with {person.name}?</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Attraction Change */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Attraction
            </label>
            <div className="flex gap-2">
              <ChangeButton
                value={-1}
                current={attractionChange}
                onChange={setAttractionChange}
                label="↓ Down"
              />
              <ChangeButton
                value={0}
                current={attractionChange}
                onChange={setAttractionChange}
                label="→ Same"
              />
              <ChangeButton
                value={1}
                current={attractionChange}
                onChange={setAttractionChange}
                label="↑ Up"
              />
            </div>
          </div>

          {/* Personality Change */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Personality
            </label>
            <div className="flex gap-2">
              <ChangeButton
                value={-1}
                current={personalityChange}
                onChange={setPersonalityChange}
                label="↓ Down"
              />
              <ChangeButton
                value={0}
                current={personalityChange}
                onChange={setPersonalityChange}
                label="→ Same"
              />
              <ChangeButton
                value={1}
                current={personalityChange}
                onChange={setPersonalityChange}
                label="↑ Up"
              />
            </div>
          </div>

          {/* Reliability Change */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Reliability
            </label>
            <div className="flex gap-2">
              <ChangeButton
                value={-1}
                current={reliabilityChange}
                onChange={setReliabilityChange}
                label="↓ Down"
              />
              <ChangeButton
                value={0}
                current={reliabilityChange}
                onChange={setReliabilityChange}
                label="→ Same"
              />
              <ChangeButton
                value={1}
                current={reliabilityChange}
                onChange={setReliabilityChange}
                label="↑ Up"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this hang..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Logging...' : 'Log Hang'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
