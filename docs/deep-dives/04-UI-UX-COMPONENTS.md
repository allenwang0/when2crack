# UI/UX Components Deep Dive

**Document Version:** 1.0
**Last Updated:** 2026-05-11

---

## Table of Contents
1. [Design System](#design-system)
2. [Component Architecture](#component-architecture)
3. [Friends Screen Components](#friends-screen-components)
4. [Discover Screen Components](#discover-screen-components)
5. [Activity Feed Components](#activity-feed-components)
6. [Group Schedule Components](#group-schedule-components)
7. [Shared Components](#shared-components)
8. [Animations & Transitions](#animations--transitions)
9. [Responsive Design](#responsive-design)
10. [Accessibility](#accessibility)

---

## Design System

### Color Palette

```typescript
// tailwind.config.js additions

module.exports = {
  theme: {
    extend: {
      colors: {
        // Existing colors
        pink: '#FFB6C1',
        purple: '#DDA0DD',
        teal: '#98D8C8',
        'yellow-bright': '#FFD93D',

        // Social feature colors
        social: {
          blue: '#4A90E2',
          indigo: '#5C6BC0',
          green: '#2ECC71',
          amber: '#F39C12',
        },

        // Recommendation colors
        recommendation: {
          high: '#9B59B6',     // High confidence
          medium: '#3498DB',   // Medium confidence
          low: '#95A5A6',      // Low confidence
        },

        // Activity colors
        activity: {
          positive: '#2ECC71',
          neutral: '#95A5A6',
          negative: '#E74C3C',
        },
      },

      // Gradients
      backgroundImage: {
        'gradient-social': 'linear-gradient(135deg, #4A90E2 0%, #5C6BC0 100%)',
        'gradient-recommendation': 'linear-gradient(135deg, #9B59B6 0%, #3498DB 100%)',
        'gradient-activity': 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
      },
    },
  },
}
```

### Typography

```css
/* app/globals.css additions */

/* Social headings */
.heading-social {
  @apply font-serif text-2xl font-bold;
  background: linear-gradient(135deg, #4A90E2 0%, #5C6BC0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Recommendation card text */
.text-recommendation {
  @apply text-sm font-medium text-gray-700;
}

/* Confidence score */
.text-confidence {
  @apply text-lg font-bold tabular-nums;
}
```

### Spacing & Layout

```typescript
// Standard component spacing
const SPACING = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem',    // 48px
}

// Card dimensions
const CARD = {
  borderRadius: '1rem',
  padding: '1.5rem',
  shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
}
```

---

## Component Architecture

### File Structure

```
components/
├── friends/
│   ├── FriendList.tsx
│   ├── FriendCard.tsx
│   ├── FriendRequestCard.tsx
│   ├── AddFriendModal.tsx
│   ├── FriendProfile.tsx
│   └── MutualFriendsIndicator.tsx
├── discover/
│   ├── RecommendationFeed.tsx
│   ├── RecommendationCard.tsx
│   ├── RecommendationReasoning.tsx
│   ├── ConfidenceBar.tsx
│   ├── PredictedScores.tsx
│   └── RecommendationSettings.tsx
├── activity/
│   ├── ActivityFeed.tsx
│   ├── ActivityCard.tsx
│   ├── HangShareCard.tsx
│   ├── ReactionBar.tsx
│   └── ShareHangModal.tsx
├── group-schedule/
│   ├── GroupScheduleList.tsx
│   ├── GroupScheduleCard.tsx
│   ├── CreateGroupModal.tsx
│   ├── AvailabilityOverlay.tsx
│   └── TimeSlotPicker.tsx
├── social-shared/
│   ├── SocialButton.tsx
│   ├── SocialCard.tsx
│   ├── SourceAttribution.tsx
│   ├── PrivacyIndicator.tsx
│   └── SocialAvatar.tsx
└── animations/
    ├── FadeIn.tsx
    ├── SlideUp.tsx
    └── Shimmer.tsx
```

---

## Friends Screen Components

### FriendList Component

```tsx
// components/friends/FriendList.tsx

'use client'

import { useState, useEffect } from 'react'
import { FriendCard } from './FriendCard'
import { FriendRequestCard } from './FriendRequestCard'
import { AddFriendModal } from './AddFriendModal'
import { Button } from '@/components/ui/Button'

interface Friend {
  id: string
  friend: {
    id: string
    displayName: string
    username: string
    avatarUrl: string | null
    bio: string | null
  }
  connectionStrength: number
  acceptedAt: string
}

interface FriendRequest {
  id: string
  friend: {
    id: string
    displayName: string
    username: string
    avatarUrl: string | null
  }
  createdAt: string
}

export function FriendList() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFriends()
  }, [])

  async function loadFriends() {
    try {
      const response = await fetch('/api/connections')
      const data = await response.json()

      if (data.success) {
        setFriends(data.data.friends)
        setPendingRequests(data.data.pending)
      }
    } catch (error) {
      console.error('Error loading friends:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAcceptRequest(requestId: string) {
    try {
      const response = await fetch(`/api/connections/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      })

      if (response.ok) {
        // Refresh friends list
        await loadFriends()
      }
    } catch (error) {
      console.error('Error accepting request:', error)
    }
  }

  async function handleDeclineRequest(requestId: string) {
    try {
      const response = await fetch(`/api/connections/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' }),
      })

      if (response.ok) {
        setPendingRequests(prev => prev.filter(r => r.id !== requestId))
      }
    } catch (error) {
      console.error('Error declining request:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-social-blue"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="heading-social">
          Friends {friends.length > 0 && `(${friends.length})`}
        </h1>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-social-blue hover:bg-social-indigo"
        >
          + Add Friend
        </Button>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">Pending Requests</h2>
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {pendingRequests.length}
            </span>
          </div>

          <div className="space-y-3">
            {pendingRequests.map(request => (
              <FriendRequestCard
                key={request.id}
                request={request}
                onAccept={handleAcceptRequest}
                onDecline={handleDeclineRequest}
              />
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Your Friends</h2>

        {friends.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-gray-500 mb-4">No friends yet</p>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-social-blue hover:bg-social-indigo"
            >
              Add Your First Friend
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map(friend => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onRemove={loadFriends}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Friend Modal */}
      {showAddModal && (
        <AddFriendModal
          onClose={() => setShowAddModal(false)}
          onSuccess={loadFriends}
        />
      )}
    </div>
  )
}
```

### FriendCard Component

```tsx
// components/friends/FriendCard.tsx

'use client'

import { useState } from 'react'
import { SocialAvatar } from '@/components/social-shared/SocialAvatar'
import { Button } from '@/components/ui/Button'

interface FriendCardProps {
  friend: {
    id: string
    friend: {
      id: string
      displayName: string
      username: string
      avatarUrl: string | null
      bio: string | null
    }
    connectionStrength: number
    acceptedAt: string
  }
  onRemove: () => void
}

export function FriendCard({ friend, onRemove }: FriendCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [removing, setRemoving] = useState(false)

  const connectionColor = getConnectionColor(friend.connectionStrength)

  async function handleRemove() {
    if (!confirm(`Remove ${friend.friend.displayName} from friends?`)) return

    setRemoving(true)

    try {
      const response = await fetch(`/api/connections/${friend.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onRemove()
      }
    } catch (error) {
      console.error('Error removing friend:', error)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <SocialAvatar
          src={friend.friend.avatarUrl}
          name={friend.friend.displayName}
          size="lg"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {friend.friend.displayName}
            </h3>
            {friend.connectionStrength >= 80 && (
              <span className="text-xs">⭐</span>
            )}
          </div>

          <p className="text-sm text-gray-500">@{friend.friend.username}</p>

          {friend.friend.bio && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-1">
              {friend.friend.bio}
            </p>
          )}

          {/* Connection Strength Indicator */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${friend.connectionStrength}%`,
                  backgroundColor: connectionColor,
                }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {friend.connectionStrength}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <button
                onClick={() => {
                  setShowMenu(false)
                  // Navigate to friend profile
                  window.location.href = `/users/${friend.friend.id}`
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                View Profile
              </button>
              <button
                onClick={() => {
                  setShowMenu(false)
                  handleRemove()
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                disabled={removing}
              >
                {removing ? 'Removing...' : 'Remove Friend'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getConnectionColor(strength: number): string {
  if (strength >= 80) return '#2ECC71' // green
  if (strength >= 50) return '#F39C12' // amber
  return '#95A5A6' // gray
}
```

### FriendRequestCard Component

```tsx
// components/friends/FriendRequestCard.tsx

'use client'

import { useState } from 'react'
import { SocialAvatar } from '@/components/social-shared/SocialAvatar'
import { Button } from '@/components/ui/Button'
import { MutualFriendsIndicator } from './MutualFriendsIndicator'

interface FriendRequestCardProps {
  request: {
    id: string
    friend: {
      id: string
      displayName: string
      username: string
      avatarUrl: string | null
    }
    createdAt: string
  }
  onAccept: (requestId: string) => void
  onDecline: (requestId: string) => void
}

export function FriendRequestCard({ request, onAccept, onDecline }: FriendRequestCardProps) {
  const [loading, setLoading] = useState(false)

  async function handleAccept() {
    setLoading(true)
    await onAccept(request.id)
    setLoading(false)
  }

  async function handleDecline() {
    setLoading(true)
    await onDecline(request.id)
    setLoading(false)
  }

  return (
    <div className="bg-gradient-to-r from-social-blue/10 to-social-indigo/10 border-2 border-social-blue/30 rounded-2xl p-4">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <SocialAvatar
          src={request.friend.avatarUrl}
          name={request.friend.displayName}
          size="md"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {request.friend.displayName}
          </h3>
          <p className="text-sm text-gray-500">@{request.friend.username}</p>

          <MutualFriendsIndicator userId={request.friend.id} />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleAccept}
            disabled={loading}
            className="bg-social-blue hover:bg-social-indigo text-white px-4 py-2"
          >
            Accept
          </Button>
          <Button
            onClick={handleDecline}
            disabled={loading}
            variant="secondary"
            className="px-4 py-2"
          >
            Decline
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

## Discover Screen Components

### RecommendationCard Component

```tsx
// components/discover/RecommendationCard.tsx

'use client'

import { useState } from 'react'
import { ConfidenceBar } from './ConfidenceBar'
import { PredictedScores } from './PredictedScores'
import { RecommendationReasoning } from './RecommendationReasoning'
import { SourceAttribution } from '@/components/social-shared/SourceAttribution'
import { Button } from '@/components/ui/Button'

interface RecommendationCardProps {
  recommendation: {
    id: string
    personName: string
    confidenceScore: number
    predictedScores: {
      attraction: number
      personality: number
      reliability: number
      composite: number
    }
    reasoning: {
      matchPoints: string[]
      similarTo: string[]
      socialProof: string
      predictedScores: any
    }
    sourceType: string
    sourceFriendCount: number
  }
  onAdd: (id: string) => void
  onDismiss: (id: string) => void
}

export function RecommendationCard({ recommendation, onAdd, onDismiss }: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAddToRoster() {
    setLoading(true)
    await onAdd(recommendation.id)
  }

  async function handleDismiss() {
    setLoading(true)
    await onDismiss(recommendation.id)
  }

  return (
    <div className="bg-white border-2 border-recommendation-high/30 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-2xl font-bold text-gray-900">
              {recommendation.personName}
            </h3>
            {recommendation.confidenceScore >= 0.9 && (
              <span className="text-2xl">⭐</span>
            )}
          </div>

          <ConfidenceBar score={recommendation.confidenceScore} />
        </div>

        {/* Badge */}
        <div className="bg-recommendation-high/10 text-recommendation-high px-3 py-1 rounded-full text-xs font-semibold">
          {Math.round(recommendation.confidenceScore * 100)}% Match
        </div>
      </div>

      {/* Predicted Scores */}
      <PredictedScores scores={recommendation.predictedScores} />

      {/* Reasoning Preview */}
      <div className="mt-4 mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          Why this recommendation:
        </h4>
        <div className="space-y-1">
          {recommendation.reasoning.matchPoints.slice(0, expanded ? undefined : 2).map((point, index) => (
            <div key={index} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-recommendation-high mt-0.5">•</span>
              <span>{point}</span>
            </div>
          ))}
        </div>

        {recommendation.reasoning.matchPoints.length > 2 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-sm text-recommendation-high hover:underline mt-2"
          >
            Show {recommendation.reasoning.matchPoints.length - 2} more reasons
          </button>
        )}
      </div>

      {/* Source Attribution */}
      <SourceAttribution
        sourceType={recommendation.sourceType}
        friendCount={recommendation.sourceFriendCount}
      />

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <RecommendationReasoning reasoning={recommendation.reasoning} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <Button
          onClick={handleAddToRoster}
          disabled={loading}
          className="flex-1 bg-gradient-recommendation text-white"
        >
          {loading ? 'Adding...' : 'Add to Roster'}
        </Button>
        <Button
          onClick={handleDismiss}
          disabled={loading}
          variant="secondary"
          className="px-6"
        >
          Not Interested
        </Button>
      </div>
    </div>
  )
}
```

### ConfidenceBar Component

```tsx
// components/discover/ConfidenceBar.tsx

interface ConfidenceBarProps {
  score: number // 0-1
}

export function ConfidenceBar({ score }: ConfidenceBarProps) {
  const percentage = Math.round(score * 100)
  const color = getConfidenceColor(score)
  const label = getConfidenceLabel(score)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">
          Confidence: <span style={{ color }}>{label}</span>
        </span>
        <span className="text-sm font-bold text-gray-900">{percentage}%</span>
      </div>

      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  )
}

function getConfidenceColor(score: number): string {
  if (score >= 0.9) return '#9B59B6' // High (purple)
  if (score >= 0.75) return '#3498DB' // Medium (blue)
  return '#95A5A6' // Low (gray)
}

function getConfidenceLabel(score: number): string {
  if (score >= 0.9) return 'Very High'
  if (score >= 0.75) return 'High'
  if (score >= 0.60) return 'Medium'
  return 'Low'
}
```

### PredictedScores Component

```tsx
// components/discover/PredictedScores.tsx

interface PredictedScoresProps {
  scores: {
    attraction: number
    personality: number
    reliability: number
    composite: number
  }
}

export function PredictedScores({ scores }: PredictedScoresProps) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">
        Predicted Scores:
      </h4>

      <div className="grid grid-cols-3 gap-4">
        <ScoreItem
          label="Looks"
          score={scores.attraction}
          icon="😊"
          color="#FFB6C1"
        />
        <ScoreItem
          label="Personality"
          score={scores.personality}
          icon="❤️"
          color="#98D8C8"
        />
        <ScoreItem
          label="Values"
          score={scores.reliability}
          icon="⭐"
          color="#F0E68C"
        />
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 text-center">
        <div className="text-xs text-gray-500 mb-1">Composite Score</div>
        <div className="text-3xl font-bold" style={{ color: '#FFB6C1' }}>
          {scores.composite.toFixed(1)}
        </div>
      </div>
    </div>
  )
}

function ScoreItem({
  label,
  score,
  icon,
  color,
}: {
  label: string
  score: number
  icon: string
  color: string
}) {
  return (
    <div className="text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-bold" style={{ color }}>
        {score.toFixed(1)}
      </div>
    </div>
  )
}
```

---

## Activity Feed Components

### ActivityFeed Component

```tsx
// components/activity/ActivityFeed.tsx

'use client'

import { useState, useEffect } from 'react'
import { HangShareCard } from './HangShareCard'
import InfiniteScroll from 'react-infinite-scroll-component'

interface FeedItem {
  id: string
  type: 'hang_shared'
  user: {
    id: string
    displayName: string
    username: string
    avatarUrl: string | null
  }
  personName: string
  caption: string | null
  sentiment: 'positive' | 'neutral' | 'negative'
  hangDetails: {
    date: string
    attractionChange: number
    personalityChange: number
    reliabilityChange: number
  }
  reactions: {
    like: number
    love: number
    congrats: number
    interested: number
  }
  userReaction: string | null
  createdAt: string
}

export function ActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)

  const LIMIT = 20

  useEffect(() => {
    loadFeed()
  }, [])

  async function loadFeed() {
    try {
      const response = await fetch(`/api/feed?limit=${LIMIT}&offset=${offset}`)
      const data = await response.json()

      if (data.success) {
        setItems(prev => [...prev, ...data.data])
        setHasMore(data.meta.hasMore)
        setOffset(prev => prev + LIMIT)
      }
    } catch (error) {
      console.error('Error loading feed:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleReaction(itemId: string, reactionType: string) {
    try {
      const response = await fetch(`/api/shared-hangs/${itemId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reactionType }),
      })

      if (response.ok) {
        // Update local state
        setItems(prev =>
          prev.map(item =>
            item.id === itemId
              ? {
                  ...item,
                  reactions: {
                    ...item.reactions,
                    [reactionType]: item.reactions[reactionType] + 1,
                  },
                  userReaction: reactionType,
                }
              : item
          )
        )
      }
    } catch (error) {
      console.error('Error reacting:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-activity-positive"></div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📱</div>
        <p className="text-gray-500 mb-2">No activity yet</p>
        <p className="text-sm text-gray-400">
          When your friends share hangs, they'll appear here
        </p>
      </div>
    )
  }

  return (
    <InfiniteScroll
      dataLength={items.length}
      next={loadFeed}
      hasMore={hasMore}
      loader={<div className="text-center py-4">Loading...</div>}
      endMessage={
        <div className="text-center py-4 text-gray-400 text-sm">
          You've reached the end
        </div>
      }
    >
      <div className="space-y-4">
        {items.map(item => (
          <HangShareCard
            key={item.id}
            item={item}
            onReaction={handleReaction}
          />
        ))}
      </div>
    </InfiniteScroll>
  )
}
```

---

*Due to length, this document continues with:*
- More Activity Feed components
- Group Schedule components
- Shared components library
- Animation specifications
- Responsive design breakpoints
- Accessibility guidelines

**Total Components Created:** 30+ reusable components
**Design Tokens:** Colors, spacing, typography, shadows
**Animation Library:** Fade, slide, shimmer effects
**Responsive Breakpoints:** Mobile-first approach

---

*End of UI/UX Components Deep Dive Preview*
