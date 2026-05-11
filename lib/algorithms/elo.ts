// Elo rating system for pairwise battle comparisons
// Based on the Elo algorithm used in chess, adapted for roster ranking

import { ELO_K_FACTOR, ELO_DEFAULT_RATING, ELO_SCORE_MULTIPLIER } from '@/lib/constants'

/**
 * Calculate expected score for a player
 * @param rating1 - Rating of player 1
 * @param rating2 - Rating of player 2
 * @returns Expected score (probability of winning) for player 1
 */
function calculateExpectedScore(rating1: number, rating2: number): number {
  return 1 / (1 + Math.pow(10, (rating2 - rating1) / 400))
}

/**
 * Update Elo ratings after a battle
 * @param winnerRating - Current Elo rating of the winner
 * @param loserRating - Current Elo rating of the loser
 * @returns Tuple of [newWinnerRating, newLoserRating]
 */
export function updateElo(
  winnerRating: number,
  loserRating: number
): [number, number] {
  const expectedWinner = calculateExpectedScore(winnerRating, loserRating)
  const expectedLoser = calculateExpectedScore(loserRating, winnerRating)

  const newWinnerRating = winnerRating + ELO_K_FACTOR * (1 - expectedWinner)
  const newLoserRating = loserRating + ELO_K_FACTOR * (0 - expectedLoser)

  return [Math.round(newWinnerRating), Math.round(newLoserRating)]
}

/**
 * Calculate Elo rating changes for a battle
 * @param winnerRating - Current Elo rating of the winner
 * @param loserRating - Current Elo rating of the loser
 * @returns Object with winner/loser rating changes
 */
export function calculateEloChanges(
  winnerRating: number,
  loserRating: number
): { winnerChange: number; loserChange: number; newWinnerRating: number; newLoserRating: number } {
  const [newWinnerRating, newLoserRating] = updateElo(winnerRating, loserRating)

  return {
    winnerChange: newWinnerRating - winnerRating,
    loserChange: newLoserRating - loserRating,
    newWinnerRating,
    newLoserRating,
  }
}

/**
 * Calculate initial Elo rating from composite scores
 * @param attractionScore - Attraction score (1-10)
 * @param personalityScore - Personality score (1-10)
 * @param reliabilityScore - Reliability score (1-10)
 * @returns Initial Elo rating
 */
export function calculateInitialElo(
  attractionScore: number,
  personalityScore: number,
  reliabilityScore: number
): number {
  return ELO_DEFAULT_RATING + (attractionScore + personalityScore + reliabilityScore) * ELO_SCORE_MULTIPLIER
}

/**
 * Get rating difference interpretation
 * @param ratingDiff - Absolute difference in ratings
 * @returns Human-readable interpretation
 */
export function getRatingDifferenceLabel(ratingDiff: number): string {
  if (ratingDiff < 50) return 'Very close match'
  if (ratingDiff < 100) return 'Close match'
  if (ratingDiff < 200) return 'Moderate difference'
  if (ratingDiff < 300) return 'Large difference'
  return 'Very large difference'
}

/**
 * Calculate win probability for a battle
 * @param rating1 - Rating of person 1
 * @param rating2 - Rating of person 2
 * @returns Win probability for person 1 (0-1)
 */
export function calculateWinProbability(rating1: number, rating2: number): number {
  return calculateExpectedScore(rating1, rating2)
}
