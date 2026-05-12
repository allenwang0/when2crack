/**
 * @deprecated LEGACY ACHIEVEMENTS COMPONENT - DO NOT USE
 *
 * This component uses the old achievement system and is deprecated.
 * Use the new components instead:
 * - AchievementGrid for grid display
 * - AchievementBadge for individual badges
 * - AchievementModal for detail view
 *
 * This file is kept for backward compatibility only.
 */

'use client'

import type { Achievement } from '@/lib/utils/achievements'

interface AchievementsProps {
  achievements: Achievement[]
}

export function Achievements({ achievements }: AchievementsProps) {
  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-block bg-gradient-to-r from-pink to-purple text-white px-8 py-3 rounded-2xl mb-4 shadow-lg">
          <span className="font-bold text-xl">🏆 Achievements</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Track your progress and unlock rewards
        </p>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 gap-4">
        {achievements.map(achievement => (
          <div
            key={achievement.id}
            className={`bg-white dark:bg-gray-800 rounded-2xl p-6 transition-all ${
              achievement.unlocked
                ? 'border-[3px] border-yellow-bright opacity-100 shadow-[0_8px_16px_rgba(255,217,61,0.3)]'
                : 'border-2 border-gray-200 dark:border-gray-700 opacity-70 shadow-sm'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className={`w-16 h-16 flex-shrink-0 flex items-center justify-center rounded-full text-3xl ${
                  achievement.unlocked
                    ? 'bg-yellow-bright border-2 border-foreground'
                    : 'bg-background'
                }`}
              >
                {achievement.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg mb-2 text-foreground">
                  {achievement.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {achievement.description}
                </p>

                {/* Progress bar if applicable */}
                {achievement.progress !== undefined && achievement.total && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>
                        {achievement.progress}/{achievement.total}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all bg-yellow-bright"
                        style={{
                          width: `${(achievement.progress / achievement.total) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Unlocked badge */}
                {achievement.unlocked && (
                  <div className="mt-2 inline-block bg-black dark:bg-yellow-bright text-yellow-bright dark:text-black px-3 py-1 rounded-full text-xs font-bold">
                    ✓ Unlocked
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="mt-8 bg-gradient-to-r from-yellow-50 to-white dark:from-yellow-900/20 dark:to-gray-800 rounded-2xl p-8 text-center shadow-sm border-[3px] border-yellow-bright">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-4xl font-bold mb-2 text-foreground dark:text-gray-100">
              {achievements.filter(a => a.unlocked).length}
            </div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Unlocked</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2 text-foreground dark:text-gray-100">
              {achievements.length}
            </div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2 text-yellow-bright">
              {achievements.length > 0 ? Math.round((achievements.filter(a => a.unlocked).length / achievements.length) * 100) : 0}%
            </div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Complete</div>
          </div>
        </div>
      </div>
    </div>
  )
}
