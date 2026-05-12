import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkUnlockedAchievements, ACHIEVEMENTS } from '@/lib/achievements/definitions'
import type { UserStats } from '@/lib/achievements/definitions'
import { validateAuth } from '@/lib/api/validation'
import { logger } from '@/lib/utils/logger'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

/**
 * GET /api/achievements
 * Fetch user's unlocked achievements
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's unlocked achievements
    const { data: achievements, error: achievementsError } = await (supabase
      .from('user_achievements') as any)
      .select('achievement_id, unlocked_at, seen')
      .eq('user_id', user.id)

    if (achievementsError) {
      logger.error('Error fetching achievements:', achievementsError)
      return NextResponse.json({ unlocked: [], newUnlocks: [] })
    }

    // Get user stats to check for new achievements
    const stats = await getUserStats(user.id, supabase)
    const currentlyUnlocked = (achievements as any)?.map((a: any) => a.achievement_id) || []
    const newUnlocks = checkUnlockedAchievements(stats, currentlyUnlocked)

    // Save new achievements
    if (newUnlocks.length > 0) {
      const newAchievements = newUnlocks.map((a) => ({
        user_id: user.id,
        achievement_id: a.id,
        unlocked_at: new Date().toISOString(),
        seen: false,
        progress: 0,
      }))

      await (supabase.from('user_achievements') as any).insert(newAchievements)
    }

    return NextResponse.json({
      unlocked: achievements || [],
      newUnlocks: newUnlocks.map((a) => a.id),
      allAchievements: ACHIEVEMENTS,
      stats, // Include stats for progress calculation on client
    })
  } catch (error) {
    logger.error('Error in achievements API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/achievements/mark-seen
 * Mark achievements as seen
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { achievementIds } = body

    if (!Array.isArray(achievementIds)) {
      return NextResponse.json(
        { error: 'achievementIds must be an array' },
        { status: 400 }
      )
    }

    // Mark as seen
    const { error } = await (supabase
      .from('user_achievements') as any)
      .update({ seen: true })
      .eq('user_id', user.id)
      .in('achievement_id', achievementIds)

    if (error) {
      logger.error('Error marking achievements as seen:', error)
      return NextResponse.json(
        { error: 'Failed to update achievements' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error in mark-seen API:', error)
    return NextResponse.json(
      { error: 'Failed to mark achievements as seen' },
      { status: 500 }
    )
  }
}

/**
 * Get user statistics for achievement checking
 */
async function getUserStats(
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<UserStats> {
  // Fetch roster count
  const { count: rosterCount } = await supabase
    .from('roster')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .neq('status', 'Archived')

  // Fetch battle count
  const { count: battleCount } = await supabase
    .from('battles')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Fetch hang count
  const { count: hangCount } = await supabase
    .from('hangs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Fetch when2crack shares count (if table exists)
  let when2cracksSent = 0
  try {
    const { count } = await supabase
      .from('when2crack_shares')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', userId)
    when2cracksSent = count || 0
  } catch {
    // Table might not exist yet
  }

  // Get login streak from localStorage (would need to be synced to DB)
  const loginStreak = 0 // TODO: Implement streak tracking in DB

  // Get user creation date
  const { data: userData } = await supabase
    .from('users')
    .select('created_at')
    .eq('id', userId)
    .single()

  return {
    rosterCount: rosterCount || 0,
    battleCount: battleCount || 0,
    hangCount: hangCount || 0,
    loginStreak,
    totalLogins: 0, // TODO: Track in DB
    when2cracksSent,
    scheduleShares: when2cracksSent, // Same as when2cracks for now
    accountCreatedDate: (userData as any)?.created_at || new Date().toISOString(),
  }
}
