import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import type { Achievement, UnlockedAchievement } from '@/lib/achievements/definitions'
import {
  ACHIEVEMENTS,
  getAchievementProgress,
  sortAchievementsByPriority,
  getCategories,
} from '@/lib/achievements/definitions'

export interface AchievementWithProgress extends Achievement {
  progress: number
  isUnlocked: boolean
  isNew: boolean
  unlockedAt?: string
}

export function useAchievements() {
  const { user } = useAuth()
  const [unlocked, setUnlocked] = useState<UnlockedAchievement[]>([])
  const [newUnlocks, setNewUnlocks] = useState<string[]>([])
  const [allAchievements, setAllAchievements] = useState<Achievement[]>(ACHIEVEMENTS)
  const [loading, setLoading] = useState(true)
  const [progressMap, setProgressMap] = useState<Map<string, number>>(new Map())

  // Fetch achievements
  const fetchAchievements = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/achievements')
      if (!response.ok) throw new Error('Failed to fetch achievements')

      const data = await response.json()
      setUnlocked(data.unlocked || [])
      setNewUnlocks(data.newUnlocks || [])
      setAllAchievements(data.allAchievements || ACHIEVEMENTS)

      // Calculate progress for all achievements
      if (data.stats) {
        const unlockedIds = (data.unlocked || []).map((u: UnlockedAchievement) => u.achievement_id)
        const progress = getAchievementProgress(data.stats, unlockedIds)
        setProgressMap(progress)
      }
    } catch (error) {
      console.error('Error fetching achievements:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchAchievements()
  }, [fetchAchievements])

  // Mark achievements as seen
  const markAsSeen = useCallback(
    async (achievementIds: string[]) => {
      if (!user) return

      try {
        const response = await fetch('/api/achievements/mark-seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ achievementIds }),
        })

        if (response.ok) {
          // Update local state
          setUnlocked((prev) =>
            prev.map((a) =>
              achievementIds.includes(a.achievement_id) ? { ...a, seen: true } : a
            )
          )
          setNewUnlocks((prev) => prev.filter((id) => !achievementIds.includes(id)))
        }
      } catch (error) {
        console.error('Error marking achievements as seen:', error)
      }
    },
    [user]
  )

  // Get unseen achievements
  const unseenAchievements = unlocked.filter((a) => !a.seen)

  // Calculate progress
  const unlockedCount = unlocked.length
  const totalCount = allAchievements.filter((a) => !a.hidden).length
  const progressPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0

  // Calculate total points
  const totalPoints = allAchievements.filter((a) => !a.hidden).reduce((sum, a) => sum + a.points, 0)
  const earnedPoints = allAchievements
    .filter((a) => unlocked.some((u) => u.achievement_id === a.id))
    .reduce((sum, a) => sum + a.points, 0)

  // Create achievements with progress info
  const unlockedIds = unlocked.map((u) => u.achievement_id)
  const achievementsWithProgress: AchievementWithProgress[] = allAchievements
    .filter((a) => !a.hidden) // Filter out hidden achievements
    .map((achievement) => {
      const isUnlocked = unlockedIds.includes(achievement.id)
      const progress = progressMap.get(achievement.id) || 0
      const isNew = newUnlocks.includes(achievement.id)
      const unlockedRecord = unlocked.find((u) => u.achievement_id === achievement.id)

      return {
        ...achievement,
        progress,
        isUnlocked,
        isNew,
        unlockedAt: unlockedRecord?.unlocked_at,
      }
    })

  // Sort by priority
  const sortedAchievements = sortAchievementsByPriority(
    achievementsWithProgress,
    progressMap,
    unlockedIds,
    newUnlocks
  )

  // Filter by category
  const filterByCategory = useCallback(
    (category: Achievement['category'] | 'all'): AchievementWithProgress[] => {
      if (category === 'all') {
        return sortedAchievements
      }
      return sortedAchievements.filter((a) => a.category === category)
    },
    [sortedAchievements]
  )

  // Get categories with counts
  const categories = getCategories().map((cat) => ({
    ...cat,
    unlockedCount: achievementsWithProgress.filter(
      (a) => a.category === cat.id && a.isUnlocked
    ).length,
  }))

  const categoriesWithAll = [
    { id: 'all' as const, name: 'All', total: totalCount, unlockedCount },
    ...categories,
  ]

  return {
    unlocked,
    newUnlocks,
    allAchievements,
    achievementsWithProgress: sortedAchievements,
    loading,
    unseenAchievements,
    unlockedCount,
    totalCount,
    progressPercentage,
    earnedPoints,
    totalPoints,
    categories: categoriesWithAll,
    fetchAchievements,
    markAsSeen,
    filterByCategory,
  }
}
