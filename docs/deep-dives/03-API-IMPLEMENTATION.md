# API Implementation Deep Dive

**Document Version:** 1.0
**Last Updated:** 2026-05-11

---

## Table of Contents
1. [API Architecture](#api-architecture)
2. [Connection Management APIs](#connection-management-apis)
3. [Recommendation APIs](#recommendation-apis)
4. [Social Feed APIs](#social-feed-apis)
5. [Group Schedule APIs](#group-schedule-apis)
6. [User Discovery APIs](#user-discovery-apis)
7. [Notification APIs](#notification-apis)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [API Documentation](#api-documentation)

---

## API Architecture

### Technology Stack

- **Framework**: Next.js 14+ App Router
- **API Style**: RESTful with Server Actions
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (JWT)
- **Real-time**: Supabase Realtime
- **Validation**: Zod
- **Rate Limiting**: Upstash Redis

### Directory Structure

```
app/
├── api/
│   ├── connections/
│   │   ├── route.ts               # GET /api/connections
│   │   ├── request/route.ts       # POST /api/connections/request
│   │   ├── [id]/
│   │   │   ├── route.ts          # DELETE /api/connections/:id
│   │   │   └── respond/route.ts  # POST /api/connections/:id/respond
│   ├── recommendations/
│   │   ├── route.ts               # GET /api/recommendations
│   │   ├── refresh/route.ts       # POST /api/recommendations/refresh
│   │   └── [id]/
│   │       └── act/route.ts       # POST /api/recommendations/:id/act
│   ├── feed/
│   │   └── route.ts               # GET /api/feed
│   ├── hangs/
│   │   └── [id]/
│   │       └── share/route.ts     # POST /api/hangs/:id/share
│   ├── shared-hangs/
│   │   └── [id]/
│   │       └── react/route.ts     # POST /api/shared-hangs/:id/react
│   ├── group-schedules/
│   │   ├── route.ts               # GET, POST /api/group-schedules
│   │   └── [id]/
│   │       ├── route.ts          # GET /api/group-schedules/:id
│   │       └── finalize/route.ts # POST /api/group-schedules/:id/finalize
│   ├── users/
│   │   ├── search/route.ts        # GET /api/users/search
│   │   └── [id]/
│   │       └── profile/route.ts   # GET /api/users/:id/profile
│   └── notifications/
│       ├── route.ts                # GET /api/notifications
│       └── [id]/
│           ├── read/route.ts      # POST /api/notifications/:id/read
│           └── dismiss/route.ts   # POST /api/notifications/:id/dismiss
│
lib/
├── api/
│   ├── middleware/
│   │   ├── auth.ts                # Authentication middleware
│   │   ├── rateLimit.ts           # Rate limiting
│   │   └── validation.ts          # Request validation
│   ├── services/
│   │   ├── ConnectionService.ts
│   │   ├── RecommendationService.ts
│   │   ├── FeedService.ts
│   │   └── NotificationService.ts
│   └── validators/
│       ├── connection.validators.ts
│       ├── recommendation.validators.ts
│       └── feed.validators.ts
```

### API Response Format

Standard response structure:

```typescript
// Success Response
{
  success: true,
  data: T,
  meta?: {
    page?: number
    limit?: number
    total?: number
    hasMore?: boolean
  }
}

// Error Response
{
  success: false,
  error: {
    code: string        // ERROR_CODE
    message: string     // Human-readable message
    details?: any       // Additional error context
  }
}
```

---

## Connection Management APIs

### GET /api/connections

Get user's friend connections.

```typescript
// app/api/connections/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/middleware/auth'
import { rateLimit } from '@/lib/api/middleware/rateLimit'

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    await rateLimit(request, { max: 100, window: 60 })

    // Authentication
    const user = await requireAuth(request)

    const supabase = createClient()

    // Get all connections (friends, pending, sent requests)
    const { data: connections, error } = await supabase
      .from('connections')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        requested_by,
        connection_strength,
        created_at,
        accepted_at,
        users:friend_id (
          id,
          display_name,
          username,
          avatar_url,
          bio
        )
      `)
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Categorize connections
    const friends = connections.filter(c =>
      c.status === 'accepted'
    ).map(c => formatConnection(c, user.id))

    const pending = connections.filter(c =>
      c.status === 'pending' && c.friend_id === user.id
    ).map(c => formatConnection(c, user.id))

    const sentRequests = connections.filter(c =>
      c.status === 'pending' && c.user_id === user.id
    ).map(c => formatConnection(c, user.id))

    return NextResponse.json({
      success: true,
      data: {
        friends,
        pending,
        sentRequests,
      },
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

function formatConnection(connection: any, currentUserId: string) {
  const isFriend = connection.user_id === currentUserId
  const otherUser = isFriend ? connection.users : connection.users

  return {
    id: connection.id,
    status: connection.status,
    friend: {
      id: otherUser.id,
      displayName: otherUser.display_name,
      username: otherUser.username,
      avatarUrl: otherUser.avatar_url,
      bio: otherUser.bio,
    },
    connectionStrength: connection.connection_strength,
    createdAt: connection.created_at,
    acceptedAt: connection.accepted_at,
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "friends": [
      {
        "id": "uuid",
        "status": "accepted",
        "friend": {
          "id": "uuid",
          "displayName": "Mike Chen",
          "username": "mikechen",
          "avatarUrl": "https://...",
          "bio": "Tech enthusiast"
        },
        "connectionStrength": 75,
        "createdAt": "2026-05-01T10:00:00Z",
        "acceptedAt": "2026-05-01T10:30:00Z"
      }
    ],
    "pending": [...],
    "sentRequests": [...]
  }
}
```

### POST /api/connections/request

Send a friend request.

```typescript
// app/api/connections/request/route.ts

import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/middleware/auth'
import { rateLimit } from '@/lib/api/middleware/rateLimit'
import { validateRequest } from '@/lib/api/middleware/validation'

const requestSchema = z.object({
  friendId: z.string().uuid('Invalid friend ID'),
  message: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (max 10 friend requests per hour)
    await rateLimit(request, { max: 10, window: 3600 })

    // Authentication
    const user = await requireAuth(request)

    // Validation
    const body = await validateRequest(request, requestSchema)

    const { friendId, message } = body

    // Prevent self-friending
    if (friendId === user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Cannot send friend request to yourself',
          },
        },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('connections')
      .select('id, status')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .or(`user_id.eq.${friendId},friend_id.eq.${friendId}`)
      .is('deleted_at', null)
      .single()

    if (existing) {
      if (existing.status === 'accepted') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ALREADY_FRIENDS',
              message: 'You are already friends with this user',
            },
          },
          { status: 400 }
        )
      } else if (existing.status === 'pending') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'REQUEST_PENDING',
              message: 'Friend request already pending',
            },
          },
          { status: 400 }
        )
      }
    }

    // Check if friend user exists and privacy settings
    const { data: friendUser, error: friendError } = await supabase
      .from('users')
      .select('id, privacy_settings(allow_friend_requests)')
      .eq('id', friendId)
      .single()

    if (friendError || !friendUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        },
        { status: 404 }
      )
    }

    // Check privacy settings
    const allowRequests = friendUser.privacy_settings?.allow_friend_requests || 'everyone'

    if (allowRequests === 'nobody') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'REQUESTS_DISABLED',
            message: 'This user is not accepting friend requests',
          },
        },
        { status: 403 }
      )
    }

    // Create connection
    const { data: connection, error } = await supabase
      .from('connections')
      .insert({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending',
        requested_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Create notification for recipient
    await supabase.from('notifications').insert({
      user_id: friendId,
      type: 'friend_request_received',
      title: 'New friend request',
      message: `${user.display_name || 'Someone'} wants to connect`,
      related_user_id: user.id,
      action_url: '/friends?tab=requests',
      icon: '🤝',
    })

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: user.id,
      action_type: 'connection_requested',
      action_category: 'connection',
      target_user_id: friendId,
      target_object_type: 'connection',
      target_object_id: connection.id,
    })

    return NextResponse.json({
      success: true,
      data: {
        connectionId: connection.id,
        status: 'pending',
      },
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
```

### POST /api/connections/[id]/respond

Accept or decline a friend request.

```typescript
// app/api/connections/[id]/respond/route.ts

const respondSchema = z.object({
  action: z.enum(['accept', 'decline']),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await rateLimit(request, { max: 50, window: 60 })

    const user = await requireAuth(request)
    const body = await validateRequest(request, respondSchema)
    const { action } = body

    const supabase = createClient()

    // Get the connection
    const { data: connection, error } = await supabase
      .from('connections')
      .select('*')
      .eq('id', params.id)
      .eq('friend_id', user.id) // Must be the recipient
      .eq('status', 'pending')
      .is('deleted_at', null)
      .single()

    if (error || !connection) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONNECTION_NOT_FOUND',
            message: 'Connection request not found',
          },
        },
        { status: 404 }
      )
    }

    // Update status
    const newStatus = action === 'accept' ? 'accepted' : 'declined'
    const updateData: any = { status: newStatus }

    if (action === 'accept') {
      updateData.accepted_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('connections')
      .update(updateData)
      .eq('id', params.id)

    if (updateError) throw updateError

    // If accepted, create notification for requester
    if (action === 'accept') {
      await supabase.from('notifications').insert({
        user_id: connection.requested_by,
        type: 'friend_request_accepted',
        title: 'Friend request accepted',
        message: `${user.display_name} accepted your friend request`,
        related_user_id: user.id,
        action_url: '/friends',
        icon: '🎉',
      })

      // Increment friend count for both users
      await supabase.rpc('increment_friend_count', {
        user_ids: [user.id, connection.requested_by],
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        status: newStatus,
      },
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
```

### DELETE /api/connections/[id]

Remove a friend connection.

```typescript
// app/api/connections/[id]/route.ts

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await rateLimit(request, { max: 20, window: 60 })

    const user = await requireAuth(request)
    const supabase = createClient()

    // Verify ownership
    const { data: connection } = await supabase
      .from('connections')
      .select('user_id, friend_id')
      .eq('id', params.id)
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .is('deleted_at', null)
      .single()

    if (!connection) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONNECTION_NOT_FOUND',
            message: 'Connection not found',
          },
        },
        { status: 404 }
      )
    }

    // Soft delete
    await supabase
      .from('connections')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)

    // Decrement friend count
    await supabase.rpc('decrement_friend_count', {
      user_ids: [connection.user_id, connection.friend_id],
    })

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
```

---

## Recommendation APIs

### GET /api/recommendations

Get personalized recommendations for the current user.

```typescript
// app/api/recommendations/route.ts

const recommendationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
  offset: z.coerce.number().min(0).default(0),
  includeViewed: z.coerce.boolean().default(false),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
})

export async function GET(request: NextRequest) {
  try {
    await rateLimit(request, { max: 100, window: 60 })

    const user = await requireAuth(request)

    const { searchParams } = new URL(request.url)
    const query = recommendationQuerySchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      includeViewed: searchParams.get('includeViewed'),
      minConfidence: searchParams.get('minConfidence'),
    })

    const supabase = createClient()

    // Get privacy settings
    const { data: privacySettings } = await supabase
      .from('privacy_settings')
      .select('min_confidence_threshold')
      .eq('user_id', user.id)
      .single()

    const minConfidence = query.minConfidence || privacySettings?.min_confidence_threshold || 0.70

    // Build query
    let dbQuery = supabase
      .from('recommendations')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('confidence_score', minConfidence)
      .gt('expires_at', new Date().toISOString())
      .order('confidence_score', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1)

    if (!query.includeViewed) {
      dbQuery = dbQuery.eq('viewed', false)
    }

    const { data: recommendations, error, count } = await dbQuery

    if (error) throw error

    // Mark as viewed (async, don't wait)
    if (!query.includeViewed && recommendations.length > 0) {
      supabase
        .from('recommendations')
        .update({
          viewed: true,
          viewed_at: new Date().toISOString(),
        })
        .in('id', recommendations.map(r => r.id))
        .then(() => {})
    }

    return NextResponse.json({
      success: true,
      data: recommendations.map(formatRecommendation),
      meta: {
        limit: query.limit,
        offset: query.offset,
        total: count || 0,
        hasMore: (count || 0) > query.offset + query.limit,
      },
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

function formatRecommendation(rec: any) {
  return {
    id: rec.id,
    personName: rec.recommended_person_name,
    confidenceScore: rec.confidence_score,
    predictedScores: {
      attraction: rec.predicted_attraction,
      personality: rec.predicted_personality,
      reliability: rec.predicted_reliability,
      composite: rec.predicted_composite,
    },
    reasoning: rec.reasoning,
    matchFactors: rec.match_factors,
    sourceType: rec.source_type,
    sourceFriendCount: rec.source_user_ids?.length || 0,
    viewed: rec.viewed,
    createdAt: rec.created_at,
    expiresAt: rec.expires_at,
  }
}
```

### POST /api/recommendations/refresh

Force refresh recommendations for current user.

```typescript
// app/api/recommendations/refresh/route.ts

export async function POST(request: NextRequest) {
  try {
    // Strict rate limiting (only 3 refreshes per hour)
    await rateLimit(request, { max: 3, window: 3600 })

    const user = await requireAuth(request)

    // Check if user has enough data
    const supabase = createClient()
    const { count } = await supabase
      .from('roster')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count || 0) < 3) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_DATA',
            message: 'You need at least 3 people in your roster to get recommendations',
          },
        },
        { status: 400 }
      )
    }

    // Trigger recommendation generation
    const recommendationService = new RecommendationService()
    await recommendationService.generateRecommendations(user.id)

    // Fetch new recommendations
    const { data: recommendations } = await supabase
      .from('recommendations')
      .select('*')
      .eq('user_id', user.id)
      .eq('viewed', false)
      .gte('expires_at', new Date().toISOString())
      .order('confidence_score', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      data: {
        count: recommendations?.length || 0,
        recommendations: recommendations?.map(formatRecommendation) || [],
      },
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
```

### POST /api/recommendations/[id]/act

Mark recommendation as acted upon (added to roster, dismissed, etc.).

```typescript
// app/api/recommendations/[id]/act/route.ts

const actSchema = z.object({
  action: z.enum(['added', 'dismissed', 'not_interested', 'blocked']),
  rosterId: z.string().uuid().optional(),
  feedback: z.string().max(500).optional(),
  rating: z.number().min(1).max(5).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await rateLimit(request, { max: 100, window: 60 })

    const user = await requireAuth(request)
    const body = await validateRequest(request, actSchema)

    const supabase = createClient()

    // Verify ownership
    const { data: recommendation } = await supabase
      .from('recommendations')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!recommendation) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RECOMMENDATION_NOT_FOUND',
            message: 'Recommendation not found',
          },
        },
        { status: 404 }
      )
    }

    // Update recommendation
    await supabase
      .from('recommendations')
      .update({
        acted_on: true,
        action_type: body.action,
        action_at: new Date().toISOString(),
        resulting_roster_id: body.rosterId,
        user_feedback: body.feedback,
        user_rating: body.rating,
      })
      .eq('id', params.id)

    // If added to roster, update roster entry with source
    if (body.action === 'added' && body.rosterId) {
      await supabase
        .from('roster')
        .update({
          source: 'recommendation',
          source_friend_id: recommendation.source_user_ids?.[0], // Primary source
        })
        .eq('id', body.rosterId)
    }

    // Track analytics event
    await analytics.track({
      event: 'recommendation_acted_on',
      userId: user.id,
      recommendationId: params.id,
      action: body.action,
      confidence: recommendation.confidence_score,
      rating: body.rating,
    })

    return NextResponse.json({
      success: true,
      data: {
        action: body.action,
        recommendationId: params.id,
      },
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
```

---

## Social Feed APIs

### GET /api/feed

Get activity feed (shared hangs from friends).

```typescript
// app/api/feed/route.ts

const feedQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
  filter: z.enum(['all', 'hangs', 'roster_updates']).default('all'),
})

export async function GET(request: NextRequest) {
  try {
    await rateLimit(request, { max: 200, window: 60 })

    const user = await requireAuth(request)

    const { searchParams } = new URL(request.url)
    const query = feedQuerySchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      filter: searchParams.get('filter'),
    })

    const supabase = createClient()

    // Get friend IDs
    const { data: connections } = await supabase
      .from('connections')
      .select('user_id, friend_id')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq('status', 'accepted')
      .is('deleted_at', null)

    const friendIds = connections?.map(c =>
      c.user_id === user.id ? c.friend_id : c.user_id
    ) || []

    if (friendIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { limit: query.limit, offset: query.offset, total: 0, hasMore: false },
      })
    }

    // Get shared hangs from friends
    const { data: feedItems, error, count } = await supabase
      .from('shared_hangs')
      .select(`
        *,
        user:user_id (
          id,
          display_name,
          username,
          avatar_url
        ),
        roster:roster_id (
          name
        ),
        hang:hang_id (
          hang_date,
          attraction_change,
          personality_change,
          reliability_change
        )
      `, { count: 'exact' })
      .in('user_id', friendIds)
      .eq('visibility', 'friends')
      .eq('is_hidden', false)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1)

    if (error) throw error

    // Get reaction counts and user's reactions
    const itemIds = feedItems.map(item => item.id)

    const { data: reactions } = await supabase
      .from('hang_reactions')
      .select('shared_hang_id, reaction_type, user_id')
      .in('shared_hang_id', itemIds)
      .is('deleted_at', null)

    // Format feed items
    const formattedItems = feedItems.map(item => ({
      id: item.id,
      type: 'hang_shared',
      user: {
        id: item.user.id,
        displayName: item.user.display_name,
        username: item.user.username,
        avatarUrl: item.user.avatar_url,
      },
      personName: item.roster?.name,
      caption: item.caption,
      sentiment: item.sentiment,
      hangDetails: {
        date: item.hang?.hang_date,
        attractionChange: item.hang?.attraction_change,
        personalityChange: item.hang?.personality_change,
        reliabilityChange: item.hang?.reliability_change,
      },
      reactions: {
        like: reactions?.filter(r => r.shared_hang_id === item.id && r.reaction_type === 'like').length || 0,
        love: reactions?.filter(r => r.shared_hang_id === item.id && r.reaction_type === 'love').length || 0,
        congrats: reactions?.filter(r => r.shared_hang_id === item.id && r.reaction_type === 'congrats').length || 0,
        interested: reactions?.filter(r => r.shared_hang_id === item.id && r.reaction_type === 'interested').length || 0,
      },
      userReaction: reactions?.find(r => r.shared_hang_id === item.id && r.user_id === user.id)?.reaction_type,
      createdAt: item.created_at,
    }))

    return NextResponse.json({
      success: true,
      data: formattedItems,
      meta: {
        limit: query.limit,
        offset: query.offset,
        total: count || 0,
        hasMore: (count || 0) > query.offset + query.limit,
      },
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
```

### POST /api/hangs/[id]/share

Share a hang to social feed.

```typescript
// app/api/hangs/[id]/share/route.ts

const shareHangSchema = z.object({
  visibility: z.enum(['friends', 'close_friends', 'specific']),
  caption: z.string().max(500).optional(),
  specificUserIds: z.array(z.string().uuid()).max(10).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await rateLimit(request, { max: 50, window: 60 })

    const user = await requireAuth(request)
    const body = await validateRequest(request, shareHangSchema)

    const supabase = createClient()

    // Verify hang ownership
    const { data: hang } = await supabase
      .from('hangs')
      .select('*, roster:roster_id(name)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!hang) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'HANG_NOT_FOUND',
            message: 'Hang not found',
          },
        },
        { status: 404 }
      )
    }

    // Determine sentiment based on score changes
    const totalChange =
      hang.attraction_change + hang.personality_change + hang.reliability_change

    const sentiment = totalChange > 2 ? 'positive' : totalChange < -2 ? 'negative' : 'neutral'

    // Create shared hang
    const { data: sharedHang, error } = await supabase
      .from('shared_hangs')
      .insert({
        user_id: user.id,
        hang_id: hang.id,
        roster_id: hang.roster_id,
        caption: body.caption,
        visibility: body.visibility,
        visible_to_user_ids: body.specificUserIds,
        sentiment,
      })
      .select()
      .single()

    if (error) throw error

    // Notify friends (async)
    if (body.visibility === 'friends') {
      notifyFriendsOfSharedHang(user.id, hang.roster.name, sharedHang.id)
    }

    return NextResponse.json({
      success: true,
      data: {
        sharedHangId: sharedHang.id,
        visibility: body.visibility,
      },
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
```

### POST /api/shared-hangs/[id]/react

React to a shared hang.

```typescript
// app/api/shared-hangs/[id]/react/route.ts

const reactSchema = z.object({
  reactionType: z.enum(['like', 'love', 'congrats', 'interested', 'comment']),
  comment: z.string().max(500).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await rateLimit(request, { max: 100, window: 60 })

    const user = await requireAuth(request)
    const body = await validateRequest(request, reactSchema)

    const supabase = createClient()

    // Verify access to this shared hang
    const { data: sharedHang } = await supabase
      .from('shared_hangs')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!sharedHang) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SHARED_HANG_NOT_FOUND',
            message: 'Shared hang not found',
          },
        },
        { status: 404 }
      )
    }

    // Check if already reacted with this type
    const { data: existing } = await supabase
      .from('hang_reactions')
      .select('id')
      .eq('shared_hang_id', params.id)
      .eq('user_id', user.id)
      .eq('reaction_type', body.reactionType)
      .is('deleted_at', null)
      .single()

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ALREADY_REACTED',
            message: 'You have already reacted with this type',
          },
        },
        { status: 400 }
      )
    }

    // Create reaction
    const { data: reaction, error } = await supabase
      .from('hang_reactions')
      .insert({
        shared_hang_id: params.id,
        user_id: user.id,
        reaction_type: body.reactionType,
        comment: body.comment,
      })
      .select()
      .single()

    if (error) throw error

    // Notify hang owner (if not self)
    if (sharedHang.user_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: sharedHang.user_id,
        type: 'hang_reaction',
        title: 'Someone reacted to your hang',
        message: `${user.display_name} ${body.reactionType}d your hang`,
        related_user_id: user.id,
        action_url: `/shared-hangs/${params.id}`,
        icon: getReactionEmoji(body.reactionType),
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        reactionId: reaction.id,
        reactionType: body.reactionType,
      },
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
```

---

## Group Schedule APIs

### POST /api/group-schedules

Create a new group schedule.

```typescript
// app/api/group-schedules/route.ts

const createGroupScheduleSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  participantIds: z.array(z.string().uuid()).min(1).max(10),
})

export async function POST(request: NextRequest) {
  try {
    await rateLimit(request, { max: 20, window: 60 })

    const user = await requireAuth(request)
    const body = await validateRequest(request, createGroupScheduleSchema)

    const supabase = createClient()

    // Verify all participants are friends
    const { data: connections } = await supabase
      .from('connections')
      .select('friend_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .in('friend_id', body.participantIds)

    const friendIds = new Set(connections?.map(c => c.friend_id) || [])

    const invalidIds = body.participantIds.filter(id => !friendIds.has(id))

    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARTICIPANTS',
            message: 'Some participants are not your friends',
            details: { invalidIds },
          },
        },
        { status: 400 }
      )
    }

    // Include user in participants
    const allParticipants = [user.id, ...body.participantIds]

    // Create group schedule
    const { data: groupSchedule, error } = await supabase
      .from('group_schedules')
      .insert({
        created_by: user.id,
        title: body.title,
        description: body.description,
        participant_ids: allParticipants,
        status: 'planning',
        current_participant_count: allParticipants.length,
      })
      .select()
      .single()

    if (error) throw error

    // Notify participants
    for (const participantId of body.participantIds) {
      await supabase.from('notifications').insert({
        user_id: participantId,
        type: 'group_schedule_invite',
        title: 'Group hangout invite',
        message: `${user.display_name} invited you to "${body.title}"`,
        related_user_id: user.id,
        action_url: `/group-schedules/${groupSchedule.id}`,
        icon: '📅',
      })
    }

    // Analyze common free times
    const commonTimes = await findCommonFreeTimes(allParticipants)

    return NextResponse.json({
      success: true,
      data: {
        groupScheduleId: groupSchedule.id,
        commonTimes,
      },
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
```

---

*Continuing in next section...*

Due to length constraints, the document continues with:
- User Discovery APIs
- Notification APIs
- Error Handling
- Rate Limiting
- API Documentation

Would you like me to continue with the remaining sections?
