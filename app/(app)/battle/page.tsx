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
import { useOnboarding } from '@/lib/contexts/OnboardingContext'
import { DEMO_ROSTER_PEOPLE } from '@/lib/constants/onboardingDemoData'
import { STARTER_ROSTER_PEOPLE } from '@/lib/constants/starterRoster'
import {
  generateAllCombinations,
  getNextCombination,
  markCombinationShown,
  getTodayDateString,
  shouldResetCombinations,
  type CombinationWithPeople,
} from '@/lib/algorithms/combination-manager'

export default function BattlePage() {
  const { user, loading: authLoading } = useAuth()
  const { state: onboardingState } = useOnboarding()
  const [localRoster, setLocalRoster] = useLocalStorage<RosterPerson[]>('guest_roster', [])
  const [dailyCombinations, setDailyCombinations] = useLocalStorage<CombinationWithPeople[]>('daily_combinations', [])
  const [lastResetDate, setLastResetDate] = useLocalStorage<string>('last_reset_date', '')
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
  const [remaining, setRemaining] = useState<number>(0)
  const [total, setTotal] = useState<number>(0)

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

  const fetchBattlePairGuest = () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Use demo data during onboarding, otherwise use local roster
      const isOnboarding = onboardingState.isActive
      let rosterToUse = isOnboarding ? DEMO_ROSTER_PEOPLE : localRoster

      // Fallback: If guest user has empty roster, initialize with starter people
      if (!isOnboarding && localRoster.length === 0) {
        logger.info('Battle page: Empty guest roster detected, initializing with starter people')
        setLocalRoster(STARTER_ROSTER_PEOPLE)
        rosterToUse = STARTER_ROSTER_PEOPLE
      }

      if (rosterToUse.length < 2) {
        logger.warn('Battle page: Not enough people in roster', { count: rosterToUse.length })
        setError('You need at least 2 people in your roster to start battles. Add more people to begin comparing!')
        setLoading(false)
        return
      }

      // Check if we need to reset for a new day (skip for demo data)
      let combinations = dailyCombinations
      if (!isOnboarding && shouldResetCombinations(lastResetDate)) {
        // Generate fresh combinations for today
        combinations = generateAllCombinations(localRoster)
        setDailyCombinations(combinations)
        setLastResetDate(getTodayDateString())
      } else if (isOnboarding) {
        // Generate demo combinations on the fly
        combinations = generateAllCombinations(rosterToUse)
      }

      // Get the next unshown combination
      const nextCombination = getNextCombination(combinations)

      if (!nextCombination) {
        // All combinations exhausted for today
        setShowOutOfComparisons(true)
        setRemaining(0)
        setTotal(combinations.length)
        setLoading(false)
        return
      }

      setShowOutOfComparisons(false)
      setPerson1(nextCombination.person1)
      setPerson2(nextCombination.person2)

      // Update progress tracking
      const shown = combinations.filter(c => c.shown).length
      setRemaining(combinations.length - shown)
      setTotal(combinations.length)
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

      // Handle empty roster error (200 response with errorCode)
      if (data.errorCode === 'EMPTY_ROSTER') {
        setError(data.message || 'You need at least 2 people in your roster to start battles.')
        setLoading(false)
        return
      }

      // Handle system errors (500 response)
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }

      // Check if all combinations are exhausted
      if (data.exhausted) {
        setShowOutOfComparisons(true)
        setRemaining(0)
        setTotal(data.total || 0)
        setLoading(false)
        return
      }

      setPerson1(data.person1)
      setPerson2(data.person2)
      setRemaining(data.remaining || 0)
      setTotal(data.total || 0)
      setShowOutOfComparisons(false)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Something went wrong. Please try again.')
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

    // Unmark this combination as shown
    if (person1 && person2) {
      const updatedCombinations = dailyCombinations.map(c => {
        if (
          (c.person1_id === battleToUndo.winnerId && c.person2_id === battleToUndo.loserId) ||
          (c.person1_id === battleToUndo.loserId && c.person2_id === battleToUndo.winnerId)
        ) {
          return { ...c, shown: false, shown_order: null }
        }
        return c
      })
      setDailyCombinations(updatedCombinations)
    }

    // Clear result display
    setResult(null)

    logger.info('Battle undone successfully')
  }

  const handleBattleGuest = (winnerId: string, loserId: string) => {
    setProcessing(true)
    setError('')

    try {
      const isOnboarding = onboardingState.isActive
      const rosterToUse = isOnboarding ? (DEMO_ROSTER_PEOPLE as RosterPerson[]) : localRoster

      // Calculate ELO changes
      const winner = rosterToUse.find(p => p.id === winnerId)
      const loser = rosterToUse.find(p => p.id === loserId)

      if (!winner || !loser) {
        throw new Error('Person not found')
      }

      const { winnerChange, loserChange, newWinnerRating, newLoserRating } = calculateEloChanges(
        winner.elo_rating,
        loser.elo_rating
      )

      // Record battle for undo (only if not onboarding)
      if (!isOnboarding) {
        recordBattle(winnerId, loserId, winner.elo_rating, loser.elo_rating)
      }

      // Update roster (only if not onboarding)
      if (!isOnboarding) {
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
      }

      // Mark this combination as shown and load next combo immediately (optimistic)
      if (person1 && person2 && !isOnboarding) {
        const updatedCombinations = markCombinationShown(
          dailyCombinations,
          person1.id,
          person2.id
        )
        setDailyCombinations(updatedCombinations)

        // Immediately load next combo
        const nextCombination = getNextCombination(updatedCombinations)

        if (nextCombination) {
          setPerson1(nextCombination.person1)
          setPerson2(nextCombination.person2)
          setShowOutOfComparisons(false)

          // Update progress tracking
          const shown = updatedCombinations.filter(c => c.shown).length
          setRemaining(updatedCombinations.length - shown)
          setTotal(updatedCombinations.length)
        } else {
          // All combinations exhausted
          setShowOutOfComparisons(true)
          setRemaining(0)
          setTotal(updatedCombinations.length)
        }
      } else if (isOnboarding) {
        // For onboarding, regenerate fresh demo combos
        const demoCombos = generateAllCombinations(rosterToUse)
        const nextCombination = getNextCombination(demoCombos)
        if (nextCombination) {
          setPerson1(nextCombination.person1)
          setPerson2(nextCombination.person2)
        }
      }

      // Show result overlay (doesn't block next combo)
      setResult({
        winner: winnerId,
        winnerChange,
        loserChange,
      })

      // Trigger haptic and confetti
      triggerHaptic('success')
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)

      // Clear result and re-enable after display duration
      setTimeout(() => {
        setResult(null)
        setProcessing(false)
      }, BATTLE_RESULT_DISPLAY_DURATION)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
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
      // Process battle and fetch next combo in parallel for better performance
      const [battleResponse, nextPairResponse] = await Promise.all([
        fetch('/api/battles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ winner_id: winnerId, loser_id: loserId }),
        }),
        fetch('/api/battles/pair'),
      ])

      const battleData = await battleResponse.json()
      const nextPairData = await nextPairResponse.json()

      if (!battleResponse.ok) {
        throw new Error(battleData.error || 'Failed to process battle')
      }

      // Immediately load next combo (optimistic)
      if (nextPairResponse.ok) {
        if (nextPairData.exhausted) {
          setShowOutOfComparisons(true)
          setRemaining(0)
          setTotal(nextPairData.total || 0)
        } else if (nextPairData.errorCode === 'EMPTY_ROSTER') {
          setError(nextPairData.message || 'You need at least 2 people in your roster to start battles.')
        } else {
          setPerson1(nextPairData.person1)
          setPerson2(nextPairData.person2)
          setRemaining(nextPairData.remaining || 0)
          setTotal(nextPairData.total || 0)
          setShowOutOfComparisons(false)
        }
      }

      // Show result overlay (doesn't block next combo)
      setResult({
        winner: winnerId,
        winnerChange: battleData.winner.change,
        loserChange: battleData.loser.change,
      })

      // Trigger haptic and confetti
      triggerHaptic('success')
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)

      // Clear result and re-enable after display duration
      setTimeout(() => {
        setResult(null)
        setProcessing(false)
      }, BATTLE_RESULT_DISPLAY_DURATION)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
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

  if (showOutOfComparisons) {
    return (
      <div>
        {!user && !authLoading && <GuestBanner />}
        <OutOfComparisons
          onReset={
            !user
              ? () => {
                  // Reset all ELO ratings to default
                  const resetRoster = localRoster.map(person => ({
                    ...person,
                    elo_rating: calculateInitialElo(
                      person.attraction_score,
                      person.personality_score,
                      person.reliability_score
                    ),
                  }))
                  setLocalRoster(resetRoster)

                  // Generate fresh combinations
                  const freshCombinations = generateAllCombinations(resetRoster)
                  setDailyCombinations(freshCombinations)
                  setLastResetDate(getTodayDateString())

                  setShowOutOfComparisons(false)
                  fetchBattlePairGuest()
                }
              : undefined
          }
          totalPeople={user ? total : localRoster.length}
          isAuthenticated={!!user}
        />
      </div>
    )
  }

  if (error) {
    const isEmptyRosterError = error.includes('at least 2 people') || error.includes('Not enough people')

    return (
      <div className="py-6">
        <h2 className="text-2xl font-serif font-bold mb-4">Battle</h2>
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <div className="text-6xl mb-4">
            {isEmptyRosterError ? '👥' : '⚠️'}
          </div>
          <p className={`${isEmptyRosterError ? 'text-gray-700 dark:text-gray-300' : 'text-red-500'} mb-4 font-medium`}>
            {error}
          </p>
          {isEmptyRosterError ? (
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.location.href = '/add'}>
                Add People to Roster
              </Button>
              <Button variant="tertiary" onClick={user ? fetchBattlePair : fetchBattlePairGuest}>
                Try Again
              </Button>
            </div>
          ) : (
            <Button onClick={user ? fetchBattlePair : fetchBattlePairGuest}>
              Try Again
            </Button>
          )}
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
  const totalPossibleBattles = user ? total : dailyCombinations.length
  const battlesCompleted = user
    ? total - remaining
    : dailyCombinations.filter(c => c.shown).length
  const battlesRemaining = user ? remaining : totalPossibleBattles - battlesCompleted

  return (
    <div className="py-6">
      {!user && !authLoading && <GuestBanner />}

      <div className="text-center mb-6">
        <h2 className="text-2xl font-serif font-bold mb-4">Battle</h2>
        <p className="text-sm text-gray-600 mb-3">
          Right now, tonight — who would you rather?
        </p>
        {totalPossibleBattles > 0 && (
          <p className="text-xs text-gray-500">
            Battle {battlesCompleted + 1} of {totalPossibleBattles}
            {user && ' • Resets daily'}
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
      <p className="text-center text-xs text-gray-500 dark:text-gray-300 mb-4">
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
            // Mark this combination as shown (even if skipped)
            if (!user && person1 && person2) {
              const updatedCombinations = markCombinationShown(
                dailyCombinations,
                person1.id,
                person2.id
              )
              setDailyCombinations(updatedCombinations)
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
