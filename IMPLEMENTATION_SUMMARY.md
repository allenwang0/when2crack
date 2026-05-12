# Daily Battle Combination System - Implementation Summary

## What Was Implemented

A complete **daily combination manager** system for the battle feature that generates all possible person combinations at the start of each day, presents them in order, tracks progress, and automatically resets daily.

## Files Created

### 1. `/lib/algorithms/combination-manager.ts`
- `generateAllCombinations()` - Creates all unique person pairs sorted by ELO difference
- `getNextCombination()` - Returns next unshown combination
- `markCombinationShown()` - Marks a combination as completed
- `areAllCombinationsShown()` - Checks if all done
- `shouldResetCombinations()` - Checks if new day requires reset
- `getTodayDateString()` - Gets current date for tracking

### 2. `/supabase-daily-combinations.sql`
Database migration that creates:
- `daily_battle_combinations` table with RLS policies
- `initialize_daily_combinations()` function - Auto-generates combinations
- `get_next_daily_battle_pair()` function - Returns next pair with progress
- `mark_combination_shown()` function - Updates shown status
- Indexes for performance
- Unique constraint to prevent duplicate combinations

### 3. `/DAILY_BATTLE_SETUP.md`
Setup and usage documentation

## Files Modified

### 1. `/app/api/battles/pair/route.ts`
- Now uses `get_next_daily_battle_pair()` RPC function
- Returns exhaustion state when all combinations complete
- Includes progress tracking (remaining/total)

### 2. `/app/api/battles/route.ts`
- Calls `mark_combination_shown()` after successful battle
- Marks combinations as shown for daily tracking

### 3. `/app/(app)/battle/page.tsx`
Major updates:
- Replaced `completedBattles`/`skippedBattles` with `dailyCombinations` array
- Added `lastResetDate` for daily reset tracking
- Imported combination manager utilities
- Updated `fetchBattlePairGuest()` to use combination manager
- Updated `handleBattleGuest()` to mark combinations as shown
- Updated `handleUndo()` to unmark combinations
- Updated skip button to mark combinations as shown
- Updated progress tracking for both authenticated and guest users
- Updated reset functionality to regenerate combinations
- Added "Resets daily" indicator for authenticated users

### 4. `/components/OutOfComparisons.tsx`
- Added `isAuthenticated` prop
- Shows different messages for authenticated vs guest users:
  - **Authenticated**: "Come back tomorrow" message (no reset button)
  - **Guest**: "Start Over" button to reset
- Updated copy to indicate daily nature

## How It Works

### Daily Cycle
1. **First visit of the day**: System generates all combinations sorted by ELO difference
2. **During the day**: Users complete battles, combinations marked as shown
3. **All complete**: Exhaustion screen displayed
4. **Next day (midnight)**: Auto-resets, fresh combinations generated

### Combination Ordering
- Sorted by ELO difference (ascending)
- Close matches appear first → more competitive/interesting battles
- Creates natural progression from even matches to clear mismatches

### Progress Tracking
- Real-time "Battle X of Y" counter
- Shows remaining combinations
- "Resets daily" indicator for authenticated users

### State Management
- **Authenticated**: PostgreSQL table tracks combinations
- **Guest**: localStorage with date-based reset logic
- Both use same algorithm for consistency

## Benefits

1. **No Duplicate Battles**: Each combination shown once per day
2. **Structured Progress**: Users see clear completion path
3. **Better Rankings**: Close matches first = more accurate ELO
4. **Daily Engagement**: Fresh battles every day
5. **Clear Completion**: Explicit "all done" state
6. **Automatic Reset**: No manual intervention needed

## API Changes

### GET `/api/battles/pair`
**New Response** (when exhausted):
```json
{
  "exhausted": true,
  "message": "All comparisons completed for today!",
  "remaining": 0,
  "total": 28
}
```

**New Response** (normal):
```json
{
  "person1": { ... },
  "person2": { ... },
  "remaining": 15,
  "total": 28
}
```

### POST `/api/battles`
- No API changes, but now also calls `mark_combination_shown()`

## Database Schema

### `daily_battle_combinations` Table
```sql
- id (UUID)
- user_id (UUID, FK to users)
- battle_date (DATE) -- Daily partition key
- person1_id (UUID, FK to roster)
- person2_id (UUID, FK to roster)
- shown (BOOLEAN) -- Completed this combination?
- shown_order (INTEGER) -- Order in which shown
- elo_difference (INTEGER) -- For sorting
- created_at (TIMESTAMP)
```

**Unique Constraint**: (user_id, battle_date, LEAST(person1_id, person2_id), GREATEST(person1_id, person2_id))

## Testing Checklist

- [ ] Run SQL migration in Supabase
- [ ] Add 3+ people to roster
- [ ] Complete a battle, verify progress updates
- [ ] Complete all battles, see exhaustion screen
- [ ] Authenticated: Verify "come back tomorrow" message
- [ ] Guest: Verify "Start Over" button works
- [ ] Skip a battle, verify it's marked as shown
- [ ] Undo a battle (guest mode), verify it's unmarked
- [ ] Change date to tomorrow, verify reset happens
- [ ] Check combinations are sorted by ELO difference

## Migration Path

1. **Run the SQL migration** in Supabase SQL Editor
2. **Deploy the code changes**
3. **Existing users**: No action needed, auto-migrates on next visit
4. **Guest users**: Auto-converts to new system on next visit

## Future Enhancements

Possible improvements:
- Add a "peek at tomorrow" feature showing upcoming battles
- Daily battle streaks/achievements
- Weekly leaderboards based on battle completion
- Alternative sorting methods (random, by tier, by score)
- Battle history view showing completed combinations
