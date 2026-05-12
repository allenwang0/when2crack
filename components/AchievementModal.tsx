'use client'

import { useEffect } from 'react'
import type { Achievement } from '@/lib/achievements/definitions'

interface AchievementModalProps {
  achievement: Achievement | null
  isUnlocked: boolean
  progress: number
  unlockedAt?: string
  isOpen: boolean
  onClose: () => void
}

export function AchievementModal({
  achievement,
  isUnlocked,
  progress,
  unlockedAt,
  isOpen,
  onClose,
}: AchievementModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen || !achievement) return null

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

  const getRarityName = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common':
        return 'Common'
      case 'rare':
        return 'Rare'
      case 'epic':
        return 'Epic'
      case 'legendary':
        return 'Legendary'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div
              className={`
                w-24 h-24 rounded-full flex items-center justify-center text-5xl
                ${
                  isUnlocked
                    ? `bg-gradient-to-br ${getRarityColor(achievement.rarity)} shadow-lg`
                    : 'bg-gray-200 dark:bg-gray-700 grayscale opacity-60'
                }
              `}
            >
              {isUnlocked ? achievement.icon : '🔒'}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">
            {achievement.name}
          </h3>

          {/* Rarity */}
          <div className="flex justify-center mb-4">
            <span
              className={`
                px-3 py-1 rounded-full text-xs font-bold text-white
                bg-gradient-to-r ${getRarityColor(achievement.rarity)}
              `}
            >
              {getRarityName(achievement.rarity)}
            </span>
          </div>

          {/* Description */}
          <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
            {achievement.description}
          </p>

          {/* Progress or Unlock Info */}
          {isUnlocked ? (
            <div className="bg-yellow-bright/10 border border-yellow-bright/30 rounded-xl p-4 text-center">
              <div className="text-lg font-bold text-yellow-bright mb-1">
                ✓ Unlocked
              </div>
              {unlockedAt && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(unlockedAt)}
                </div>
              )}
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">
                +{achievement.points} points
              </div>
            </div>
          ) : (
            <div>
              {/* Progress Bar */}
              {progress > 0 ? (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                    <span>Progress</span>
                    <span className="font-bold">{Math.floor(progress)}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink to-purple transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : null}

              {/* Hint */}
              <div className="bg-gray-100 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  How to unlock:
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {achievement.hint || achievement.description}
                </div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-500 mt-2">
                  Worth {achievement.points} points
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
