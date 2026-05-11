import React from 'react'
import { SkeletonAvatar, SkeletonText } from './Skeleton'

export function SkeletonRosterCard() {
  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <SkeletonAvatar size="sm" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          <div className="mb-2">
            <SkeletonText width="w-32" height="h-5" />
          </div>

          {/* Badge + Composite Score */}
          <div className="flex items-center gap-2 mb-3">
            <SkeletonText width="w-16" height="h-5" className="rounded-full" />
            <SkeletonText width="w-24" height="h-4" />
          </div>

          {/* Elo + Last Contact */}
          <div className="flex items-center justify-between">
            <SkeletonText width="w-16" height="h-3" />
            <SkeletonText width="w-28" height="h-3" />
          </div>
        </div>
      </div>
    </div>
  )
}
