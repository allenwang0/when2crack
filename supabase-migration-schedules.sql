-- Migration: Add schedules and when2crack tracking tables
-- Run this SQL in your Supabase SQL Editor

-- Schedules table - store weekly availability for authenticated users
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL, -- Monday of the week
  slots JSONB NOT NULL, -- Array of slot strings like ["Mon-18", "Tue-20"]
  timezone TEXT NOT NULL, -- User's timezone when schedule was created
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start_date) -- One schedule per week per user
);

-- Enable RLS on schedules
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schedules
CREATE POLICY "Users can view their own schedules"
  ON public.schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedules"
  ON public.schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedules"
  ON public.schedules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedules"
  ON public.schedules FOR DELETE
  USING (auth.uid() = user_id);

-- When2Crack shares tracking table
CREATE TABLE IF NOT EXISTS public.when2crack_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_roster_id UUID REFERENCES public.roster(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL, -- Store name in case roster entry is deleted
  share_url TEXT NOT NULL,
  schedule_data JSONB NOT NULL, -- Store the encoded schedule data
  viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMPTZ,
  responded BOOLEAN DEFAULT FALSE,
  responded_at TIMESTAMPTZ,
  response_url TEXT, -- URL where recipient filled out their schedule
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on when2crack_shares
ALTER TABLE public.when2crack_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for when2crack_shares
CREATE POLICY "Users can view their own sent shares"
  ON public.when2crack_shares FOR SELECT
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can insert their own shares"
  ON public.when2crack_shares FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own shares"
  ON public.when2crack_shares FOR UPDATE
  USING (auth.uid() = sender_id);

-- Trigger to update schedules.updated_at
CREATE OR REPLACE FUNCTION update_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schedules_updated_at_trigger
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_schedules_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON public.schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_week_start ON public.schedules(week_start_date);
CREATE INDEX IF NOT EXISTS idx_when2crack_shares_sender ON public.when2crack_shares(sender_id);
CREATE INDEX IF NOT EXISTS idx_when2crack_shares_roster ON public.when2crack_shares(recipient_roster_id);
CREATE INDEX IF NOT EXISTS idx_when2crack_shares_created ON public.when2crack_shares(created_at DESC);
