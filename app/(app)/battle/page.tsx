'use client'

import { useEffect, useState } from 'react'
import { BattleCard } from '@/components/BattleCard'
import { Button } from '@/components/ui/Button'
import { GuestBanner } from '@/components/GuestBanner'
import { OutOfComparisons } from '@/components/OutOfComparisons'
import { SkeletonBattleCard } from '@/components/skeletons/SkeletonBattleCard'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { useBattleUndo } from '@/lib/hooks/useBattleUndo'
import { BattleUndoButton } from '@/components/BattleUndoButton'
import { Confetti } from '@/components/ui/Confetti'
import { useSwipe } from '@/lib/hooks/useSwipe'
import { triggerHaptic } from '@/lib/utils/haptics'
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
  const [showConfetti, setShowConfetti] = useState(false)

  // Battle undo functionality
  const { recordBattle, undo, isUndoable, getRemainingTime } = useBattleUndo({
    undoWindowMs: 5000, // 5 second undo window
    onUndo: () => {
      logger.info('Battle undo triggered')
    },
  })

  // Swipe handlers for both cards
  const swipePerson1 = useSwipe({
    onSwipe: (direction) => {
      if (direction === 'right' && person1 && person2 && !processing) {
        handleBattle(person1.id, person2.id) // Vote for person1
      }
    },
    threshold: 50,
  })

  const swipePerson2 = useSwipe({
    onSwipe: (direction) => {
      if (direction === 'left' && person1 && person2 && !processing) {
        handleBattle(person2.id, person1.id) // Vote for person2
      }
    },
    threshold: 50,
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
    // fetchBattlePairGuest is stable relative to localRoster which is in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Trigger haptic and confetti
      triggerHaptic('success')
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)

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

      // Trigger haptic and confetti
      triggerHaptic('success')
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)

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
      <div className="py-6">
        <div className="text-center mb-6">
          <div className="h-8 w-32 bg-border/50 animate-pulse rounded mx-auto mb-4" />
          <div className="h-4 w-64 bg-border/50 animate-pulse rounded mx-auto mb-3" />
          <div className="h-3 w-40 bg-border/50 animate-pulse rounded mx-auto" />
        </div>

        {/* Battle Cards Skeleton */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6">
          <SkeletonBattleCard />
          <SkeletonBattleCard />
        </div>

        {/* VS Divider Skeleton */}
        <div className="text-center mb-6">
          <div className="inline-block h-10 w-20 bg-border/50 animate-pulse rounded-full" />
        </div>

        {/* Skip Button Skeleton */}
        <div className="text-center">
          <div className="h-10 w-32 bg-border/50 animate-pulse rounded mx-auto" />
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
      <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6 relative">
        <div
          className="relative"
          {...swipePerson1}
          style={{
            transform: swipePerson1.swiping
              ? `translateX(${swipePerson1.swipeOffset.x}px) rotate(${swipePerson1.swipeOffset.x / 10}deg)`
              : 'none',
            transition: swipePerson1.swiping ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          <BattleCard
            person={person1}
            onClick={() => handleBattle(person1.id, person2.id)}
            disabled={processing}
          />
          {swipePerson1.swipeOffset.x > 30 && (
            <div className="absolute top-4 right-4 bg-teal text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg z-10 animate-fade-in">
              VOTE ✓
            </div>
          )}
        </div>

        <div
          className="relative"
          {...swipePerson2}
          style={{
            transform: swipePerson2.swiping
              ? `translateX(${swipePerson2.swipeOffset.x}px) rotate(${swipePerson2.swipeOffset.x / 10}deg)`
              : 'none',
            transition: swipePerson2.swiping ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          <BattleCard
            person={person2}
            onClick={() => handleBattle(person2.id, person1.id)}
            disabled={processing}
          />
          {swipePerson2.swipeOffset.x < -30 && (
            <div className="absolute top-4 left-4 bg-teal text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg z-10 animate-fade-in">
              VOTE ✓
            </div>
          )}
        </div>
      </div>

      {/* Swipe instruction */}
      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-4">
        💡 Swipe right on left card or left on right card to vote
      </p>

      {/* VS Divider */}
      <div className="text-center mb-6">
        <span className="inline-block px-4 py-2 bg-card border border-border rounded-full text-sm font-semibold text-gray-600">
          VS
        </span>
      </div>

      {/* Skip Button */}
      <div className="text-center">
        <Button
          variant="tertiary"
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

      {/* Confetti */}
      <Confetti trigger={showConfetti} />
    </div>
  )
}
