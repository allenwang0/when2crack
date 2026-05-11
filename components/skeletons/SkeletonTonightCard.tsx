import React from 'react'
import { SkeletonAvatar, SkeletonText, SkeletonRectangle } from './Skeleton'

export function SkeletonTonightCard() {
  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-5">
      {/* Rank Label */}
      <div className="mb-3">
        <SkeletonText width="w-24" height="h-4" />
      </div>

      {/* Person Info */}
      <div className="flex items-start gap-3 mb-4">
        {/* Avatar */}
        <SkeletonAvatar size="sm" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          <div className="mb-2">
            <SkeletonText width="w-32" height="h-5" />
          </div>

          {/* Badge + Elo */}
          <div className="flex items-center gap-2">
            <SkeletonText width="w-16" height="h-5" className="rounded-full" />
            <SkeletonText width="w-12" height="h-3" />
          </div>
        </div>
      </div>

      {/* Reasoning Section */}
      <div className="bg-background rounded-lg p-4 mb-4 space-y-2.5">
        {/* "Why tonight:" label */}
        <div className="mb-2">
          <SkeletonText width="w-20" height="h-3" />
        </div>

        {/* Score rows */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <SkeletonText width="w-20" height="h-4" />
            <SkeletonText width="w-12" height="h-4" />
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <SkeletonRectangle width="flex-1" height="h-9" rounded="2xl" />
        <SkeletonRectangle width="flex-1" height="h-9" rounded="2xl" />
      </div>
    </div>
  )
}
