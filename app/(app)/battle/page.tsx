'use client'

import { useEffect, useState } from 'react'
import { BattleCard } from '@/components/BattleCard'
import { Button } from '@/components/ui/Button'
import { GuestBanner } from '@/components/GuestBanner'
import { OutOfComparisons } from '@/components/OutOfComparisons'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { useBattleUndo } from '@/lib/hooks/useBattleUndo'
import { BattleUndoButton } from '@/components/BattleUndoButton'
import type { RosterPerson } from '@/lib/types'
import { calculateEloChanges, calculateInitialElo } from '@/lib/algorithms/elo'
import { API_SAFETY_TIMEOUT, BATTLE_RESULT_DISPLAY_DURATION } from '@/lib/constants'
import { logger } from '@/lib/utils/logger'

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

  // Battle undo functionality
  const { recordBattle, undo, isUndoable, getRemainingTime } = useBattleUndo({
    undoWindowMs: 5000, // 5 second undo window
    onUndo: () => {
      logger.info('Battle undo triggered')
    },
  })

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

      // Convert completed/skipped battles to Sets for O(1) lookups
      const completedSet = new Set(completedBattles)
      const skippedSet = new Set(skippedBattles)

      // Find available pairs without generating all pairs upfront
      const availablePairs: Array<[RosterPerson, RosterPerson]> = []
      for (let i = 0; i < localRoster.length; i++) {
        for (let j = i + 1; j < localRoster.length; j++) {
          const key = getBattleKey(localRoster[i].id, localRoster[j].id)
          if (!completedSet.has(key) && !skippedSet.has(key)) {
            availablePairs.push([localRoster[i], localRoster[j]])
          }
        }
      }

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
      if (process.env.NODE_ENV === 'development') {
        console.warn('Battle loading timeout - forcing completion')
      }
      setLoading(false)
    }, API_SAFETY_TIMEOUT)

    setLoadingMessage('Loading battle...')

    if (user) {
      fetchBattlePair().finally(() => clearTimeout(safetyTimeout))
    } else {
      fetchBattlePairGuest()
      clearTimeout(safetyTimeout)
    }

    return () => clearTimeout(safetyTimeout)
  }, [user, authLoading, localRoster])

  const handleUndo = () => {
    const battleToUndo = undo()
    if (!battleToUndo) return

    // Revert ELO ratings
    const updatedRoster = localRoster.map(person => {
      if (person.id === battleToUndo.winnerId) {
        return { ...person, elo_rating: battleToUndo.winnerOldRating }
      }
      if (person.id === battleToUndo.loserId) {
        return { ...person, elo_rating: battleToUndo.loserOldRating }
      }
      return person
    })

    setLocalRoster(updatedRoster)

    // Remove from completed battles
    if (person1 && person2) {
      const battleKey = getBattleKey(person1.id, person2.id)
      setCompletedBattles(completedBattles.filter(key => key !== battleKey))
    }

    // Clear result display
    setResult(null)

    logger.info('Battle undone successfully')
  }

  const handleBattleGuest = (winnerId: string, loserId: string) => {
    setProcessing(true)
    setError('')

    try {
      // Mark this battle as completed
      if (person1 && person2) {
        const battleKey = getBattleKey(person1.id, person2.id)
        setCompletedBattles([...completedBattles, battleKey])
      }

      // Calculate ELO changes
      const winner = localRoster.find(p => p.id === winnerId)
      const loser = localRoster.find(p => p.id === loserId)

      if (!winner || !loser) {
        throw new Error('Person not found')
      }

      const { winnerChange, loserChange, newWinnerRating, newLoserRating } = calculateEloChanges(
        winner.elo_rating,
        loser.elo_rating
      )

      // Record battle for undo
      recordBattle(winnerId, loserId, winner.elo_rating, loser.elo_rating)

      const updatedRoster = localRoster.map(person => {
        if (person.id === winnerId) {
          return { ...person, elo_rating: newWinnerRating }
        }
        if (person.id === loserId) {
          return { ...person, elo_rating: newLoserRating }
        }
        return person
      })

      setLocalRoster(updatedRoster)

      // Show result
      setResult({
        winner: winnerId,
        winnerChange,
        loserChange,
      })

      // Auto-load next battle
      setTimeout(() => {
        fetchBattlePairGuest()
      }, BATTLE_RESULT_DISPLAY_DURATION)
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

      // Auto-load next battle
      setTimeout(() => {
        fetchBattlePair()
      }, BATTLE_RESULT_DISPLAY_DURATION)
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
          <p className="text-foreground/60 mb-4">{loadingMessage}</p>
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

            // Reset all ELO ratings to default
            const resetRoster = localRoster.map(person => ({
              ...person,
              elo_rating: calculateInitialElo(
                person.attraction_score,
                person.personality_score,
                person.reliability_score
              )
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
          <p className="text-gray-600 mb-4">Not enough people for battles</p>
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
        <h2 className="text-2xl font-serif font-bold mb-4">Battle</h2>
        <p className="text-sm text-gray-600 mb-3">
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
          <p className="text-sm text-gray-600">
            Winner: {result.winnerChange > 0 ? '+' : ''}
            {result.winnerChange} Elo
            {' • '}
            Loser: {result.loserChange > 0 ? '+' : ''}
            {result.loserChange} Elo
          </p>
        </div>
      )}

      {/* Battle Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6">
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
        <span className="inline-block px-4 py-2 bg-card border border-border rounded-full text-sm font-semibold text-gray-600">
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
          className="text-gray-600"
        >
          Skip this battle
        </Button>
      </div>

      {/* Undo Button */}
      <BattleUndoButton
        isUndoable={isUndoable && !user} // Only for guest mode
        onUndo={handleUndo}
        getRemainingTime={getRemainingTime}
      />
    </div>
  )
}
