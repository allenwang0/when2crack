# Analytics & Monitoring Deep Dive

**Document Version:** 1.0
**Last Updated:** 2026-05-11

---

## Table of Contents
1. [Observability Stack](#observability-stack)
2. [Application Monitoring](#application-monitoring)
3. [User Analytics](#user-analytics)
4. [Business Metrics](#business-metrics)
5. [Error Tracking](#error-tracking)
6. [Alerting Strategy](#alerting-strategy)
7. [Dashboard Design](#dashboard-design)
8. [Privacy Considerations](#privacy-considerations)

---

## Observability Stack

### Tools & Services

```
┌─────────────────────────────────────────┐
│         Application Layer                │
├─────────────────────────────────────────┤
│  • Vercel Analytics (Performance)        │
│  • Sentry (Error Tracking)              │
│  • PostHog (Product Analytics)          │
│  • Custom Events (Amplitude/Mixpanel)   │
├─────────────────────────────────────────┤
│         Database Layer                   │
├─────────────────────────────────────────┤
│  • Supabase Metrics (Query Performance) │
│  • pg_stat_statements (Slow Queries)    │
├─────────────────────────────────────────┤
│         Infrastructure Layer             │
├─────────────────────────────────────────┤
│  • Vercel Logs (Server Logs)           │
│  • Uptime Monitoring (UptimeRobot)      │
│  • Status Page (status.when2crack.com)  │
└─────────────────────────────────────────┘
```

---

## Application Monitoring

### Performance Monitoring

```typescript
// lib/monitoring/performance.ts

import { Analytics } from '@vercel/analytics'

export class PerformanceMonitor {
  /**
   * Track Web Vitals
   */
  static trackWebVitals() {
    if (typeof window === 'undefined') return

    // Core Web Vitals
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          this.trackMetric('LCP', entry.renderTime || entry.loadTime, 'ms')
        }
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] })

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'first-input') {
          this.trackMetric('FID', (entry as any).processingStart - entry.startTime, 'ms')
        }
      }
    }).observe({ entryTypes: ['first-input'] })

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          this.trackMetric('CLS', (entry as any).value, 'score')
        }
      }
    }).observe({ entryTypes: ['layout-shift'] })
  }

  /**
   * Track API call performance
   */
  static async trackAPICall<T>(
    endpoint: string,
    method: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now()
    let status = 'success'

    try {
      const result = await fn()
      return result
    } catch (error) {
      status = 'error'
      throw error
    } finally {
      const duration = performance.now() - start

      this.trackMetric('api_call', duration, 'ms', {
        endpoint,
        method,
        status,
      })

      // Alert on slow API calls
      if (duration > 1000) {
        console.warn(`Slow API call: ${endpoint} took ${duration}ms`)
      }
    }
  }

  /**
   * Track database query performance
   */
  static trackQuery(queryName: string, duration: number, rowCount?: number) {
    this.trackMetric('db_query', duration, 'ms', {
      query: queryName,
      rows: rowCount,
    })

    if (duration > 500) {
      console.warn(`Slow query: ${queryName} took ${duration}ms`)
    }
  }

  /**
   * Track recommendation generation performance
   */
  static trackRecommendationGeneration(
    userId: string,
    duration: number,
    recommendationCount: number
  ) {
    this.trackMetric('recommendation_generation', duration, 'ms', {
      userId,
      count: recommendationCount,
    })
  }

  /**
   * Generic metric tracking
   */
  private static trackMetric(
    name: string,
    value: number,
    unit: string,
    tags?: Record<string, any>
  ) {
    // Send to Vercel Analytics
    Analytics.track(name, {
      value,
      unit,
      ...tags,
      timestamp: new Date().toISOString(),
    })

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Metric] ${name}: ${value}${unit}`, tags)
    }
  }
}

// Usage examples
PerformanceMonitor.trackWebVitals()

const friends = await PerformanceMonitor.trackAPICall(
  '/api/connections',
  'GET',
  () => fetch('/api/connections').then(r => r.json())
)
```

### Custom Events Tracking

```typescript
// lib/analytics/events.ts

import * as analytics from '@/lib/analytics/provider' // PostHog, Mixpanel, etc.

export enum EventName {
  // Social Events
  FRIEND_REQUEST_SENT = 'friend_request_sent',
  FRIEND_REQUEST_ACCEPTED = 'friend_request_accepted',
  FRIEND_REQUEST_DECLINED = 'friend_request_declined',
  FRIEND_REMOVED = 'friend_removed',

  // Recommendation Events
  RECOMMENDATION_VIEWED = 'recommendation_viewed',
  RECOMMENDATION_ADDED = 'recommendation_added',
  RECOMMENDATION_DISMISSED = 'recommendation_dismissed',
  RECOMMENDATION_REFRESHED = 'recommendation_refreshed',

  // Activity Feed Events
  HANG_SHARED = 'hang_shared',
  HANG_REACTED = 'hang_reacted',
  FEED_VIEWED = 'feed_viewed',

  // Group Schedule Events
  GROUP_SCHEDULE_CREATED = 'group_schedule_created',
  GROUP_SCHEDULE_FINALIZED = 'group_schedule_finalized',

  // Onboarding
  ONBOARDING_STARTED = 'onboarding_started',
  ONBOARDING_COMPLETED = 'onboarding_completed',
  FIRST_ROSTER_ENTRY = 'first_roster_entry',
  FIRST_FRIEND_ADDED = 'first_friend_added',
}

interface EventProperties {
  userId?: string
  timestamp?: string
  [key: string]: any
}

export class Analytics {
  /**
   * Track an event
   */
  static track(event: EventName, properties?: EventProperties) {
    const enrichedProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
      platform: 'web',
      version: process.env.NEXT_PUBLIC_APP_VERSION,
    }

    // Send to analytics provider
    analytics.track(event, enrichedProperties)

    // Also log to database for custom analysis
    this.logEventToDatabase(event, enrichedProperties)
  }

  /**
   * Identify user
   */
  static identify(userId: string, traits?: Record<string, any>) {
    analytics.identify(userId, {
      ...traits,
      platform: 'web',
    })
  }

  /**
   * Track page view
   */
  static pageView(pageName: string, properties?: Record<string, any>) {
    analytics.page(pageName, {
      ...properties,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Log event to database for custom analysis
   */
  private static async logEventToDatabase(
    event: string,
    properties: EventProperties
  ) {
    try {
      const supabase = createClient()

      await supabase.from('analytics_events').insert({
        event_name: event,
        user_id: properties.userId,
        properties,
        created_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Failed to log event to database:', error)
    }
  }

  /**
   * Track funnel step
   */
  static trackFunnelStep(
    funnelName: string,
    step: number,
    stepName: string,
    properties?: Record<string, any>
  ) {
    this.track(EventName.ONBOARDING_STARTED, {
      funnel: funnelName,
      step,
      stepName,
      ...properties,
    })
  }
}

// Usage examples
Analytics.track(EventName.FRIEND_REQUEST_SENT, {
  friendId: 'user-123',
  source: 'search',
})

Analytics.track(EventName.RECOMMENDATION_ADDED, {
  recommendationId: 'rec-456',
  confidence: 0.92,
  source: 'friend_similar',
})

Analytics.trackFunnelStep('onboarding', 1, 'create_account', {
  method: 'google',
})
```

---

## User Analytics

### User Segmentation

```typescript
// lib/analytics/segments.ts

export enum UserSegment {
  NEW_USER = 'new_user',           // < 7 days
  ACTIVE_USER = 'active_user',     // Logged in within 7 days
  POWER_USER = 'power_user',       // > 20 roster entries, > 5 friends
  DORMANT_USER = 'dormant_user',   // No activity in 30 days
  CHURNED_USER = 'churned_user',   // No activity in 90 days
}

export async function identifyUserSegment(userId: string): Promise<UserSegment> {
  const supabase = createClient()

  // Get user data
  const [userProfile, rosterCount, friendCount, lastActivity] = await Promise.all([
    supabase.from('users').select('created_at').eq('id', userId).single(),
    supabase.from('roster').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase
      .from('connections')
      .select('id', { count: 'exact', head: true })
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted'),
    supabase
      .from('activity_log')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  const accountAge = Date.now() - new Date(userProfile.data!.created_at).getTime()
  const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24)

  const daysSinceActivity = lastActivity.data
    ? (Date.now() - new Date(lastActivity.data.created_at).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity

  // Segment logic
  if (daysSinceActivity > 90) {
    return UserSegment.CHURNED_USER
  } else if (daysSinceActivity > 30) {
    return UserSegment.DORMANT_USER
  } else if (daysSinceCreation < 7) {
    return UserSegment.NEW_USER
  } else if ((rosterCount.count || 0) > 20 && (friendCount.count || 0) > 5) {
    return UserSegment.POWER_USER
  } else {
    return UserSegment.ACTIVE_USER
  }
}

// Track segment changes
export async function trackUserSegmentChange(userId: string) {
  const newSegment = await identifyUserSegment(userId)

  Analytics.identify(userId, {
    segment: newSegment,
    segmentUpdatedAt: new Date().toISOString(),
  })
}
```

### Cohort Analysis

```sql
-- Retention cohorts by signup month

WITH cohorts AS (
  SELECT
    id as user_id,
    DATE_TRUNC('month', created_at) as cohort_month
  FROM users
),
activity AS (
  SELECT
    user_id,
    DATE_TRUNC('month', created_at) as activity_month
  FROM activity_log
  GROUP BY user_id, activity_month
)
SELECT
  c.cohort_month,
  COUNT(DISTINCT c.user_id) as cohort_size,
  COUNT(DISTINCT CASE WHEN a.activity_month = c.cohort_month THEN c.user_id END) as month_0,
  COUNT(DISTINCT CASE WHEN a.activity_month = c.cohort_month + INTERVAL '1 month' THEN c.user_id END) as month_1,
  COUNT(DISTINCT CASE WHEN a.activity_month = c.cohort_month + INTERVAL '2 months' THEN c.user_id END) as month_2,
  COUNT(DISTINCT CASE WHEN a.activity_month = c.cohort_month + INTERVAL '3 months' THEN c.user_id END) as month_3
FROM cohorts c
LEFT JOIN activity a ON c.user_id = a.user_id
GROUP BY c.cohort_month
ORDER BY c.cohort_month DESC;
```

---

## Business Metrics

### Key Performance Indicators (KPIs)

```typescript
// lib/analytics/kpis.ts

export interface SocialKPIs {
  // User Engagement
  dailyActiveUsers: number
  weeklyActiveUsers: number
  monthlyActiveUsers: number
  averageSessionDuration: number // minutes

  // Social Features
  totalConnections: number
  newConnectionsToday: number
  averageFriendsPerUser: number
  connectionAcceptanceRate: number // %

  // Recommendations
  recommendationsGenerated: number
  recommendationsViewed: number
  recommendationsAccepted: number
  recommendationAcceptanceRate: number // %
  averageConfidenceScore: number

  // Activity Feed
  hangsShared: number
  feedEngagementRate: number // % of users who react
  averageReactionsPerPost: number

  // Growth
  newSignups: number
  conversionRate: number // % of visitors who sign up
  viralCoefficient: number // avg invites per user

  // Retention
  dayOneRetention: number // %
  daySevenRetention: number // %
  dayThirtyRetention: number // %
}

export async function calculateKPIs(
  startDate: Date,
  endDate: Date
): Promise<SocialKPIs> {
  const supabase = createClient()

  // Daily Active Users
  const { count: dau } = await supabase
    .from('activity_log')
    .select('user_id', { count: 'exact', head: true })
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  // Weekly Active Users
  const weekAgo = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
  const { count: wau } = await supabase
    .from('activity_log')
    .select('user_id', { count: 'exact', head: true })
    .gte('created_at', weekAgo.toISOString())
    .lte('created_at', endDate.toISOString())

  // Total Connections
  const { count: totalConnections } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'accepted')

  // New Connections Today
  const { count: newConnectionsToday } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'accepted')
    .gte('accepted_at', startDate.toISOString())

  // Recommendation Metrics
  const { data: recommendationMetrics } = await supabase
    .from('recommendations')
    .select('viewed, acted_on, action_type, confidence_score')
    .gte('created_at', startDate.toISOString())

  const recommendationsGenerated = recommendationMetrics?.length || 0
  const recommendationsViewed = recommendationMetrics?.filter(r => r.viewed).length || 0
  const recommendationsAccepted = recommendationMetrics?.filter(r => r.action_type === 'added').length || 0

  return {
    dailyActiveUsers: dau || 0,
    weeklyActiveUsers: wau || 0,
    monthlyActiveUsers: 0, // Calculate similarly
    averageSessionDuration: 0, // Calculate from session data
    totalConnections: totalConnections || 0,
    newConnectionsToday: newConnectionsToday || 0,
    averageFriendsPerUser: 0, // Calculate
    connectionAcceptanceRate: 0, // Calculate
    recommendationsGenerated,
    recommendationsViewed,
    recommendationsAccepted,
    recommendationAcceptanceRate: (recommendationsAccepted / recommendationsGenerated) * 100,
    averageConfidenceScore: 0, // Calculate
    hangsShared: 0, // Calculate
    feedEngagementRate: 0, // Calculate
    averageReactionsPerPost: 0, // Calculate
    newSignups: 0, // Calculate
    conversionRate: 0, // Calculate
    viralCoefficient: 0, // Calculate
    dayOneRetention: 0, // Calculate
    daySevenRetention: 0, // Calculate
    dayThirtyRetention: 0, // Calculate
  }
}

// Scheduled job to calculate and store KPIs
export async function calculateAndStoreKPIs() {
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

  const kpis = await calculateKPIs(yesterday, today)

  const supabase = createClient()

  await supabase.from('daily_kpis').insert({
    date: today.toISOString().split('T')[0],
    metrics: kpis,
    created_at: new Date().toISOString(),
  })

  console.log('KPIs calculated and stored:', kpis)
}
```

### A/B Test Tracking

```typescript
// lib/analytics/abtest.ts

export enum Experiment {
  RECOMMENDATION_ALGORITHM = 'recommendation_algorithm_v2',
  FRIEND_REQUEST_UI = 'friend_request_ui_v2',
  ONBOARDING_FLOW = 'onboarding_flow_v2',
}

export interface ExperimentVariant {
  name: string
  weight: number // 0-1, probability of assignment
}

export class ABTestService {
  /**
   * Assign user to experiment variant
   */
  static assignVariant(
    userId: string,
    experiment: Experiment,
    variants: ExperimentVariant[]
  ): string {
    // Consistent hashing for stable assignment
    const hash = this.hashUserId(userId, experiment)
    const random = hash / Number.MAX_SAFE_INTEGER

    let cumulative = 0
    for (const variant of variants) {
      cumulative += variant.weight
      if (random < cumulative) {
        return variant.name
      }
    }

    return variants[variants.length - 1].name
  }

  /**
   * Track experiment exposure
   */
  static trackExposure(userId: string, experiment: Experiment, variant: string) {
    Analytics.track('experiment_exposed', {
      userId,
      experiment,
      variant,
    })

    // Store in database
    const supabase = createClient()
    supabase.from('experiment_assignments').upsert({
      user_id: userId,
      experiment,
      variant,
      assigned_at: new Date().toISOString(),
    })
  }

  /**
   * Track experiment outcome
   */
  static trackOutcome(
    userId: string,
    experiment: Experiment,
    variant: string,
    outcome: string,
    value?: number
  ) {
    Analytics.track('experiment_outcome', {
      userId,
      experiment,
      variant,
      outcome,
      value,
    })
  }

  private static hashUserId(userId: string, experiment: string): number {
    const combined = `${userId}-${experiment}`
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }
}

// Usage
const variant = ABTestService.assignVariant(
  userId,
  Experiment.RECOMMENDATION_ALGORITHM,
  [
    { name: 'control', weight: 0.5 },
    { name: 'variant_a', weight: 0.5 },
  ]
)

ABTestService.trackExposure(userId, Experiment.RECOMMENDATION_ALGORITHM, variant)

// Later, track outcome
ABTestService.trackOutcome(
  userId,
  Experiment.RECOMMENDATION_ALGORITHM,
  variant,
  'recommendation_accepted',
  1
)
```

---

## Error Tracking

### Sentry Integration

```typescript
// lib/monitoring/sentry.ts

import * as Sentry from '@sentry/nextjs'

export function initializeSentry() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1, // 10% of transactions

    // Error filtering
    beforeSend(event, hint) {
      // Filter out known non-critical errors
      if (event.exception) {
        const error = hint.originalException as Error
        if (error.message.includes('ResizeObserver loop')) {
          return null // Ignore browser quirk
        }
      }

      // Add user context
      if (event.user && !event.user.id) {
        event.user.id = 'anonymous'
      }

      return event
    },

    // Integrations
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true, // Privacy: mask all text
        blockAllMedia: true, // Privacy: block all images/video
      }),
    ],
  })
}

// Capture custom errors
export function captureError(
  error: Error,
  context?: Record<string, any>
) {
  Sentry.captureException(error, {
    extra: context,
  })

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error captured:', error, context)
  }
}

// Track error boundaries
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={<ErrorFallback />}
      showDialog
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}

function ErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
        <p className="text-gray-600 mb-4">
          We've been notified and are working on a fix.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Reload Page
        </button>
      </div>
    </div>
  )
}
```

### Error Rate Monitoring

```sql
-- Calculate error rate by endpoint

SELECT
  details->>'endpoint' as endpoint,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE action_type LIKE '%error%') as errors,
  (COUNT(*) FILTER (WHERE action_type LIKE '%error%')::float / COUNT(*)) * 100 as error_rate
FROM activity_log
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND action_category = 'api'
GROUP BY details->>'endpoint'
ORDER BY error_rate DESC;
```

---

## Alerting Strategy

### Alert Configuration

```typescript
// lib/monitoring/alerts.ts

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface Alert {
  name: string
  severity: AlertSeverity
  condition: () => Promise<boolean>
  message: string
  channels: ('email' | 'slack' | 'pagerduty')[]
}

export const ALERTS: Alert[] = [
  {
    name: 'high_error_rate',
    severity: AlertSeverity.CRITICAL,
    condition: async () => {
      // Check if error rate > 5% in last 5 minutes
      const errorRate = await getErrorRate(5)
      return errorRate > 0.05
    },
    message: 'Error rate above 5% in last 5 minutes',
    channels: ['email', 'slack', 'pagerduty'],
  },

  {
    name: 'slow_api_response',
    severity: AlertSeverity.HIGH,
    condition: async () => {
      // Check if p95 API response time > 1s
      const p95 = await getP95ResponseTime(5)
      return p95 > 1000
    },
    message: 'API p95 response time above 1 second',
    channels: ['email', 'slack'],
  },

  {
    name: 'recommendation_generation_failures',
    severity: AlertSeverity.HIGH,
    condition: async () => {
      // Check if recommendation generation failure rate > 10%
      const failureRate = await getRecommendationFailureRate(60)
      return failureRate > 0.1
    },
    message: 'Recommendation generation failure rate above 10%',
    channels: ['email', 'slack'],
  },

  {
    name: 'database_connection_pool_exhausted',
    severity: AlertSeverity.CRITICAL,
    condition: async () => {
      const poolUsage = await getDatabasePoolUsage()
      return poolUsage > 0.9
    },
    message: 'Database connection pool usage above 90%',
    channels: ['email', 'pagerduty'],
  },

  {
    name: 'low_recommendation_acceptance_rate',
    severity: AlertSeverity.MEDIUM,
    condition: async () => {
      const acceptanceRate = await getRecommendationAcceptanceRate(24 * 60)
      return acceptanceRate < 0.10 // Below 10%
    },
    message: 'Recommendation acceptance rate below 10% in last 24 hours',
    channels: ['email'],
  },
]

// Alert checker (run every 5 minutes)
export async function checkAlerts() {
  for (const alert of ALERTS) {
    try {
      const triggered = await alert.condition()

      if (triggered) {
        await sendAlert(alert)
      }
    } catch (error) {
      console.error(`Error checking alert ${alert.name}:`, error)
    }
  }
}

async function sendAlert(alert: Alert) {
  console.log(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`)

  // Send to configured channels
  if (alert.channels.includes('email')) {
    await sendEmailAlert(alert)
  }

  if (alert.channels.includes('slack')) {
    await sendSlackAlert(alert)
  }

  if (alert.channels.includes('pagerduty')) {
    await sendPagerDutyAlert(alert)
  }

  // Log alert to database
  const supabase = createClient()
  await supabase.from('alerts_log').insert({
    alert_name: alert.name,
    severity: alert.severity,
    message: alert.message,
    created_at: new Date().toISOString(),
  })
}
```

### Slack Integration

```typescript
// lib/monitoring/slack.ts

interface SlackMessage {
  text: string
  blocks?: any[]
}

export async function sendSlackAlert(alert: Alert) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    console.warn('Slack webhook not configured')
    return
  }

  const color = {
    [AlertSeverity.CRITICAL]: '#FF0000',
    [AlertSeverity.HIGH]: '#FF9900',
    [AlertSeverity.MEDIUM]: '#FFCC00',
    [AlertSeverity.LOW]: '#36A64F',
  }[alert.severity]

  const message: SlackMessage = {
    text: `*[${alert.severity.toUpperCase()}]* ${alert.message}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*[${alert.severity.toUpperCase()}]* ${alert.message}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Alert: \`${alert.name}\` | Time: ${new Date().toISOString()}`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Dashboard',
            },
            url: 'https://when2crack.com/admin/dashboard',
          },
        ],
      },
    ],
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  })
}
```

---

## Dashboard Design

### Admin Dashboard

```typescript
// app/admin/dashboard/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { LineChart, BarChart, PieChart } from '@/components/charts'

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    const response = await fetch('/api/admin/kpis')
    const data = await response.json()
    setKpis(data)
    setLoading(false)
  }

  if (loading) {
    return <div>Loading dashboard...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">When2Crack Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Daily Active Users"
          value={kpis.dailyActiveUsers}
          change={+5.2}
          trend="up"
        />
        <KPICard
          title="New Connections"
          value={kpis.newConnectionsToday}
          change={+12.1}
          trend="up"
        />
        <KPICard
          title="Recommendation Acceptance"
          value={`${kpis.recommendationAcceptanceRate.toFixed(1)}%`}
          change={-2.3}
          trend="down"
        />
        <KPICard
          title="Feed Engagement"
          value={`${kpis.feedEngagementRate.toFixed(1)}%`}
          change={+0.8}
          trend="up"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">User Growth</h2>
          <LineChart
            data={kpis.userGrowthData}
            xKey="date"
            yKey="users"
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Recommendation Performance</h2>
          <BarChart
            data={kpis.recommendationData}
            xKey="confidence"
            yKey="acceptanceRate"
          />
        </div>
      </div>

      {/* Tables */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Alerts</h2>
        <AlertsTable alerts={kpis.recentAlerts} />
      </div>
    </div>
  )
}

function KPICard({ title, value, change, trend }: any) {
  const trendColor = trend === 'up' ? 'text-green-600' : 'text-red-600'
  const trendIcon = trend === 'up' ? '↑' : '↓'

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-sm text-gray-600 mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold">{value}</p>
        <p className={`text-sm ${trendColor}`}>
          {trendIcon} {Math.abs(change)}%
        </p>
      </div>
    </div>
  )
}
```

---

## Privacy Considerations

### Anonymization in Analytics

```typescript
// lib/analytics/privacy.ts

/**
 * Hash user ID for analytics
 */
export function hashUserId(userId: string): string {
  // Use consistent hashing for analytics while preserving privacy
  const hash = crypto.createHash('sha256')
  hash.update(userId + process.env.ANALYTICS_SALT!)
  return hash.digest('hex')
}

/**
 * Remove PII before sending to analytics
 */
export function sanitizeEventProperties(properties: Record<string, any>): Record<string, any> {
  const sanitized = { ...properties }

  // Remove potentially sensitive fields
  delete sanitized.email
  delete sanitized.phone
  delete sanitized.fullName
  delete sanitized.ipAddress

  // Hash user IDs
  if (sanitized.userId) {
    sanitized.userId = hashUserId(sanitized.userId)
  }

  if (sanitized.friendId) {
    sanitized.friendId = hashUserId(sanitized.friendId)
  }

  return sanitized
}

// Use in tracking
Analytics.track(EventName.FRIEND_REQUEST_SENT, sanitizeEventProperties({
  userId: user.id,
  friendId: friend.id,
  source: 'search',
}))
```

### GDPR Compliance

```typescript
// Users can export or delete their analytics data

export async function exportUserAnalytics(userId: string) {
  const supabase = createClient()

  const { data: events } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return {
    events,
    exportedAt: new Date().toISOString(),
  }
}

export async function deleteUserAnalytics(userId: string) {
  const supabase = createClient()

  await supabase
    .from('analytics_events')
    .delete()
    .eq('user_id', userId)
}
```

---

**Monitoring Checklist:**

- [ ] Application performance monitoring configured
- [ ] Error tracking (Sentry) set up
- [ ] User analytics implemented
- [ ] Business KPIs tracked
- [ ] A/B testing framework in place
- [ ] Alerting configured (critical metrics)
- [ ] Admin dashboard built
- [ ] Privacy-compliant analytics
- [ ] Logging strategy implemented
- [ ] Uptime monitoring configured

---

*End of Analytics & Monitoring Deep Dive*
