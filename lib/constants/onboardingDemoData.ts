import type { RosterPerson } from '@/lib/types'

/**
 * Demo data for onboarding flow
 * These profiles appear when user has an empty roster to demonstrate features
 */
export const DEMO_ROSTER_PEOPLE: Partial<RosterPerson>[] = [
  {
    id: 'demo-jordan-001',
    name: 'Jordan',
    tier: 'S',
    status: 'Chatting',
    attraction_score: 9,
    personality_score: 8,
    reliability_score: 7,
    elo_rating: 1240,
    avatar_color: '#FFB6D9',
    notes: 'Met at coffee shop, great conversation',
    last_contact_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
  },
  {
    id: 'demo-taylor-002',
    name: 'Taylor',
    tier: 'A',
    status: 'Met Once',
    attraction_score: 8,
    personality_score: 9,
    reliability_score: 6,
    elo_rating: 1180,
    avatar_color: '#E4C1F9',
    notes: 'Funny and easy to talk to',
    last_contact_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
  },
  {
    id: 'demo-alex-003',
    name: 'Alex',
    tier: 'A',
    status: 'New',
    attraction_score: 7,
    personality_score: 8,
    reliability_score: 8,
    elo_rating: 1150,
    avatar_color: '#FFD93D',
    notes: 'Very reliable, always responds',
    last_contact_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
  },
]

/**
 * Check if demo data should be shown
 * Only show if user has no roster data
 */
export function shouldShowDemoData(rosterCount: number): boolean {
  return rosterCount === 0
}
