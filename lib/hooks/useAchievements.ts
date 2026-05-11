import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import type { Achievement, UnlockedAchievement } from '@/lib/achievements/definitions'

export function useAchievements() {
  const { user } = useAuth()
  const [unlocked, setUnlocked] = useState<UnlockedAchievement[]>([])
  const [newUnlocks, setNewUnlocks] = useState<string[]>([])
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

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
      setAllAchievements(data.allAchievements || [])
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
  const totalCount = allAchievements.length
  const progressPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0

  // Calculate total points
  const totalPoints = allAchievements.reduce((sum, a) => sum + a.points, 0)
  const earnedPoints = allAchievements
    .filter((a) => unlocked.some((u) => u.achievement_id === a.id))
    .reduce((sum, a) => sum + a.points, 0)

  return {
    unlocked,
    newUnlocks,
    allAchievements,
    loading,
    unseenAchievements,
    unlockedCount,
    totalCount,
    progressPercentage,
    earnedPoints,
    totalPoints,
    fetchAchievements,
    markAsSeen,
  }
}
