/**
 * Application-wide constants
 * Centralized location for all magic numbers and configuration values
 */

// ELO Rating System
export const ELO_K_FACTOR = 32
export const ELO_DEFAULT_RATING = 1000
export const ELO_SCORE_MULTIPLIER = 10 // Used when initializing from composite scores

// Timeouts (in milliseconds)
export const AUTH_INITIALIZATION_TIMEOUT = 5000 // Increased from 3000
export const API_SAFETY_TIMEOUT = 8000
export const BATTLE_RESULT_DISPLAY_DURATION = 2000
export const TOAST_AUTO_DISMISS_DURATION = 3000
export const SAVED_MESSAGE_DURATION = 1500
export const IMAGE_LOAD_TIMEOUT = 10000
export const USER_CREATION_RETRY_DELAY = 5000

// Tonight Recommendations
export const TONIGHT_RECOMMENDATION_COUNT = 5
export const RELIABILITY_SCORE_MULTIPLIER = 20
export const RECENCY_PENALTY_DAYS = 28
export const RECENCY_PENALTY_AMOUNT = -100

// Image Upload
export const MAX_IMAGE_SIZE_MB = 5
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024
export const MAX_UNCOMPRESSED_IMAGE_SIZE_MB = 10
export const MAX_UNCOMPRESSED_IMAGE_SIZE_BYTES = MAX_UNCOMPRESSED_IMAGE_SIZE_MB * 1024 * 1024
export const MAX_COMPRESSED_IMAGE_SIZE_BYTES = 1024 * 1024 // 1MB for localStorage
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
export const IMAGE_MAX_DIMENSION = 5000
export const IMAGE_COMPRESSION_SIZE = 400
export const IMAGE_COMPRESSION_QUALITY = 0.8

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

// Battle Settings
export const BATTLE_COOLDOWN_DAYS = 7 // Days before same pair can battle again
export const BATTLE_HISTORY_LIMIT = 50 // Number of recent battles to fetch

// LocalStorage
export const LOCAL_STORAGE_QUOTA_ESTIMATE_MB = 5
export const LOCAL_STORAGE_QUOTA_ESTIMATE_BYTES = LOCAL_STORAGE_QUOTA_ESTIMATE_MB * 1024 * 1024
export const LOCAL_STORAGE_DEBOUNCE_MS = 300

// Schedule
export const SCHEDULE_TIME_RANGE = {
  start: 20, // 8pm
  end: 4,    // 4am
} as const

// Scores
export const SCORE_MIN = 1
export const SCORE_MAX = 10
export const SCORE_DEFAULT = 5

// Feature Flags
export const FEATURES = {
  profilePictures: true,
  when2crackShares: false, // Table may not exist yet
  achievements: true,
} as const

// Onboarding (all timing values in milliseconds)
export const ONBOARDING = {
  // Timing
  INITIAL_CALCULATION_DELAY: 500,        // SpotlightOverlay initial position calc (increased to wait for tab content)
  TOOLTIP_POSITION_DELAY: 150,           // OnboardingTooltip position calc (after spotlight)
  AUTH_SETTLE_DELAY: 500,                // Wait for auth state to settle
  TAB_FORCE_INITIAL_DELAY: 100,          // Initial delay before forcing tab (start sooner)
  TAB_FORCE_RETRY_DELAY: 300,            // Delay between tab force retries (increased)
  CONFETTI_DURATION: 2000,               // How long confetti shows
  COMPLETION_REDIRECT_DELAY: 2000,       // Delay before redirecting after completion

  // Retry logic
  SPOTLIGHT_MAX_RETRIES: 15,             // Max retries to find spotlight target (increased for tab switches)
  SPOTLIGHT_RETRY_DELAY: 300,            // Delay between spotlight retries (increased)
  TAB_FORCE_MAX_RETRIES: 4,              // Max retries for tab forcing (increased)
  AUTO_SKIP_AFTER_RETRIES: false,        // Don't auto-skip - let user see what's happening

  // MutationObserver
  MUTATION_DEBOUNCE_MS: 500,             // Debounce for mutation recalculations

  // Animation durations (match CSS)
  SPOTLIGHT_TRANSITION_MS: 400,          // Spotlight move transition
  TOOLTIP_SLIDE_UP_MS: 300,              // Tooltip appear animation

  // Tooltip dimensions (for position calculation)
  TOOLTIP_WIDTH: 400,
  TOOLTIP_HEIGHT: 300,
  TOOLTIP_GAP: 16,

  // Version
  CURRENT_VERSION: 1,                    // Increment when onboarding changes significantly
} as const

// Onboarding Analytics Events
export const ONBOARDING_ANALYTICS_EVENTS = {
  STARTED: 'onboarding_started',
  STEP_VIEW: 'onboarding_step_view',
  STEP_NEXT: 'onboarding_step_next',
  STEP_PREVIOUS: 'onboarding_step_previous',
  STEP_SKIP_AUTO: 'onboarding_step_skip_auto',
  COMPLETED: 'onboarding_completed',
  SKIPPED: 'onboarding_skipped',
  ERROR: 'onboarding_error',
  TARGET_NOT_FOUND: 'onboarding_target_not_found',
} as const

// Type-safe analytics helper
export function trackOnboardingEvent(
  event: typeof ONBOARDING_ANALYTICS_EVENTS[keyof typeof ONBOARDING_ANALYTICS_EVENTS],
  props?: Record<string, string | number | boolean>
): void {
  if (typeof window === 'undefined') return

  try {
    const plausible = (window as any).plausible
    if (plausible) {
      plausible(event, props ? { props } : undefined)
    }
  } catch (error) {
    // Only log in development to avoid noise
    if (process.env.NODE_ENV === 'development') {
      console.error('Analytics tracking failed:', error)
    }
  }
}
