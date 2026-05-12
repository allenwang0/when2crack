'use client'

interface AchievementStatsBarProps {
  unlockedCount: number
  totalCount: number
  earnedPoints: number
  totalPoints: number
}

export function AchievementStatsBar({
  unlockedCount,
  totalCount,
  earnedPoints,
  totalPoints,
}: AchievementStatsBarProps) {
  const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-6">
      {/* Stats Row */}
      <div className="flex items-center justify-between gap-4 mb-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <div>
            <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
              {unlockedCount}/{totalCount}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300">Unlocked</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-2xl">✨</span>
          <div>
            <div className="font-bold text-lg text-yellow-bright">
              {earnedPoints}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300">Points</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <div>
            <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
              {percentage}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300">Complete</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-pink to-purple transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
