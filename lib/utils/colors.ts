// Avatar color generation
// Generates a consistent color for a person based on their name

const AVATAR_COLORS = [
  '#FF8C69', // warm orange
  '#FFB088', // peach
  '#E07856', // terracotta
  '#F4A261', // sandy orange
  '#E9C46A', // golden
  '#F08080', // light coral
  '#D4A373', // tan
  '#E76F51', // burnt orange
  '#EE9B00', // honey
  '#C9ADA7', // warm gray
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
    S: '#FF8C69', // warm orange
    A: '#FFB088', // peach
    B: '#F4A261', // sandy orange
    C: '#C9ADA7', // warm gray
  }
  return tierColors[tier]
}
