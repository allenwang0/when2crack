'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'
import { BattleCard } from '@/components/BattleCard'
import { MessageModal } from '@/components/MessageModal'
import { SuccessAnimation } from '@/components/SuccessAnimation'
import { TonightStats } from '@/components/TonightStats'
import { SkeletonBattleCard } from '@/components/skeletons/SkeletonBattleCard'
import { GuestBanner } from '@/components/GuestBanner'
import { OutOfComparisons } from '@/components/OutOfComparisons'
import { Button } from '@/components/ui/Button'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { useToast } from '@/lib/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import type { RosterPerson, Database } from '@/lib/types'
import { calculateEloChanges, calculateInitialElo } from '@/lib/algorithms/elo'
import { API_SAFETY_TIMEOUT } from '@/lib/constants'
import { useOnboarding } from '@/lib/contexts/OnboardingContext'
import { DEMO_ROSTER_PEOPLE } from '@/lib/constants/onboardingDemoData'

export default function TonightPage() {
  const { user, loading: authLoading } = useAuth()
  const { state: onboardingState } = useOnboarding()
  const supabase = createClient()
  const router = useRouter()
  const { toasts, showToast, removeToast } = useToast()
  const [localRoster, setLocalRoster] = useLocalStorage<RosterPerson[]>('guest_roster', [])
  const [completedBattles, setCompletedBattles] = useLocalStorage<string[]>('completed_battles', [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [person1, setPerson1] = useState<RosterPerson | null>(null)
  const [person2, setPerson2] = useState<RosterPerson | null>(null)
  const [processing, setProcessing] = useState(false)
  const [battleResult, setBattleResult] = useState<{
    winner: string
    winnerChange: number
    loserChange: number
  } | null>(null)
  const [showOutOfComparisons, setShowOutOfComparisons] = useState(false)

  // Message modal state
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<RosterPerson | null>(null)
  const [messagesCount, setMessagesCount] = useState(0)
  const [lastMessagedPerson, setLastMessagedPerson] = useState<string>('')

  // Battle functions
  const getBattleKey = (id1: string, id2: string) => {
    return [id1, id2].sort().join('-')
  }

  const fetchBattlePairGuest = () => {
    setLoading(true)
    setError('')
    setBattleResult(null)

    try {
      // Use demo data during onboarding, otherwise use local roster
      const isOnboarding = onboardingState.isActive
      const rosterToUse = isOnboarding ? DEMO_ROSTER_PEOPLE : localRoster

      if (rosterToUse.length < 2) {
        setError('Not enough people in roster')
        setLoading(false)
        return
      }

      // Convert completed battles to Set for O(1) lookups (skip for onboarding)
      const completedSet = isOnboarding ? new Set() : new Set(completedBattles)

      // Find available pairs - prioritize tonight-worthy candidates
      const tonightCandidates = rosterToUse.filter(p => {
        const compositeScore = (p.attraction_score + p.personality_score + p.reliability_score) / 3
        return p.status !== 'Archived' &&
          (compositeScore >= 6 || (p.reliability_score || 0) >= 5)
      })

      const candidatesToUse = tonightCandidates.length >= 2 ? tonightCandidates : rosterToUse

      // Find available pairs
      const availablePairs: Array<[RosterPerson, RosterPerson]> = []
      for (let i = 0; i < candidatesToUse.length; i++) {
        for (let j = i + 1; j < candidatesToUse.length; j++) {
          const key = getBattleKey(candidatesToUse[i].id, candidatesToUse[j].id)
          if (!completedSet.has(key)) {
            availablePairs.push([candidatesToUse[i], candidatesToUse[j]])
          }
        }
      }

      if (availablePairs.length === 0) {
        setShowOutOfComparisons(true)
        setLoading(false)
        return
      }

      setShowOutOfComparisons(false)

      // Prefer pairs with close scores (more interesting comparisons)
      const sortedPairs = availablePairs.sort((a, b) => {
        const aScoreDiff = Math.abs((a[0].elo_rating || 1500) - (a[1].elo_rating || 1500))
        const bScoreDiff = Math.abs((b[0].elo_rating || 1500) - (b[1].elo_rating || 1500))
        return aScoreDiff - bScoreDiff
      })

      const bestPair = sortedPairs[0]
      setPerson1(bestPair[0])
      setPerson2(bestPair[1])
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

      // Check if all combinations are exhausted
      if (data.exhausted) {
        setShowOutOfComparisons(true)
        return
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
      const isOnboarding = onboardingState.isActive
      const rosterToUse = isOnboarding ? (DEMO_ROSTER_PEOPLE as RosterPerson[]) : localRoster

      // Mark battle as completed (only if not onboarding)
      if (person1 && person2 && !isOnboarding) {
        const battleKey = getBattleKey(person1.id, person2.id)
        setCompletedBattles([...completedBattles, battleKey])
      }

      const winner = rosterToUse.find(p => p.id === winnerId)
      const loser = rosterToUse.find(p => p.id === loserId)

      if (!winner || !loser) {
        throw new Error('Person not found')
      }

      const { winnerChange, loserChange, newWinnerRating, newLoserRating } = calculateEloChanges(
        winner.elo_rating,
        loser.elo_rating
      )

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

      setBattleResult({
        winner: winnerId,
        winnerChange,
        loserChange,
      })

      // Open message modal for winner
      setSelectedPerson(winner)
      setShowMessageModal(true)
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

      // Open message modal for winner
      const winner = winnerId === person1?.id ? person1 : person2
      if (winner) {
        setSelectedPerson(winner)
        setShowMessageModal(true)
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleSendMessage = async (message: string) => {
    if (!selectedPerson) return

    try {
      if (user) {
        // Log outreach for authenticated users
        // @ts-expect-error - Supabase generated types issue
        const { error } = await supabase
          .from('outreach_log')
          .insert({
            roster_id: selectedPerson.id,
            user_id: user.id,
            outreach_date: new Date().toISOString(),
          })

        if (error) throw error

        // @ts-expect-error - Supabase generated types issue
        const { error: updateError } = await supabase
          .from('roster')
          .update({
            last_contact_date: new Date().toISOString(),
          })
          .eq('id', selectedPerson.id)
          .eq('user_id', user.id)

        if (updateError) throw updateError
      }

      const firstName = selectedPerson.name.split(' ')[0]
      showToast(`Message ready for ${firstName}! 💬`, 'success')
      setMessagesCount(prev => prev + 1)
      setLastMessagedPerson(firstName)

      // Load next pair after a short delay
      setTimeout(() => {
        if (user) {
          fetchBattlePair()
        } else {
          fetchBattlePairGuest()
        }
      }, 500)
    } catch (err) {
      console.error('Error logging outreach:', err)
      showToast('Failed to log outreach. Please try again.', 'error')
    }
  }

  const handleSkip = () => {
    if (user) {
      fetchBattlePair()
    } else {
      fetchBattlePairGuest()
    }
  }

  useEffect(() => {
    if (authLoading) {
      setLoading(true)
      return
    }

    const safetyTimeout = setTimeout(() => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Loading timeout - forcing completion')
      }
      setLoading(false)
    }, API_SAFETY_TIMEOUT)

    if (user) {
      fetchBattlePair().finally(() => clearTimeout(safetyTimeout))
    } else {
      fetchBattlePairGuest()
      clearTimeout(safetyTimeout)
    }

    return () => clearTimeout(safetyTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading])

  if (loading) {
    return (
      <div className="py-6" aria-label="Loading" aria-busy="true">
        <div className="text-center mb-6">
          <div className="h-8 w-64 mx-auto skeleton rounded mb-3" />
          <div className="h-4 w-48 mx-auto skeleton rounded" />
        </div>
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SkeletonBattleCard />
            <SkeletonBattleCard />
          </div>
        </div>
      </div>
    )
  }

  // Completion screen
  if (showOutOfComparisons) {
    return (
      <div>
        {!user && !authLoading && <GuestBanner />}
        <OutOfComparisons
          isAuthenticated={!!user}
          onReset={
            user
              ? undefined
              : () => {
                  setCompletedBattles([])
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
                }
          }
          totalPeople={user ? 0 : localRoster.length}
        />
      </div>
    )
  }

  const totalPossibleBattles = (localRoster.length * (localRoster.length - 1)) / 2
  const battlesCompleted = completedBattles.length

  return (
    <div className="py-6">
      {!user && !authLoading && <GuestBanner />}

      {/* Success Animation */}
      {lastMessagedPerson && (
        <SuccessAnimation count={messagesCount} personName={lastMessagedPerson} />
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-3 sm:mb-4 text-gray-900 dark:text-gray-100">
          Who Tonight?
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6">
          Who do you want to reach out to more?
        </p>
        {!user && totalPossibleBattles > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-300 font-medium">
            Comparison {battlesCompleted + 1} of {totalPossibleBattles}
          </p>
        )}
      </div>

      {/* Progress Stats */}
      {messagesCount > 0 && <TonightStats todayCount={messagesCount} />}

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6 text-center">
          <p className="text-red-500 text-sm font-medium mb-3">{error}</p>
          <Button onClick={user ? fetchBattlePair : fetchBattlePairGuest} variant="secondary">Try Again</Button>
        </div>
      )}

      {!error && (!person1 || !person2) && (
        <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 sm:p-12 text-center">
          <div className="text-5xl sm:text-6xl mb-4 sm:mb-6">👥</div>
          <p className="text-gray-900 dark:text-gray-100 font-semibold text-base sm:text-lg mb-2">Need more people</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Add at least 2 people to your roster to get started
          </p>
          <Button
            onClick={() => router.push('/roster')}
            className="mt-4"
          >
            Go to Roster
          </Button>
        </div>
      )}

      {person1 && person2 && (
        <>
          {battleResult && (
            <div className="bg-pink/10 dark:bg-pink/20 border border-pink rounded-xl p-4 mb-6 text-center animate-fade-in">
              <p className="text-pink dark:text-pink font-semibold mb-2">Great choice!</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Winner: {battleResult.winnerChange > 0 ? '+' : ''}
                {battleResult.winnerChange} Elo
                {' • '}
                Other: {battleResult.loserChange > 0 ? '+' : ''}
                {battleResult.loserChange} Elo
              </p>
            </div>
          )}

          <div className="relative">
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <BattleCard
                person={person1!}
                onClick={() => handleBattle(person1!.id, person2!.id)}
                disabled={processing}
              />
              <BattleCard
                person={person2!}
                onClick={() => handleBattle(person2!.id, person1!.id)}
                disabled={processing}
              />
            </div>

            {/* VS Badge - Positioned between cards */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <span className="inline-block px-4 py-2 bg-gray-900 dark:bg-gray-100 text-yellow-bright dark:text-gray-900 rounded-full text-sm font-bold shadow-lg">
                VS
              </span>
            </div>
          </div>

          <div className="text-center mt-6 space-y-3">
            <Button
              variant="tertiary"
              onClick={handleSkip}
              disabled={processing}
            >
              Skip this comparison
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Can't decide? Skip and we'll show you another pair
            </p>
          </div>
        </>
      )}

      {/* Message Modal */}
      {selectedPerson && (
        <MessageModal
          person={selectedPerson}
          isOpen={showMessageModal}
          onClose={() => {
            setShowMessageModal(false)
            setSelectedPerson(null)
          }}
          onSend={handleSendMessage}
          onScheduleInstead={() => router.push(`/schedule?person=${selectedPerson.id}`)}
        />
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
