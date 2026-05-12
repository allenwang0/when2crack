import type { RosterPerson, Battle } from '@/lib/types'

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
 * Generate all possible combinations for a roster
 * Combinations are sorted by ELO difference (closer matches first for more interesting battles)
 */
export function generateAllCombinations(roster: RosterPerson[]): CombinationWithPeople[] {
  const combinations: CombinationWithPeople[] = []

  // Filter active roster
  const active = roster.filter((p) => p.status !== 'Archived')

  if (active.length < 2) return []

  // Performance safeguards
  if (active.length > 30) {
    console.warn(
      `Large roster (${active.length} people) will generate ${
        (active.length * (active.length - 1)) / 2
      } combinations. This may impact performance.`
    )
  }

  if (active.length > 50) {
    console.error(
      'Roster too large for daily combinations (max 50 active people). Please archive some people to improve performance.'
    )
    return []
  }

  // Generate all unique pairs
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

  return combinations
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
