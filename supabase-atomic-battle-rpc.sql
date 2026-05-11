-- Atomic Battle RPC Function
-- This function handles battle processing in a single transaction to prevent race conditions

CREATE OR REPLACE FUNCTION process_battle(
  p_user_id UUID,
  p_winner_id UUID,
  p_loser_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_winner_rating INTEGER;
  v_loser_rating INTEGER;
  v_new_winner_rating INTEGER;
  v_new_loser_rating INTEGER;
  v_expected_score_winner NUMERIC;
  v_expected_score_loser NUMERIC;
  v_k_factor INTEGER := 32;
  v_result JSON;
BEGIN
  -- Lock rows for update to prevent concurrent battles on same people
  SELECT elo_rating INTO v_winner_rating
  FROM roster
  WHERE id = p_winner_id AND user_id = p_user_id
  FOR UPDATE;

  SELECT elo_rating INTO v_loser_rating
  FROM roster
  WHERE id = p_loser_id AND user_id = p_user_id
  FOR UPDATE;

  -- Verify both people exist
  IF v_winner_rating IS NULL OR v_loser_rating IS NULL THEN
    RAISE EXCEPTION 'One or both people not found';
  END IF;

  -- Calculate expected scores (Elo formula)
  v_expected_score_winner := 1.0 / (1.0 + POWER(10, (v_loser_rating - v_winner_rating) / 400.0));
  v_expected_score_loser := 1.0 / (1.0 + POWER(10, (v_winner_rating - v_loser_rating) / 400.0));

  -- Calculate new ratings
  v_new_winner_rating := v_winner_rating + ROUND(v_k_factor * (1 - v_expected_score_winner));
  v_new_loser_rating := v_loser_rating + ROUND(v_k_factor * (0 - v_expected_score_loser));

  -- Update ratings atomically
  UPDATE roster
  SET elo_rating = v_new_winner_rating
  WHERE id = p_winner_id AND user_id = p_user_id;

  UPDATE roster
  SET elo_rating = v_new_loser_rating
  WHERE id = p_loser_id AND user_id = p_user_id;

  -- Log the battle
  INSERT INTO battles (user_id, winner_id, loser_id)
  VALUES (p_user_id, p_winner_id, p_loser_id);

  -- Return result
  v_result := json_build_object(
    'success', true,
    'winner', json_build_object(
      'id', p_winner_id,
      'old_rating', v_winner_rating,
      'new_rating', v_new_winner_rating,
      'change', v_new_winner_rating - v_winner_rating
    ),
    'loser', json_build_object(
      'id', p_loser_id,
      'old_rating', v_loser_rating,
      'new_rating', v_new_loser_rating,
      'change', v_new_loser_rating - v_loser_rating
    )
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_battle(UUID, UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION process_battle IS 'Atomically processes a battle between two roster members, updating Elo ratings and logging the battle';
