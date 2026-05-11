import React from 'react'
import { SkeletonAvatar, SkeletonText } from './Skeleton'

export function SkeletonBattleCard() {
  return (
    <div className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-3 sm:p-6">
      {/* Avatar */}
      <div className="mb-4 sm:mb-5">
        <SkeletonAvatar size="lg" className="mx-auto" />
      </div>

      {/* Name */}
      <div className="mb-3 sm:mb-4 flex flex-col items-center gap-1">
        <SkeletonText width="w-24" height="h-5" />
        <SkeletonText width="w-32" height="h-6" />
      </div>

      {/* Scores */}
      <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-5">
        {['Composite', 'Attraction', 'Personality', 'Reliability'].map((label) => (
          <div key={label} className="flex items-center justify-between">
            <SkeletonText width="w-20" height="h-4" />
            <SkeletonText width="w-8" height="h-4" />
          </div>
        ))}
      </div>

      {/* Elo Rating */}
      <div className="flex justify-center mt-3">
        <SkeletonText width="w-16" height="h-3" />
      </div>
    </div>
  )
}
