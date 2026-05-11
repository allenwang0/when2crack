'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { TonightCard } from '@/components/TonightCard'
import { BattleCard } from '@/components/BattleCard'
import { GuestBanner } from '@/components/GuestBanner'
import { OutOfComparisons } from '@/components/OutOfComparisons'
import { Button } from '@/components/ui/Button'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import type { TonightRecommendation, RosterPerson } from '@/lib/types'

export default function TonightPage() {
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const { toasts, showToast, removeToast } = useToast()
  const [localRoster, setLocalRoster] = useLocalStorage<RosterPerson[]>('guest_roster', [])
  const [completedBattles, setCompletedBattles] = useLocalStorage<string[]>('completed_battles', [])

  const [activeTab, setActiveTab] = useState<'tonight' | 'battle'>('tonight')
  const [recommendations, setRecommendations] = useState<TonightRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState('Loading...')
  const [error, setError] = useState('')

  // Battle state
  const [person1, setPerson1] = useState<RosterPerson | null>(null)
  const [person2, setPerson2] = useState<RosterPerson | null>(null)
  const [processing, setProcessing] = useState(false)
  const [battleResult, setBattleResult] = useState<{
    winner: string
    winnerChange: number
    loserChange: number
  } | null>(null)
  const [showOutOfComparisons, setShowOutOfComparisons] = useState(false)

  // Tonight functions
  const fetchRecommendationsGuest = () => {
    setLoading(true)
    setError('')

    try {
      const sorted = [...localRoster]
        .filter(p => p.status !== 'Archived')
        .sort((a, b) => {
          const scoreA = a.elo_rating + (a.reliability_score * 10)
          const scoreB = b.elo_rating + (b.reliability_score * 10)
          return scoreB - scoreA
        })
        .slice(0, 5)
        .map((person, index) => {
          const lastContact = new Date(person.last_contact_date)
          const now = new Date()
          const daysSince = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))

          return {
            person,
            reasoning: {
              tier: person.tier,
              elo_rating: person.elo_rating,
              reliability: person.reliability_score,
              recency_days: daysSince,
            },
            rank: index + 1,
            score: person.elo_rating,
            reliability_boost: person.reliability_score * 10,
          }
        })

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

  // Battle functions
  const getBattleKey = (id1: string, id2: string) => {
    return [id1, id2].sort().join('-')
  }

  const fetchBattlePairGuest = () => {
    setLoading(true)
    setError('')
    setBattleResult(null)

    try {
      if (localRoster.length < 2) {
        setError('Not enough people in roster')
        setLoading(false)
        return
      }

      // Convert completed battles to Set for O(1) lookups
      const completedSet = new Set(completedBattles)

      // Find available pairs without generating all pairs upfront
      const availablePairs: Array<[RosterPerson, RosterPerson]> = []
      for (let i = 0; i < localRoster.length; i++) {
        for (let j = i + 1; j < localRoster.length; j++) {
          const key = getBattleKey(localRoster[i].id, localRoster[j].id)
          if (!completedSet.has(key)) {
            availablePairs.push([localRoster[i], localRoster[j]])
          }
        }
      }

      if (availablePairs.length === 0) {
        setShowOutOfComparisons(true)
        setLoading(false)
        return
      }

      setShowOutOfComparisons(false)

      const randomPair = availablePairs[Math.floor(Math.random() * availablePairs.length)]
      setPerson1(randomPair[0])
      setPerson2(randomPair[1])
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchBattlePair = async () => {
    setLoading(true)
    setError('')
    setBattleResult(null)

    try {
      const response = await fetch('/api/battles/pair')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch battle pair')
      }

      setPerson1(data.person1)
      setPerson2(data.person2)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBattleGuest = (winnerId: string, loserId: string) => {
    setProcessing(true)
    setError('')

    try {
      if (person1 && person2) {
        const battleKey = getBattleKey(person1.id, person2.id)
        setCompletedBattles([...completedBattles, battleKey])
      }

      const K = 32
      let actualWinnerChange = 0
      let actualLoserChange = 0

      const updatedRoster = localRoster.map(person => {
        if (person.id === winnerId) {
          const expectedScore = 1 / (1 + Math.pow(10, ((person2?.elo_rating || 1000) - person.elo_rating) / 400))
          const change = Math.round(K * (1 - expectedScore))
          actualWinnerChange = change
          return { ...person, elo_rating: person.elo_rating + change }
        }
        if (person.id === loserId) {
          const expectedScore = 1 / (1 + Math.pow(10, ((person1?.elo_rating || 1000) - person.elo_rating) / 400))
          const change = Math.round(K * (0 - expectedScore))
          actualLoserChange = change
          return { ...person, elo_rating: person.elo_rating + change }
        }
        return person
      })

      setLocalRoster(updatedRoster)

      setBattleResult({
        winner: winnerId,
        winnerChange: actualWinnerChange,
        loserChange: actualLoserChange,
      })

      setTimeout(() => {
        fetchBattlePairGuest()
      }, 2000)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleBattle = async (winnerId: string, loserId: string) => {
    if (!user) {
      handleBattleGuest(winnerId, loserId)
      return
    }

    setProcessing(true)
    setError('')

    try {
      const response = await fetch('/api/battles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner_id: winnerId, loser_id: loserId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process battle')
      }

      setBattleResult({
        winner: winnerId,
        winnerChange: data.winner.change,
        loserChange: data.loser.change,
      })

      setTimeout(() => {
        fetchBattlePair()
      }, 2000)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleShootShot = async (personId: string) => {
    if (!user) {
      showToast('Outreach logged! Good luck 🎯', 'success')
      return
    }

    try {
      // @ts-ignore
      const { error } = await supabase.from('outreach_log').insert({
        roster_id: personId,
        user_id: user.id,
        outreach_date: new Date().toISOString(),
      })

      if (error) throw error

      // @ts-ignore
      await supabase
        .from('roster')
        .update({ last_contact_date: new Date().toISOString() })
        .eq('id', personId)
        .eq('user_id', user.id)

      showToast('Outreach logged! Good luck 🎯', 'success')
      fetchRecommendations()
    } catch (err) {
      console.error('Error logging outreach:', err)
      showToast('Failed to log outreach. Please try again.', 'error')
    }
  }

  useEffect(() => {
    if (authLoading) {
      setLoadingMessage('Checking authentication...')
      setLoading(true)
      return
    }

    const safetyTimeout = setTimeout(() => {
      console.warn('Loading timeout - forcing completion')
      setLoading(false)
    }, 2000)

    if (activeTab === 'tonight') {
      setLoadingMessage('Loading recommendations...')
      if (user) {
        fetchRecommendations().finally(() => clearTimeout(safetyTimeout))
      } else {
        fetchRecommendationsGuest()
        clearTimeout(safetyTimeout)
      }
    } else {
      setLoadingMessage('Loading battle...')
      if (user) {
        fetchBattlePair().finally(() => clearTimeout(safetyTimeout))
      } else {
        fetchBattlePairGuest()
        clearTimeout(safetyTimeout)
      }
    }

    return () => clearTimeout(safetyTimeout)
    // Note: Removed localRoster dependency to prevent refetch loop after battles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, activeTab])

  if (loading) {
    return (
      <div className="py-6 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink"></div>
        <p className="text-gray-400">{loadingMessage}</p>
      </div>
    )
  }

  // Battle completion screen
  if (activeTab === 'battle' && showOutOfComparisons && !user) {
    return (
      <div>
        {!user && !authLoading && <GuestBanner />}
        <OutOfComparisons
          onReset={() => {
            setCompletedBattles([])
            const resetRoster = localRoster.map(person => ({
              ...person,
              elo_rating: 1000 + (person.attraction_score + person.personality_score + person.reliability_score) * 10
            }))
            setLocalRoster(resetRoster)
            setShowOutOfComparisons(false)
            fetchBattlePairGuest()
          }}
          totalPeople={localRoster.length}
        />
      </div>
    )
  }

  const totalPossibleBattles = (localRoster.length * (localRoster.length - 1)) / 2
  const battlesCompleted = completedBattles.length

  return (
    <div className="pb-28">
      {!user && !authLoading && <GuestBanner />}

      {/* Tabs */}
      <div className="flex gap-2 sm:gap-3 mb-6 sm:mb-8 touch-manipulation">
        <button
          onClick={() => setActiveTab('tonight')}
          className={`flex-1 py-3 sm:py-4 px-3 sm:px-4 rounded-2xl font-bold transition-all text-base sm:text-lg active:scale-95 ${
            activeTab === 'tonight'
              ? 'bg-gradient-to-r from-pink to-purple text-white shadow-xl'
              : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-pink/30 hover:bg-pink/5 hover:shadow-md'
          }`}
        >
          <span className="hidden sm:inline">📅 Tonight</span>
          <span className="sm:hidden">📅 Tonight</span>
        </button>
        <button
          onClick={() => setActiveTab('battle')}
          className={`flex-1 py-3 sm:py-4 px-3 sm:px-4 rounded-2xl font-bold transition-all text-base sm:text-lg active:scale-95 ${
            activeTab === 'battle'
              ? 'bg-gradient-to-r from-pink to-purple text-white shadow-xl'
              : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-purple/30 hover:bg-purple/5 hover:shadow-md'
          }`}
        >
          <span className="hidden sm:inline">⚔️ Battle</span>
          <span className="sm:hidden">⚔️ Battle</span>
        </button>
      </div>

      {/* Tonight Tab */}
      {activeTab === 'tonight' && (
        <>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif font-bold mb-3 text-gray-800">Tonight's Top Picks</h2>
            <p className="text-sm text-gray-600">
              Weighted by reliability, recency, and vibe
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-center">
              <p className="text-red-500 text-sm">{error}</p>
              <Button onClick={user ? fetchRecommendations : fetchRecommendationsGuest} variant="ghost" size="sm" className="mt-2">
                Try Again
              </Button>
            </div>
          )}

          {recommendations.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-gray-800 font-semibold text-lg mb-2">No recommendations yet</p>
              <p className="text-sm text-gray-600">
                Add people to your roster and run some battles to get personalized picks
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

          {recommendations.length > 0 && (
            <div className="mt-6 text-center">
              <Button variant="ghost" onClick={user ? fetchRecommendations : fetchRecommendationsGuest}>
                Refresh Recommendations
              </Button>
            </div>
          )}
        </>
      )}

      {/* Battle Tab */}
      {activeTab === 'battle' && (
        <>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif font-bold mb-3 text-gray-800">Battle Mode</h2>
            <p className="text-sm text-gray-600 mb-2">
              Right now, tonight — who would you rather?
            </p>
            {!user && totalPossibleBattles > 0 && (
              <p className="text-xs text-gray-500 font-medium">
                Battle {battlesCompleted + 1} of {totalPossibleBattles}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={user ? fetchBattlePair : fetchBattlePairGuest}>Try Again</Button>
            </div>
          )}

          {!person1 || !person2 ? (
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">⚔️</div>
              <p className="text-gray-800 font-semibold text-lg mb-2">Need more people</p>
              <p className="text-sm text-gray-600">
                Add at least 2 people to your roster to start battles
              </p>
            </div>
          ) : (
            <>
              {battleResult && (
                <div className="bg-pink/10 border border-pink rounded-lg p-4 mb-6 text-center animate-fade-in">
                  <p className="text-pink font-semibold mb-1">Battle Complete!</p>
                  <p className="text-sm text-gray-400">
                    Winner: {battleResult.winnerChange > 0 ? '+' : ''}
                    {battleResult.winnerChange} Elo
                    {' • '}
                    Loser: {battleResult.loserChange > 0 ? '+' : ''}
                    {battleResult.loserChange} Elo
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <BattleCard
                  person={person1}
                  onClick={() => handleBattle(person1.id, person2.id)}
                  disabled={processing}
                />
                <BattleCard
                  person={person2}
                  onClick={() => handleBattle(person2.id, person1.id)}
                  disabled={processing}
                />
              </div>

              <div className="text-center mb-6">
                <span className="inline-block px-4 py-2 bg-card border border-border rounded-full text-sm font-semibold text-gray-400">
                  VS
                </span>
              </div>

              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={user ? fetchBattlePair : fetchBattlePairGuest}
                  disabled={processing}
                  className="text-gray-400"
                >
                  Skip this battle
                </Button>
              </div>
            </>
          )}
        </>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
