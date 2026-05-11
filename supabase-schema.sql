-- When2Crack Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  availability_window_start TIME DEFAULT '18:00:00',
  availability_window_end TIME DEFAULT '23:00:00',
  panic_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Roster table
CREATE TABLE IF NOT EXISTS public.roster (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('S', 'A', 'B', 'C')),
  status TEXT NOT NULL CHECK (status IN ('New', 'Chatting', 'Met Once', 'Regular', 'Archived')),
  attraction_score INTEGER DEFAULT 5 CHECK (attraction_score >= 1 AND attraction_score <= 10),
  personality_score INTEGER DEFAULT 5 CHECK (personality_score >= 1 AND personality_score <= 10),
  reliability_score INTEGER DEFAULT 5 CHECK (reliability_score >= 1 AND reliability_score <= 10),
  elo_rating INTEGER DEFAULT 1200,
  notes TEXT,
  avatar_color TEXT DEFAULT '#ff6b9d',
  avatar_url TEXT,
  last_contact_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on roster
ALTER TABLE public.roster ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roster
CREATE POLICY "Users can view their own roster"
  ON public.roster FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roster entries"
  ON public.roster FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own roster entries"
  ON public.roster FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own roster entries"
  ON public.roster FOR DELETE
  USING (auth.uid() = user_id);

-- Hangs table (interaction log)
CREATE TABLE IF NOT EXISTS public.hangs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  roster_id UUID NOT NULL REFERENCES public.roster(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hang_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attraction_change INTEGER DEFAULT 0 CHECK (attraction_change >= -1 AND attraction_change <= 1),
  personality_change INTEGER DEFAULT 0 CHECK (personality_change >= -1 AND personality_change <= 1),
  reliability_change INTEGER DEFAULT 0 CHECK (reliability_change >= -1 AND reliability_change <= 1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on hangs
ALTER TABLE public.hangs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hangs
CREATE POLICY "Users can view their own hangs"
  ON public.hangs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own hangs"
  ON public.hangs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own hangs"
  ON public.hangs FOR DELETE
  USING (auth.uid() = user_id);

-- Battles table (pairwise comparisons)
CREATE TABLE IF NOT EXISTS public.battles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  winner_id UUID NOT NULL REFERENCES public.roster(id) ON DELETE CASCADE,
  loser_id UUID NOT NULL REFERENCES public.roster(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on battles
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for battles
CREATE POLICY "Users can view their own battles"
  ON public.battles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own battles"
  ON public.battles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Outreach log table
CREATE TABLE IF NOT EXISTS public.outreach_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  roster_id UUID NOT NULL REFERENCES public.roster(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  outreach_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on outreach_log
ALTER TABLE public.outreach_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for outreach_log
CREATE POLICY "Users can view their own outreach logs"
  ON public.outreach_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outreach logs"
  ON public.outreach_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outreach logs"
  ON public.outreach_log FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update roster.updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on roster
CREATE TRIGGER update_roster_updated_at
  BEFORE UPDATE ON public.roster
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_roster_user_id ON public.roster(user_id);
CREATE INDEX IF NOT EXISTS idx_roster_tier ON public.roster(tier);
CREATE INDEX IF NOT EXISTS idx_roster_elo_rating ON public.roster(elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_hangs_roster_id ON public.hangs(roster_id);
CREATE INDEX IF NOT EXISTS idx_hangs_user_id ON public.hangs(user_id);
CREATE INDEX IF NOT EXISTS idx_battles_user_id ON public.battles(user_id);
CREATE INDEX IF NOT EXISTS idx_battles_created_at ON public.battles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_user_id ON public.outreach_log(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_roster_id ON public.outreach_log(roster_id);
