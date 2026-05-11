# Custom Profile Picture Feature

## Summary
Added the ability for users to upload their own profile picture. Profile pictures are now displayed throughout the app in:
- User's own profile page
- Roster cards
- Battle cards
- Tonight recommendations
- History/hang log

## Changes Made

### 1. Database Migration
**File:** `supabase-migration-user-avatar.sql` (NEW)
- Added `avatar_url` column to the `users` table
- Stores base64-encoded profile pictures (max 400x400px, JPEG 80% quality)

**To apply:** Run this SQL in your Supabase SQL Editor

### 2. User Profile Page Updates
**File:** `app/(app)/profile/page.tsx`

**New Features:**
- Click/hover on profile picture to upload your own photo
- Remove photo button (X button in top-right corner)
- Toast notifications for success/error feedback
- Image compression (max 5MB, automatically resized to 400x400px)
- Guest mode: Stores in localStorage (`user_avatar`)
- Authenticated mode: Stores in Supabase `users.avatar_url`

**New Functions:**
- `handlePhotoUpload()` - Handles image selection, compression, and saving
- `handleRemovePhoto()` - Removes the profile picture

**UI Changes:**
- Profile picture displays with pink border when uploaded
- Hover overlay with camera icon for upload
- Fallback to gradient circle with user icon if no photo

### 3. Components Already Supporting Avatars
These components were already built to display profile pictures from the `avatar_url` field:

✓ **RosterCard** (`components/RosterCard.tsx`)
  - Shows person avatars in roster list (12x12 size)

✓ **BattleCard** (`components/BattleCard.tsx`)
  - Shows person avatars in battle comparisons (24x24 size)

✓ **TonightCard** (`components/TonightCard.tsx`)
  - Shows person avatars in tonight recommendations (12x12 size)

✓ **History Page** (`app/(app)/history/page.tsx`)
  - Shows person avatars in hang history log (12x12 size)

## How It Works

### For Roster People
People in your roster can have profile pictures uploaded from their individual profile pages (`/profile/[id]`). This feature was already implemented.

### For Your Own Profile (NEW)
1. Go to your profile page (`/profile`)
2. Hover over your profile picture circle
3. Click the camera icon to upload
4. Select an image (max 5MB, any image format)
5. Image is automatically compressed and saved
6. Click the X button in the top-right to remove the photo

### Storage
- **Guest Mode:** Stored in `localStorage` under `user_avatar` key
- **Authenticated Mode:** Stored in Supabase `users` table, `avatar_url` column

### Image Compression
Uses the existing `lib/utils/imageCompression.ts` utility:
- Max dimensions: 400x400px (maintains aspect ratio)
- Format: JPEG at 80% quality
- High-quality smoothing enabled
- Stored as base64 data URL

## Testing
Build completed successfully with no errors:
```
✓ Compiled successfully
✓ Generating static pages (18/18)
```

## Next Steps
To enable this feature in production:
1. Run the SQL migration in Supabase SQL Editor
2. Deploy the updated code
3. Users can immediately start uploading their profile pictures
