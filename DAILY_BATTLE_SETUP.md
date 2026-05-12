# Daily Battle Combination System Setup

This document explains how to set up the new daily battle combination system.

## Overview

The battle system now uses a **daily combination manager** that:
- Generates all possible person combinations at the start of each day
- Presents them in order (sorted by ELO difference - closer matches first)
- Tracks which combinations have been shown
- Displays an exhaustion screen when all comparisons are complete
- **Resets daily at midnight** for a fresh set of comparisons

## Database Migration

Run the following SQL in your Supabase SQL Editor:

```bash
# Copy the contents of supabase-daily-combinations.sql and run it in Supabase
```

This will:
1. Create the `daily_battle_combinations` table
2. Set up RLS policies
3. Create helper functions:
   - `initialize_daily_combinations(user_id)` - Generates all combinations for today
   - `get_next_daily_battle_pair(user_id)` - Returns the next unshown pair
   - `mark_combination_shown(user_id, person1_id, person2_id)` - Marks a pair as shown

## How It Works

### For Authenticated Users

1. When the battle page loads, it calls `/api/battles/pair`
2. The API calls `get_next_daily_battle_pair()` which:
   - Auto-initializes combinations for today if needed
   - Cleans up old combinations from previous days
   - Returns the next unshown combination (sorted by ELO difference)
3. When a battle is completed, `mark_combination_shown()` is called
4. When all combinations are exhausted, the "Out of Comparisons" screen is shown
5. At midnight (new day), the system auto-generates fresh combinations

### For Guest Users

1. Combinations are stored in localStorage
2. Daily reset is tracked by comparing dates
3. Fresh combinations are generated when:
   - First visit of the day
   - After hitting reset button
4. Progress is tracked locally

## Key Features

### Stack Ranking
Combinations are sorted by ELO difference (ascending), so:
- Close matches appear first
- More interesting/competitive battles are prioritized
- Clear mismatches appear later

### Daily Reset
- Automatically resets at midnight
- Users can complete all combinations each day
- Fresh start every day for re-evaluation

### Exhaustion Screen
When all combinations are complete:
- **Authenticated users**: "Come back tomorrow" message
- **Guest users**: "Start Over" button to reset

### Progress Tracking
- Shows "Battle X of Y • Resets daily"
- Tracks remaining combinations
- Updates in real-time

## Benefits

1. **Structured Progress**: Users know exactly how many comparisons remain
2. **Daily Engagement**: Fresh battles every day encourage daily visits
3. **Better Ranking**: Close matches first = more accurate ELO ratings
4. **No Repeats**: Each combination shown once per day (no random duplicates)
5. **Clean UX**: Clear completion state with daily reset messaging

## Testing

1. Add 3+ people to your roster
2. Complete a few battles
3. Check progress counter updates
4. Complete all battles to see exhaustion screen
5. (Authenticated) Verify "come back tomorrow" message
6. (Guest) Verify "Start Over" button works
7. Change system date to tomorrow and refresh to test daily reset

## Migration Notes

- Existing battle history is preserved
- ELO ratings are not affected
- Old battle pairs can still be viewed in history
- Guest mode automatically converts to new system on next visit
