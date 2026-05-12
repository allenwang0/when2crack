-- Daily Battle Combinations Table
-- Tracks which combinations have been shown to users each day
-- Resets daily for a fresh set of comparisons

CREATE TABLE IF NOT EXISTS public.daily_battle_combinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  battle_date DATE NOT NULL DEFAULT CURRENT_DATE,
  person1_id UUID NOT NULL REFERENCES public.roster(id) ON DELETE CASCADE,
  person2_id UUID NOT NULL REFERENCES public.roster(id) ON DELETE CASCADE,
  shown BOOLEAN DEFAULT FALSE,
  shown_order INTEGER,
  elo_difference INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.daily_battle_combinations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own daily combinations"
  ON public.daily_battle_combinations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily combinations"
  ON public.daily_battle_combinations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily combinations"
  ON public.daily_battle_combinations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily combinations"
  ON public.daily_battle_combinations FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_combinations_user_date
  ON public.daily_battle_combinations(user_id, battle_date);

CREATE INDEX IF NOT EXISTS idx_daily_combinations_shown_order
  ON public.daily_battle_combinations(user_id, battle_date, shown, shown_order);

-- Unique constraint: one combination per user per day (regardless of order)
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_combinations_unique
  ON public.daily_battle_combinations(user_id, battle_date, LEAST(person1_id, person2_id), GREATEST(person1_id, person2_id));

-- Function to initialize daily combinations
CREATE OR REPLACE FUNCTION initialize_daily_combinations(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_roster_person RECORD;
  v_roster_person2 RECORD;
  v_active_count INTEGER;
  v_roster CURSOR FOR
    SELECT id, elo_rating
    FROM public.roster
    WHERE user_id = p_user_id
      AND status != 'Archived'
    ORDER BY elo_rating DESC;
BEGIN
  -- Clear old combinations for this user from previous days
  DELETE FROM public.daily_battle_combinations
  WHERE user_id = p_user_id
    AND battle_date < CURRENT_DATE;

  -- Check if combinations already exist for today
  IF EXISTS (
    SELECT 1
    FROM public.daily_battle_combinations
    WHERE user_id = p_user_id
      AND battle_date = CURRENT_DATE
  ) THEN
    RETURN; -- Already initialized for today
  END IF;

  -- Performance safeguard: Check roster size
  SELECT COUNT(*) INTO v_active_count
  FROM public.roster
  WHERE user_id = p_user_id
    AND status != 'Archived';

  -- Skip if roster too large (would generate too many combinations)
  IF v_active_count > 50 THEN
    RAISE NOTICE 'Roster too large (% people). Max 50 active people for daily battles.', v_active_count;
    RETURN;
  END IF;

  -- Generate all combinations sorted by ELO difference
  FOR v_roster_person IN v_roster LOOP
    FOR v_roster_person2 IN v_roster LOOP
      IF v_roster_person2.id > v_roster_person.id THEN
        INSERT INTO public.daily_battle_combinations (
          user_id,
          battle_date,
          person1_id,
          person2_id,
          elo_difference
        )
        VALUES (
          p_user_id,
          CURRENT_DATE,
          v_roster_person.id,
          v_roster_person2.id,
          ABS(v_roster_person.elo_rating - v_roster_person2.elo_rating)
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next battle pair from daily combinations
CREATE OR REPLACE FUNCTION get_next_daily_battle_pair(p_user_id UUID)
RETURNS TABLE (
  person1_id UUID,
  person2_id UUID,
  remaining_count BIGINT,
  total_count BIGINT
) AS $$
DECLARE
  v_exists_count BIGINT;
BEGIN
  -- Fast-path: Check if combinations already exist for today
  -- This avoids expensive initialization check on every API call
  SELECT COUNT(*) INTO v_exists_count
  FROM public.daily_battle_combinations
  WHERE user_id = p_user_id
    AND battle_date = CURRENT_DATE
  LIMIT 1;

  -- Only initialize if no combinations exist
  IF v_exists_count = 0 THEN
    PERFORM initialize_daily_combinations(p_user_id);
  END IF;

  -- Get the next unshown combination
  RETURN QUERY
  SELECT
    dbc.person1_id,
    dbc.person2_id,
    (SELECT COUNT(*) FROM public.daily_battle_combinations
     WHERE user_id = p_user_id
       AND battle_date = CURRENT_DATE
       AND NOT shown) as remaining_count,
    (SELECT COUNT(*) FROM public.daily_battle_combinations
     WHERE user_id = p_user_id
       AND battle_date = CURRENT_DATE) as total_count
  FROM public.daily_battle_combinations dbc
  WHERE dbc.user_id = p_user_id
    AND dbc.battle_date = CURRENT_DATE
    AND NOT dbc.shown
  ORDER BY dbc.elo_difference ASC, dbc.created_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark a combination as shown
CREATE OR REPLACE FUNCTION mark_combination_shown(
  p_user_id UUID,
  p_person1_id UUID,
  p_person2_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_max_order INTEGER;
BEGIN
  -- Get the max shown_order
  SELECT COALESCE(MAX(shown_order), 0) INTO v_max_order
  FROM public.daily_battle_combinations
  WHERE user_id = p_user_id
    AND battle_date = CURRENT_DATE;

  -- Mark as shown (works regardless of person order)
  UPDATE public.daily_battle_combinations
  SET shown = TRUE,
      shown_order = v_max_order + 1
  WHERE user_id = p_user_id
    AND battle_date = CURRENT_DATE
    AND (
      (person1_id = p_person1_id AND person2_id = p_person2_id) OR
      (person1_id = p_person2_id AND person2_id = p_person1_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
