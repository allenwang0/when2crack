/**
 * Avatar utility functions
 * Ensures consistent avatar handling across the app
 */

/**
 * Check if an avatar URL is valid and should be displayed
 */
export function isValidAvatarUrl(avatarUrl: string | null | undefined): boolean {
  if (!avatarUrl) return false
  if (avatarUrl.trim() === '') return false
  if (avatarUrl === 'null') return false
  if (avatarUrl === 'undefined') return false
  return true
}

/**
 * Get the avatar source - returns the URL or null if invalid
 */
export function getAvatarSrc(avatarUrl: string | null | undefined): string | null {
  return isValidAvatarUrl(avatarUrl) ? (avatarUrl as string) : null
}

/**
 * Default profile picture path
 */
export const DEFAULT_PROFILE_PIC = '/egg.png'
