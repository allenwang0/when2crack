// Avatar color generation
// Generates a consistent color for a person based on their name

const AVATAR_COLORS = [
  '#ff6b9d', // pink
  '#a78bfa', // purple
  '#60a5fa', // blue
  '#4ecdc4', // teal
  '#ffa07a', // amber
  '#ff8c7a', // coral
  '#f472b6', // pink variant
  '#818cf8', // indigo
  '#34d399', // green
  '#fb923c', // orange
]

export function generateAvatarColor(name: string): string {
  // Simple hash function to get consistent color per name
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

export function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function getTierColor(tier: 'S' | 'A' | 'B' | 'C'): string {
  const tierColors = {
    S: '#ff6b9d', // pink
    A: '#a78bfa', // purple
    B: '#60a5fa', // blue
    C: '#9ca3af', // gray
  }
  return tierColors[tier]
}
