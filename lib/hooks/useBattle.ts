import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RosterPerson } from '@/lib/types'
import { calculateEloChanges } from '@/lib/algorithms/elo'

interface BattleResult {
  winner: string
  winnerChange: number
  loserChange: number
}

export function useBattle(
  user: any,
  localRoster: RosterPerson[],
  setLocalRoster: (roster: RosterPerson[]) => void,
  completedBattles: string[],
  setCompletedBattles: (battles: string[]) => void,
  skippedBattles?: string[],
  setSkippedBattles?: (battles: string[]) => void
) {
  const [person1, setPerson1] = useState<RosterPerson | null>(null)
  const [person2, setPerson2] = useState<RosterPerson | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null)
  const [showOutOfComparisons, setShowOutOfComparisons] = useState(false)

  const supabase = createClient()

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

      // Convert completed/skipped battles to Sets for O(1) lookups
      const completedSet = new Set(completedBattles)
      const skippedSet = skippedBattles ? new Set(skippedBattles) : new Set()

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

      if (data.person1 && data.person2) {
        setPerson1(data.person1)
        setPerson2(data.person2)
        setShowOutOfComparisons(false)
      } else {
        setShowOutOfComparisons(true)
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBattleGuest = async (winnerId: string, loserId: string) => {
    if (!person1 || !person2) return

    setProcessing(true)
    setBattleResult(null)

    try {
      // Mark battle as completed
      const battleKey = getBattleKey(winnerId, loserId)
      setCompletedBattles([...completedBattles, battleKey])

      // Calculate Elo changes
      const winner = localRoster.find(p => p.id === winnerId)
      const loser = localRoster.find(p => p.id === loserId)

      if (!winner || !loser) {
        throw new Error('Person not found')
      }

      const { winnerChange, loserChange, newWinnerRating, newLoserRating } = calculateEloChanges(
        winner.elo_rating,
        loser.elo_rating
      )

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

      setBattleResult({
        winner: winnerId,
        winnerChange,
        loserChange,
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
      return handleBattleGuest(winnerId, loserId)
    }

    setProcessing(true)
    setBattleResult(null)

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

  const handleSkip = () => {
    if (!person1 || !person2) return

    if (skippedBattles && setSkippedBattles) {
      const battleKey = getBattleKey(person1.id, person2.id)
      setSkippedBattles([...skippedBattles, battleKey])
    }

    if (user) {
      fetchBattlePair()
    } else {
      fetchBattlePairGuest()
    }
  }

  return {
    person1,
    person2,
    loading,
    processing,
    error,
    battleResult,
    showOutOfComparisons,
    fetchBattlePair,
    fetchBattlePairGuest,
    handleBattle,
    handleSkip,
    setPerson1,
    setPerson2,
    setShowOutOfComparisons,
    getBattleKey,
  }
}
