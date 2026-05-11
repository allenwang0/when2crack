import type { RosterPerson } from '@/lib/types'

export function calculateDiscoverScore(person: RosterPerson): number {
  const now = new Date()
  const lastContact = person.last_contact_date
    ? new Date(person.last_contact_date)
    : new Date(0)
  const daysSince = Math.floor(
    (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Components of discover score:
  // 1. Recency penalty: Older contacts get higher priority
  const recencyScore = Math.min(daysSince * 2, 100)

  // 2. Interest factor: Lower reliability = more "interesting" (room for growth)
  const interestScore = (10 - person.reliability_score) * 10

  // 3. Serendipity: Random factor to keep things fresh
  const serendipityScore = Math.random() * 50

  return recencyScore + interestScore + serendipityScore
}

export function sortByDiscover(roster: RosterPerson[]): RosterPerson[] {
  return [...roster]
    .map((person) => ({
      person,
      score: calculateDiscoverScore(person),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.person)
}

export function sortByRecent(roster: RosterPerson[]): RosterPerson[] {
  return [...roster].sort((a, b) => {
    const dateA = a.last_contact_date ? new Date(a.last_contact_date).getTime() : 0
    const dateB = b.last_contact_date ? new Date(b.last_contact_date).getTime() : 0
    return dateB - dateA
  })
}

export function filterNeedsTLC(roster: RosterPerson[]): RosterPerson[] {
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  return roster.filter((person) => {
    if (!person.last_contact_date) return true
    const lastContact = new Date(person.last_contact_date)
    return lastContact < fourteenDaysAgo
  })
}
