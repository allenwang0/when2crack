import type { RosterPerson } from '@/lib/types'
import { calculateInitialElo } from '@/lib/algorithms/elo'

/**
 * Starter roster entries that are auto-added for new users
 * These help users get started and demonstrate the delete functionality
 */
export const STARTER_ROSTER_PEOPLE: RosterPerson[] = [
  {
    id: 'starter-ilya',
    user_id: 'guest',
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
    id: 'starter-shane',
    user_id: 'guest',
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
