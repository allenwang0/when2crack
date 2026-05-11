# Database Architecture Deep Dive

**Document Version:** 1.0
**Last Updated:** 2026-05-11

---

## Table of Contents
1. [Schema Design Philosophy](#schema-design-philosophy)
2. [Complete Table Definitions](#complete-table-definitions)
3. [Migration Strategy](#migration-strategy)
4. [Indexes & Performance](#indexes--performance)
5. [Row Level Security](#row-level-security)
6. [Triggers & Functions](#triggers--functions)
7. [Data Integrity & Constraints](#data-integrity--constraints)
8. [Backup & Recovery](#backup--recovery)

---

## Schema Design Philosophy

### Design Principles

1. **Privacy First**: Every table considers privacy implications
2. **Denormalization for Performance**: Cache computed values strategically
3. **Audit Trail**: Track who did what and when
4. **Soft Deletes**: Preserve data for analytics
5. **Scalability**: Designed for 1M+ users

### Naming Conventions

- **Tables**: Plural nouns (`connections`, `recommendations`)
- **Primary Keys**: `id UUID` (all tables)
- **Foreign Keys**: `{table}_id` format
- **Timestamps**: `created_at`, `updated_at`, `deleted_at`
- **Booleans**: Prefixed with `is_` or verb (`is_private`, `viewed`)

### Data Types Standards

- **IDs**: `UUID` (better for distributed systems)
- **Timestamps**: `TIMESTAMPTZ` (timezone-aware)
- **Text**: `VARCHAR(n)` for known limits, `TEXT` for unlimited
- **JSON**: `JSONB` (indexed, queryable)
- **Numbers**: `INTEGER`, `BIGINT`, `DECIMAL(p,s)` as appropriate

---

## Complete Table Definitions

### 1. Connections Table

**Purpose**: Manage bidirectional friend relationships

```sql
-- ============================================
-- TABLE: connections
-- ============================================

CREATE TABLE connections (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationship
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Status Management
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Metadata
  connection_strength INTEGER DEFAULT 0, -- 0-100, increases with interaction
  last_interaction_at TIMESTAMPTZ,
  notes TEXT, -- private notes about this friendship

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  blocked_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ, -- soft delete

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'blocked', 'declined')),
  CONSTRAINT different_users CHECK (user_id != friend_id),
  CONSTRAINT unique_connection UNIQUE (user_id, friend_id)
);

-- Indexes
CREATE INDEX idx_connections_user_status
  ON connections(user_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_connections_friend_status
  ON connections(friend_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_connections_pending
  ON connections(friend_id)
  WHERE status = 'pending' AND deleted_at IS NULL;

CREATE INDEX idx_connections_last_interaction
  ON connections(last_interaction_at DESC);

-- Comments
COMMENT ON TABLE connections IS 'Friend relationships between users';
COMMENT ON COLUMN connections.connection_strength IS 'Algorithmic score of friendship strength (0-100)';
COMMENT ON COLUMN connections.requested_by IS 'User who initiated the friend request';
COMMENT ON COLUMN connections.notes IS 'Private notes visible only to user_id';
```

**Design Decisions:**
- **Bidirectional**: Each friendship is ONE row, not two
- **Soft Deletes**: `deleted_at` allows recovery and analytics
- **Connection Strength**: Enables "close friends" features later
- **Requested By**: Track who initiated for UX purposes

### 2. Recommendations Table

**Purpose**: Store and cache personalized recommendations

```sql
-- ============================================
-- TABLE: recommendations
-- ============================================

CREATE TABLE recommendations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target User
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Recommended Person (anonymized)
  recommended_person_name VARCHAR(255) NOT NULL,
  recommended_person_traits JSONB NOT NULL DEFAULT '{}',

  -- Scoring
  confidence_score DECIMAL(3,2) NOT NULL, -- 0.00 to 1.00
  predicted_attraction DECIMAL(3,1),
  predicted_personality DECIMAL(3,1),
  predicted_reliability DECIMAL(3,1),
  predicted_composite DECIMAL(3,1),

  -- Reasoning
  reasoning JSONB NOT NULL DEFAULT '{}',
  match_factors VARCHAR(100)[], -- ['similar_to_sarah', 'high_personality', 'social_proof']

  -- Source Attribution
  based_on_roster_ids UUID[], -- users' roster IDs that influenced this
  source_type VARCHAR(50) NOT NULL,
  source_user_ids UUID[] NOT NULL, -- friends who contributed
  similar_to_roster_id UUID REFERENCES roster(id) ON DELETE SET NULL,

  -- User Actions
  viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMPTZ,
  acted_on BOOLEAN DEFAULT FALSE,
  action_type VARCHAR(20), -- 'added', 'dismissed', 'not_interested'
  action_at TIMESTAMPTZ,
  resulting_roster_id UUID REFERENCES roster(id) ON DELETE SET NULL,

  -- Feedback
  user_rating INTEGER, -- 1-5 stars if user provides feedback
  user_feedback TEXT,

  -- Lifecycle
  generation_version INTEGER DEFAULT 1, -- algorithm version
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

  -- Constraints
  CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1),
  CONSTRAINT valid_predicted_scores CHECK (
    predicted_attraction BETWEEN 0 AND 10 AND
    predicted_personality BETWEEN 0 AND 10 AND
    predicted_reliability BETWEEN 0 AND 10
  ),
  CONSTRAINT valid_action CHECK (action_type IN ('added', 'dismissed', 'not_interested', 'blocked')),
  CONSTRAINT valid_rating CHECK (user_rating BETWEEN 1 AND 5)
);

-- Indexes
CREATE INDEX idx_recommendations_user_active
  ON recommendations(user_id, expires_at)
  WHERE NOT viewed AND expires_at > NOW();

CREATE INDEX idx_recommendations_confidence
  ON recommendations(user_id, confidence_score DESC)
  WHERE expires_at > NOW();

CREATE INDEX idx_recommendations_source_type
  ON recommendations(source_type);

CREATE INDEX idx_recommendations_expires
  ON recommendations(expires_at)
  WHERE expires_at > NOW();

-- Partial index for analytics
CREATE INDEX idx_recommendations_acted_on
  ON recommendations(user_id, acted_on, action_type)
  WHERE acted_on = TRUE;

-- GIN index for JSONB queries
CREATE INDEX idx_recommendations_traits
  ON recommendations USING GIN(recommended_person_traits);

-- Comments
COMMENT ON TABLE recommendations IS 'Personalized roster recommendations for users';
COMMENT ON COLUMN recommendations.confidence_score IS 'Algorithm confidence (0-1), higher = better match';
COMMENT ON COLUMN recommendations.generation_version IS 'Algorithm version for A/B testing';
COMMENT ON COLUMN recommendations.match_factors IS 'Array of reason tags for UI display';
```

**Design Decisions:**
- **Expiration**: Recommendations expire after 7 days to stay fresh
- **Version Tracking**: `generation_version` enables A/B testing algorithms
- **Rich Reasoning**: JSONB allows flexible explanation structures
- **User Feedback**: Collects ratings to improve algorithm

### 3. Shared Hangs Table

**Purpose**: Social feed of shared hangout experiences

```sql
-- ============================================
-- TABLE: shared_hangs
-- ============================================

CREATE TABLE shared_hangs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hang_id UUID NOT NULL REFERENCES hangs(id) ON DELETE CASCADE,
  roster_id UUID NOT NULL REFERENCES roster(id) ON DELETE CASCADE,

  -- Content
  caption TEXT,
  sentiment VARCHAR(20) DEFAULT 'positive', -- 'positive', 'neutral', 'negative'

  -- Visibility
  visibility VARCHAR(20) DEFAULT 'friends',
  visible_to_user_ids UUID[], -- specific users (overrides visibility)

  -- Engagement Counters (denormalized)
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  interested_count INTEGER DEFAULT 0, -- users who want to meet this person

  -- Moderation
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  is_hidden BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_visibility CHECK (visibility IN ('friends', 'close_friends', 'specific', 'private')),
  CONSTRAINT valid_sentiment CHECK (sentiment IN ('positive', 'neutral', 'negative'))
);

-- Indexes
CREATE INDEX idx_shared_hangs_feed
  ON shared_hangs(visibility, created_at DESC)
  WHERE deleted_at IS NULL AND is_hidden = FALSE;

CREATE INDEX idx_shared_hangs_user
  ON shared_hangs(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_shared_hangs_roster
  ON shared_hangs(roster_id);

-- GIN index for specific user visibility
CREATE INDEX idx_shared_hangs_visible_to
  ON shared_hangs USING GIN(visible_to_user_ids);

-- Full-text search on captions
CREATE INDEX idx_shared_hangs_caption_search
  ON shared_hangs USING GIN(to_tsvector('english', caption))
  WHERE caption IS NOT NULL;

-- Comments
COMMENT ON TABLE shared_hangs IS 'Shared hang experiences visible to friends';
COMMENT ON COLUMN shared_hangs.interested_count IS 'Count of friends interested in meeting this person';
COMMENT ON COLUMN shared_hangs.visible_to_user_ids IS 'Specific user IDs who can see (overrides visibility)';
```

### 4. Hang Reactions Table

**Purpose**: Likes, comments, and reactions to shared hangs

```sql
-- ============================================
-- TABLE: hang_reactions
-- ============================================

CREATE TABLE hang_reactions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  shared_hang_id UUID NOT NULL REFERENCES shared_hangs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Reaction
  reaction_type VARCHAR(20) NOT NULL,
  comment TEXT,

  -- Metadata
  is_edited BOOLEAN DEFAULT FALSE,
  edit_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_reaction CHECK (reaction_type IN ('like', 'love', 'congrats', 'interested', 'comment')),
  CONSTRAINT unique_user_reaction UNIQUE (shared_hang_id, user_id, reaction_type)
);

-- Indexes
CREATE INDEX idx_hang_reactions_shared_hang
  ON hang_reactions(shared_hang_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_hang_reactions_user
  ON hang_reactions(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_hang_reactions_type
  ON hang_reactions(reaction_type)
  WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE hang_reactions IS 'User reactions (likes, comments) to shared hangs';
COMMENT ON COLUMN hang_reactions.is_edited IS 'True if comment has been edited';
```

### 5. Privacy Settings Table

**Purpose**: Granular user privacy controls

```sql
-- ============================================
-- TABLE: privacy_settings
-- ============================================

CREATE TABLE privacy_settings (
  -- Primary Key (user_id is PK)
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Profile Visibility
  profile_visibility VARCHAR(20) DEFAULT 'friends',
  searchable_by_username BOOLEAN DEFAULT TRUE,
  searchable_by_email BOOLEAN DEFAULT FALSE,
  show_online_status BOOLEAN DEFAULT TRUE,

  -- Roster Visibility
  show_roster_count BOOLEAN DEFAULT TRUE,
  show_roster_names BOOLEAN DEFAULT FALSE,
  show_roster_scores BOOLEAN DEFAULT FALSE,
  show_roster_tiers BOOLEAN DEFAULT FALSE,
  share_roster_insights BOOLEAN DEFAULT TRUE, -- aggregate stats

  -- Hang History
  show_hang_count BOOLEAN DEFAULT TRUE,
  show_hang_history BOOLEAN DEFAULT FALSE,

  -- Recommendations
  allow_recommendations BOOLEAN DEFAULT TRUE,
  allow_being_recommended BOOLEAN DEFAULT TRUE,
  recommendation_frequency VARCHAR(20) DEFAULT 'daily',
  min_confidence_threshold DECIMAL(3,2) DEFAULT 0.70,

  -- Social Features
  activity_feed_visibility VARCHAR(20) DEFAULT 'friends',
  auto_share_positive_hangs BOOLEAN DEFAULT FALSE,
  allow_friend_requests VARCHAR(20) DEFAULT 'everyone',

  -- Scheduling
  show_schedule BOOLEAN DEFAULT TRUE,
  allow_group_schedules BOOLEAN DEFAULT TRUE,

  -- Notifications
  notify_friend_requests BOOLEAN DEFAULT TRUE,
  notify_recommendations BOOLEAN DEFAULT TRUE,
  notify_hang_reactions BOOLEAN DEFAULT TRUE,
  notify_group_invites BOOLEAN DEFAULT TRUE,
  email_digest_frequency VARCHAR(20) DEFAULT 'weekly',

  -- Advanced
  data_sharing_for_research BOOLEAN DEFAULT FALSE,
  allow_anonymous_analytics BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_profile_visibility CHECK (profile_visibility IN ('public', 'friends', 'private')),
  CONSTRAINT valid_activity_visibility CHECK (activity_feed_visibility IN ('public', 'friends', 'close_friends', 'private')),
  CONSTRAINT valid_friend_requests CHECK (allow_friend_requests IN ('everyone', 'friends_of_friends', 'nobody')),
  CONSTRAINT valid_recommendation_frequency CHECK (recommendation_frequency IN ('daily', 'weekly', 'never')),
  CONSTRAINT valid_email_frequency CHECK (email_digest_frequency IN ('daily', 'weekly', 'monthly', 'never')),
  CONSTRAINT valid_confidence CHECK (min_confidence_threshold BETWEEN 0 AND 1)
);

-- Indexes (minimal since this is small)
CREATE INDEX idx_privacy_settings_recommendations
  ON privacy_settings(user_id)
  WHERE allow_recommendations = TRUE;

-- Comments
COMMENT ON TABLE privacy_settings IS 'Granular privacy controls for each user';
COMMENT ON COLUMN privacy_settings.min_confidence_threshold IS 'Only show recommendations above this confidence';
```

**Design Decisions:**
- **Sensible Defaults**: Privacy-conscious defaults
- **Granular Control**: Users control each aspect independently
- **Recommendation Tuning**: Users can adjust frequency and quality threshold

### 6. Roster Shares Table

**Purpose**: Share specific roster entries with friends

```sql
-- ============================================
-- TABLE: roster_shares
-- ============================================

CREATE TABLE roster_shares (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  roster_id UUID NOT NULL REFERENCES roster(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Permissions
  permission_level VARCHAR(20) DEFAULT 'view',
  include_scores BOOLEAN DEFAULT FALSE,
  include_notes BOOLEAN DEFAULT FALSE,
  include_hang_history BOOLEAN DEFAULT FALSE,

  -- Message
  message TEXT,
  context VARCHAR(100), -- 'recommendation', 'setup', 'asking_opinion'

  -- Engagement
  viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMPTZ,
  responded BOOLEAN DEFAULT FALSE,
  response_text TEXT,
  response_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- optional expiration
  revoked_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_permission CHECK (permission_level IN ('view', 'comment', 'full')),
  CONSTRAINT different_users CHECK (shared_by != shared_with),
  CONSTRAINT unique_share UNIQUE (roster_id, shared_by, shared_with)
);

-- Indexes
CREATE INDEX idx_roster_shares_shared_with
  ON roster_shares(shared_with, viewed)
  WHERE revoked_at IS NULL;

CREATE INDEX idx_roster_shares_shared_by
  ON roster_shares(shared_by, created_at DESC);

CREATE INDEX idx_roster_shares_roster
  ON roster_shares(roster_id);

-- Comments
COMMENT ON TABLE roster_shares IS 'Specific roster entries shared between friends';
COMMENT ON COLUMN roster_shares.context IS 'Why this was shared (helps with UX)';
```

### 7. Group Schedules Table

**Purpose**: Coordinate hangouts with multiple people

```sql
-- ============================================
-- TABLE: group_schedules
-- ============================================

CREATE TABLE group_schedules (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Creator
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Group Info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  participant_ids UUID[] NOT NULL,

  -- Scheduling
  proposed_times JSONB DEFAULT '[]', -- array of {start, end, proposed_by, votes[]}
  availability_data JSONB DEFAULT '{}', -- map of user_id -> availability slots
  finalized_time TIMESTAMPTZ,
  location_suggestion TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'planning',
  min_participants INTEGER DEFAULT 2,
  current_participant_count INTEGER,

  -- Engagement
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_by UUID REFERENCES auth.users(id),
  message_count INTEGER DEFAULT 0,

  -- Outcome
  actually_happened BOOLEAN,
  attendance UUID[], -- who actually showed up
  post_hang_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('planning', 'scheduled', 'confirmed', 'completed', 'cancelled')),
  CONSTRAINT min_two_participants CHECK (array_length(participant_ids, 1) >= 2)
);

-- Indexes
CREATE INDEX idx_group_schedules_created_by
  ON group_schedules(created_by, status, created_at DESC);

-- GIN index for participant queries
CREATE INDEX idx_group_schedules_participants
  ON group_schedules USING GIN(participant_ids);

CREATE INDEX idx_group_schedules_status
  ON group_schedules(status, last_activity_at DESC);

-- JSONB indexes for scheduling queries
CREATE INDEX idx_group_schedules_proposed_times
  ON group_schedules USING GIN(proposed_times);

-- Comments
COMMENT ON TABLE group_schedules IS 'Coordinate group hangouts with multiple users';
COMMENT ON COLUMN group_schedules.proposed_times IS 'Array of time proposals with votes';
COMMENT ON COLUMN group_schedules.availability_data IS 'Cached availability for quick matching';
```

### 8. Notifications Table

**Purpose**: In-app notifications and alerts

```sql
-- ============================================
-- TABLE: notifications
-- ============================================

CREATE TABLE notifications (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target User
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification Content
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  icon VARCHAR(50), -- emoji or icon name

  -- Action
  action_url VARCHAR(500),
  action_text VARCHAR(50),

  -- Related Entities
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_object_type VARCHAR(50), -- 'roster', 'hang', 'recommendation', etc.
  related_object_id UUID,

  -- Data Payload
  data JSONB DEFAULT '{}',

  -- Status
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,

  -- Priority
  priority VARCHAR(20) DEFAULT 'normal',

  -- Delivery
  delivered_in_app BOOLEAN DEFAULT FALSE,
  delivered_via_email BOOLEAN DEFAULT FALSE,
  delivered_via_push BOOLEAN DEFAULT FALSE,

  -- Grouping (for collapsing similar notifications)
  group_key VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_type CHECK (type IN (
    'friend_request_received',
    'friend_request_accepted',
    'recommendation_new',
    'hang_reaction',
    'roster_shared',
    'group_schedule_invite',
    'group_schedule_finalized',
    'reminder'
  )),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Indexes
CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE read = FALSE AND dismissed = FALSE;

CREATE INDEX idx_notifications_type
  ON notifications(user_id, type, created_at DESC);

CREATE INDEX idx_notifications_group
  ON notifications(user_id, group_key)
  WHERE group_key IS NOT NULL;

CREATE INDEX idx_notifications_expires
  ON notifications(expires_at)
  WHERE expires_at IS NOT NULL;

-- Partial index for cleanup
CREATE INDEX idx_notifications_old
  ON notifications(created_at)
  WHERE read = TRUE AND created_at < NOW() - INTERVAL '30 days';

-- Comments
COMMENT ON TABLE notifications IS 'In-app notifications and alerts';
COMMENT ON COLUMN notifications.group_key IS 'For collapsing similar notifications (e.g., "3 new recommendations")';
```

### 9. Activity Log Table (Audit Trail)

**Purpose**: Track all social actions for security and analytics

```sql
-- ============================================
-- TABLE: activity_log
-- ============================================

CREATE TABLE activity_log (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Action
  action_type VARCHAR(100) NOT NULL,
  action_category VARCHAR(50) NOT NULL, -- 'connection', 'recommendation', 'roster', etc.

  -- Target
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_object_type VARCHAR(50),
  target_object_id UUID,

  -- Context
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_category CHECK (action_category IN (
    'connection',
    'recommendation',
    'roster',
    'hang',
    'privacy',
    'group_schedule',
    'notification'
  ))
);

-- Indexes (time-series optimized)
CREATE INDEX idx_activity_log_user_time
  ON activity_log(user_id, created_at DESC);

CREATE INDEX idx_activity_log_category
  ON activity_log(action_category, created_at DESC);

CREATE INDEX idx_activity_log_action
  ON activity_log(action_type, created_at DESC);

-- GIN index for detail queries
CREATE INDEX idx_activity_log_details
  ON activity_log USING GIN(details);

-- Partition by month (for very large scale)
-- CREATE TABLE activity_log_y2026m05 PARTITION OF activity_log
--   FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- Comments
COMMENT ON TABLE activity_log IS 'Audit trail of all social actions';
COMMENT ON COLUMN activity_log.details IS 'JSON details specific to action type';
```

---

## Migration Strategy

### Migration Files Structure

```
supabase/migrations/
├── 20260511000001_create_connections.sql
├── 20260511000002_create_recommendations.sql
├── 20260511000003_create_shared_hangs.sql
├── 20260511000004_create_hang_reactions.sql
├── 20260511000005_create_privacy_settings.sql
├── 20260511000006_create_roster_shares.sql
├── 20260511000007_create_group_schedules.sql
├── 20260511000008_create_notifications.sql
├── 20260511000009_create_activity_log.sql
├── 20260511000010_update_users_table.sql
├── 20260511000011_update_roster_table.sql
├── 20260511000012_create_indexes.sql
├── 20260511000013_create_rls_policies.sql
├── 20260511000014_create_triggers.sql
└── 20260511000015_seed_privacy_defaults.sql
```

### Sample Migration: Connections

```sql
-- Migration: 20260511000001_create_connections.sql
-- Description: Create connections table for friend relationships

BEGIN;

-- Create table
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_strength INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  blocked_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'blocked', 'declined')),
  CONSTRAINT different_users CHECK (user_id != friend_id),
  CONSTRAINT unique_connection UNIQUE (user_id, friend_id)
);

-- Create indexes
CREATE INDEX idx_connections_user_status ON connections(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_connections_friend_status ON connections(friend_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_connections_pending ON connections(friend_id) WHERE status = 'pending' AND deleted_at IS NULL;

-- Add comments
COMMENT ON TABLE connections IS 'Friend relationships between users';

-- Enable RLS
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

COMMIT;
```

### Rollback Strategy

```sql
-- Rollback: 20260511000001_create_connections.sql

BEGIN;

DROP TABLE IF EXISTS connections CASCADE;

COMMIT;
```

### Migration Testing Checklist

- [ ] Test on local development database
- [ ] Verify foreign key constraints
- [ ] Check index creation performance
- [ ] Test RLS policies with multiple users
- [ ] Verify triggers fire correctly
- [ ] Run rollback and re-apply
- [ ] Test with production-size data samples
- [ ] Monitor migration time on staging

---

## Indexes & Performance

### Index Strategy

#### 1. Query Patterns
Identify common query patterns:

```sql
-- Friend list query
SELECT * FROM connections
WHERE user_id = $1 AND status = 'accepted' AND deleted_at IS NULL;
-- Index: idx_connections_user_status

-- Pending requests query
SELECT * FROM connections
WHERE friend_id = $1 AND status = 'pending' AND deleted_at IS NULL;
-- Index: idx_connections_pending

-- Recommendation feed query
SELECT * FROM recommendations
WHERE user_id = $1 AND expires_at > NOW() AND viewed = FALSE
ORDER BY confidence_score DESC;
-- Index: idx_recommendations_user_active

-- Activity feed query
SELECT * FROM shared_hangs
WHERE visibility = 'friends' AND deleted_at IS NULL
ORDER BY created_at DESC;
-- Index: idx_shared_hangs_feed
```

#### 2. Index Types

**B-Tree Indexes** (default, most common):
```sql
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
```

**Partial Indexes** (for filtered queries):
```sql
CREATE INDEX idx_connections_active ON connections(user_id)
WHERE deleted_at IS NULL AND status = 'accepted';
```

**GIN Indexes** (for arrays and JSONB):
```sql
CREATE INDEX idx_group_schedules_participants
ON group_schedules USING GIN(participant_ids);

CREATE INDEX idx_recommendations_traits
ON recommendations USING GIN(recommended_person_traits);
```

**Full-Text Search**:
```sql
CREATE INDEX idx_shared_hangs_search
ON shared_hangs USING GIN(to_tsvector('english', caption));
```

#### 3. Composite Indexes

For queries with multiple WHERE conditions:

```sql
-- Query: WHERE user_id = ? AND status = ? AND deleted_at IS NULL
CREATE INDEX idx_connections_user_status_active
ON connections(user_id, status)
WHERE deleted_at IS NULL;
```

### Index Maintenance

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM recommendations
WHERE user_id = '123' AND expires_at > NOW();

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Find unused indexes
SELECT schemaname, tablename, indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND schemaname = 'public';

-- Rebuild indexes (if fragmented)
REINDEX TABLE connections;
```

---

## Row Level Security

### RLS Philosophy

1. **Deny by Default**: No access unless explicitly granted
2. **Layer Security**: RLS + API validation + client checks
3. **Performance**: RLS policies must be efficient
4. **Test Thoroughly**: Test with multiple user scenarios

### Connection Policies

```sql
-- ============================================
-- RLS POLICIES: connections
-- ============================================

-- Policy: Users can view their own connections
CREATE POLICY "Users view own connections"
ON connections FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR friend_id = auth.uid()
);

-- Policy: Users can create connection requests
CREATE POLICY "Users can request friendships"
ON connections FOR INSERT
TO authenticated
WITH CHECK (
  requested_by = auth.uid() AND
  (user_id = auth.uid() OR friend_id = auth.uid()) AND
  status = 'pending'
);

-- Policy: Users can accept/decline requests to them
CREATE POLICY "Users can respond to requests"
ON connections FOR UPDATE
TO authenticated
USING (
  friend_id = auth.uid() AND
  status = 'pending'
)
WITH CHECK (
  friend_id = auth.uid() AND
  status IN ('accepted', 'declined')
);

-- Policy: Users can delete their own connections
CREATE POLICY "Users can remove connections"
ON connections FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR friend_id = auth.uid()
)
WITH CHECK (
  deleted_at IS NOT NULL
);

-- Policy: Users can block others
CREATE POLICY "Users can block"
ON connections FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid() AND
  status = 'blocked'
);
```

### Recommendation Policies

```sql
-- ============================================
-- RLS POLICIES: recommendations
-- ============================================

-- Policy: Users can only see their own recommendations
CREATE POLICY "Users view own recommendations"
ON recommendations FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: System can create recommendations (via service role)
-- (No INSERT policy for regular users)

-- Policy: Users can update their own recommendations (mark viewed, acted on)
CREATE POLICY "Users update own recommendations"
ON recommendations FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### Privacy-Aware Roster Access

```sql
-- ============================================
-- RLS POLICIES: roster (social access)
-- ============================================

-- Policy: Users can always see their own roster
CREATE POLICY "Users view own roster"
ON roster FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Friends can view roster based on privacy settings
CREATE POLICY "Friends view roster with privacy"
ON roster FOR SELECT
TO authenticated
USING (
  -- Check if viewer is a friend
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
  -- Check privacy settings
  EXISTS (
    SELECT 1 FROM privacy_settings ps
    WHERE ps.user_id = roster.user_id
      AND ps.show_roster_names = TRUE
  )
  AND
  -- Check if roster entry is not private
  roster.is_private = FALSE
);

-- Policy: Specific roster shares
CREATE POLICY "View shared roster entries"
ON roster FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM roster_shares rs
    WHERE rs.roster_id = roster.id
      AND rs.shared_with = auth.uid()
      AND rs.revoked_at IS NULL
  )
);
```

### Shared Hangs Policies

```sql
-- ============================================
-- RLS POLICIES: shared_hangs
-- ============================================

-- Policy: Users see their own shared hangs
CREATE POLICY "Users view own shared hangs"
ON shared_hangs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Friends see shared hangs based on visibility
CREATE POLICY "Friends view shared hangs"
ON shared_hangs FOR SELECT
TO authenticated
USING (
  visibility = 'friends' AND
  deleted_at IS NULL AND
  is_hidden = FALSE AND
  EXISTS (
    SELECT 1 FROM connections c
    WHERE c.status = 'accepted'
      AND c.deleted_at IS NULL
      AND (
        (c.user_id = shared_hangs.user_id AND c.friend_id = auth.uid()) OR
        (c.friend_id = shared_hangs.user_id AND c.user_id = auth.uid())
      )
  )
);

-- Policy: Specific users see when explicitly shared
CREATE POLICY "View specifically shared hangs"
ON shared_hangs FOR SELECT
TO authenticated
USING (
  visibility = 'specific' AND
  auth.uid() = ANY(visible_to_user_ids)
);

-- Policy: Users can create shared hangs
CREATE POLICY "Users create shared hangs"
ON shared_hangs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own shared hangs
CREATE POLICY "Users update own shared hangs"
ON shared_hangs FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### Testing RLS Policies

```sql
-- Test as user1
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub = 'user1-uuid';

-- Should see own connections
SELECT * FROM connections WHERE user_id = 'user1-uuid';

-- Should NOT see other users' recommendations
SELECT * FROM recommendations WHERE user_id = 'user2-uuid';
-- Returns: 0 rows

-- Reset
RESET ROLE;
```

---

## Triggers & Functions

### 1. Update Connection Strength

Automatically increase connection strength on interactions:

```sql
-- Function: Update connection strength on interaction
CREATE OR REPLACE FUNCTION update_connection_strength()
RETURNS TRIGGER AS $$
BEGIN
  -- Increase connection strength based on action
  UPDATE connections
  SET
    connection_strength = LEAST(100, connection_strength + 5),
    last_interaction_at = NOW()
  WHERE (user_id = NEW.user_id AND friend_id = NEW.related_user_id)
     OR (friend_id = NEW.user_id AND user_id = NEW.related_user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on hang reactions
CREATE TRIGGER trigger_connection_strength_hang_reaction
AFTER INSERT ON hang_reactions
FOR EACH ROW
EXECUTE FUNCTION update_connection_strength();

-- Trigger on roster shares
CREATE TRIGGER trigger_connection_strength_roster_share
AFTER INSERT ON roster_shares
FOR EACH ROW
EXECUTE FUNCTION update_connection_strength();
```

### 2. Denormalize Engagement Counters

Update counters for performance:

```sql
-- Function: Update shared hang counters
CREATE OR REPLACE FUNCTION update_shared_hang_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shared_hangs
    SET
      like_count = CASE WHEN NEW.reaction_type = 'like' THEN like_count + 1 ELSE like_count END,
      comment_count = CASE WHEN NEW.reaction_type = 'comment' THEN comment_count + 1 ELSE comment_count END,
      interested_count = CASE WHEN NEW.reaction_type = 'interested' THEN interested_count + 1 ELSE interested_count END,
      updated_at = NOW()
    WHERE id = NEW.shared_hang_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shared_hangs
    SET
      like_count = CASE WHEN OLD.reaction_type = 'like' THEN GREATEST(0, like_count - 1) ELSE like_count END,
      comment_count = CASE WHEN OLD.reaction_type = 'comment' THEN GREATEST(0, comment_count - 1) ELSE comment_count END,
      interested_count = CASE WHEN OLD.reaction_type = 'interested' THEN GREATEST(0, interested_count - 1) ELSE interested_count END,
      updated_at = NOW()
    WHERE id = OLD.shared_hang_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hang_counters
AFTER INSERT OR DELETE ON hang_reactions
FOR EACH ROW
EXECUTE FUNCTION update_shared_hang_counters();
```

### 3. Auto-Create Privacy Settings

Create default privacy settings for new users:

```sql
-- Function: Initialize privacy settings for new user
CREATE OR REPLACE FUNCTION initialize_privacy_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO privacy_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_initialize_privacy
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION initialize_privacy_settings();
```

### 4. Notification Creation

Auto-create notifications for events:

```sql
-- Function: Create notification on friend request
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      related_user_id,
      action_url,
      icon
    )
    VALUES (
      NEW.friend_id,
      'friend_request_received',
      'New friend request',
      (SELECT display_name || ' wants to connect' FROM users WHERE id = NEW.user_id),
      NEW.user_id,
      '/friends?tab=requests',
      '🤝'
    );
  ELSIF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Notify the requester
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      related_user_id,
      action_url,
      icon
    )
    VALUES (
      NEW.requested_by,
      'friend_request_accepted',
      'Friend request accepted',
      (SELECT display_name || ' accepted your friend request' FROM users WHERE id = NEW.friend_id),
      NEW.friend_id,
      '/friends',
      '🎉'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_friend_request
AFTER INSERT OR UPDATE ON connections
FOR EACH ROW
EXECUTE FUNCTION notify_friend_request();
```

### 5. Activity Logging

Automatically log important actions:

```sql
-- Function: Log social activity
CREATE OR REPLACE FUNCTION log_social_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_action_type VARCHAR(100);
  v_category VARCHAR(50);
BEGIN
  -- Determine action type and category based on table
  IF TG_TABLE_NAME = 'connections' THEN
    v_category := 'connection';
    v_action_type := 'connection_' || NEW.status;
  ELSIF TG_TABLE_NAME = 'recommendations' AND NEW.acted_on = TRUE THEN
    v_category := 'recommendation';
    v_action_type := 'recommendation_' || NEW.action_type;
  ELSIF TG_TABLE_NAME = 'shared_hangs' THEN
    v_category := 'hang';
    v_action_type := 'hang_shared';
  END IF;

  INSERT INTO activity_log (
    user_id,
    action_type,
    action_category,
    target_object_type,
    target_object_id,
    details
  )
  VALUES (
    COALESCE(NEW.user_id, auth.uid()),
    v_action_type,
    v_category,
    TG_TABLE_NAME,
    NEW.id,
    to_jsonb(NEW)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER trigger_log_connection_activity
AFTER INSERT OR UPDATE ON connections
FOR EACH ROW
EXECUTE FUNCTION log_social_activity();

CREATE TRIGGER trigger_log_recommendation_activity
AFTER UPDATE ON recommendations
FOR EACH ROW
WHEN (NEW.acted_on = TRUE AND OLD.acted_on = FALSE)
EXECUTE FUNCTION log_social_activity();
```

---

## Data Integrity & Constraints

### Foreign Key Cascade Rules

| Table | FK Column | On Delete | Rationale |
|-------|-----------|-----------|-----------|
| connections | user_id | CASCADE | Remove all connections when user deleted |
| connections | friend_id | CASCADE | Remove connections when friend deleted |
| recommendations | user_id | CASCADE | Remove recommendations when user deleted |
| shared_hangs | user_id | CASCADE | Remove shared content when user deleted |
| shared_hangs | hang_id | CASCADE | Remove share when hang deleted |
| roster_shares | roster_id | CASCADE | Remove share when roster entry deleted |
| notifications | user_id | CASCADE | Remove notifications when user deleted |
| notifications | related_user_id | SET NULL | Keep notification but clear reference |

### Check Constraints

```sql
-- Connections: Prevent self-friending
ALTER TABLE connections
ADD CONSTRAINT no_self_friendship
CHECK (user_id != friend_id);

-- Recommendations: Valid confidence scores
ALTER TABLE recommendations
ADD CONSTRAINT valid_confidence_range
CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0);

-- Shared Hangs: Positive counters
ALTER TABLE shared_hangs
ADD CONSTRAINT positive_counters
CHECK (
  like_count >= 0 AND
  comment_count >= 0 AND
  interested_count >= 0
);

-- Privacy Settings: Valid thresholds
ALTER TABLE privacy_settings
ADD CONSTRAINT valid_recommendation_threshold
CHECK (min_confidence_threshold BETWEEN 0.0 AND 1.0);
```

### Unique Constraints

```sql
-- Prevent duplicate connections (bidirectional)
CREATE UNIQUE INDEX unique_connection_pair
ON connections (LEAST(user_id, friend_id), GREATEST(user_id, friend_id))
WHERE deleted_at IS NULL;

-- Prevent duplicate reactions (one per user per hang per type)
CREATE UNIQUE INDEX unique_user_reaction
ON hang_reactions (shared_hang_id, user_id, reaction_type)
WHERE deleted_at IS NULL;

-- Prevent duplicate roster shares
CREATE UNIQUE INDEX unique_roster_share
ON roster_shares (roster_id, shared_by, shared_with)
WHERE revoked_at IS NULL;
```

---

## Backup & Recovery

### Backup Strategy

#### 1. Continuous Backups (Supabase Pro)
- Automatic point-in-time recovery
- Retain backups for 30 days
- Test restore monthly

#### 2. Daily Snapshots
```bash
#!/bin/bash
# backup-social-tables.sh

DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/when2crack/$DATE"

mkdir -p "$BACKUP_DIR"

# Backup each social table
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -t connections \
  -t recommendations \
  -t shared_hangs \
  -t hang_reactions \
  -t privacy_settings \
  -t roster_shares \
  -t group_schedules \
  -t notifications \
  --file="$BACKUP_DIR/social_tables_$DATE.sql"

# Compress
gzip "$BACKUP_DIR/social_tables_$DATE.sql"

# Upload to S3
aws s3 cp "$BACKUP_DIR/social_tables_$DATE.sql.gz" \
  s3://when2crack-backups/daily/

# Delete local backup after 7 days
find /backups/when2crack -type d -mtime +7 -exec rm -rf {} \;
```

#### 3. Critical Data Protection

For highest value data (connections, recommendations):

```sql
-- Create immutable audit copies
CREATE TABLE connections_audit (LIKE connections INCLUDING ALL);

CREATE OR REPLACE FUNCTION audit_connection_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO connections_audit SELECT NEW.*;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_connections
AFTER INSERT OR UPDATE ON connections
FOR EACH ROW
EXECUTE FUNCTION audit_connection_changes();
```

### Recovery Procedures

#### Scenario 1: Accidental Data Deletion

```sql
-- Soft delete recovery (restore from deleted_at)
UPDATE connections
SET deleted_at = NULL
WHERE user_id = 'affected-user-id'
  AND deleted_at > '2026-05-11 10:00:00';

-- Hard delete recovery (from backup)
-- 1. Restore backup to temp database
-- 2. Copy specific rows
INSERT INTO connections
SELECT * FROM temp_db.connections
WHERE user_id = 'affected-user-id'
  AND id NOT IN (SELECT id FROM connections);
```

#### Scenario 2: Corrupted Recommendations

```sql
-- Regenerate recommendations for affected users
DELETE FROM recommendations WHERE user_id IN (
  SELECT DISTINCT user_id
  FROM recommendations
  WHERE created_at > '2026-05-11'
    AND confidence_score = 0
);

-- Trigger regeneration via application
-- (Run recommendation batch job)
```

#### Scenario 3: Privacy Violation

```sql
-- Immediately revoke access
UPDATE roster_shares
SET revoked_at = NOW()
WHERE shared_with = 'affected-user-id';

-- Remove from recommendations
DELETE FROM recommendations
WHERE source_user_ids @> ARRAY['affected-user-id'];

-- Notify affected users
INSERT INTO notifications (user_id, type, title, message)
SELECT DISTINCT user_id, 'privacy_alert', 'Privacy Update',
  'Your privacy settings have been updated'
FROM roster_shares
WHERE shared_with = 'affected-user-id';
```

---

## Performance Monitoring

### Key Queries to Monitor

```sql
-- 1. Slow query: Friend recommendations generation
SELECT
  r.*,
  array_agg(u.display_name) as friends
FROM recommendations r
JOIN LATERAL unnest(r.source_user_ids) WITH ORDINALITY AS source_id ON true
JOIN users u ON u.id = source_id::uuid
WHERE r.user_id = $1
GROUP BY r.id;

-- 2. Activity feed (potentially slow with many friends)
SELECT sh.*, u.display_name, COUNT(hr.id) as reactions
FROM shared_hangs sh
JOIN users u ON u.id = sh.user_id
LEFT JOIN hang_reactions hr ON hr.shared_hang_id = sh.id
WHERE sh.user_id IN (
  SELECT friend_id FROM connections WHERE user_id = $1 AND status = 'accepted'
)
GROUP BY sh.id, u.display_name
ORDER BY sh.created_at DESC
LIMIT 20;

-- 3. Group schedule availability matching
SELECT gs.*,
  array_agg(u.display_name) as participants
FROM group_schedules gs
JOIN LATERAL unnest(gs.participant_ids) WITH ORDINALITY AS part_id ON true
JOIN users u ON u.id = part_id::uuid
WHERE $1 = ANY(gs.participant_ids)
GROUP BY gs.id;
```

### Query Optimization

```sql
-- Add EXPLAIN ANALYZE to identify bottlenecks
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM recommendations WHERE user_id = 'xxx';

-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND tablename IN ('connections', 'recommendations', 'shared_hangs')
ORDER BY abs(correlation) DESC;
```

### Database Statistics

```sql
-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

---

## Appendix: Complete DDL

See individual migration files for complete table definitions.

**Total Tables**: 9 new + 2 updated = 11 tables
**Total Indexes**: ~50 indexes
**Total RLS Policies**: ~25 policies
**Total Triggers**: ~8 triggers
**Total Functions**: ~6 functions

**Estimated Database Size** (1M users, 5M connections, 10M recommendations):
- connections: ~500 MB
- recommendations: ~2 GB
- shared_hangs: ~800 MB
- hang_reactions: ~400 MB
- notifications: ~1.5 GB (with cleanup)
- **Total**: ~5-6 GB

**Query Performance Targets**:
- Friend list: < 50ms
- Activity feed: < 100ms
- Recommendations: < 150ms
- Group schedule matching: < 200ms

---

*End of Database Architecture Deep Dive*
