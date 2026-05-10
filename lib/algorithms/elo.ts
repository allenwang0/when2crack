// Elo rating system for pairwise battle comparisons
// Based on the Elo algorithm used in chess, adapted for roster ranking

const K = 32 // K-factor: determines rating volatility

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

  const newWinnerRating = winnerRating + K * (1 - expectedWinner)
  const newLoserRating = loserRating + K * (0 - expectedLoser)

  return [Math.round(newWinnerRating), Math.round(newLoserRating)]
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
