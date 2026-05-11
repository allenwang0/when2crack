'use client'

interface Achievement {
  id: string
  icon: string
  title: string
  description: string
  unlocked: boolean
  progress?: number
  total?: number
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_add',
    icon: '🥚',
    title: 'Crack the First Egg',
    description: 'Add your first person',
    unlocked: false
  },
  {
    id: 'five_people',
    icon: '🐣',
    title: 'Growing Roster',
    description: 'Add 5 people to your roster',
    unlocked: false,
    progress: 0,
    total: 5
  },
  {
    id: 'ten_people',
    icon: '🐥',
    title: 'Squad Goals',
    description: 'Add 10 people to your roster',
    unlocked: false,
    progress: 0,
    total: 10
  },
  {
    id: 'first_battle',
    icon: '⚔️',
    title: 'First Battle',
    description: 'Complete your first comparison',
    unlocked: false
  },
  {
    id: 'ten_battles',
    icon: '🏆',
    title: 'Battle Royale',
    description: 'Complete 10 battles',
    unlocked: false,
    progress: 0,
    total: 10
  },
  {
    id: 'all_battles',
    icon: '👑',
    title: 'Comparison King',
    description: 'Compare everyone with everyone',
    unlocked: false
  },
  {
    id: 'schedule_set',
    icon: '📅',
    title: 'Planning Ahead',
    description: 'Set your availability for the week',
    unlocked: false
  },
  {
    id: 'seven_day_streak',
    icon: '🔥',
    title: 'Week Warrior',
    description: 'Open the app 7 days in a row',
    unlocked: false,
    progress: 0,
    total: 7
  }
]

export function Achievements() {
  return (
    <div className="py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-block bg-black text-yellow-bright px-6 py-3 rounded-full mb-3">
          <span className="font-bold text-xl">🏆 Achievements</span>
        </div>
        <p className="text-sm text-gray-600">
          Track your progress and unlock rewards
        </p>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 gap-4">
        {ACHIEVEMENTS.map(achievement => (
          <div
            key={achievement.id}
            className="bg-white rounded-2xl p-5 transition-all"
            style={{
              border: achievement.unlocked
                ? '3px solid #FFD93D'
                : '2px solid #E8E8E8',
              opacity: achievement.unlocked ? 1 : 0.6,
              boxShadow: achievement.unlocked
                ? '0 4px 12px rgba(255, 217, 61, 0.3)'
                : 'none'
            }}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className="w-16 h-16 flex-shrink-0 flex items-center justify-center rounded-full text-3xl"
                style={{
                  backgroundColor: achievement.unlocked ? '#FFD93D' : '#F5F5F0',
                  border: achievement.unlocked ? '2px solid #1A1A1A' : 'none'
                }}
              >
                {achievement.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg mb-1" style={{ color: '#1A1A1A' }}>
                  {achievement.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {achievement.description}
                </p>

                {/* Progress bar if applicable */}
                {achievement.progress !== undefined && achievement.total && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>
                        {achievement.progress}/{achievement.total}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(achievement.progress / achievement.total) * 100}%`,
                          backgroundColor: '#FFD93D'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Unlocked badge */}
                {achievement.unlocked && (
                  <div className="mt-2 inline-block bg-black text-yellow-bright px-3 py-1 rounded-full text-xs font-bold">
                    ✓ Unlocked
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="mt-8 bg-gradient-to-r from-yellow-soft to-white rounded-3xl p-6 text-center"
           style={{ border: '2px solid #FFD93D' }}>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>
              {ACHIEVEMENTS.filter(a => a.unlocked).length}
            </div>
            <div className="text-xs text-gray-600 mt-1">Unlocked</div>
          </div>
          <div>
            <div className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>
              {ACHIEVEMENTS.length}
            </div>
            <div className="text-xs text-gray-600 mt-1">Total</div>
          </div>
          <div>
            <div className="text-3xl font-bold" style={{ color: '#FFD93D' }}>
              {Math.round((ACHIEVEMENTS.filter(a => a.unlocked).length / ACHIEVEMENTS.length) * 100)}%
            </div>
            <div className="text-xs text-gray-600 mt-1">Complete</div>
          </div>
        </div>
      </div>
    </div>
  )
}
