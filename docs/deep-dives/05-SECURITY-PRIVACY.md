# Security & Privacy Deep Dive

**Document Version:** 1.0
**Last Updated:** 2026-05-11

---

## Table of Contents
1. [Security Architecture](#security-architecture)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [Privacy Controls](#privacy-controls)
5. [Attack Prevention](#attack-prevention)
6. [Audit & Compliance](#audit--compliance)
7. [Incident Response](#incident-response)
8. [Security Checklist](#security-checklist)

---

## Security Architecture

### Defense in Depth

Multiple layers of security:

```
Layer 1: Network (Cloudflare, DDoS protection)
         ↓
Layer 2: Application (Rate limiting, input validation)
         ↓
Layer 3: Authentication (JWT, session management)
         ↓
Layer 4: Authorization (RLS policies, permission checks)
         ↓
Layer 5: Data (Encryption at rest and in transit)
         ↓
Layer 6: Monitoring (Logging, alerts, anomaly detection)
```

### Threat Model

**Assets to Protect:**
1. User credentials and authentication tokens
2. Personal roster data (names, scores, notes)
3. Social connections between users
4. Private messages and shared content
5. Scheduling/availability information

**Threat Actors:**
1. Malicious users (account takeover, data harvesting)
2. Automated bots (scraping, spam)
3. Internal threats (rogue admin, data leak)
4. External attackers (SQL injection, XSS)

**Attack Vectors:**
1. Authentication bypass
2. Authorization flaws (access other users' data)
3. Injection attacks (SQL, XSS, CSRF)
4. API abuse (rate limit evasion)
5. Social engineering
6. Supply chain attacks (compromised dependencies)

---

## Authentication & Authorization

### Authentication Flow

```typescript
// lib/auth/authFlow.ts

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function getCurrentUser() {
  const supabase = createClient()

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session) {
    return null
  }

  // Verify session is not expired
  if (new Date(session.expires_at!) < new Date()) {
    await supabase.auth.signOut()
    return null
  }

  return session.user
}

export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Authentication required')
  }

  return user
}
```

### JWT Token Security

**Token Storage:**
- HTTP-only cookies (not accessible via JavaScript)
- Secure flag (HTTPS only)
- SameSite=Strict (CSRF protection)

```typescript
// middleware.ts

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-access-token')

  // Verify token exists
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Add security headers
  const response = NextResponse.next()

  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  )

  return response
}

export const config = {
  matcher: [
    '/roster/:path*',
    '/profile/:path*',
    '/friends/:path*',
    '/discover/:path*',
    '/activity/:path*',
    '/api/:path*',
  ],
}
```

### Row Level Security (RLS)

**Principle:** Database enforces access control, not just application code.

```sql
-- Friends can only view each other's data if connection is accepted AND privacy allows it

CREATE POLICY "Friends view roster with privacy"
ON roster FOR SELECT
TO authenticated
USING (
  -- Own data
  user_id = auth.uid()
  OR
  -- Friend's data (with conditions)
  (
    -- Check friendship exists and is accepted
    EXISTS (
      SELECT 1 FROM connections c
      WHERE c.status = 'accepted'
        AND c.deleted_at IS NULL
        AND (
          (c.user_id = roster.user_id AND c.friend_id = auth.uid()) OR
          (c.friend_id = roster.user_id AND c.user_id = auth.uid())
        )
    )
    AND
    -- Check privacy settings allow it
    EXISTS (
      SELECT 1 FROM privacy_settings ps
      WHERE ps.user_id = roster.user_id
        AND ps.show_roster_names = TRUE
    )
    AND
    -- Entry is not marked private
    roster.is_private = FALSE
    AND
    -- Entry is discoverable
    roster.discoverable = TRUE
  )
);
```

### API Authorization

```typescript
// lib/api/authorization.ts

export async function canAccessConnection(
  userId: string,
  connectionId: string
): Promise<boolean> {
  const supabase = createClient()

  const { data } = await supabase
    .from('connections')
    .select('user_id, friend_id')
    .eq('id', connectionId)
    .single()

  if (!data) return false

  // User must be part of this connection
  return data.user_id === userId || data.friend_id === userId
}

export async function canViewRecommendation(
  userId: string,
  recommendationId: string
): Promise<boolean> {
  const supabase = createClient()

  const { data } = await supabase
    .from('recommendations')
    .select('user_id')
    .eq('id', recommendationId)
    .single()

  // Only the target user can view their recommendations
  return data?.user_id === userId
}

export async function canAccessRosterEntry(
  userId: string,
  rosterId: string
): Promise<'full' | 'view' | 'none'> {
  const supabase = createClient()

  const { data: roster } = await supabase
    .from('roster')
    .select(`
      user_id,
      is_private,
      discoverable,
      roster_shares!inner (
        shared_with,
        permission_level,
        revoked_at
      )
    `)
    .eq('id', rosterId)
    .single()

  if (!roster) return 'none'

  // Owner has full access
  if (roster.user_id === userId) return 'full'

  // Check if explicitly shared
  const share = roster.roster_shares?.find(
    (s) => s.shared_with === userId && !s.revoked_at
  )

  if (share) {
    return share.permission_level === 'full' ? 'full' : 'view'
  }

  // Check if accessible via privacy settings
  if (roster.is_private || !roster.discoverable) {
    return 'none'
  }

  // Check if friends
  const { data: connection } = await supabase
    .from('connections')
    .select('id')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .or(`user_id.eq.${roster.user_id},friend_id.eq.${roster.user_id}`)
    .eq('status', 'accepted')
    .is('deleted_at', null)
    .single()

  if (connection) {
    // Check privacy settings
    const { data: privacy } = await supabase
      .from('privacy_settings')
      .select('show_roster_names, show_roster_scores')
      .eq('user_id', roster.user_id)
      .single()

    if (privacy?.show_roster_names) {
      return privacy.show_roster_scores ? 'view' : 'view'
    }
  }

  return 'none'
}
```

---

## Data Protection

### Encryption

**At Rest:**
- Supabase PostgreSQL: AES-256 encryption
- Sensitive fields (notes, messages): Additional application-level encryption

```typescript
// lib/encryption/fieldEncryption.ts

import * as crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex') // 32 bytes

export function encryptField(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Return: iv + authTag + encrypted (all in hex)
  return iv.toString('hex') + authTag.toString('hex') + encrypted
}

export function decryptField(encrypted: string): string {
  const iv = Buffer.from(encrypted.slice(0, 32), 'hex')
  const authTag = Buffer.from(encrypted.slice(32, 64), 'hex')
  const ciphertext = encrypted.slice(64)

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// Usage example
const privateNotes = 'This is sensitive information'
const encrypted = encryptField(privateNotes)
// Store encrypted in database

const decrypted = decryptField(encrypted)
// Use decrypted value in application
```

**In Transit:**
- HTTPS/TLS 1.3 for all connections
- Certificate pinning for mobile apps (future)

### Input Sanitization

```typescript
// lib/utils/sanitize.ts

import DOMPurify from 'isomorphic-dompurify'

export function sanitizeNotes(input: string): string {
  // Remove HTML tags, scripts, etc.
  const clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML allowed
    ALLOWED_ATTR: [],
  })

  // Trim and limit length
  return clean.trim().slice(0, 5000)
}

export function sanitizeUsername(input: string): string {
  // Only alphanumeric, underscore, dash
  return input.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30)
}

export function sanitizeSearchQuery(input: string): string {
  // Prevent SQL injection in search queries
  // Note: Use parameterized queries as primary defense
  return input
    .replace(/[^\w\s@.-]/g, '') // Allow alphanumeric, space, @, ., -
    .trim()
    .slice(0, 100)
}
```

### SQL Injection Prevention

**Use Parameterized Queries:**

```typescript
// GOOD - Parameterized query
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('username', userInput) // Supabase safely escapes this

// BAD - String concatenation (never do this!)
// const query = `SELECT * FROM users WHERE username = '${userInput}'`
```

### XSS Prevention

```typescript
// lib/components/SafeHTML.tsx

'use client'

import DOMPurify from 'isomorphic-dompurify'

interface SafeHTMLProps {
  html: string
  className?: string
}

export function SafeHTML({ html, className }: SafeHTMLProps) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'title'],
  })

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
```

---

## Privacy Controls

### Privacy Settings Implementation

```typescript
// lib/services/PrivacyService.ts

export class PrivacyService {
  private supabase = createClient()

  async getUserPrivacySettings(userId: string) {
    const { data, error } = await this.supabase
      .from('privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) throw error

    return data
  }

  async updatePrivacySettings(
    userId: string,
    settings: Partial<PrivacySettings>
  ) {
    // Validate settings
    this.validatePrivacySettings(settings)

    const { error } = await this.supabase
      .from('privacy_settings')
      .update(settings)
      .eq('user_id', userId)

    if (error) throw error

    // Log privacy change for audit
    await this.supabase.from('activity_log').insert({
      user_id: userId,
      action_type: 'privacy_settings_updated',
      action_category: 'privacy',
      details: settings,
    })
  }

  private validatePrivacySettings(settings: any) {
    // Validate boolean fields
    const booleanFields = [
      'show_roster_count',
      'show_roster_names',
      'show_roster_scores',
      'allow_recommendations',
    ]

    for (const field of booleanFields) {
      if (field in settings && typeof settings[field] !== 'boolean') {
        throw new Error(`${field} must be a boolean`)
      }
    }

    // Validate enum fields
    if (settings.profile_visibility) {
      const valid = ['public', 'friends', 'private']
      if (!valid.includes(settings.profile_visibility)) {
        throw new Error('Invalid profile_visibility value')
      }
    }

    // Validate threshold
    if (settings.min_confidence_threshold) {
      const threshold = settings.min_confidence_threshold
      if (threshold < 0 || threshold > 1) {
        throw new Error('min_confidence_threshold must be between 0 and 1')
      }
    }
  }

  async canUserAccessData(
    requesterId: string,
    targetUserId: string,
    dataType: 'roster' | 'hangs' | 'schedule'
  ): Promise<boolean> {
    // User can always access own data
    if (requesterId === targetUserId) return true

    // Check if users are friends
    const areFriends = await this.areFriends(requesterId, targetUserId)
    if (!areFriends) return false

    // Check privacy settings
    const privacy = await this.getUserPrivacySettings(targetUserId)

    switch (dataType) {
      case 'roster':
        return privacy.show_roster_names
      case 'hangs':
        return privacy.show_hang_history
      case 'schedule':
        return privacy.show_schedule
      default:
        return false
    }
  }

  private async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('connections')
      .select('id')
      .or(`user_id.eq.${userId1},friend_id.eq.${userId1}`)
      .or(`user_id.eq.${userId2},friend_id.eq.${userId2}`)
      .eq('status', 'accepted')
      .is('deleted_at', null)
      .single()

    return !!data
  }
}
```

### Data Anonymization in Recommendations

```typescript
// lib/services/RecommendationService.ts (privacy-aware)

function anonymizePersonForRecommendation(
  person: RosterPerson,
  sourceFriendId: string
): AnonymizedPerson {
  return {
    // Never include identifying info
    traits: {
      avgAttraction: Math.round(person.attraction_score), // Round to nearest integer
      avgPersonality: Math.round(person.personality_score),
      avgReliability: Math.round(person.reliability_score),
      compositeScore: Math.round(calculateCompositeScore(person)),
    },
    // Fuzzy categories instead of exact values
    tierCategory: getTierCategory(person.tier),
    statusCategory: getStatusCategory(person.status),
    // No names, photos, or personal details
  }
}

function getTierCategory(tier: string): 'top' | 'mid' | 'bottom' {
  if (tier === 'S' || tier === 'A') return 'top'
  if (tier === 'B') return 'mid'
  return 'bottom'
}
```

---

## Attack Prevention

### Rate Limiting

```typescript
// lib/api/middleware/rateLimit.ts

import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

const redis = Redis.fromEnv()

// Different limits for different endpoints
const limiters = {
  default: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
  }),

  friendRequest: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    analytics: true,
  }),

  recommendation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    analytics: true,
  }),

  search: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
  }),
}

export async function rateLimit(
  request: Request,
  options: { max?: number; window?: number } = {}
) {
  // Get identifier (user ID or IP)
  const user = await getCurrentUser()
  const identifier = user?.id || request.headers.get('x-forwarded-for') || 'anonymous'

  // Select appropriate limiter based on endpoint
  const endpoint = new URL(request.url).pathname
  let limiter = limiters.default

  if (endpoint.includes('/connections/request')) {
    limiter = limiters.friendRequest
  } else if (endpoint.includes('/recommendations/refresh')) {
    limiter = limiters.recommendation
  } else if (endpoint.includes('/users/search')) {
    limiter = limiters.search
  }

  // Check rate limit
  const { success, limit, reset, remaining } = await limiter.limit(identifier)

  if (!success) {
    throw new Error('Rate limit exceeded', {
      cause: { limit, reset, remaining },
    })
  }

  // Add rate limit headers to response
  return {
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toISOString(),
    },
  }
}
```

### CSRF Protection

```typescript
// lib/api/middleware/csrf.ts

import { NextRequest } from 'next/server'

export function verifyCsrfToken(request: NextRequest) {
  // Verify origin matches host
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  if (origin && !origin.includes(host!)) {
    throw new Error('Invalid origin')
  }

  // For state-changing operations, verify CSRF token
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const token = request.headers.get('x-csrf-token')
    const cookieToken = request.cookies.get('csrf-token')?.value

    if (!token || !cookieToken || token !== cookieToken) {
      throw new Error('Invalid CSRF token')
    }
  }
}
```

### Brute Force Protection

```typescript
// lib/security/bruteForceProtection.ts

import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 // 15 minutes in seconds

export async function checkBruteForce(identifier: string, action: string) {
  const key = `bruteforce:${action}:${identifier}`

  const attempts = await redis.incr(key)

  if (attempts === 1) {
    // Set expiry on first attempt
    await redis.expire(key, LOCKOUT_DURATION)
  }

  if (attempts > MAX_FAILED_ATTEMPTS) {
    throw new Error('Too many failed attempts. Please try again later.')
  }

  return {
    attempts,
    remaining: MAX_FAILED_ATTEMPTS - attempts,
  }
}

export async function resetBruteForce(identifier: string, action: string) {
  const key = `bruteforce:${action}:${identifier}`
  await redis.del(key)
}

// Usage in login endpoint
async function handleLogin(username: string, password: string) {
  const identifier = username.toLowerCase()

  // Check brute force
  await checkBruteForce(identifier, 'login')

  // Attempt login
  const success = await attemptLogin(username, password)

  if (success) {
    // Reset counter on success
    await resetBruteForce(identifier, 'login')
    return { success: true }
  } else {
    // Counter already incremented by checkBruteForce
    return { success: false, error: 'Invalid credentials' }
  }
}
```

---

## Audit & Compliance

### Audit Logging

```typescript
// lib/audit/auditLog.ts

export enum AuditAction {
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  ROSTER_VIEWED = 'roster_viewed',
  ROSTER_SHARED = 'roster_shared',
  FRIEND_REQUEST_SENT = 'friend_request_sent',
  FRIEND_REQUEST_ACCEPTED = 'friend_request_accepted',
  PRIVACY_SETTINGS_CHANGED = 'privacy_settings_changed',
  DATA_EXPORTED = 'data_exported',
  ACCOUNT_DELETED = 'account_deleted',
}

interface AuditLogEntry {
  userId: string
  action: AuditAction
  targetUserId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

export async function logAudit(entry: AuditLogEntry) {
  const supabase = createClient()

  await supabase.from('activity_log').insert({
    user_id: entry.userId,
    action_type: entry.action,
    action_category: getCategoryForAction(entry.action),
    target_user_id: entry.targetUserId,
    ip_address: entry.ipAddress,
    user_agent: entry.userAgent,
    details: entry.metadata,
    created_at: new Date().toISOString(),
  })
}

// Query audit logs
export async function getAuditLogs(
  userId: string,
  options: {
    startDate?: Date
    endDate?: Date
    actions?: AuditAction[]
  } = {}
) {
  const supabase = createClient()

  let query = supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (options.startDate) {
    query = query.gte('created_at', options.startDate.toISOString())
  }

  if (options.endDate) {
    query = query.lte('created_at', options.endDate.toISOString())
  }

  if (options.actions && options.actions.length > 0) {
    query = query.in('action_type', options.actions)
  }

  const { data, error } = await query

  if (error) throw error

  return data
}
```

### GDPR Compliance

```typescript
// lib/compliance/gdpr.ts

export class GDPRService {
  private supabase = createClient()

  /**
   * Export all user data (GDPR Right to Data Portability)
   */
  async exportUserData(userId: string): Promise<UserDataExport> {
    const [
      profile,
      roster,
      hangs,
      connections,
      recommendations,
      privacySettings,
      activityLog,
    ] = await Promise.all([
      this.getUserProfile(userId),
      this.getUserRoster(userId),
      this.getUserHangs(userId),
      this.getUserConnections(userId),
      this.getUserRecommendations(userId),
      this.getPrivacySettings(userId),
      this.getActivityLog(userId),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId,
      profile,
      roster,
      hangs,
      connections,
      recommendations,
      privacySettings,
      activityLog,
    }

    // Log export
    await logAudit({
      userId,
      action: AuditAction.DATA_EXPORTED,
    })

    return exportData
  }

  /**
   * Delete all user data (GDPR Right to Erasure)
   */
  async deleteUserData(userId: string): Promise<void> {
    // 1. Anonymize data that must be retained for legal reasons
    await this.anonymizeRetainedData(userId)

    // 2. Delete all user-owned data
    await Promise.all([
      this.supabase.from('roster').delete().eq('user_id', userId),
      this.supabase.from('hangs').delete().eq('user_id', userId),
      this.supabase.from('recommendations').delete().eq('user_id', userId),
      this.supabase.from('shared_hangs').delete().eq('user_id', userId),
      this.supabase.from('notifications').delete().eq('user_id', userId),
      this.supabase.from('privacy_settings').delete().eq('user_id', userId),
    ])

    // 3. Handle connections (soft delete both directions)
    await this.supabase
      .from('connections')
      .update({ deleted_at: new Date().toISOString() })
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

    // 4. Delete user account
    await this.supabase.auth.admin.deleteUser(userId)

    // 5. Log deletion
    await logAudit({
      userId: 'system',
      action: AuditAction.ACCOUNT_DELETED,
      targetUserId: userId,
    })
  }

  private async anonymizeRetainedData(userId: string) {
    // Anonymize activity log (keep for analytics, remove PII)
    await this.supabase
      .from('activity_log')
      .update({
        ip_address: null,
        user_agent: null,
        details: null,
      })
      .eq('user_id', userId)
  }
}
```

---

## Incident Response

### Security Incident Playbook

**Detection:**
1. Monitor for anomalous activity (see Monitoring section)
2. User reports security concern
3. Automated alert triggers

**Assessment:**
1. Classify severity (Critical, High, Medium, Low)
2. Identify affected users
3. Determine scope of breach

**Containment:**
1. Revoke compromised credentials
2. Block malicious IPs
3. Disable affected features if necessary

**Eradication:**
1. Patch vulnerability
2. Remove malicious data
3. Update security rules

**Recovery:**
1. Restore from backups if needed
2. Re-enable features
3. Monitor for recurrence

**Post-Incident:**
1. Document incident
2. Notify affected users (if required)
3. Update security measures
4. Conduct post-mortem

### Breach Notification

```typescript
// lib/security/breachNotification.ts

interface BreachInfo {
  incidentId: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  affectedDataTypes: string[]
  affectedUserIds: string[]
  discoveredAt: Date
  mitigatedAt?: Date
}

export async function notifyAffectedUsers(breach: BreachInfo) {
  const supabase = createClient()

  // Fetch affected users
  const { data: users } = await supabase
    .from('users')
    .select('id, email, display_name')
    .in('id', breach.affectedUserIds)

  if (!users) return

  // Send breach notification emails
  for (const user of users) {
    await sendBreachNotificationEmail({
      to: user.email,
      userName: user.display_name,
      incidentId: breach.incidentId,
      severity: breach.severity,
      affectedData: breach.affectedDataTypes,
      discoveredAt: breach.discoveredAt,
      mitigatedAt: breach.mitigatedAt,
    })

    // Create in-app notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'security_alert',
      title: 'Security Notice',
      message: 'We detected unusual activity on your account. Please review.',
      priority: 'urgent',
      action_url: '/security/incident',
    })
  }

  // Log breach notification
  await supabase.from('breach_notifications').insert({
    incident_id: breach.incidentId,
    notified_at: new Date().toISOString(),
    user_count: users.length,
  })
}
```

---

## Security Checklist

### Pre-Launch Checklist

- [ ] All passwords hashed with bcrypt (min 12 rounds)
- [ ] HTTPS enforced (no HTTP)
- [ ] CSRF tokens implemented
- [ ] Rate limiting on all endpoints
- [ ] Input validation on all user inputs
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection (output encoding)
- [ ] Sensitive data encrypted at rest
- [ ] RLS policies tested with multiple users
- [ ] Authentication tokens stored securely (HTTP-only cookies)
- [ ] Session expiration implemented
- [ ] Brute force protection on login
- [ ] Security headers configured
- [ ] Dependency vulnerabilities scanned (npm audit)
- [ ] API endpoints authenticated
- [ ] File upload validation (if applicable)
- [ ] Error messages don't leak sensitive info
- [ ] Audit logging implemented
- [ ] Backup and recovery tested
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR compliance verified
- [ ] Security penetration test completed

### Ongoing Security Tasks

**Daily:**
- Monitor error rates and anomalies
- Review security alerts

**Weekly:**
- Review audit logs for suspicious activity
- Check rate limit violations
- Update dependencies (security patches)

**Monthly:**
- Review user permissions
- Audit RLS policies
- Test backup restoration
- Review and rotate API keys
- Conduct security training

**Quarterly:**
- Security penetration test
- Privacy policy review
- Incident response drill
- Third-party security audit

---

*End of Security & Privacy Deep Dive*
