'use client'

import { useEffect, useState } from 'react'
import { BattleCard } from '@/components/BattleCard'
import { Button } from '@/components/ui/Button'
import { GuestBanner } from '@/components/GuestBanner'
import { OutOfComparisons } from '@/components/OutOfComparisons'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import type { RosterPerson } from '@/lib/types'

export default function BattlePage() {
  const { user, loading: authLoading } = useAuth()
  const [localRoster, setLocalRoster] = useLocalStorage<RosterPerson[]>('guest_roster', [])
  const [completedBattles, setCompletedBattles] = useLocalStorage<string[]>('completed_battles', [])
  const [skippedBattles, setSkippedBattles] = useLocalStorage<string[]>('skipped_battles', [])
  const [person1, setPerson1] = useState<RosterPerson | null>(null)
  const [person2, setPerson2] = useState<RosterPerson | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState('Loading battle...')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{
    winner: string
    winnerChange: number
    loserChange: number
  } | null>(null)
  const [error, setError] = useState('')
  const [showOutOfComparisons, setShowOutOfComparisons] = useState(false)

  const getBattleKey = (id1: string, id2: string) => {
    return [id1, id2].sort().join('-')
  }

  const fetchBattlePairGuest = () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      if (localRoster.length < 2) {
        setError('Not enough people in roster')
        setLoading(false)
        return
      }

      // Get all possible pairs
      const allPairs: Array<[RosterPerson, RosterPerson]> = []
      for (let i = 0; i < localRoster.length; i++) {
        for (let j = i + 1; j < localRoster.length; j++) {
          allPairs.push([localRoster[i], localRoster[j]])
        }
      }

      // Filter out completed and skipped battles
      const availablePairs = allPairs.filter(([p1, p2]) => {
        const key = getBattleKey(p1.id, p2.id)
        return !completedBattles.includes(key) && !skippedBattles.includes(key)
      })

      // If all battles completed, show completion screen
      if (availablePairs.length === 0) {
        setShowOutOfComparisons(true)
        setLoading(false)
        return
      }

      setShowOutOfComparisons(false)

      // Pick a random available pair
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
    setResult(null)

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

  useEffect(() => {
    // Wait for auth to load first
    if (authLoading) {
      setLoadingMessage('Checking authentication...')
      setLoading(true)
      return
    }

    // Set a safety timeout
    const safetyTimeout = setTimeout(() => {
      console.warn('Battle loading timeout - forcing completion')
      setLoading(false)
    }, 8000)

    setLoadingMessage('Loading battle...')

    if (user) {
      fetchBattlePair().finally(() => clearTimeout(safetyTimeout))
    } else {
      fetchBattlePairGuest()
      clearTimeout(safetyTimeout)
    }

    return () => clearTimeout(safetyTimeout)
  }, [user, authLoading, localRoster])

  const handleBattleGuest = (winnerId: string, loserId: string) => {
    setProcessing(true)
    setError('')

    try {
      // Mark this battle as completed
      if (person1 && person2) {
        const battleKey = getBattleKey(person1.id, person2.id)
        setCompletedBattles([...completedBattles, battleKey])
      }

      // Simple ELO calculation for guest mode
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

      // Show result with actual calculated changes
      setResult({
        winner: winnerId,
        winnerChange: actualWinnerChange,
        loserChange: actualLoserChange,
      })

      // Auto-load next battle after 2 seconds
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

      // Show result
      setResult({
        winner: winnerId,
        winnerChange: data.winner.change,
        loserChange: data.loser.change,
      })

      // Auto-load next battle after 2 seconds
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

  if (loading) {
    return (
      <div className="py-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">⚔️</div>
          <p className="text-foreground/60 mb-2">{loadingMessage}</p>
          <div className="w-8 h-8 border-b-2 border-pink animate-spin rounded-full mx-auto"></div>
        </div>
      </div>
    )
  }

  if (showOutOfComparisons && !user) {
    return (
      <div>
        {!user && !authLoading && <GuestBanner />}
        <OutOfComparisons
          onReset={() => {
            // Reset completed and skipped battles
            setCompletedBattles([])
            setSkippedBattles([])

            // Reset all ELO ratings to default (initial formula from add page)
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

  if (error) {
    return (
      <div className="py-6">
        <h2 className="text-2xl font-serif font-bold mb-4">Battle</h2>
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchBattlePair}>Try Again</Button>
        </div>
      </div>
    )
  }

  if (!person1 || !person2) {
    return (
      <div className="py-6">
        <h2 className="text-2xl font-serif font-bold mb-4">Battle</h2>
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-2">Not enough people for battles</p>
          <p className="text-sm text-gray-500">
            Add at least 2 people to your roster to start battles
          </p>
        </div>
      </div>
    )
  }

  // Calculate progress
  const totalPossibleBattles = (localRoster.length * (localRoster.length - 1)) / 2
  const battlesCompleted = completedBattles.length
  const battlesRemaining = totalPossibleBattles - battlesCompleted

  return (
    <div className="py-6">
      {!user && !authLoading && <GuestBanner />}

      <div className="text-center mb-6">
        <h2 className="text-2xl font-serif font-bold mb-2">Battle</h2>
        <p className="text-sm text-gray-400 mb-1">
          Right now, tonight — who would you rather?
        </p>
        {!user && totalPossibleBattles > 0 && (
          <p className="text-xs text-gray-500">
            Battle {battlesCompleted + 1} of {totalPossibleBattles}
          </p>
        )}
      </div>

      {/* Battle Result */}
      {result && (
        <div className="bg-pink/10 border border-pink rounded-lg p-4 mb-6 text-center animate-fade-in">
          <p className="text-pink font-semibold mb-1">Battle Complete!</p>
          <p className="text-sm text-gray-400">
            Winner: {result.winnerChange > 0 ? '+' : ''}
            {result.winnerChange} Elo
            {' • '}
            Loser: {result.loserChange > 0 ? '+' : ''}
            {result.loserChange} Elo
          </p>
        </div>
      )}

      {/* Battle Cards */}
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

      {/* VS Divider */}
      <div className="text-center mb-6">
        <span className="inline-block px-4 py-2 bg-card border border-border rounded-full text-sm font-semibold text-gray-400">
          VS
        </span>
      </div>

      {/* Skip Button */}
      <div className="text-center">
        <Button
          variant="ghost"
          onClick={() => {
            // Mark this pair as skipped (guest mode only)
            if (!user && person1 && person2) {
              const battleKey = getBattleKey(person1.id, person2.id)
              setSkippedBattles([...skippedBattles, battleKey])
            }
            // Load new pair
            user ? fetchBattlePair() : fetchBattlePairGuest()
          }}
          disabled={processing}
          className="text-gray-400"
        >
          Skip this battle
        </Button>
      </div>
    </div>
  )
}
