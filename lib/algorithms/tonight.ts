import type { RosterPerson, TonightRecommendation } from '@/lib/types'
import { daysBetween } from '@/lib/utils/dates'

/**
 * Calculate Tonight recommendation score
 * Weighs reliability heavily, applies recency decay, and tier multiplier
 * @param person - Roster person
 * @returns Tonight score (higher = better recommendation)
 */
export function calculateTonightScore(person: RosterPerson): number {
  const baseScore = person.elo_rating

  // Recency decay: 4-week penalty
  const daysSinceContact = daysBetween(person.last_contact_date, new Date())
  const recencyPenalty = daysSinceContact > 28 ? -100 : 0

  // Reliability weight (heavily weighted)
  // Scale: -100 to +100 based on reliability score
  const reliabilityBoost = (person.reliability_score - 5) * 20

  return baseScore + reliabilityBoost + recencyPenalty
}

/**
 * Get top Tonight recommendations
 * @param roster - Array of roster people
 * @param limit - Number of recommendations to return (default: 3)
 * @returns Array of Tonight recommendations sorted by score
 */
export function getTonightRecommendations(
  roster: RosterPerson[],
  limit: number = 3
): TonightRecommendation[] {
  // Filter out archived people
  const active = roster.filter((p) => p.status !== 'Archived')

  // Calculate Tonight score for each person
  const recommendations: TonightRecommendation[] = active.map((person) => ({
    person,
    tonight_score: calculateTonightScore(person),
    reasoning: {
      tier: person.tier, // Keep in data structure but not displayed
      reliability: person.reliability_score,
      recency_days: daysBetween(person.last_contact_date, new Date()),
      elo_rating: person.elo_rating,
    },
  }))

  // Sort by Tonight score (descending) and return top N
  return recommendations
    .sort((a, b) => b.tonight_score - a.tonight_score)
    .slice(0, limit)
}

/**
 * Get availability indicator for a person
 * Based on last contact date and reliability score
 * @param person - Roster person
 * @returns 'likely' | 'uncertain' | 'unlikely'
 */
export function getAvailabilityIndicator(
  person: RosterPerson
): 'likely' | 'uncertain' | 'unlikely' {
  const daysSinceContact = daysBetween(person.last_contact_date, new Date())
  const { reliability_score } = person

  // High reliability + recent contact = likely
  if (reliability_score >= 7 && daysSinceContact <= 7) return 'likely'

  // Low reliability or no recent contact = unlikely
  if (reliability_score <= 4 || daysSinceContact > 28) return 'unlikely'

  // Everything else = uncertain
  return 'uncertain'
}
