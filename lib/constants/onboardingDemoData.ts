import type { RosterPerson } from '@/lib/types'
import { calculateInitialElo } from '@/lib/algorithms/elo'

/**
 * Demo data for onboarding flow
 * These profiles appear during onboarding to demonstrate features
 * Using the same starter roster people (Ilya and Shane) for consistency
 */
export const DEMO_ROSTER_PEOPLE: RosterPerson[] = [
  {
    id: 'demo-ilya',
    user_id: 'demo-user',
    name: 'Ilya Rozanov',
    tier: 'S',
    status: 'New',
    attraction_score: 9,
    personality_score: 9,
    reliability_score: 8,
    elo_rating: calculateInitialElo(9, 9, 8),
    avatar_color: '#4A90E2',
    avatar_url: '/avatars/ilya.webp',
    notes: 'Demo profile - feel free to delete!',
    last_contact_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-shane',
    user_id: 'demo-user',
    name: 'Shane Hollander',
    tier: 'S',
    status: 'New',
    attraction_score: 9,
    personality_score: 8,
    reliability_score: 9,
    elo_rating: calculateInitialElo(9, 8, 9),
    avatar_color: '#E94B3C',
    avatar_url: '/avatars/shane.jpg',
    notes: 'Demo profile - feel free to delete!',
    last_contact_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

/**
 * Check if demo data should be shown
 * Only show if user has no roster data
 */
export function shouldShowDemoData(rosterCount: number): boolean {
  return rosterCount === 0
}
