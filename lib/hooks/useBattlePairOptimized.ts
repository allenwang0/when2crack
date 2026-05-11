import { useMemo } from 'react'
import type { RosterPerson } from '@/lib/types'

/**
 * Optimized battle pair generation for guest mode
 * Uses memoization to avoid recalculating pairs on every render
 */
export function useBattlePairOptimized(
  localRoster: RosterPerson[],
  completedBattles: string[],
  skippedBattles: string[]
) {
  // Memoize available pairs calculation
  const availablePairs = useMemo(() => {
    if (localRoster.length < 2) {
      return []
    }

    const completedSet = new Set(completedBattles)
    const skippedSet = new Set(skippedBattles)
    const pairs: Array<[RosterPerson, RosterPerson]> = []

    // Only generate pairs, don't check them yet
    for (let i = 0; i < localRoster.length; i++) {
      for (let j = i + 1; j < localRoster.length; j++) {
        const key = [localRoster[i].id, localRoster[j].id].sort().join('-')

        if (!completedSet.has(key) && !skippedSet.has(key)) {
          pairs.push([localRoster[i], localRoster[j]])
        }
      }
    }

    return pairs
  }, [localRoster, completedBattles, skippedBattles])

  // Memoize battle statistics
  const stats = useMemo(() => {
    const totalPossible = (localRoster.length * (localRoster.length - 1)) / 2
    const completed = completedBattles.length
    const skipped = skippedBattles.length
    const remaining = availablePairs.length

    return {
      totalPossible,
      completed,
      skipped,
      remaining,
      percentComplete: totalPossible > 0 ? Math.round((completed / totalPossible) * 100) : 0,
    }
  }, [localRoster.length, completedBattles.length, skippedBattles.length, availablePairs.length])

  return {
    availablePairs,
    stats,
    hasAvailablePairs: availablePairs.length > 0,
  }
}
