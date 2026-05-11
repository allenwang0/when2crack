import type { RosterPerson } from '../types'

export interface Achievement {
  id: string
  icon: string
  title: string
  description: string
  unlocked: boolean
  progress?: number
  total?: number
}

export function calculateAchievements(
  rosterCount: number,
  battleCount: number,
  hasSchedule: boolean,
  loginStreak: number
): Achievement[] {
  const totalBattles = (rosterCount * (rosterCount - 1)) / 2

  return [
    {
      id: 'first_add',
      icon: '🥚',
      title: 'Crack the First Egg',
      description: 'Add your first person',
      unlocked: rosterCount >= 1
    },
    {
      id: 'five_people',
      icon: '🐣',
      title: 'Growing Roster',
      description: 'Add 5 people to your roster',
      unlocked: rosterCount >= 5,
      progress: Math.min(rosterCount, 5),
      total: 5
    },
    {
      id: 'ten_people',
      icon: '🐥',
      title: 'Squad Goals',
      description: 'Add 10 people to your roster',
      unlocked: rosterCount >= 10,
      progress: Math.min(rosterCount, 10),
      total: 10
    },
    {
      id: 'first_battle',
      icon: '⚔️',
      title: 'First Battle',
      description: 'Complete your first comparison',
      unlocked: battleCount >= 1
    },
    {
      id: 'ten_battles',
      icon: '🏆',
      title: 'Battle Royale',
      description: 'Complete 10 battles',
      unlocked: battleCount >= 10,
      progress: Math.min(battleCount, 10),
      total: 10
    },
    {
      id: 'all_battles',
      icon: '👑',
      title: 'Comparison King',
      description: 'Compare everyone with everyone',
      unlocked: totalBattles > 0 && battleCount >= totalBattles
    },
    {
      id: 'schedule_set',
      icon: '📅',
      title: 'Planning Ahead',
      description: 'Set your availability for the week',
      unlocked: hasSchedule
    },
    {
      id: 'seven_day_streak',
      icon: '🔥',
      title: 'Week Warrior',
      description: 'Open the app 7 days in a row',
      unlocked: loginStreak >= 7,
      progress: Math.min(loginStreak, 7),
      total: 7
    }
  ]
}
