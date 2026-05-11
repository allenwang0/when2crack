/**
 * Achievement definitions and unlock logic
 */

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'roster' | 'battles' | 'hangs' | 'social' | 'special'
  condition: (stats: UserStats) => boolean
  points: number
}

export interface UserStats {
  rosterCount: number
  battleCount: number
  hangCount: number
  loginStreak: number
  totalLogins: number
  when2cracksSent: number
  scheduleShares: number
  firstBattleDate?: string
  accountCreatedDate: string
}

export interface UnlockedAchievement {
  achievement_id: string
  unlocked_at: string
  seen: boolean
}

/**
 * All available achievements
 */
export const ACHIEVEMENTS: Achievement[] = [
  // Roster Achievements
  {
    id: 'first_person',
    name: 'First Contact',
    description: 'Add your first person to the roster',
    icon: '👋',
    category: 'roster',
    condition: (stats) => stats.rosterCount >= 1,
    points: 10,
  },
  {
    id: 'roster_5',
    name: 'Building Connections',
    description: 'Add 5 people to your roster',
    icon: '👥',
    category: 'roster',
    condition: (stats) => stats.rosterCount >= 5,
    points: 25,
  },
  {
    id: 'roster_10',
    name: 'Social Butterfly',
    description: 'Add 10 people to your roster',
    icon: '🦋',
    category: 'roster',
    condition: (stats) => stats.rosterCount >= 10,
    points: 50,
  },
  {
    id: 'roster_20',
    name: 'Network Master',
    description: 'Add 20 people to your roster',
    icon: '🌟',
    category: 'roster',
    condition: (stats) => stats.rosterCount >= 20,
    points: 100,
  },

  // Battle Achievements
  {
    id: 'first_battle',
    name: 'First Decision',
    description: 'Complete your first battle comparison',
    icon: '⚔️',
    category: 'battles',
    condition: (stats) => stats.battleCount >= 1,
    points: 10,
  },
  {
    id: 'battles_10',
    name: 'Getting Decisive',
    description: 'Complete 10 battle comparisons',
    icon: '🎯',
    category: 'battles',
    condition: (stats) => stats.battleCount >= 10,
    points: 25,
  },
  {
    id: 'battles_50',
    name: 'Comparison Expert',
    description: 'Complete 50 battle comparisons',
    icon: '🏆',
    category: 'battles',
    condition: (stats) => stats.battleCount >= 50,
    points: 75,
  },
  {
    id: 'battles_100',
    name: 'Master Ranker',
    description: 'Complete 100 battle comparisons',
    icon: '👑',
    category: 'battles',
    condition: (stats) => stats.battleCount >= 100,
    points: 150,
  },

  // Hang Achievements
  {
    id: 'first_hang',
    name: 'Out There',
    description: 'Log your first hang',
    icon: '🎉',
    category: 'hangs',
    condition: (stats) => stats.hangCount >= 1,
    points: 15,
  },
  {
    id: 'hangs_5',
    name: 'Social Life',
    description: 'Log 5 hangs',
    icon: '✨',
    category: 'hangs',
    condition: (stats) => stats.hangCount >= 5,
    points: 30,
  },
  {
    id: 'hangs_20',
    name: 'Always Busy',
    description: 'Log 20 hangs',
    icon: '🔥',
    category: 'hangs',
    condition: (stats) => stats.hangCount >= 20,
    points: 75,
  },

  // Social Achievements
  {
    id: 'first_when2crack',
    name: 'Scheduler',
    description: 'Send your first when2crack schedule',
    icon: '📅',
    category: 'social',
    condition: (stats) => stats.when2cracksSent >= 1,
    points: 20,
  },
  {
    id: 'when2cracks_5',
    name: 'Time Coordinator',
    description: 'Send 5 when2crack schedules',
    icon: '⏰',
    category: 'social',
    condition: (stats) => stats.when2cracksSent >= 5,
    points: 40,
  },

  // Streak Achievements
  {
    id: 'streak_3',
    name: 'Getting Consistent',
    description: 'Login 3 days in a row',
    icon: '🔥',
    category: 'special',
    condition: (stats) => stats.loginStreak >= 3,
    points: 15,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Login 7 days in a row',
    icon: '💪',
    category: 'special',
    condition: (stats) => stats.loginStreak >= 7,
    points: 35,
  },
  {
    id: 'streak_30',
    name: 'Dedication',
    description: 'Login 30 days in a row',
    icon: '⭐',
    category: 'special',
    condition: (stats) => stats.loginStreak >= 30,
    points: 100,
  },

  // Special Achievements
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined when2crack in the early days',
    icon: '🚀',
    category: 'special',
    condition: (stats) => {
      if (!stats.accountCreatedDate) return false
      const created = new Date(stats.accountCreatedDate)
      const cutoff = new Date('2026-06-01') // Adjust based on launch
      return created < cutoff
    },
    points: 50,
  },
  {
    id: 'completionist',
    name: 'Completionist',
    description: 'Try every feature: roster, battles, hangs, schedule',
    icon: '🎊',
    category: 'special',
    condition: (stats) =>
      stats.rosterCount >= 1 &&
      stats.battleCount >= 1 &&
      stats.hangCount >= 1 &&
      stats.scheduleShares >= 1,
    points: 75,
  },
]

/**
 * Check which achievements a user has unlocked
 */
export function checkUnlockedAchievements(
  stats: UserStats,
  currentlyUnlocked: string[]
): Achievement[] {
  const newlyUnlocked: Achievement[] = []

  for (const achievement of ACHIEVEMENTS) {
    // Skip if already unlocked
    if (currentlyUnlocked.includes(achievement.id)) {
      continue
    }

    // Check if condition is met
    if (achievement.condition(stats)) {
      newlyUnlocked.push(achievement)
    }
  }

  return newlyUnlocked
}

/**
 * Calculate total achievement points
 */
export function calculateAchievementPoints(unlockedIds: string[]): number {
  return ACHIEVEMENTS.filter((a) => unlockedIds.includes(a.id)).reduce(
    (sum, a) => sum + a.points,
    0
  )
}

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(
  category: Achievement['category']
): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.category === category)
}
