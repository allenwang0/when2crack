# When2Crack Social Features Design Document

**Version:** 1.0
**Last Updated:** 2026-05-11
**Status:** Proposal

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Goals & Objectives](#goals--objectives)
3. [User Stories](#user-stories)
4. [System Architecture](#system-architecture)
5. [Database Schema](#database-schema)
6. [Recommendation Algorithm](#recommendation-algorithm)
7. [Privacy & Permissions](#privacy--permissions)
8. [API Design](#api-design)
9. [UI/UX Design](#uiux-design)
10. [Implementation Phases](#implementation-phases)
11. [Technical Considerations](#technical-considerations)
12. [Success Metrics](#success-metrics)

---

## Executive Summary

This document outlines the design for transforming When2Crack from a personal roster management tool into a social platform with friend connections, intelligent recommendations, and collaborative scheduling features. The goal is to help users discover compatible people through their network while maintaining privacy and user control.

**Core Features:**
- Friend/connection system
- Intelligent roster recommendations based on friend data
- Social sharing of hangs and schedules
- Group scheduling coordination
- Activity feed and notifications

---

## Goals & Objectives

### Primary Goals
1. **Increase user engagement** - Give users reasons to return daily
2. **Network effects** - Make the app more valuable as more friends join
3. **Discovery** - Help users find compatible people through trusted connections
4. **Social proof** - Leverage friend data to validate roster choices

### Success Criteria
- 40% of users add at least 3 friends within first week
- 60% of users accept at least one recommendation
- 25% increase in weekly active users
- Average session time increases by 50%

---

## User Stories

### As a user, I want to...

#### Connection Management
- **US-1:** Send friend requests to other When2Crack users
- **US-2:** Accept/decline incoming friend requests
- **US-3:** See a list of my friends and their basic activity
- **US-4:** Remove friends if needed
- **US-5:** Control what data friends can see about me

#### Discovery & Recommendations
- **US-6:** Get recommendations for people I might enjoy based on my hang history
- **US-7:** See when friends have good experiences with people similar to my type
- **US-8:** Discover people through mutual connections
- **US-9:** Filter recommendations by criteria (proximity, interests, etc.)

#### Social Sharing
- **US-10:** Share positive hang experiences with friends (optional)
- **US-11:** React to friends' shared hangs
- **US-12:** Share my roster profile for a person with a specific friend
- **US-13:** See an activity feed of friend updates

#### Collaborative Features
- **US-14:** Find times when I and 2+ friends are all available
- **US-15:** Coordinate group hangs through the app
- **US-16:** Share my schedule with multiple friends at once

#### Privacy & Control
- **US-17:** Set granular privacy settings for what friends see
- **US-18:** Block or hide specific roster entries from all friends
- **US-19:** Opt out of being included in recommendations
- **US-20:** Export or delete all my social data

---

## System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                        │
│  (Next.js App - React Components & Client-Side Logic)   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   API Layer (Server Actions/Routes)      │
│  • Connection Management API                            │
│  • Recommendation Engine API                            │
│  • Social Feed API                                      │
│  • Group Scheduling API                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Business Logic Layer                    │
│  • RecommendationService                                │
│  • ConnectionService                                    │
│  • PrivacyService                                       │
│  • NotificationService                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Database Layer (Supabase)              │
│  • PostgreSQL Tables                                    │
│  • Row Level Security Policies                         │
│  • Real-time Subscriptions                             │
└─────────────────────────────────────────────────────────┘
```

### Key Services

#### RecommendationService
- Analyzes user hang history and scoring patterns
- Finds similar users with collaborative filtering
- Generates personalized recommendations
- Scores recommendations based on multiple factors

#### ConnectionService
- Manages friend relationships (CRUD)
- Handles connection requests workflow
- Enforces privacy boundaries
- Provides connection graph utilities

#### PrivacyService
- Enforces user privacy settings
- Filters data before sharing with friends
- Manages blocking and visibility rules
- Audit logging for sensitive operations

#### NotificationService
- Real-time notifications for social actions
- Email digests for weekly recommendations
- Push notifications (future enhancement)

---

## Database Schema

### New Tables

#### `connections` (friend relationships)
```sql
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

CREATE INDEX idx_connections_user_id ON connections(user_id);
CREATE INDEX idx_connections_friend_id ON connections(friend_id);
CREATE INDEX idx_connections_status ON connections(status);
```

#### `recommendations` (cached recommendations)
```sql
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommended_person_name VARCHAR(255) NOT NULL,
  recommended_person_traits JSONB, -- anonymized traits
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  reasoning JSONB NOT NULL, -- explanation for recommendation
  based_on_roster_id UUID REFERENCES roster(id) ON DELETE SET NULL,
  source_type VARCHAR(50) NOT NULL, -- 'friend_similar', 'collaborative', 'pattern_match'
  source_user_ids UUID[], -- friends who contributed to this recommendation
  viewed BOOLEAN DEFAULT FALSE,
  acted_on BOOLEAN DEFAULT FALSE, -- user added to roster or dismissed
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX idx_recommendations_expires ON recommendations(expires_at);
CREATE INDEX idx_recommendations_viewed ON recommendations(viewed);
```

#### `shared_hangs` (social feed items)
```sql
CREATE TABLE shared_hangs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hang_id UUID NOT NULL REFERENCES hangs(id) ON DELETE CASCADE,
  roster_id UUID NOT NULL REFERENCES roster(id) ON DELETE CASCADE,
  visibility VARCHAR(20) DEFAULT 'friends', -- 'friends', 'close_friends', 'private'
  caption TEXT,
  is_positive BOOLEAN DEFAULT TRUE, -- whether this was a good hang
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shared_hangs_user_id ON shared_hangs(user_id);
CREATE INDEX idx_shared_hangs_created ON shared_hangs(created_at DESC);
```

#### `hang_reactions` (likes/comments on shared hangs)
```sql
CREATE TABLE hang_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_hang_id UUID NOT NULL REFERENCES shared_hangs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL, -- 'like', 'congrats', 'interested'
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shared_hang_id, user_id)
);

CREATE INDEX idx_hang_reactions_shared_hang ON hang_reactions(shared_hang_id);
```

#### `privacy_settings` (user privacy preferences)
```sql
CREATE TABLE privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_visibility VARCHAR(20) DEFAULT 'friends', -- 'public', 'friends', 'private'
  show_roster_count BOOLEAN DEFAULT TRUE,
  show_hang_count BOOLEAN DEFAULT TRUE,
  show_roster_names BOOLEAN DEFAULT FALSE, -- names of people in roster
  show_roster_scores BOOLEAN DEFAULT FALSE, -- individual scores
  allow_recommendations BOOLEAN DEFAULT TRUE,
  allow_being_recommended BOOLEAN DEFAULT TRUE,
  show_schedule BOOLEAN DEFAULT TRUE,
  activity_feed_visibility VARCHAR(20) DEFAULT 'friends',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `roster_shares` (specific roster entries shared with friends)
```sql
CREATE TABLE roster_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id UUID NOT NULL REFERENCES roster(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) DEFAULT 'view', -- 'view', 'full'
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(roster_id, shared_by, shared_with)
);

CREATE INDEX idx_roster_shares_shared_with ON roster_shares(shared_with);
```

#### `group_schedules` (coordinating group hangs)
```sql
CREATE TABLE group_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  participant_ids UUID[] NOT NULL,
  proposed_times JSONB, -- array of time slot suggestions
  finalized_time TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'planning', -- 'planning', 'scheduled', 'completed', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_group_schedules_created_by ON group_schedules(created_by);
CREATE INDEX idx_group_schedules_participants ON group_schedules USING GIN(participant_ids);
```

#### `notifications` (activity notifications)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'friend_request', 'recommendation', 'hang_reaction', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB, -- type-specific data
  read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

### Updated Tables

#### `users` (add social fields)
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS friend_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;
```

#### `roster` (add social metadata)
```sql
ALTER TABLE roster ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
ALTER TABLE roster ADD COLUMN IF NOT EXISTS discoverable BOOLEAN DEFAULT TRUE;
ALTER TABLE roster ADD COLUMN IF NOT EXISTS source VARCHAR(50); -- 'manual', 'recommendation', 'friend_share'
ALTER TABLE roster ADD COLUMN IF NOT EXISTS source_friend_id UUID REFERENCES auth.users(id);
```

---

## Recommendation Algorithm

### Overview
The recommendation system uses a hybrid approach combining:
1. **Collaborative Filtering** - Find users with similar taste
2. **Content-Based Filtering** - Match based on person attributes
3. **Social Graph** - Leverage friend connections
4. **Temporal Patterns** - Consider timing and recency

### Algorithm Components

#### 1. User Similarity Score
Calculate similarity between users based on:
- **Score Correlation**: How similarly they rate people
- **Hang Patterns**: Similar frequency and types of hangs
- **Tier Distribution**: Similar roster tier breakdowns

```typescript
function calculateUserSimilarity(userA: User, userB: User): number {
  const scoreCorrelation = pearsonCorrelation(
    userA.rosterScores,
    userB.rosterScores
  )

  const tierSimilarity = cosineSimilarity(
    userA.tierDistribution,
    userB.tierDistribution
  )

  const hangPatternSimilarity = compareHangPatterns(
    userA.hangHistory,
    userB.hangHistory
  )

  return (
    scoreCorrelation * 0.5 +
    tierSimilarity * 0.3 +
    hangPatternSimilarity * 0.2
  )
}
```

#### 2. Person Profile Matching
Extract patterns from user's highly-rated roster entries:

```typescript
interface UserPreferenceProfile {
  avgAttractionScore: number
  avgPersonalityScore: number
  avgReliabilityScore: number
  preferredStatuses: Status[]
  successfulHangCharacteristics: {
    timeOfDay: string[]
    dayOfWeek: string[]
    locationTypes: string[]
  }
  idealCompositeScore: number
  scoreWeights: {
    attraction: number
    personality: number
    reliability: number
  }
}

function extractUserPreferences(roster: RosterPerson[], hangs: Hang[]): UserPreferenceProfile {
  // Analyze top 20% of roster by composite score
  const topRoster = roster
    .sort((a, b) => calculateCompositeScore(b) - calculateCompositeScore(a))
    .slice(0, Math.ceil(roster.length * 0.2))

  // Analyze hangs with positive outcomes (score increases)
  const positiveHangs = hangs.filter(h =>
    h.attraction_change > 0 ||
    h.personality_change > 0 ||
    h.reliability_change > 0
  )

  return {
    avgAttractionScore: average(topRoster.map(r => r.attraction_score)),
    avgPersonalityScore: average(topRoster.map(r => r.personality_score)),
    avgReliabilityScore: average(topRoster.map(r => r.reliability_score)),
    // ... extract other patterns
  }
}
```

#### 3. Recommendation Generation

```typescript
interface Recommendation {
  personName: string
  confidenceScore: number // 0-1
  reasoning: RecommendationReasoning
  sourceType: 'friend_similar' | 'collaborative' | 'pattern_match'
  sourceFriends: string[] // friend names who contributed
}

interface RecommendationReasoning {
  matchPoints: string[] // e.g., "Similar personality to your top-rated Sarah"
  similarTo: string[] // names from user's roster
  socialProof: string // e.g., "3 friends with similar taste rated highly"
  predictedScores: {
    attraction: number
    personality: number
    reliability: number
  }
}

async function generateRecommendations(userId: string): Promise<Recommendation[]> {
  // 1. Get user's preference profile
  const userProfile = await extractUserPreferences(userId)

  // 2. Find similar friends
  const friends = await getFriends(userId)
  const similarFriends = friends
    .map(friend => ({
      friend,
      similarity: calculateUserSimilarity(userProfile, friend.profile)
    }))
    .filter(f => f.similarity > 0.6)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10)

  // 3. Get highly-rated people from similar friends
  const friendRosterPeople = await getFriendRosterPeople(
    similarFriends.map(f => f.friend.id),
    { minCompositeScore: 7.0, minHangs: 2 }
  )

  // 4. Filter out people already in user's roster
  const userRosterNames = await getUserRosterNames(userId)
  const candidatePeople = friendRosterPeople.filter(
    person => !userRosterNames.includes(person.name)
  )

  // 5. Score each candidate
  const recommendations = candidatePeople.map(person => {
    const score = calculateRecommendationScore(person, userProfile, similarFriends)
    return {
      personName: person.name,
      confidenceScore: score.confidence,
      reasoning: score.reasoning,
      sourceType: score.sourceType,
      sourceFriends: score.sourceFriends
    }
  })

  // 6. Return top recommendations
  return recommendations
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 20)
}
```

#### 4. Recommendation Scoring

```typescript
function calculateRecommendationScore(
  candidate: RosterPerson,
  userProfile: UserPreferenceProfile,
  similarFriends: SimilarFriend[]
): RecommendationScore {
  let score = 0
  let reasoning: string[] = []
  let sourceFriends: string[] = []

  // Factor 1: Friend ratings (weighted by similarity)
  const friendRatings = similarFriends
    .filter(sf => sf.friend.roster.some(p => p.name === candidate.name))
    .map(sf => ({
      friend: sf.friend,
      rating: sf.friend.roster.find(p => p.name === candidate.name)!,
      weight: sf.similarity
    }))

  const weightedAvgScore = friendRatings.reduce((sum, fr) =>
    sum + calculateCompositeScore(fr.rating) * fr.weight, 0
  ) / friendRatings.reduce((sum, fr) => sum + fr.weight, 0)

  score += weightedAvgScore * 0.4

  if (friendRatings.length > 0) {
    reasoning.push(`${friendRatings.length} friends with similar taste rated highly`)
    sourceFriends = friendRatings.map(fr => fr.friend.display_name)
  }

  // Factor 2: Attribute match with user preferences
  const attrMatch = 1 - Math.abs(candidate.attraction_score - userProfile.avgAttractionScore) / 10
  const persMatch = 1 - Math.abs(candidate.personality_score - userProfile.avgPersonalityScore) / 10
  const reliMatch = 1 - Math.abs(candidate.reliability_score - userProfile.avgReliabilityScore) / 10

  const attributeScore = (
    attrMatch * userProfile.scoreWeights.attraction +
    persMatch * userProfile.scoreWeights.personality +
    reliMatch * userProfile.scoreWeights.reliability
  )

  score += attributeScore * 0.3

  // Factor 3: Similar to user's top people
  const userTopPeople = await getTopRosterPeople(userId, 5)
  const similarity = findMostSimilarPerson(candidate, userTopPeople)

  if (similarity.score > 0.8) {
    score += 0.2
    reasoning.push(`Similar profile to your top-rated ${similarity.person.name}`)
  }

  // Factor 4: Social proof (multiple friends)
  if (friendRatings.length >= 3) {
    score += 0.1
    reasoning.push('Multiple friends in your network rated highly')
  }

  return {
    confidence: Math.min(score / 10, 1.0),
    reasoning: {
      matchPoints: reasoning,
      similarTo: similarity.score > 0.8 ? [similarity.person.name] : [],
      socialProof: `${friendRatings.length} friends rated ${weightedAvgScore.toFixed(1)}/10 average`,
      predictedScores: {
        attraction: candidate.attraction_score,
        personality: candidate.personality_score,
        reliability: candidate.reliability_score
      }
    },
    sourceType: friendRatings.length > 0 ? 'friend_similar' : 'pattern_match',
    sourceFriends: sourceFriends.slice(0, 3)
  }
}
```

### Recommendation Refresh Strategy

- **Real-time triggers**: New friend added, new hang logged, roster updated
- **Batch processing**: Generate recommendations nightly for all users
- **Expiration**: Recommendations expire after 7 days
- **Diversity**: Ensure variety in recommendations (not all similar)

---

## Privacy & Permissions

### Privacy Levels

#### Level 1: Public
- Profile visible to all users
- Roster count visible
- Can receive friend requests from anyone

#### Level 2: Friends Only (Default)
- Profile visible to friends
- Can share specific data with friends
- Friend requests from friends-of-friends

#### Level 3: Private
- Profile hidden except to accepted friends
- Minimal data shared
- No recommendations based on their data
- Friend requests by username only

### Granular Controls

Users can independently control:

```typescript
interface PrivacySettings {
  // Profile
  profileVisibility: 'public' | 'friends' | 'private'
  showRosterCount: boolean
  showHangCount: boolean

  // Roster Data
  showRosterNames: boolean // show names of people in roster
  showRosterScores: boolean // show actual scores
  shareRosterStatuses: boolean // New, Chatting, etc.

  // Recommendations
  allowRecommendations: boolean // receive recommendations
  allowBeingRecommended: boolean // be used in friend recommendations

  // Social Feed
  activityFeedVisibility: 'friends' | 'close_friends' | 'private'
  autoSharePositiveHangs: boolean

  // Scheduling
  showSchedule: boolean
  allowGroupSchedules: boolean
}
```

### Data Anonymization

When generating recommendations:
1. **Never expose exact scores** - Use ranges or categories
2. **Aggregate data** - "3 friends" not "Sarah, Mike, and John"
3. **Fuzzy matching** - "Similar to your type" not specific attributes
4. **Consent-based** - Both parties must opt-in

### Row Level Security (RLS) Policies

```sql
-- Friends can only see each other's data if connection is accepted
CREATE POLICY "Users can view friends' data"
ON roster FOR SELECT
USING (
  user_id IN (
    SELECT friend_id FROM connections
    WHERE user_id = auth.uid() AND status = 'accepted'
    UNION
    SELECT user_id FROM connections
    WHERE friend_id = auth.uid() AND status = 'accepted'
  )
);

-- Users can only see recommendations meant for them
CREATE POLICY "Users see own recommendations"
ON recommendations FOR SELECT
USING (user_id = auth.uid());

-- Shared hangs visible based on visibility settings
CREATE POLICY "View shared hangs based on visibility"
ON shared_hangs FOR SELECT
USING (
  visibility = 'friends' AND user_id IN (
    SELECT friend_id FROM connections
    WHERE user_id = auth.uid() AND status = 'accepted'
    UNION
    SELECT user_id FROM connections
    WHERE friend_id = auth.uid() AND status = 'accepted'
  )
  OR user_id = auth.uid()
);
```

---

## API Design

### Connection Management

#### POST `/api/connections/request`
Send a friend request
```typescript
Request: {
  friendId: string
}
Response: {
  connectionId: string
  status: 'pending'
}
```

#### POST `/api/connections/respond`
Accept or decline a request
```typescript
Request: {
  connectionId: string
  action: 'accept' | 'decline'
}
Response: {
  status: 'accepted' | 'declined'
}
```

#### GET `/api/connections`
Get user's connections
```typescript
Response: {
  friends: Friend[]
  pending: PendingRequest[]
  sentRequests: SentRequest[]
}
```

#### DELETE `/api/connections/:connectionId`
Remove a friend

### Recommendations

#### GET `/api/recommendations`
Get personalized recommendations
```typescript
Query: {
  limit?: number
  includeViewed?: boolean
}
Response: {
  recommendations: Recommendation[]
  hasMore: boolean
}
```

#### POST `/api/recommendations/:id/act`
Mark recommendation as acted upon
```typescript
Request: {
  action: 'add_to_roster' | 'dismiss' | 'not_interested'
  rosterId?: string // if added to roster
}
Response: {
  success: boolean
}
```

#### POST `/api/recommendations/refresh`
Force refresh recommendations
```typescript
Response: {
  count: number
  recommendations: Recommendation[]
}
```

### Social Feed

#### GET `/api/feed`
Get activity feed
```typescript
Query: {
  limit?: number
  offset?: number
  filter?: 'all' | 'hangs' | 'roster_updates'
}
Response: {
  items: FeedItem[]
  hasMore: boolean
}
```

#### POST `/api/hangs/:id/share`
Share a hang to social feed
```typescript
Request: {
  visibility: 'friends' | 'close_friends'
  caption?: string
}
Response: {
  sharedHangId: string
}
```

#### POST `/api/hangs/shared/:id/react`
React to a shared hang
```typescript
Request: {
  reactionType: 'like' | 'congrats' | 'interested'
  comment?: string
}
Response: {
  reactionId: string
}
```

### Group Scheduling

#### POST `/api/group-schedules`
Create a group schedule
```typescript
Request: {
  title: string
  description?: string
  participantIds: string[]
}
Response: {
  groupScheduleId: string
  commonTimes: TimeSlot[]
}
```

#### GET `/api/group-schedules/:id`
Get group schedule details
```typescript
Response: {
  groupSchedule: GroupSchedule
  participants: Participant[]
  commonTimes: TimeSlot[]
}
```

#### POST `/api/group-schedules/:id/finalize`
Finalize a time for group hang
```typescript
Request: {
  selectedTime: string
}
Response: {
  success: boolean
}
```

### User Discovery

#### GET `/api/users/search`
Search for users to add as friends
```typescript
Query: {
  query: string // username or display name
}
Response: {
  users: PublicUserProfile[]
}
```

#### GET `/api/users/:id/profile`
Get user's public profile
```typescript
Response: {
  user: PublicUserProfile
  mutualFriends: number
  canSendRequest: boolean
}
```

---

## UI/UX Design

### New Navigation Items

Update `components/Navigation.tsx`:
```typescript
- Roster (existing)
- Battle (existing)
- Schedule (existing)
- History (existing)
- [NEW] Friends - Friend list and requests
- [NEW] Discover - Recommendations feed
- [NEW] Activity - Social feed
- Profile (existing, now enhanced)
```

### Key Screens

#### 1. Friends Screen (`/friends`)

**Layout:**
```
┌─────────────────────────────────────────┐
│  Friends (12)          [+ Add Friend]   │
├─────────────────────────────────────────┤
│  [Pending Requests (2)]                 │
│  ┌─────────────────────────────────┐   │
│  │ 👤 Sarah Johnson                │   │
│  │    Mutual friends: 3             │   │
│  │    [Accept] [Decline]            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Your Friends]                         │
│  ┌─────────────────────────────────┐   │
│  │ 👤 Mike Chen                     │   │
│  │    12 people in roster           │   │
│  │    Last active: 2h ago           │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ 👤 Emma Davis                    │   │
│  │    8 people in roster            │   │
│  │    Last active: 1d ago           │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Components:**
- `FriendList` - Display friends with quick stats
- `FriendRequestCard` - Accept/decline UI
- `AddFriendModal` - Search and send requests
- `FriendProfile` - Detailed friend view (respects privacy)

#### 2. Discover Screen (`/discover`)

**Layout:**
```
┌─────────────────────────────────────────┐
│  Discover                    [Settings] │
├─────────────────────────────────────────┤
│  Based on your roster and friends       │
│                                         │
│  [NEW RECOMMENDATIONS (3)]              │
│  ┌─────────────────────────────────┐   │
│  │ ⭐ Alex Rodriguez               │   │
│  │    Confidence: 92%               │   │
│  │                                  │   │
│  │    Why this recommendation:      │   │
│  │    • 3 friends rated 8.5/10 avg │   │
│  │    • Similar to your Sarah (9/10)│   │
│  │    • High personality scores     │   │
│  │                                  │   │
│  │    Predicted scores:             │   │
│  │    Looks: 8  Personality: 9      │   │
│  │    Values: 8                     │   │
│  │                                  │   │
│  │    From: Mike, Emma, +1 other    │   │
│  │                                  │   │
│  │    [Add to Roster] [Not Interested] │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Components:**
- `RecommendationCard` - Rich recommendation display
- `RecommendationReasoning` - Explain why recommended
- `AddToRosterButton` - Quick action to add
- `RecommendationSettings` - Adjust preferences

#### 3. Activity Feed (`/activity`)

**Layout:**
```
┌─────────────────────────────────────────┐
│  Activity Feed                          │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │ 👤 Mike Chen                     │   │
│  │    Had a great hang with James   │   │
│  │    2 hours ago                   │   │
│  │    💬 "Best conversation ever!"  │   │
│  │                                  │   │
│  │    👍 3 reactions                │   │
│  │    [Like] [Congrats] [Comment]   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 👤 Emma Davis                    │   │
│  │    Added Taylor to S-tier        │   │
│  │    1 day ago                     │   │
│  │                                  │   │
│  │    👍 5 reactions                │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Components:**
- `ActivityFeed` - Scrollable feed of updates
- `FeedItem` - Individual activity card
- `ReactionBar` - Like/comment interface
- `ShareHangModal` - Post hang to feed

#### 4. Enhanced Profile Page

**Additions to existing profile:**
```
┌─────────────────────────────────────────┐
│  [Existing profile content...]          │
│                                         │
│  [NEW SECTION]                          │
│  ┌─────────────────────────────────┐   │
│  │ 🤝 Share with Friends            │   │
│  │                                  │   │
│  │ Let friends know about Alex:     │   │
│  │ [Select Friends...]              │   │
│  │                                  │   │
│  │ ☑ Include scores                │   │
│  │ ☑ Include field notes            │   │
│  │                                  │   │
│  │ Message (optional):              │   │
│  │ [text input]                     │   │
│  │                                  │   │
│  │ [Share]                          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Source Information]                   │
│  Added from: Mike's recommendation      │
│  3 mutual friends have Alex in roster   │
└─────────────────────────────────────────┘
```

#### 5. Group Schedule Screen (`/group-schedule`)

**Layout:**
```
┌─────────────────────────────────────────┐
│  Group Schedule           [New Group]   │
├─────────────────────────────────────────┤
│  [Active Groups]                        │
│  ┌─────────────────────────────────┐   │
│  │ Weekend Hangout                  │   │
│  │ You, Mike, Emma, Sarah           │   │
│  │                                  │   │
│  │ Common free times:               │   │
│  │ • Fri 7-9pm (all 4 free)        │   │
│  │ • Sat 2-4pm (all 4 free)        │   │
│  │ • Sun 6-8pm (3 of 4 free)       │   │
│  │                                  │   │
│  │ [Finalize Time]                  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Design System Updates

#### New Colors
```css
--color-social-blue: #4A90E2;
--color-recommendation-purple: #9B59B6;
--color-activity-green: #2ECC71;
--color-friend-gold: #F39C12;
```

#### New Components
- `Badge` variant for "New Friend", "New Recommendation"
- `ConfidenceBar` - Visual representation of recommendation confidence
- `MutualFriendsIndicator` - Show mutual connections
- `ActivityCard` - Consistent activity feed items

### Notification UI

**In-app notifications (top-right badge):**
```typescript
interface Notification {
  id: string
  type: 'friend_request' | 'recommendation' | 'hang_reaction' | 'group_schedule'
  title: string
  message: string
  actionUrl: string
  read: boolean
  createdAt: string
}
```

**Notification dropdown:**
- Friend requests (high priority)
- New recommendations (daily digest)
- Hang reactions (real-time)
- Group schedule updates (real-time)

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Basic friend system and database setup

- [ ] Create database tables and migrations
- [ ] Implement RLS policies
- [ ] Build connection management API
- [ ] Create Friends screen UI
- [ ] Add friend request flow
- [ ] Search and add friends functionality
- [ ] Update user profile with social fields

**Deliverables:**
- Users can send/accept friend requests
- Friend list visible
- Basic privacy settings

### Phase 2: Recommendations Engine (Weeks 3-4)
**Goal:** Generate and display recommendations

- [ ] Implement recommendation algorithm
- [ ] Build RecommendationService
- [ ] Create batch job for nightly generation
- [ ] Build Discover screen UI
- [ ] Recommendation cards with reasoning
- [ ] Add to roster from recommendation
- [ ] Recommendation feedback (dismiss, not interested)

**Deliverables:**
- Users see personalized recommendations
- Can add recommended people to roster
- Recommendations update based on activity

### Phase 3: Social Feed (Weeks 5-6)
**Goal:** Share and react to hangs

- [ ] Build shared hangs functionality
- [ ] Create Activity Feed screen
- [ ] Implement reactions (likes, comments)
- [ ] Share hang from profile
- [ ] Privacy controls for sharing
- [ ] Real-time feed updates (Supabase subscriptions)

**Deliverables:**
- Users can share positive hangs
- Friends can react and comment
- Activity feed shows friend updates

### Phase 4: Group Scheduling (Weeks 7-8)
**Goal:** Coordinate group hangs

- [ ] Build group schedule API
- [ ] Create Group Schedule screen
- [ ] Find common availability algorithm
- [ ] Participant invitation flow
- [ ] Time finalization and confirmation
- [ ] Calendar integration (optional)

**Deliverables:**
- Users can create group schedules
- App finds common free times
- Groups can finalize plans

### Phase 5: Polish & Optimization (Weeks 9-10)
**Goal:** Improve performance and UX

- [ ] Optimize recommendation algorithm
- [ ] Add caching for feeds
- [ ] Implement notifications
- [ ] Email digests for recommendations
- [ ] Onboarding flow for social features
- [ ] Advanced privacy controls
- [ ] Analytics and tracking
- [ ] A/B testing framework

**Deliverables:**
- Fast, smooth user experience
- Users understand social features
- Analytics in place for iteration

### Phase 6: Advanced Features (Future)
- [ ] Mutual roster insights
- [ ] Location-based recommendations
- [ ] Event planning (not just scheduling)
- [ ] "Set up" feature (introduce friends to each other)
- [ ] Collaborative rating (friends rate together)
- [ ] Achievement system (gamification)
- [ ] Premium features (unlimited recommendations, etc.)

---

## Technical Considerations

### Performance

#### Database Optimization
- **Indexes**: Create indexes on foreign keys and frequently queried columns
- **Denormalization**: Cache friend counts, roster stats in user table
- **Materialized Views**: Pre-compute recommendation scores
- **Partitioning**: Partition notifications by date

#### API Optimization
- **Caching**: Redis for feed data (5-minute TTL)
- **Pagination**: Cursor-based pagination for feeds
- **Rate Limiting**: Prevent abuse of recommendation refreshes
- **Background Jobs**: Use Supabase Edge Functions for batch processing

#### Client Optimization
- **Optimistic Updates**: Update UI immediately, sync later
- **Infinite Scroll**: Virtual scrolling for long feeds
- **Image Optimization**: Compress avatars, lazy load
- **Code Splitting**: Lazy load social features

### Scalability

#### Recommendation Algorithm
- **Batch Processing**: Generate recommendations nightly for all users
- **Incremental Updates**: Refresh only affected users on roster changes
- **Sampling**: For users with many friends, sample subset for recommendations
- **Caching**: Cache recommendations for 24 hours

#### Real-time Updates
- **Supabase Realtime**: Use for notifications and activity feed
- **Throttling**: Debounce frequent updates
- **Channel Optimization**: Subscribe only to relevant channels

### Security

#### Data Protection
- **Encrypt Sensitive Data**: Field notes, messages
- **Audit Logging**: Track who accesses whose data
- **Rate Limiting**: Prevent scraping of user data
- **CSRF Protection**: Secure all state-changing APIs

#### Privacy Enforcement
- **RLS Policies**: Enforce at database level
- **API Validation**: Double-check permissions in API layer
- **Data Minimization**: Only share what's necessary
- **Anonymization**: Remove identifying info from recommendations

### Monitoring

#### Key Metrics
- **Engagement**: Friend connections per user, recommendations accepted
- **Performance**: API response times, recommendation generation time
- **Errors**: Failed friend requests, recommendation generation failures
- **Privacy**: Privacy setting changes, data access patterns

#### Alerts
- Recommendation generation failures
- Spike in friend requests (potential spam)
- High API latency
- Database connection issues

---

## Success Metrics

### Adoption Metrics
- **Friend Connections**: Average friends per user
  - Target: 5+ friends within first month
- **Recommendation Acceptance Rate**: % of recommendations added to roster
  - Target: 15% acceptance rate
- **Social Sharing**: % of hangs shared to feed
  - Target: 30% of positive hangs shared

### Engagement Metrics
- **Daily Active Users (DAU)**: Users who open the app daily
  - Target: +50% increase
- **Session Duration**: Time spent in app per session
  - Target: +40% increase
- **Return Rate**: Users who return after 7 days
  - Target: 70% retention

### Network Effects
- **Viral Coefficient**: How many friends each user invites
  - Target: 1.5 invites per user
- **Network Density**: % of possible connections realized
  - Target: 20% of friend-of-friends connected

### Quality Metrics
- **Recommendation Accuracy**: User satisfaction with recommendations
  - Measure: Post-add survey (1-5 stars)
  - Target: 4.0+ average rating
- **Privacy Concerns**: Support tickets about privacy
  - Target: <1% of users report concerns

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Recommendation algorithm poor quality | High | Medium | A/B test multiple algorithms, user feedback loop |
| Database performance issues at scale | High | Medium | Optimize queries, add caching, monitor performance |
| Privacy breach / data leak | Critical | Low | Security audit, RLS testing, encryption |
| Real-time features cause latency | Medium | Medium | Throttle updates, use CDN, optimize subscriptions |

### Product Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Users don't adopt social features | High | Medium | Phased rollout, onboarding, incentives |
| Recommendations feel creepy | High | Low | Clear explanations, privacy controls, opt-out |
| Friend drama / social pressure | Medium | Medium | Private by default, block features, moderation |
| Network effects don't kick in | High | Medium | Referral incentives, seed with initial network |

### Compliance Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| GDPR/privacy law violations | Critical | Low | Privacy by design, data export, deletion |
| Age verification (minors) | High | Low | Age gate, parental consent for <18 |
| Liability for user actions | Medium | Low | Terms of service, content moderation |

---

## Future Considerations

### Potential Enhancements

#### Advanced Recommendations
- **Machine Learning**: Train neural network on hang outcomes
- **Natural Language Processing**: Analyze field notes for insights
- **Temporal Patterns**: Recommend people based on time of year, day of week
- **Location-Based**: Factor in geographic proximity

#### Gamification
- **Achievements**: "Connected 10 friends", "Perfect hang streak"
- **Leaderboards**: Most successful hangs, highest ELO
- **Challenges**: "Hang with 3 new people this week"

#### Monetization
- **Premium Tier**:
  - Unlimited recommendations
  - Advanced analytics on roster
  - Priority support
  - Ad-free experience
- **Freemium Model**: 5 recommendations/week free, unlimited for $4.99/month

#### Platform Expansion
- **Mobile Apps**: Native iOS and Android
- **Calendar Integration**: Google Calendar, Apple Calendar
- **Messaging Integration**: iMessage, WhatsApp share buttons
- **Dating App Integration**: Import from Hinge, Bumble

---

## Appendix

### A. User Flows

#### Flow 1: Adding First Friend
1. User completes onboarding
2. Prompted to add friends
3. Search by username/email
4. Send friend request
5. Friend receives notification
6. Friend accepts request
7. Both users see each other in Friends list

#### Flow 2: Discovering Recommendation
1. User opens Discover tab
2. Sees 3-5 new recommendations
3. Taps on a recommendation card
4. Views detailed reasoning and predicted scores
5. Sees which friends contributed to recommendation
6. Decides to add to roster
7. Prompted to add initial scores
8. Person added to roster with source tag

#### Flow 3: Sharing a Hang
1. User logs a positive hang
2. After logging, prompted "Share with friends?"
3. User writes optional caption
4. Selects visibility (all friends or close friends)
5. Hang appears in friends' activity feed
6. Friends react with likes/comments
7. User receives notification of reactions

### B. Database Indexes

```sql
-- Connections
CREATE INDEX idx_connections_status_user ON connections(user_id, status);
CREATE INDEX idx_connections_status_friend ON connections(friend_id, status);

-- Recommendations
CREATE INDEX idx_recommendations_user_viewed ON recommendations(user_id, viewed, expires_at);

-- Shared Hangs
CREATE INDEX idx_shared_hangs_feed ON shared_hangs(visibility, created_at DESC);

-- Notifications
CREATE INDEX idx_notifications_unread ON notifications(user_id, read, created_at DESC);

-- Group Schedules
CREATE INDEX idx_group_schedules_status ON group_schedules(status, created_at DESC);
```

### C. API Rate Limits

| Endpoint | Rate Limit | Window |
|----------|-----------|--------|
| `POST /connections/request` | 10 requests | 1 hour |
| `GET /recommendations` | 100 requests | 1 hour |
| `POST /recommendations/refresh` | 3 requests | 1 hour |
| `GET /feed` | 200 requests | 1 hour |
| `POST /hangs/:id/share` | 50 requests | 1 hour |
| `GET /users/search` | 30 requests | 1 minute |

### D. Sample Queries

#### Get recommendations for user
```sql
SELECT
  r.*,
  array_agg(u.display_name) as source_friends
FROM recommendations r
LEFT JOIN unnest(r.source_user_ids) source_id ON true
LEFT JOIN users u ON u.id = source_id::uuid
WHERE r.user_id = $1
  AND r.expires_at > NOW()
  AND r.viewed = false
GROUP BY r.id
ORDER BY r.confidence_score DESC
LIMIT 10;
```

#### Get activity feed for user
```sql
SELECT
  sh.*,
  u.display_name,
  u.avatar_url,
  rp.name as person_name,
  COUNT(hr.id) as reaction_count
FROM shared_hangs sh
JOIN users u ON u.id = sh.user_id
JOIN roster rp ON rp.id = sh.roster_id
LEFT JOIN hang_reactions hr ON hr.shared_hang_id = sh.id
WHERE sh.user_id IN (
  SELECT friend_id FROM connections
  WHERE user_id = $1 AND status = 'accepted'
  UNION
  SELECT user_id FROM connections
  WHERE friend_id = $1 AND status = 'accepted'
)
AND sh.visibility = 'friends'
GROUP BY sh.id, u.display_name, u.avatar_url, rp.name
ORDER BY sh.created_at DESC
LIMIT 20 OFFSET $2;
```

#### Find users with similar taste
```sql
WITH user_avg_scores AS (
  SELECT
    user_id,
    AVG(attraction_score) as avg_attraction,
    AVG(personality_score) as avg_personality,
    AVG(reliability_score) as avg_reliability
  FROM roster
  WHERE user_id = $1
  GROUP BY user_id
),
friend_avg_scores AS (
  SELECT
    r.user_id,
    AVG(r.attraction_score) as avg_attraction,
    AVG(r.personality_score) as avg_personality,
    AVG(r.reliability_score) as avg_reliability
  FROM roster r
  WHERE r.user_id IN (
    SELECT friend_id FROM connections WHERE user_id = $1 AND status = 'accepted'
  )
  GROUP BY r.user_id
)
SELECT
  f.*,
  ABS(u.avg_attraction - f.avg_attraction) +
  ABS(u.avg_personality - f.avg_personality) +
  ABS(u.avg_reliability - f.avg_reliability) as similarity_score
FROM friend_avg_scores f
CROSS JOIN user_avg_scores u
ORDER BY similarity_score ASC
LIMIT 10;
```

---

## Sign-off

**Document Owner:** Product Team
**Technical Reviewers:** Engineering Team
**Privacy Review:** Legal Team
**Expected Start Date:** TBD
**Target Launch:** Q4 2026

**Next Steps:**
1. Review and approval from stakeholders
2. Technical feasibility assessment
3. Design mockups and prototypes
4. Create detailed sprint planning for Phase 1
5. Set up development environment and database migrations

---

*This is a living document and will be updated as the project evolves.*
