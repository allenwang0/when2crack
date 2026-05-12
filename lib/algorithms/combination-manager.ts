import type { RosterPerson, Battle } from '@/lib/types'
import { logger } from '@/lib/utils/logger'

export interface DailyCombination {
  person1_id: string
  person2_id: string
  shown: boolean
  shown_order: number | null
}

export interface CombinationWithPeople extends DailyCombination {
  person1: RosterPerson
  person2: RosterPerson
  elo_difference: number
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Generate sampled combinations for large rosters
 * Uses random sampling to cap total combinations
 */
function generateSampledCombinations(
  roster: RosterPerson[],
  maxCombinations: number
): CombinationWithPeople[] {
  const combinations: CombinationWithPeople[] = []
  const seenPairs = new Set<string>()

  const active = roster.filter((p) => p.status !== 'Archived')
  if (active.length < 2) return []

  // Try to generate diverse pairings
  let attempts = 0
  const maxAttempts = maxCombinations * 3 // Allow retries for duplicates

  while (combinations.length < maxCombinations && attempts < maxAttempts) {
    attempts++

    const i = Math.floor(Math.random() * active.length)
    const j = Math.floor(Math.random() * active.length)

    if (i === j) continue

    // Create consistent pair key (sorted IDs)
    const pairKey = [active[i].id, active[j].id].sort().join('-')
    if (seenPairs.has(pairKey)) continue

    seenPairs.add(pairKey)

    const person1 = active[i]
    const person2 = active[j]
    const eloDiff = Math.abs(person1.elo_rating - person2.elo_rating)

    combinations.push({
      person1_id: person1.id,
      person2_id: person2.id,
      person1,
      person2,
      elo_difference: eloDiff,
      shown: false,
      shown_order: null,
    })
  }

  // Sort by ELO difference for interesting matches
  return combinations.sort((a, b) => a.elo_difference - b.elo_difference)
}

/**
 * Generate all possible combinations for a roster
 * Combinations are sorted by ELO difference (closer matches first for more interesting battles)
 * For large rosters (>100), uses sampling to cap total combinations
 */
export function generateAllCombinations(roster: RosterPerson[]): CombinationWithPeople[] {
  const combinations: CombinationWithPeople[] = []

  // Filter active roster
  const active = roster.filter((p) => p.status !== 'Archived')

  if (active.length < 2) return []

  const totalPossible = (active.length * (active.length - 1)) / 2

  // Performance safeguards - use sampling for very large rosters
  const MAX_ROSTER_SIZE = 100

  if (active.length > MAX_ROSTER_SIZE) {
    logger.warn(
      `Roster size ${active.length} exceeds maximum ${MAX_ROSTER_SIZE}. Using sampled combinations (max 1000).`
    )
    return generateSampledCombinations(active, 1000)
  }

  if (active.length > 50) {
    logger.warn(
      `Large roster (${active.length} people) will generate ${totalPossible} combinations. Consider archiving inactive people.`
    )
  }

  // Generate all unique pairs for rosters <= 100 people
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const person1 = active[i]
      const person2 = active[j]
      const eloDiff = Math.abs(person1.elo_rating - person2.elo_rating)

      combinations.push({
        person1_id: person1.id,
        person2_id: person2.id,
        person1,
        person2,
        elo_difference: eloDiff,
        shown: false,
        shown_order: null,
      })
    }
  }

  // Sort by ELO difference (ascending - closer matches first)
  combinations.sort((a, b) => a.elo_difference - b.elo_difference)

  // Shuffle slightly to add variety while keeping similar ELOs near each other
  return shuffleArray(combinations)
}

/**
 * Get the next unshown combination
 */
export function getNextCombination(
  combinations: CombinationWithPeople[]
): CombinationWithPeople | null {
  return combinations.find(c => !c.shown) || null
}

/**
 * Check if all combinations have been shown
 */
export function areAllCombinationsShown(combinations: DailyCombination[]): boolean {
  return combinations.length > 0 && combinations.every(c => c.shown)
}

/**
 * Mark a combination as shown
 */
export function markCombinationShown(
  combinations: CombinationWithPeople[],
  person1_id: string,
  person2_id: string
): CombinationWithPeople[] {
  const maxOrder = Math.max(0, ...combinations.map(c => c.shown_order || 0))

  return combinations.map(c => {
    // Check if this combination matches (either order)
    if (
      (c.person1_id === person1_id && c.person2_id === person2_id) ||
      (c.person1_id === person2_id && c.person2_id === person1_id)
    ) {
      return {
        ...c,
        shown: true,
        shown_order: maxOrder + 1,
      }
    }
    return c
  })
}

/**
 * Get today's date string in YYYY-MM-DD format (local timezone)
 */
export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Check if combinations need to be reset (new day)
 */
export function shouldResetCombinations(lastResetDate: string | null): boolean {
  if (!lastResetDate) return true
  return lastResetDate !== getTodayDateString()
}
