'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'

interface TonightStatsProps {
  todayCount: number
}

export function TonightStats({ todayCount }: TonightStatsProps) {
  const { user } = useAuth()
  const [weeklyCount, setWeeklyCount] = useState(0)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    if (!user) return

    const fetchStats = async () => {
      const supabase = createClient()

      // Get weekly count
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      const { data: weeklyData } = await supabase
        .from('outreach_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('outreach_date', oneWeekAgo.toISOString())

      if (weeklyData) {
        setWeeklyCount((weeklyData as any).count || 0)
      }

      // Calculate streak (days with at least 1 outreach)
      const { data: recentOutreach } = await supabase
        .from('outreach_log')
        .select('outreach_date')
        .eq('user_id', user.id)
        .order('outreach_date', { ascending: false })
        .limit(100)

      if (recentOutreach && recentOutreach.length > 0) {
        const dates = recentOutreach.map(r => {
          const date = new Date(r.outreach_date)
          return date.toDateString()
        })

        const uniqueDates = Array.from(new Set(dates))
        let currentStreak = 0
        let checkDate = new Date()

        for (let i = 0; i < uniqueDates.length; i++) {
          const dateStr = checkDate.toDateString()
          if (uniqueDates.includes(dateStr)) {
            currentStreak++
            checkDate.setDate(checkDate.getDate() - 1)
          } else {
            break
          }
        }

        setStreak(currentStreak)
      }
    }

    fetchStats()
  }, [user, todayCount])

  if (todayCount === 0) return null

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-4 sm:p-6 mb-6">
      <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-4 uppercase tracking-wide">
        Your Progress
      </p>

      <div className="grid grid-cols-3 gap-4">
        {/* Today */}
        <div className="text-center">
          <div className="text-3xl sm:text-4xl font-bold text-purple-600 dark:text-purple-400 mb-1">
            {todayCount}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">Today</div>
        </div>

        {/* This Week */}
        <div className="text-center">
          <div className="text-3xl sm:text-4xl font-bold text-pink dark:text-pink-400 mb-1">
            {weeklyCount}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">This Week</div>
        </div>

        {/* Streak */}
        {streak > 0 && (
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-orange-500 dark:text-orange-400 mb-1">
              {streak} 🔥
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300">Day Streak</div>
          </div>
        )}

        {streak === 0 && user && (
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-gray-400 dark:text-gray-500 mb-1">
              --
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300">Day Streak</div>
          </div>
        )}
      </div>

      {/* Encouragement */}
      {todayCount >= 3 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-purple-600 dark:text-purple-300 font-medium">
            {todayCount >= 5 ? "🌟 You're crushing it today!" : "💪 Keep the momentum going!"}
          </p>
        </div>
      )}
    </div>
  )
}
