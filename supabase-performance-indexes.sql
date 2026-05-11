-- Performance optimization indexes for when2crack
-- Run these in your Supabase SQL Editor to speed up queries

-- Index for roster queries (user_id + status filtering)
CREATE INDEX IF NOT EXISTS idx_roster_user_status
ON roster(user_id, status)
WHERE status != 'Archived';

-- Index for roster queries (user_id + elo_rating for sorting)
CREATE INDEX IF NOT EXISTS idx_roster_user_elo
ON roster(user_id, elo_rating DESC);

-- Index for battles queries (user_id + created_at)
CREATE INDEX IF NOT EXISTS idx_battles_user_created
ON battles(user_id, created_at DESC);

-- Index for battles queries (user_id + winner_id + loser_id for pair lookups)
CREATE INDEX IF NOT EXISTS idx_battles_user_pair
ON battles(user_id, winner_id, loser_id);

-- Analyze tables to update query planner statistics
ANALYZE roster;
ANALYZE battles;
