/**
 * Achievement definitions and unlock logic
 */

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'roster' | 'battles' | 'hangs' | 'social' | 'streak' | 'special'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  condition: (stats: UserStats) => number // Returns progress 0-100
  points: number
  hidden?: boolean // Secret achievements
  order: number // Display order within category
  hint?: string // Hint for locked achievements
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
    rarity: 'common',
    condition: (stats) => Math.min((stats.rosterCount / 1) * 100, 100),
    points: 10,
    order: 1,
    hint: 'Add your first person to unlock',
  },
  {
    id: 'roster_3',
    name: 'Growing Network',
    description: 'Add 3 people to your roster',
    icon: '🐣',
    category: 'roster',
    rarity: 'common',
    condition: (stats) => Math.min((stats.rosterCount / 3) * 100, 100),
    points: 15,
    order: 2,
    hint: 'Add 3 people to your roster',
  },
  {
    id: 'roster_5',
    name: 'Building Connections',
    description: 'Add 5 people to your roster',
    icon: '👥',
    category: 'roster',
    rarity: 'common',
    condition: (stats) => Math.min((stats.rosterCount / 5) * 100, 100),
    points: 25,
    order: 3,
    hint: 'Add 5 people to your roster',
  },
  {
    id: 'roster_10',
    name: 'Social Butterfly',
    description: 'Add 10 people to your roster',
    icon: '🦋',
    category: 'roster',
    rarity: 'rare',
    condition: (stats) => Math.min((stats.rosterCount / 10) * 100, 100),
    points: 50,
    order: 4,
    hint: 'Add 10 people to your roster',
  },
  {
    id: 'roster_20',
    name: 'Network Master',
    description: 'Add 20 people to your roster',
    icon: '🌟',
    category: 'roster',
    rarity: 'epic',
    condition: (stats) => Math.min((stats.rosterCount / 20) * 100, 100),
    points: 100,
    order: 5,
    hint: 'Add 20 people to your roster',
  },
  {
    id: 'roster_50',
    name: 'Roster Legend',
    description: 'Add 50 people to your roster',
    icon: '💫',
    category: 'roster',
    rarity: 'legendary',
    condition: (stats) => Math.min((stats.rosterCount / 50) * 100, 100),
    points: 250,
    order: 6,
    hint: 'Add 50 people to your roster',
  },

  // Battle Achievements
  {
    id: 'first_battle',
    name: 'First Decision',
    description: 'Complete your first battle comparison',
    icon: '⚔️',
    category: 'battles',
    rarity: 'common',
    condition: (stats) => Math.min((stats.battleCount / 1) * 100, 100),
    points: 10,
    order: 1,
    hint: 'Complete your first battle',
  },
  {
    id: 'battles_5',
    name: 'Getting Decisive',
    description: 'Complete 5 battle comparisons',
    icon: '🎯',
    category: 'battles',
    rarity: 'common',
    condition: (stats) => Math.min((stats.battleCount / 5) * 100, 100),
    points: 20,
    order: 2,
    hint: 'Complete 5 battles',
  },
  {
    id: 'battles_25',
    name: 'Comparison Expert',
    description: 'Complete 25 battle comparisons',
    icon: '🏅',
    category: 'battles',
    rarity: 'rare',
    condition: (stats) => Math.min((stats.battleCount / 25) * 100, 100),
    points: 50,
    order: 3,
    hint: 'Complete 25 battles',
  },
  {
    id: 'battles_50',
    name: 'Battle Pro',
    description: 'Complete 50 battle comparisons',
    icon: '🏆',
    category: 'battles',
    rarity: 'epic',
    condition: (stats) => Math.min((stats.battleCount / 50) * 100, 100),
    points: 75,
    order: 4,
    hint: 'Complete 50 battles',
  },
  {
    id: 'battles_100',
    name: 'Master Ranker',
    description: 'Complete 100 battle comparisons',
    icon: '👑',
    category: 'battles',
    rarity: 'epic',
    condition: (stats) => Math.min((stats.battleCount / 100) * 100, 100),
    points: 150,
    order: 5,
    hint: 'Complete 100 battles',
  },
  {
    id: 'battles_250',
    name: 'Battle Legend',
    description: 'Complete 250 battle comparisons',
    icon: '🔥',
    category: 'battles',
    rarity: 'legendary',
    condition: (stats) => Math.min((stats.battleCount / 250) * 100, 100),
    points: 300,
    order: 6,
    hint: 'Complete 250 battles',
  },

  // Hang Achievements
  {
    id: 'first_hang',
    name: 'Out There',
    description: 'Log your first hang',
    icon: '🎉',
    category: 'hangs',
    rarity: 'common',
    condition: (stats) => Math.min((stats.hangCount / 1) * 100, 100),
    points: 15,
    order: 1,
    hint: 'Log your first hang',
  },
  {
    id: 'hangs_5',
    name: 'Social Life',
    description: 'Log 5 hangs',
    icon: '✨',
    category: 'hangs',
    rarity: 'common',
    condition: (stats) => Math.min((stats.hangCount / 5) * 100, 100),
    points: 30,
    order: 2,
    hint: 'Log 5 hangs',
  },
  {
    id: 'hangs_10',
    name: 'Social Butterfly',
    description: 'Log 10 hangs',
    icon: '🦋',
    category: 'hangs',
    rarity: 'rare',
    condition: (stats) => Math.min((stats.hangCount / 10) * 100, 100),
    points: 50,
    order: 3,
    hint: 'Log 10 hangs',
  },
  {
    id: 'hangs_20',
    name: 'Always Busy',
    description: 'Log 20 hangs',
    icon: '🌈',
    category: 'hangs',
    rarity: 'epic',
    condition: (stats) => Math.min((stats.hangCount / 20) * 100, 100),
    points: 75,
    order: 4,
    hint: 'Log 20 hangs',
  },

  // Social Achievements
  {
    id: 'first_when2crack',
    name: 'Scheduler',
    description: 'Send your first when2crack schedule',
    icon: '📅',
    category: 'social',
    rarity: 'common',
    condition: (stats) => Math.min((stats.when2cracksSent / 1) * 100, 100),
    points: 20,
    order: 1,
    hint: 'Share your schedule',
  },
  {
    id: 'when2cracks_5',
    name: 'Time Coordinator',
    description: 'Send 5 when2crack schedules',
    icon: '⏰',
    category: 'social',
    rarity: 'rare',
    condition: (stats) => Math.min((stats.when2cracksSent / 5) * 100, 100),
    points: 40,
    order: 2,
    hint: 'Share 5 schedules',
  },
  {
    id: 'when2cracks_10',
    name: 'Planning Pro',
    description: 'Send 10 when2crack schedules',
    icon: '🗓️',
    category: 'social',
    rarity: 'epic',
    condition: (stats) => Math.min((stats.when2cracksSent / 10) * 100, 100),
    points: 75,
    order: 3,
    hint: 'Share 10 schedules',
  },

  // Streak Achievements
  {
    id: 'streak_3',
    name: 'Getting Consistent',
    description: 'Login 3 days in a row',
    icon: '🔥',
    category: 'streak',
    rarity: 'common',
    condition: (stats) => Math.min((stats.loginStreak / 3) * 100, 100),
    points: 15,
    order: 1,
    hint: 'Login 3 days in a row',
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Login 7 days in a row',
    icon: '💪',
    category: 'streak',
    rarity: 'rare',
    condition: (stats) => Math.min((stats.loginStreak / 7) * 100, 100),
    points: 35,
    order: 2,
    hint: 'Login 7 days in a row',
  },
  {
    id: 'streak_30',
    name: 'Monthly Dedication',
    description: 'Login 30 days in a row',
    icon: '⭐',
    category: 'streak',
    rarity: 'epic',
    condition: (stats) => Math.min((stats.loginStreak / 30) * 100, 100),
    points: 100,
    order: 3,
    hint: 'Login 30 days in a row',
  },
  {
    id: 'streak_90',
    name: 'Consistency King',
    description: 'Login 90 days in a row',
    icon: '👑',
    category: 'streak',
    rarity: 'legendary',
    condition: (stats) => Math.min((stats.loginStreak / 90) * 100, 100),
    points: 300,
    order: 4,
    hint: 'Login 90 days in a row',
  },

  // Special Achievements
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined when2crack in the early days',
    icon: '🚀',
    category: 'special',
    rarity: 'epic',
    condition: (stats) => {
      if (!stats.accountCreatedDate) return 0
      const created = new Date(stats.accountCreatedDate)
      const cutoff = new Date('2026-06-01')
      return created < cutoff ? 100 : 0
    },
    points: 50,
    order: 1,
    hint: 'Join before June 2026',
  },
  {
    id: 'completionist',
    name: 'Completionist',
    description: 'Try every feature: roster, battles, hangs, schedule',
    icon: '🎊',
    category: 'special',
    rarity: 'rare',
    condition: (stats) => {
      const checks = [
        stats.rosterCount >= 1,
        stats.battleCount >= 1,
        stats.hangCount >= 1,
        stats.scheduleShares >= 1,
      ]
      const completed = checks.filter(Boolean).length
      return (completed / 4) * 100
    },
    points: 75,
    order: 2,
    hint: 'Use all app features',
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Use the app after midnight',
    icon: '🌙',
    category: 'special',
    rarity: 'rare',
    condition: (stats) => (stats.totalLogins > 0 ? 0 : 0), // TODO: Track time of login
    points: 25,
    order: 3,
    hidden: true,
    hint: '???',
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Use the app before 6am',
    icon: '☀️',
    category: 'special',
    rarity: 'rare',
    condition: (stats) => (stats.totalLogins > 0 ? 0 : 0), // TODO: Track time of login
    points: 25,
    order: 4,
    hidden: true,
    hint: '???',
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Active all 7 days in a week',
    icon: '💯',
    category: 'special',
    rarity: 'epic',
    condition: (stats) => (stats.loginStreak >= 7 ? 100 : 0),
    points: 50,
    order: 5,
    hint: 'Be active all 7 days',
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

    // Check if condition is met (100% progress = unlocked)
    const progress = achievement.condition(stats)
    if (progress >= 100) {
      newlyUnlocked.push(achievement)
    }
  }

  return newlyUnlocked
}

/**
 * Get achievement progress for all achievements
 */
export function getAchievementProgress(
  stats: UserStats,
  unlockedIds: string[]
): Map<string, number> {
  const progressMap = new Map<string, number>()

  for (const achievement of ACHIEVEMENTS) {
    // If unlocked, progress is 100
    if (unlockedIds.includes(achievement.id)) {
      progressMap.set(achievement.id, 100)
    } else {
      // Otherwise calculate current progress
      const progress = achievement.condition(stats)
      progressMap.set(achievement.id, Math.min(progress, 99)) // Cap at 99 until unlocked
    }
  }

  return progressMap
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
  return ACHIEVEMENTS.filter((a) => a.category === category).sort((a, b) => a.order - b.order)
}

/**
 * Get all categories with achievement counts
 */
export function getCategories(): Array<{
  id: Achievement['category']
  name: string
  total: number
}> {
  const categories: Achievement['category'][] = ['roster', 'battles', 'hangs', 'social', 'streak', 'special']

  return categories.map((cat) => ({
    id: cat,
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    total: ACHIEVEMENTS.filter((a) => a.category === cat && !a.hidden).length,
  }))
}

/**
 * Sort achievements by priority: in-progress > recently unlocked > locked by category
 */
export function sortAchievementsByPriority(
  achievements: Achievement[],
  progressMap: Map<string, number>,
  unlockedIds: string[],
  recentlyUnlockedIds: string[] = []
): Achievement[] {
  return [...achievements].sort((a, b) => {
    const aProgress = progressMap.get(a.id) || 0
    const bProgress = progressMap.get(b.id) || 0
    const aUnlocked = unlockedIds.includes(a.id)
    const bUnlocked = unlockedIds.includes(b.id)
    const aRecent = recentlyUnlockedIds.includes(a.id)
    const bRecent = recentlyUnlockedIds.includes(b.id)
    const aInProgress = !aUnlocked && aProgress > 0 && aProgress >= 80
    const bInProgress = !bUnlocked && bProgress > 0 && bProgress >= 80

    // Priority 1: Almost there (80-99%)
    if (aInProgress && !bInProgress) return -1
    if (!aInProgress && bInProgress) return 1

    // Priority 2: Recently unlocked
    if (aRecent && !bRecent) return -1
    if (!aRecent && bRecent) return 1

    // Priority 3: Unlocked before locked
    if (aUnlocked && !bUnlocked) return -1
    if (!aUnlocked && bUnlocked) return 1

    // Priority 4: Category and order
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category)
    }
    return a.order - b.order
  })
}
