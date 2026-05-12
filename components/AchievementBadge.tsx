'use client'

import type { Achievement } from '@/lib/achievements/definitions'

interface AchievementBadgeProps {
  achievement: Achievement
  isUnlocked: boolean
  progress: number // 0-100
  isNew?: boolean
  onClick?: () => void
}

export function AchievementBadge({
  achievement,
  isUnlocked,
  progress,
  isNew = false,
  onClick,
}: AchievementBadgeProps) {
  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common':
        return 'from-gray-400 to-gray-500'
      case 'rare':
        return 'from-blue-400 to-blue-600'
      case 'epic':
        return 'from-purple-400 to-purple-600'
      case 'legendary':
        return 'from-yellow-400 to-yellow-600'
    }
  }

  const getRarityGlow = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common':
        return 'shadow-gray-300'
      case 'rare':
        return 'shadow-blue-300'
      case 'epic':
        return 'shadow-purple-300'
      case 'legendary':
        return 'shadow-yellow-300'
    }
  }

  // Calculate stroke dash for progress ring
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all hover:scale-105 active:scale-95"
      aria-label={`${achievement.name} - ${isUnlocked ? 'Unlocked' : `${Math.floor(progress)}% progress`}`}
    >
      {/* Badge Container */}
      <div className="relative w-12 h-12">
        {/* Progress Ring for In-Progress Achievements */}
        {!isUnlocked && progress > 0 && (
          <svg
            className="absolute inset-0 w-12 h-12 -rotate-90"
            viewBox="0 0 48 48"
          >
            {/* Background circle */}
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-yellow-bright transition-all duration-300"
            />
          </svg>
        )}

        {/* Icon Container */}
        <div
          className={`
            relative w-12 h-12 rounded-full flex items-center justify-center text-2xl
            transition-all duration-200
            ${
              isUnlocked
                ? `bg-gradient-to-br ${getRarityColor(achievement.rarity)} shadow-lg ${getRarityGlow(achievement.rarity)}`
                : 'bg-gray-200 dark:bg-gray-700 grayscale opacity-60'
            }
          `}
        >
          {isUnlocked ? (
            achievement.icon
          ) : (
            <span className="text-xl">🔒</span>
          )}
        </div>

        {/* NEW Badge Indicator */}
        {isNew && isUnlocked && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
            NEW
          </div>
        )}

        {/* Points Badge */}
        {isUnlocked && (
          <div className="absolute -bottom-1 -right-1 bg-black dark:bg-yellow-bright text-yellow-bright dark:text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-gray-800">
            {achievement.points}
          </div>
        )}
      </div>

      {/* Achievement Name */}
      <div className="text-[10px] font-semibold text-center leading-tight max-w-[60px] line-clamp-2 text-gray-900 dark:text-gray-100">
        {achievement.name}
      </div>

      {/* Progress Percentage for In-Progress */}
      {!isUnlocked && progress > 0 && (
        <div className="text-[9px] font-bold text-yellow-bright">
          {Math.floor(progress)}%
        </div>
      )}
    </button>
  )
}
