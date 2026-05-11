# Performance & Scalability Deep Dive

**Document Version:** 1.0
**Last Updated:** 2026-05-11

---

## Table of Contents
1. [Performance Goals](#performance-goals)
2. [Database Optimization](#database-optimization)
3. [Caching Strategy](#caching-strategy)
4. [API Optimization](#api-optimization)
5. [Frontend Performance](#frontend-performance)
6. [Scalability Architecture](#scalability-architecture)
7. [Load Testing](#load-testing)
8. [Monitoring & Profiling](#monitoring--profiling)

---

## Performance Goals

### Target Metrics

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Time to Interactive (TTI) | < 2s | < 4s |
| First Contentful Paint (FCP) | < 1s | < 2s |
| Largest Contentful Paint (LCP) | < 2.5s | < 4s |
| API Response Time (p95) | < 200ms | < 500ms |
| Database Query Time (p95) | < 50ms | < 150ms |
| Recommendation Generation | < 5s | < 15s |
| Feed Load Time | < 300ms | < 800ms |
| Friend List Load | < 150ms | < 400ms |

### User Experience Standards

**Core User Flows:**
1. **Login to Feed**: < 3 seconds total
2. **View Recommendations**: < 2 seconds
3. **Add Friend**: < 1 second
4. **Load Activity Feed**: < 1 second (first 20 items)
5. **Search Users**: < 500ms

---

## Database Optimization

### Query Optimization

#### 1. Index Strategy

```sql
-- Critical indexes for social features

-- Connection lookups (most frequent)
CREATE INDEX idx_connections_user_status_active
ON connections(user_id, status)
WHERE deleted_at IS NULL;

CREATE INDEX idx_connections_friend_status_active
ON connections(friend_id, status)
WHERE deleted_at IS NULL;

-- Composite index for feed queries
CREATE INDEX idx_shared_hangs_feed_lookup
ON shared_hangs(visibility, created_at DESC, user_id)
WHERE deleted_at IS NULL AND is_hidden = FALSE;

-- Recommendation queries
CREATE INDEX idx_recommendations_active_user
ON recommendations(user_id, expires_at, confidence_score DESC)
WHERE viewed = FALSE AND expires_at > NOW();

-- Notification queries
CREATE INDEX idx_notifications_unread_user
ON notifications(user_id, created_at DESC)
WHERE read = FALSE AND dismissed = FALSE;

-- Array containment for group schedules
CREATE INDEX idx_group_schedules_participants_gin
ON group_schedules USING GIN(participant_ids);
```

#### 2. Query Analysis

```sql
-- Analyze slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%shared_hangs%'
  OR query LIKE '%connections%'
  OR query LIKE '%recommendations%'
ORDER BY mean_time DESC
LIMIT 20;

-- Find missing indexes
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1
ORDER BY n_distinct DESC;
```

#### 3. Optimized Friend Feed Query

```sql
-- Before optimization (N+1 query problem)
-- SELECT * FROM shared_hangs WHERE user_id IN (friend_ids)
-- Then for each hang: SELECT * FROM hang_reactions WHERE shared_hang_id = ?

-- After optimization (single query with aggregation)
WITH friend_ids AS (
  SELECT CASE
    WHEN user_id = $1 THEN friend_id
    ELSE user_id
  END as friend_id
  FROM connections
  WHERE (user_id = $1 OR friend_id = $1)
    AND status = 'accepted'
    AND deleted_at IS NULL
)
SELECT
  sh.*,
  u.display_name,
  u.username,
  u.avatar_url,
  r.name as person_name,
  COUNT(DISTINCT hr.id) FILTER (WHERE hr.reaction_type = 'like') as like_count,
  COUNT(DISTINCT hr.id) FILTER (WHERE hr.reaction_type = 'love') as love_count,
  COUNT(DISTINCT hr.id) FILTER (WHERE hr.reaction_type = 'congrats') as congrats_count,
  EXISTS(
    SELECT 1 FROM hang_reactions
    WHERE shared_hang_id = sh.id AND user_id = $1
  ) as user_reacted
FROM shared_hangs sh
JOIN friend_ids fi ON sh.user_id = fi.friend_id
JOIN users u ON u.id = sh.user_id
JOIN roster r ON r.id = sh.roster_id
LEFT JOIN hang_reactions hr ON hr.shared_hang_id = sh.id AND hr.deleted_at IS NULL
WHERE sh.visibility = 'friends'
  AND sh.deleted_at IS NULL
  AND sh.is_hidden = FALSE
GROUP BY sh.id, u.display_name, u.username, u.avatar_url, r.name
ORDER BY sh.created_at DESC
LIMIT 20 OFFSET $2;
```

### Connection Pooling

```typescript
// lib/database/pool.ts

import { createClient } from '@supabase/supabase-js'

// Configure connection pool
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      'x-application-name': 'when2crack',
    },
  },
})

// For high-traffic endpoints, use pgBouncer
// Connection string: postgres://user:pass@host:6432/db?pgbouncer=true
```

### Materialized Views

```sql
-- Materialized view for user statistics (refreshed daily)
CREATE MATERIALIZED VIEW user_stats_mv AS
SELECT
  u.id as user_id,
  COUNT(DISTINCT r.id) as roster_count,
  AVG(r.attraction_score) as avg_attraction,
  AVG(r.personality_score) as avg_personality,
  AVG(r.reliability_score) as avg_reliability,
  COUNT(DISTINCT h.id) as total_hangs,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'accepted') as friend_count,
  MAX(h.hang_date) as last_hang_date
FROM users u
LEFT JOIN roster r ON r.user_id = u.id
LEFT JOIN hangs h ON h.user_id = u.id
LEFT JOIN connections c ON (c.user_id = u.id OR c.friend_id = u.id)
  AND c.deleted_at IS NULL
GROUP BY u.id;

CREATE UNIQUE INDEX ON user_stats_mv(user_id);

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_user_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats_mv;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh (via cron job or Supabase Functions)
SELECT cron.schedule(
  'refresh-user-stats',
  '0 2 * * *', -- 2 AM daily
  $$SELECT refresh_user_stats()$$
);
```

---

## Caching Strategy

### Multi-Layer Caching

```
┌─────────────────────────────────────┐
│   Browser Cache (Service Worker)    │  TTL: varies
├─────────────────────────────────────┤
│   CDN Cache (Cloudflare)            │  TTL: 1 hour
├─────────────────────────────────────┤
│   Next.js Cache (ISR/SSR)           │  TTL: 60s revalidate
├─────────────────────────────────────┤
│   Redis Cache (Application)         │  TTL: 5-60 minutes
├─────────────────────────────────────┤
│   PostgreSQL (Source of Truth)      │  No cache
└─────────────────────────────────────┘
```

### Redis Caching

```typescript
// lib/cache/redis.ts

import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export class CacheService {
  // Friend list caching
  async getFriends(userId: string): Promise<Friend[] | null> {
    const cacheKey = `friends:${userId}`
    const cached = await redis.get<Friend[]>(cacheKey)

    if (cached) {
      return cached
    }

    return null
  }

  async setFriends(userId: string, friends: Friend[], ttl: number = 300) {
    const cacheKey = `friends:${userId}`
    await redis.setex(cacheKey, ttl, friends)
  }

  async invalidateFriends(userId: string) {
    const cacheKey = `friends:${userId}`
    await redis.del(cacheKey)
  }

  // Activity feed caching
  async getFeed(userId: string, page: number = 0): Promise<FeedItem[] | null> {
    const cacheKey = `feed:${userId}:${page}`
    return await redis.get<FeedItem[]>(cacheKey)
  }

  async setFeed(userId: string, page: number, items: FeedItem[], ttl: number = 300) {
    const cacheKey = `feed:${userId}:${page}`
    await redis.setex(cacheKey, ttl, items)
  }

  // User profile caching
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const cacheKey = `user:${userId}:profile`
    return await redis.get<UserProfile>(cacheKey)
  }

  async setUserProfile(userId: string, profile: UserProfile, ttl: number = 600) {
    const cacheKey = `user:${userId}:profile`
    await redis.setex(cacheKey, ttl, profile)
  }

  // Recommendation caching
  async getRecommendations(userId: string): Promise<Recommendation[] | null> {
    const cacheKey = `recommendations:${userId}`
    return await redis.get<Recommendation[]>(cacheKey)
  }

  async setRecommendations(userId: string, recs: Recommendation[], ttl: number = 3600) {
    const cacheKey = `recommendations:${userId}`
    await redis.setex(cacheKey, ttl, recs)
  }

  // Cache invalidation on updates
  async invalidateUserCache(userId: string) {
    const pattern = `*:${userId}:*`
    // In production, use SCAN instead of KEYS for large datasets
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }
}
```

### Cache Warming

```typescript
// lib/jobs/cacheWarming.ts

import { CacheService } from '@/lib/cache/redis'
import { createClient } from '@/lib/supabase/server'

export async function warmCacheForActiveUsers() {
  const supabase = createClient()
  const cache = new CacheService()

  // Get active users (logged in within last 24 hours)
  const { data: activeUsers } = await supabase
    .from('users')
    .select('id')
    .gte('last_sign_in_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if (!activeUsers) return

  console.log(`Warming cache for ${activeUsers.length} active users`)

  // Warm cache in batches
  const batchSize = 50
  for (let i = 0; i < activeUsers.length; i += batchSize) {
    const batch = activeUsers.slice(i, i + batchSize)

    await Promise.all(
      batch.map(async (user) => {
        try {
          // Warm friends cache
          const friends = await getFriends(user.id)
          await cache.setFriends(user.id, friends)

          // Warm feed cache
          const feed = await getFeedForUser(user.id, 0)
          await cache.setFeed(user.id, 0, feed)

          // Warm recommendations cache
          const recommendations = await getRecommendationsForUser(user.id)
          await cache.setRecommendations(user.id, recommendations)
        } catch (error) {
          console.error(`Error warming cache for user ${user.id}:`, error)
        }
      })
    )

    // Brief pause between batches
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  console.log('Cache warming complete')
}

// Run cache warming daily at 1 AM
// Schedule via cron or Vercel Cron Jobs
```

---

## API Optimization

### Request Batching

```typescript
// lib/api/batching.ts

interface BatchRequest {
  id: string
  endpoint: string
  params: any
}

interface BatchResponse {
  id: string
  data: any
  error?: string
}

export async function batchAPIRequests(
  requests: BatchRequest[]
): Promise<BatchResponse[]> {
  // Group by endpoint
  const grouped = requests.reduce((acc, req) => {
    if (!acc[req.endpoint]) acc[req.endpoint] = []
    acc[req.endpoint].push(req)
    return acc
  }, {} as Record<string, BatchRequest[]>)

  // Execute all groups in parallel
  const results = await Promise.all(
    Object.entries(grouped).map(async ([endpoint, reqs]) => {
      try {
        // Make single batch request to endpoint
        const response = await fetch(`/api/${endpoint}/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: reqs.map((r) => ({ id: r.id, params: r.params })),
          }),
        })

        const data = await response.json()
        return data.results as BatchResponse[]
      } catch (error) {
        // Return errors for all requests in this batch
        return reqs.map((r) => ({
          id: r.id,
          data: null,
          error: 'Batch request failed',
        }))
      }
    })
  )

  return results.flat()
}

// Usage example
const requests = [
  { id: '1', endpoint: 'users', params: { id: 'user1' } },
  { id: '2', endpoint: 'users', params: { id: 'user2' } },
  { id: '3', endpoint: 'roster', params: { userId: 'user1' } },
]

const responses = await batchAPIRequests(requests)
```

### Pagination Optimization

```typescript
// Cursor-based pagination (better than offset for large datasets)
interface CursorPaginationParams {
  limit: number
  cursor?: string // last item's ID or timestamp
}

async function getPaginatedFeed(
  userId: string,
  params: CursorPaginationParams
): Promise<{
  items: FeedItem[]
  nextCursor?: string
  hasMore: boolean
}> {
  const supabase = createClient()

  let query = supabase
    .from('shared_hangs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(params.limit + 1) // Fetch one extra to check if there's more

  if (params.cursor) {
    // Cursor is the timestamp of the last item
    query = query.lt('created_at', params.cursor)
  }

  const { data, error } = await query

  if (error) throw error

  const hasMore = data.length > params.limit
  const items = hasMore ? data.slice(0, -1) : data

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1].created_at : undefined,
    hasMore,
  }
}
```

---

## Frontend Performance

### Code Splitting

```typescript
// app/(app)/friends/page.tsx

import dynamic from 'next/dynamic'

// Lazy load heavy components
const FriendList = dynamic(() => import('@/components/friends/FriendList'), {
  loading: () => <FriendListSkeleton />,
  ssr: false, // Don't server-render if not needed
})

const AddFriendModal = dynamic(
  () => import('@/components/friends/AddFriendModal'),
  {
    loading: () => <div>Loading...</div>,
    ssr: false,
  }
)

export default function FriendsPage() {
  return (
    <div>
      <FriendList />
    </div>
  )
}
```

### Image Optimization

```typescript
// components/social-shared/SocialAvatar.tsx

import Image from 'next/image'

interface SocialAvatarProps {
  src: string | null
  name: string
  size: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
}

export function SocialAvatar({ src, name, size }: SocialAvatarProps) {
  const dimension = sizes[size]

  if (!src) {
    // Return initials avatar
    return <div className={`avatar-${size}`}>{getInitials(name)}</div>
  }

  return (
    <Image
      src={src}
      alt={name}
      width={dimension}
      height={dimension}
      className="rounded-full"
      loading="lazy"
      placeholder="blur"
      blurDataURL={getBlurDataURL()} // Low-quality placeholder
      sizes={`${dimension}px`}
    />
  )
}
```

### Virtual Scrolling

```typescript
// components/activity/ActivityFeed.tsx

import { useVirtualizer } from '@tanstack/react-virtual'

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated item height
    overscan: 5, // Render 5 extra items above/below viewport
  })

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ActivityCard item={items[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Bundle Size Optimization

```javascript
// next.config.js

module.exports = {
  // Analyze bundle size
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk for node_modules
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Common chunk for shared code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      }
    }

    return config
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
  },

  // Compress output
  compress: true,

  // Enable SWC minification
  swcMinify: true,
}
```

---

## Scalability Architecture

### Horizontal Scaling

```
                    ┌─────────────┐
                    │   Load      │
                    │  Balancer   │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐    ┌─────▼─────┐   ┌─────▼─────┐
    │  App      │    │  App      │   │  App      │
    │ Instance 1│    │ Instance 2│   │ Instance 3│
    └─────┬─────┘    └─────┬─────┘   └─────┬─────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
                  ┌────────▼────────┐
                  │  Redis Cache    │
                  └────────┬────────┘
                           │
                  ┌────────▼────────┐
                  │   PostgreSQL    │
                  │   (Primary +    │
                  │   Replicas)     │
                  └─────────────────┘
```

### Database Scaling

**Read Replicas:**
```typescript
// lib/database/replication.ts

const PRIMARY_URL = process.env.DATABASE_URL!
const REPLICA_URL = process.env.DATABASE_REPLICA_URL!

export function getPrimaryClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, PRIMARY_URL)
}

export function getReplicaClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, REPLICA_URL)
}

// Use replica for read-only operations
export async function getFeed(userId: string) {
  const replica = getReplicaClient()

  const { data } = await replica
    .from('shared_hangs')
    .select('*')
    .eq('user_id', userId)

  return data
}

// Use primary for writes
export async function createHang(hangData: HangInsert) {
  const primary = getPrimaryClient()

  const { data } = await primary.from('hangs').insert(hangData).select()

  return data
}
```

### Recommendation Generation Scaling

```typescript
// Use Supabase Edge Functions for background processing

// supabase/functions/generate-recommendations/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { userId, priority } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Generate recommendations (heavy computation)
  const recommendations = await generateRecommendations(userId)

  // Store in database
  await supabase.from('recommendations').insert(recommendations)

  return new Response(
    JSON.stringify({ success: true, count: recommendations.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})

// Invoke from application
async function triggerRecommendationGeneration(userId: string) {
  await supabase.functions.invoke('generate-recommendations', {
    body: { userId, priority: 'normal' },
  })
}
```

---

## Load Testing

### k6 Load Test Script

```javascript
// scripts/loadtest.js

import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp up to 50 users
    { duration: '1m', target: 100 }, // Stay at 100 users
    { duration: '30s', target: 200 }, // Ramp to 200 users
    { duration: '1m', target: 200 }, // Stay at 200
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'], // Error rate under 1%
  },
}

const BASE_URL = 'https://when2crack.com'

export default function () {
  // Test friend list endpoint
  const friendsRes = http.get(`${BASE_URL}/api/connections`, {
    headers: {
      Authorization: `Bearer ${__ENV.TEST_TOKEN}`,
    },
  })

  check(friendsRes, {
    'friends loaded': (r) => r.status === 200,
    'friends response time OK': (r) => r.timings.duration < 300,
  })

  sleep(1)

  // Test feed endpoint
  const feedRes = http.get(`${BASE_URL}/api/feed?limit=20`, {
    headers: {
      Authorization: `Bearer ${__ENV.TEST_TOKEN}`,
    },
  })

  check(feedRes, {
    'feed loaded': (r) => r.status === 200,
    'feed response time OK': (r) => r.timings.duration < 500,
  })

  sleep(2)

  // Test recommendations
  const recsRes = http.get(`${BASE_URL}/api/recommendations?limit=10`, {
    headers: {
      Authorization: `Bearer ${__ENV.TEST_TOKEN}`,
    },
  })

  check(recsRes, {
    'recommendations loaded': (r) => r.status === 200,
  })

  sleep(3)
}
```

**Run load test:**
```bash
k6 run scripts/loadtest.js
```

---

## Monitoring & Profiling

### Performance Monitoring

```typescript
// lib/monitoring/performance.ts

import { Analytics } from '@vercel/analytics'

export function trackPerformance(metric: string, value: number, tags?: Record<string, string>) {
  // Send to analytics
  Analytics.track(metric, {
    value,
    ...tags,
  })

  // Log slow operations
  if (metric.includes('duration') && value > 1000) {
    console.warn(`Slow operation detected: ${metric} took ${value}ms`, tags)
  }
}

// Track API response time
export async function measureAPICall<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now()

  try {
    const result = await fn()
    const duration = performance.now() - start

    trackPerformance(`api.${name}.duration`, duration, {
      status: 'success',
    })

    return result
  } catch (error) {
    const duration = performance.now() - start

    trackPerformance(`api.${name}.duration`, duration, {
      status: 'error',
    })

    throw error
  }
}

// Usage
const friends = await measureAPICall('getFriends', () => getFriends(userId))
```

### Database Query Profiling

```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 100; -- Log queries over 100ms
ALTER SYSTEM SET log_statement = 'all';

-- Reload configuration
SELECT pg_reload_conf();

-- Monitor slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time,
  stddev_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 20;
```

---

**Performance Optimization Checklist:**

- [ ] Database indexes created for all frequent queries
- [ ] Connection pooling configured
- [ ] Redis caching implemented for hot data
- [ ] API pagination using cursors
- [ ] Frontend code splitting enabled
- [ ] Images optimized (WebP/AVIF)
- [ ] Virtual scrolling for long lists
- [ ] CDN configured for static assets
- [ ] Gzip/Brotli compression enabled
- [ ] Load testing completed
- [ ] Performance monitoring in place
- [ ] Database query profiling enabled
- [ ] Cache warming for active users
- [ ] Read replicas configured (if needed)
- [ ] Background jobs for heavy computation

---

*End of Performance & Scalability Deep Dive*
