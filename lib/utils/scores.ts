import type { RosterPerson, Hang } from '@/lib/types'

// Calculate composite score (average of three dimensions)
export function calculateCompositeScore(person: RosterPerson): number {
  const composite =
    (person.attraction_score + person.personality_score + person.reliability_score) / 3
  return Math.round(composite * 10) / 10 // Round to 1 decimal place
}

// Calculate momentum from recent hangs
export function calculateMomentum(recentHangs: Hang[]): number {
  // Look at last 3 hangs
  const recent = recentHangs.slice(0, 3)

  let momentum = 0
  recent.forEach((hang) => {
    momentum += hang.attraction_change + hang.personality_change + hang.reliability_change
  })

  return momentum // Range: -9 to +9
}

// Get momentum label for display
export function getMomentumLabel(momentum: number): string {
  if (momentum > 3) return 'Strong upward'
  if (momentum > 0) return 'Upward'
  if (momentum < -3) return 'Strong downward'
  if (momentum < 0) return 'Downward'
  return 'Stable'
}

// Get momentum color
export function getMomentumColor(momentum: number): string {
  if (momentum > 3) return '#4ecdc4' // teal
  if (momentum > 0) return '#34d399' // green
  if (momentum < -3) return '#f87171' // red
  if (momentum < 0) return '#ffa07a' // amber
  return '#9ca3af' // gray
}

// Score validation
export function validateScore(score: number): number {
  return Math.max(1, Math.min(10, score))
}

// Apply score change
export function applyScoreChange(currentScore: number, change: -1 | 0 | 1): number {
  return validateScore(currentScore + change)
}
