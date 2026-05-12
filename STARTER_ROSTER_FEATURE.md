# Starter Roster Feature

## Overview

New guest users now automatically get two demo profiles added to their roster when they first use the app. This solves the tutorial bug and provides a fun way to teach roster management.

## The Starter Profiles

### Ilya Rozanov
- **Avatar**: `/avatars/ilya.webp`
- **Tier**: S
- **Scores**: Attraction 9, Personality 9, Reliability 8
- **Status**: New
- **Note**: "Demo profile - feel free to delete!"

### Shane Hollander
- **Avatar**: `/avatars/shane.jpg`
- **Tier**: S
- **Scores**: Attraction 9, Personality 8, Reliability 9
- **Status**: New
- **Note**: "Demo profile - feel free to delete!"

## How It Works

1. **Auto-initialization**: When a guest user (not signed in) first loads the app, the `useInitializeStarterRoster` hook checks if they have initialized their roster yet.

2. **One-time setup**: If `starter_roster_initialized` is false and their `guest_roster` is empty, the two starter profiles are automatically added.

3. **Persistent data**: Unlike demo data, these are real roster entries saved to localStorage, so they persist across sessions and work with all app features (battles, recommendations, etc.).

4. **Deletable**: Users can delete or archive these profiles just like any other roster entry. The tutorial specifically teaches them how to do this in step 3.

## Tutorial Integration

The onboarding flow has been updated to include these starter profiles:

- **Step 1**: Mentions the demo profiles are pre-added
- **Step 3** (NEW): Teaches users how to delete/manage roster entries
- **Step 6**: Battle mode now works immediately since users have 2+ people

## Technical Implementation

### Files Created/Modified

1. **`lib/constants/starterRoster.ts`** - Defines the two starter profiles
2. **`lib/hooks/useInitializeStarterRoster.ts`** - Hook that auto-adds profiles on first load
3. **`app/(app)/layout.tsx`** - Calls the initialization hook
4. **`lib/constants/onboardingSteps.ts`** - Updated tutorial steps
5. **`public/avatars/`** - Contains ilya.webp and shane.jpg

### Key Features

- Only runs for guest users (not signed in)
- Only runs once per device (tracked via localStorage flag)
- Uses real RosterPerson objects with proper ELO ratings
- Avatar images are optimized for web (16KB and 28KB)

## Benefits

✅ **Fixes tutorial bug**: Users no longer hit "Not enough people in roster" during onboarding
✅ **Immediate functionality**: Battle mode works right away
✅ **Teaches deletion**: Users learn how to manage their roster
✅ **Fun easter egg**: Founders/team members as starter profiles
✅ **Real data**: Works with all app features, not just during tutorial

## Future Considerations

- Could add more starter profiles
- Could randomize which starter profiles are shown
- Could make them celebrities/fictional characters instead of team members
- Could add a "reset to defaults" option in settings
