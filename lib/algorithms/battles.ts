import type { RosterPerson, Battle, BattlePair } from '@/lib/types'
import { daysBetween } from '@/lib/utils/dates'

/**
 * Select the next battle pair
 * Prioritizes close-ranked pairs that haven't battled recently
 * @param roster - Array of roster people
 * @param battleHistory - Array of past battles
 * @returns Battle pair or null if insufficient roster
 */
export function selectBattlePair(
  roster: RosterPerson[],
  battleHistory: Battle[]
): BattlePair | null {
  // Filter active roster (not Archived)
  const active = roster.filter((p) => p.status !== 'Archived')

  if (active.length < 2) return null

  // Sort by Elo rating (descending)
  const sorted = [...active].sort((a, b) => b.elo_rating - a.elo_rating)

  // Find pairs with close ratings that haven't battled recently
  for (let i = 0; i < sorted.length - 1; i++) {
    const person1 = sorted[i]
    const person2 = sorted[i + 1]

    // Check if they've battled in last 7 days
    const recentBattle = battleHistory.find(
      (b) =>
        (b.winner_id === person1.id && b.loser_id === person2.id) ||
        (b.winner_id === person2.id && b.loser_id === person1.id)
    )

    const daysSinceBattle = recentBattle
      ? daysBetween(recentBattle.created_at, new Date())
      : Infinity

    if (daysSinceBattle > 7) {
      return { person1, person2 }
    }
  }

  // Fallback: random pair from active roster
  const idx1 = Math.floor(Math.random() * active.length)
  let idx2 = Math.floor(Math.random() * active.length)
  while (idx2 === idx1 && active.length > 1) {
    idx2 = Math.floor(Math.random() * active.length)
  }

  return {
    person1: active[idx1],
    person2: active[idx2],
  }
}

/**
 * Check if a person has high uncertainty (few recent battles)
 * @param personId - ID of the roster person
 * @param battleHistory - Array of past battles
 * @param threshold - Number of days to look back (default: 30)
 * @returns True if person has fewer than 3 battles in the threshold period
 */
export function hasHighUncertainty(
  personId: string,
  battleHistory: Battle[],
  threshold: number = 30
): boolean {
  const recentBattles = battleHistory.filter((b) => {
    const isInvolved = b.winner_id === personId || b.loser_id === personId
    const daysAgo = daysBetween(b.created_at, new Date())
    return isInvolved && daysAgo <= threshold
  })

  return recentBattles.length < 3
}

/**
 * Get battle statistics for a person
 * @param personId - ID of the roster person
 * @param battleHistory - Array of past battles
 * @returns Object with win/loss counts and win rate
 */
export function getBattleStats(personId: string, battleHistory: Battle[]) {
  const battles = battleHistory.filter(
    (b) => b.winner_id === personId || b.loser_id === personId
  )

  const wins = battles.filter((b) => b.winner_id === personId).length
  const losses = battles.filter((b) => b.loser_id === personId).length
  const total = battles.length

  return {
    wins,
    losses,
    total,
    winRate: total > 0 ? (wins / total) * 100 : 0,
  }
}
