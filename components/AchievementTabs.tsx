'use client'

import type { Achievement } from '@/lib/achievements/definitions'

interface CategoryTab {
  id: 'all' | Achievement['category']
  name: string
  icon: string
  unlockedCount: number
  totalCount: number
}

interface AchievementTabsProps {
  tabs: CategoryTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function AchievementTabs({ tabs, activeTab, onTabChange }: AchievementTabsProps) {
  return (
    <div className="mb-6">
      {/* Scrollable Tabs Container */}
      <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
        <div className="flex gap-2 min-w-max pb-2">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab
            const completionRate = tab.totalCount > 0
              ? Math.round((tab.unlockedCount / tab.totalCount) * 100)
              : 0

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm
                  transition-all whitespace-nowrap
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-pink to-purple text-white shadow-md'
                      : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-pink'
                  }
                `}
                aria-label={`${tab.name} category - ${tab.unlockedCount} of ${tab.totalCount} unlocked`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.name}</span>
                {tab.totalCount > 0 && (
                  <span
                    className={`
                      text-xs font-bold px-2 py-0.5 rounded-full
                      ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }
                    `}
                  >
                    {tab.unlockedCount}/{tab.totalCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
