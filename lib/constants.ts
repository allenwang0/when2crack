/**
 * Application-wide constants
 * Centralized location for all magic numbers and configuration values
 */

// ELO Rating System
export const ELO_K_FACTOR = 32
export const ELO_DEFAULT_RATING = 1000
export const ELO_SCORE_MULTIPLIER = 10 // Used when initializing from composite scores

// Timeouts (in milliseconds)
export const AUTH_INITIALIZATION_TIMEOUT = 3000
export const API_SAFETY_TIMEOUT = 8000
export const BATTLE_RESULT_DISPLAY_DURATION = 2000
export const TOAST_AUTO_DISMISS_DURATION = 3000
export const SAVED_MESSAGE_DURATION = 1500

// Tonight Recommendations
export const TONIGHT_RECOMMENDATION_COUNT = 5
export const RELIABILITY_SCORE_MULTIPLIER = 20
export const RECENCY_PENALTY_DAYS = 28
export const RECENCY_PENALTY_AMOUNT = -100

// Image Upload
export const MAX_IMAGE_SIZE_MB = 5
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// Touch Targets (for mobile accessibility)
export const MIN_TOUCH_TARGET_SIZE = 44 // iOS minimum in pixels

// Z-Index Scale
export const Z_INDEX = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  navigation: 40,
  modal: 50,
  popover: 60,
  toast: 70,
  tooltip: 80,
} as const

// Roster
export const ROSTER_INITIAL_TIER = 'A' as const

// Color Contrast (WCAG AA compliant)
export const TEXT_COLORS = {
  primary: 'text-gray-900',
  secondary: 'text-gray-600', // Minimum for accessibility
  muted: 'text-gray-500',
  disabled: 'text-gray-400',
} as const

// API Endpoints
export const API_ENDPOINTS = {
  battles: '/api/battles',
  battlesPair: '/api/battles/pair',
  tonight: '/api/tonight',
} as const

// Local Storage Keys
export const STORAGE_KEYS = {
  guestRoster: 'guest_roster',
  completedBattles: 'completed_battles',
  skippedBattles: 'skipped_battles',
  weekSchedule: 'week_schedule',
  displayName: 'display_name',
  loginStreak: 'login_streak',
  lastLoginDate: 'last_login_date',
  onboardingSeen: 'onboarding_seen',
  onboardingCompleted: 'onboarding_completed',
  onboardingVersion: 'onboarding_version',
  onboardingSkipped: 'onboarding_skipped',
} as const

// Contact Information
export const CONTACT_EMAIL = 'support@when2crack.app'
export const PRIVACY_EMAIL = 'privacy@when2crack.app'

// Feature Flags
export const FEATURES = {
  profilePictures: true,
  when2crackShares: false, // Table may not exist yet
  achievements: true,
} as const
