/**
 * Guest to Authenticated Account Migration Utilities
 * Handles migration of guest roster data to authenticated user account
 */

import type { RosterPerson, Database } from '@/lib/types'
import { STORAGE_KEYS } from '@/lib/constants'
import { logger } from '@/lib/utils/logger'

export interface GuestData {
  roster: RosterPerson[]
  completedBattles: string[]
  skippedBattles: string[]
  displayName: string | null
}

/**
 * Check if user has guest data that can be migrated
 */
export function hasGuestData(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const roster = localStorage.getItem(STORAGE_KEYS.guestRoster)
    return roster !== null && JSON.parse(roster).length > 0
  } catch (error) {
    logger.error('Error checking guest data:', error)
    return false
  }
}

/**
 * Get all guest data from localStorage
 */
export function getGuestData(): GuestData | null {
  if (typeof window === 'undefined') return null

  try {
    const rosterData = localStorage.getItem(STORAGE_KEYS.guestRoster)
    const completedBattlesData = localStorage.getItem(STORAGE_KEYS.completedBattles)
    const skippedBattlesData = localStorage.getItem(STORAGE_KEYS.skippedBattles)
    const displayNameData = localStorage.getItem(STORAGE_KEYS.displayName)

    const roster = rosterData ? JSON.parse(rosterData) : []
    const completedBattles = completedBattlesData ? JSON.parse(completedBattlesData) : []
    const skippedBattles = skippedBattlesData ? JSON.parse(skippedBattlesData) : []
    const displayName = displayNameData ? JSON.parse(displayNameData) : null

    if (!Array.isArray(roster) || roster.length === 0) {
      return null
    }

    return {
      roster,
      completedBattles,
      skippedBattles,
      displayName,
    }
  } catch (error) {
    logger.error('Error getting guest data:', error)
    return null
  }
}

/**
 * Clear guest data from localStorage after successful migration
 */
export function clearGuestData(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEYS.guestRoster)
    localStorage.removeItem(STORAGE_KEYS.completedBattles)
    localStorage.removeItem(STORAGE_KEYS.skippedBattles)
    // Keep display name for user convenience
  } catch (error) {
    logger.error('Error clearing guest data:', error)
  }
}

/**
 * Mark migration as offered (user declined or will do later)
 */
export function markMigrationOffered(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem('migration_offered', new Date().toISOString())
  } catch (error) {
    logger.error('Error marking migration offered:', error)
  }
}

/**
 * Check if migration was already offered to user
 */
export function wasMigrationOffered(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const offered = localStorage.getItem('migration_offered')
    if (!offered) return false

    // Only offer once per session, or after 7 days
    const offeredDate = new Date(offered)
    const now = new Date()
    const daysSince = Math.floor((now.getTime() - offeredDate.getTime()) / (1000 * 60 * 60 * 24))

    return daysSince < 7
  } catch (error) {
    logger.error('Error checking migration offered:', error)
    return false
  }
}

/**
 * Prepare roster data for database insert
 * Removes guest-specific fields and updates IDs
 */
export function prepareRosterForMigration(
  guestRoster: RosterPerson[],
  userId: string
): Database['public']['Tables']['roster']['Insert'][] {
  return guestRoster.map((person) => ({
    user_id: userId,
    name: person.name,
    tier: person.tier,
    status: person.status,
    attraction_score: person.attraction_score,
    personality_score: person.personality_score,
    reliability_score: person.reliability_score,
    elo_rating: person.elo_rating,
    avatar_color: person.avatar_color,
    avatar_url: person.avatar_url,
    notes: person.notes,
    last_contact_date: person.last_contact_date,
  }))
}

/**
 * Get migration statistics for display to user
 */
export function getMigrationStats(guestData: GuestData): {
  peopleCount: number
  battlesCount: number
  estimatedTime: string
} {
  const peopleCount = guestData.roster.length
  const battlesCount = guestData.completedBattles.length

  // Estimate: 1 person = 1 second, 10 battles = 1 second
  const estimatedSeconds = Math.ceil(peopleCount + battlesCount / 10)
  const estimatedTime = estimatedSeconds < 5 ? 'a few seconds' : `about ${estimatedSeconds} seconds`

  return {
    peopleCount,
    battlesCount,
    estimatedTime,
  }
}
