-- Migration: Add user achievements tracking table
-- Run this SQL in your Supabase SQL Editor

-- User Achievements table - track unlocked achievements for authenticated users
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  seen BOOLEAN DEFAULT FALSE,
  progress INTEGER DEFAULT 100, -- Progress percentage at time of unlock (usually 100)
  UNIQUE(user_id, achievement_id) -- One achievement per user
);

-- Enable RLS on user_achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements"
  ON public.user_achievements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own achievements"
  ON public.user_achievements FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON public.user_achievements(unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_seen ON public.user_achievements(user_id, seen) WHERE seen = FALSE;

-- Comment on table
COMMENT ON TABLE public.user_achievements IS 'Tracks which achievements users have unlocked';
COMMENT ON COLUMN public.user_achievements.achievement_id IS 'Reference to achievement ID from app code (not a foreign key since achievements are defined in code)';
COMMENT ON COLUMN public.user_achievements.seen IS 'Whether user has seen the achievement unlock notification';
COMMENT ON COLUMN public.user_achievements.progress IS 'Progress percentage at time of unlock (for tracking purposes)';
