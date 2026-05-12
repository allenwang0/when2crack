'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GuestBanner } from '@/components/GuestBanner'
import { Button } from '@/components/ui/Button'
import { AchievementStatsBar } from '@/components/AchievementStatsBar'
import { AchievementTabs } from '@/components/AchievementTabs'
import { AchievementGrid } from '@/components/AchievementGrid'
import { AchievementModal } from '@/components/AchievementModal'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useAchievements } from '@/lib/hooks/useAchievements'
import type { Achievement } from '@/lib/achievements/definitions'
import type { AchievementWithProgress } from '@/lib/hooks/useAchievements'

const CATEGORY_ICONS = {
  all: '🏆',
  roster: '👥',
  battles: '⚔️',
  hangs: '🎉',
  social: '📅',
  streak: '🔥',
  special: '✨',
}

export default function AchievementsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const {
    achievementsWithProgress,
    loading,
    unlockedCount,
    totalCount,
    earnedPoints,
    totalPoints,
    categories,
    filterByCategory,
  } = useAchievements()

  const [activeCategory, setActiveCategory] = useState<Achievement['category'] | 'all'>('all')
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementWithProgress | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleBadgeClick = (achievement: Achievement) => {
    const achWithProgress = achievementsWithProgress.find((a) => a.id === achievement.id)
    if (achWithProgress) {
      setSelectedAchievement(achWithProgress)
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setSelectedAchievement(null), 200) // Delay reset for animation
  }

  // Convert categories to tab format
  const tabs = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: CATEGORY_ICONS[cat.id] || '📁',
    unlockedCount: cat.unlockedCount || 0,
    totalCount: cat.total,
  }))

  // Get filtered achievements
  const filteredAchievements = filterByCategory(activeCategory)

  if (authLoading || (user && loading)) {
    return (
      <div className="py-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading achievements...</p>
        </div>
      </div>
    )
  }

  // Guest mode message
  if (!user) {
    return (
      <div className="py-6">
        <GuestBanner />

        <Button variant="tertiary" onClick={() => router.back()} className="mb-6">
          ← Back
        </Button>

        <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border-2 border-pink dark:border-pink/50 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100">
            Track Your Progress
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Sign in to unlock achievements, earn points, and track your progress as you build your
            roster and make connections!
          </p>
          <Button onClick={() => router.push('/')}>Sign In to Unlock Achievements</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6">
      {/* Back Button */}
      <Button variant="tertiary" onClick={() => router.back()} className="mb-6">
        ← Back
      </Button>

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-serif font-bold mb-2 text-gray-900 dark:text-gray-100">
          Achievements
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Unlock achievements and earn points as you use the app
        </p>
      </div>

      {/* Stats Bar */}
      <AchievementStatsBar
        unlockedCount={unlockedCount}
        totalCount={totalCount}
        earnedPoints={earnedPoints}
        totalPoints={totalPoints}
      />

      {/* Category Tabs */}
      <AchievementTabs
        tabs={tabs}
        activeTab={activeCategory}
        onTabChange={(tabId) => setActiveCategory(tabId as Achievement['category'] | 'all')}
      />

      {/* Achievement Grid */}
      {filteredAchievements.length > 0 ? (
        <AchievementGrid
          achievements={filteredAchievements}
          onBadgeClick={handleBadgeClick}
          progressive={true}
          initialCount={12}
        />
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>No achievements in this category yet.</p>
        </div>
      )}

      {/* Achievement Modal */}
      {selectedAchievement && (
        <AchievementModal
          achievement={selectedAchievement}
          isUnlocked={selectedAchievement.isUnlocked}
          progress={selectedAchievement.progress}
          unlockedAt={selectedAchievement.unlockedAt}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
