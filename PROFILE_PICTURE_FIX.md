# Profile Picture Bug Fix

## Issues Found

The profile picture feature was displaying as a black circle due to multiple issues:

1. **Missing Database Column**: The `users` table was missing the `avatar_url` column in the main schema file
2. **Poor Null Handling**: The code didn't properly check for various falsy values like `'null'`, `'undefined'`, empty strings
3. **No Error Handling**: Images that failed to load had no fallback mechanism
4. **No Background Color**: The image containers didn't have a white background, which could cause black circles to appear

## Fixes Applied

### 1. Database Schema Update
**File**: `supabase-schema.sql`

Added `avatar_url TEXT` column to the `users` table to match the migration file.

```sql
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  avatar_url TEXT,  -- ADDED THIS LINE
  availability_window_start TIME DEFAULT '18:00:00',
  availability_window_end TIME DEFAULT '23:00:00',
  panic_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Action Required**: Run this SQL in your Supabase SQL Editor:
```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

### 2. Improved Avatar Validation
Updated the avatar URL checking logic in all components to properly handle:
- `null` and `undefined` values
- Empty strings (`''`)
- String literals `'null'` and `'undefined'` (which can happen with localStorage)

**Files Updated**:
- `app/(app)/profile/page.tsx` - User's own profile page
- `app/(app)/profile/[id]/page.tsx` - Individual roster person profile
- `components/RosterCard.tsx` - Roster list view
- `components/BattleCard.tsx` - Battle comparison view
- `components/TonightCard.tsx` - Tonight recommendations view
- `components/TonightSwipeStack.tsx` - Swipeable tonight view

### 3. Added Error Handling
All image elements now have `onError` handlers that:
- Hide the broken image
- Show the default fallback (egg.png for user profile, initials for roster people)

### 4. Added White Background
All avatar containers now have `bg-white` class to prevent black circles from appearing when images fail to load.

## Testing Checklist

To verify the fix works:

- [ ] Run the database migration to add `avatar_url` to users table
- [ ] Test user profile without photo (should show egg.png)
- [ ] Upload a profile picture (should display correctly)
- [ ] Test with invalid/broken image URL (should fallback gracefully)
- [ ] Test in guest mode (localStorage)
- [ ] Test in authenticated mode (Supabase)
- [ ] Verify roster person profiles show initials by default
- [ ] Upload photo for roster person (should work)
- [ ] Check all views: Roster, Battle, Tonight, History

## Default Profile Picture

The default profile picture uses `/public/egg.png` - a cute egg icon that displays when no avatar is set.

## Image Upload Flow

1. User clicks/hovers on profile picture
2. Selects image (max 5MB, any image format)
3. Image is compressed to 400x400px, JPEG 80% quality
4. Stored as base64 data URL
5. Guest mode: Saved to localStorage (`user_avatar`)
6. Authenticated mode: Saved to Supabase `users.avatar_url`

## Next Steps

1. Run the database migration
2. Test the profile picture upload feature
3. Verify default images display correctly
4. Check all views where avatars appear
