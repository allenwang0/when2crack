'use client'

import { useState } from 'react'
import { AchievementBadge } from './AchievementBadge'
import { Button } from './ui/Button'
import type { Achievement } from '@/lib/achievements/definitions'

interface AchievementWithProgress extends Achievement {
  progress: number
  isUnlocked: boolean
  isNew: boolean
}

interface AchievementGridProps {
  achievements: AchievementWithProgress[]
  onBadgeClick: (achievement: Achievement) => void
  progressive?: boolean
  initialCount?: number
}

export function AchievementGrid({
  achievements,
  onBadgeClick,
  progressive = true,
  initialCount = 12,
}: AchievementGridProps) {
  const [showAll, setShowAll] = useState(false)

  // Separate unlocked and locked for better organization
  const unlocked = achievements.filter((a) => a.isUnlocked)
  const inProgress = achievements.filter((a) => !a.isUnlocked && a.progress > 0)
  const locked = achievements.filter((a) => !a.isUnlocked && a.progress === 0)

  // Combine in priority order
  const sortedAchievements = [...unlocked, ...inProgress, ...locked]

  const displayedAchievements = progressive && !showAll
    ? sortedAchievements.slice(0, initialCount)
    : sortedAchievements

  const hiddenCount = sortedAchievements.length - initialCount

  return (
    <div>
      {/* Grid */}
      <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-4">
        {displayedAchievements.map((achievement) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            isUnlocked={achievement.isUnlocked}
            progress={achievement.progress}
            isNew={achievement.isNew}
            onClick={() => onBadgeClick(achievement)}
          />
        ))}
      </div>

      {/* Show More Button */}
      {progressive && hiddenCount > 0 && !showAll && (
        <div className="text-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAll(true)}
            className="text-sm"
          >
            Show {hiddenCount} more {hiddenCount === 1 ? 'achievement' : 'achievements'}
          </Button>
        </div>
      )}

      {/* Show Less Button */}
      {progressive && showAll && hiddenCount > 0 && (
        <div className="text-center">
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => setShowAll(false)}
            className="text-sm"
          >
            Show less
          </Button>
        </div>
      )}
    </div>
  )
}
