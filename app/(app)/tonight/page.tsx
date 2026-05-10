'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { TonightCard } from '@/components/TonightCard'
import { GuestBanner } from '@/components/GuestBanner'
import { Button } from '@/components/ui/Button'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import type { TonightRecommendation, RosterPerson } from '@/lib/types'

export default function TonightPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [localRoster] = useLocalStorage<RosterPerson[]>('guest_roster', [])

  const [recommendations, setRecommendations] = useState<TonightRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchRecommendationsGuest = () => {
    setLoading(true)
    setError('')

    try {
      // Simple recommendation algorithm for guest mode
      // Sort by ELO rating and reliability score
      const sorted = [...localRoster]
        .filter(p => p.status !== 'Archived')
        .sort((a, b) => {
          const scoreA = a.elo_rating + (a.reliability_score * 10)
          const scoreB = b.elo_rating + (b.reliability_score * 10)
          return scoreB - scoreA
        })
        .slice(0, 5)
        .map((person, index) => ({
          person,
          rank: index + 1,
          score: person.elo_rating,
          reliability_boost: person.reliability_score * 10,
        }))

      setRecommendations(sorted)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchRecommendations = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/tonight')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recommendations')
      }

      setRecommendations(data.recommendations || [])
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchRecommendations()
    } else {
      fetchRecommendationsGuest()
    }
  }, [user, localRoster])

  const handleShootShot = async (personId: string) => {
    // Guest mode: Just show a message
    if (!user) {
      alert('Outreach logged! Good luck 🎯\n\nNote: Sign up to save your outreach history.')
      return
    }

    try {
      // Log outreach
      // @ts-ignore
      const { error } = await supabase.from('outreach_log').insert({
        roster_id: personId,
        user_id: user.id,
        outreach_date: new Date().toISOString(),
      })

      if (error) throw error

      // Update last contact date
      // @ts-ignore
      await supabase
        .from('roster')
        .update({ last_contact_date: new Date().toISOString() })
        .eq('id', personId)
        .eq('user_id', user.id)

      // Show success feedback
      alert('Outreach logged! Good luck 🎯')

      // Refresh recommendations
      fetchRecommendations()
    } catch (err) {
      console.error('Error logging outreach:', err)
      alert('Failed to log outreach. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="py-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="py-6">
      {!user && <GuestBanner />}

      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-serif font-bold mb-2">Tonight</h2>
        <p className="text-sm text-gray-400">
          Top picks weighted by reliability and recency
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-center">
          <p className="text-red-500 text-sm">{error}</p>
          <Button onClick={fetchRecommendations} variant="ghost" size="sm" className="mt-2">
            Try Again
          </Button>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-2">No recommendations available</p>
          <p className="text-sm text-gray-500">
            Add people to your roster and run some battles to get started
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((recommendation, index) => (
            <TonightCard
              key={recommendation.person.id}
              recommendation={recommendation}
              rank={index + 1}
              onShootShot={handleShootShot}
            />
          ))}
        </div>
      )}

      {/* Refresh Button */}
      {recommendations.length > 0 && (
        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={user ? fetchRecommendations : fetchRecommendationsGuest}>
            Refresh Recommendations
          </Button>
        </div>
      )}
    </div>
  )
}
