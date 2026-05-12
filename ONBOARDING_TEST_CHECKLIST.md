# Onboarding Flow Test Checklist

## Critical Fixes Applied ✅

### 1. **Portal Rendering** - Fixed overflow clipping
- All modals and overlays now render via React Portal to `document.body`
- No longer clipped by main container's `overflow-y-auto`

### 2. **Tab Forcing Timing** - Fixed race conditions
- Increased spotlight delay to 500ms (was 100ms)
- Increased max retries to 15 (was 10)
- Disabled auto-skip to prevent glitching
- Better retry delays (300ms instead of 200ms)

### 3. **Null Target Positioning** - Fixed Step 8
- Centers tooltip on screen when `targetSelector` is null
- Prevents positioning bugs on FAQ step

### 4. **Mobile Calculations** - Simplified positioning
- Uses fixed pixels (80px) instead of complex calc()
- Removed problematic `env(safe-area-inset-bottom)`
- Better compatibility across browsers

---

## Test Steps - Walk Through Entire Flow

### **Pass 1: Welcome & Initial Steps**

1. **Clear localStorage** (open browser console):
   ```js
   localStorage.clear()
   location.reload()
   ```

2. **Welcome Modal**
   - [ ] Modal appears centered on screen
   - [ ] "Start Tour" button visible and clickable
   - [ ] "Skip" button visible
   - [ ] Click "Start Tour"

3. **Step 1: Roster Overview** (`/roster`)
   - [ ] Navigate to `/roster`
   - [ ] Tooltip appears and is **FULLY VISIBLE**
   - [ ] `.roster-section` is highlighted with spotlight
   - [ ] "Next" button clickable
   - [ ] Click "Next"

4. **Step 2: Add Person** (`/roster`)
   - [ ] Stays on `/roster`
   - [ ] Tooltip appears and is **FULLY VISIBLE**
   - [ ] `.onboarding-add-button` is highlighted
   - [ ] Button is clickable (allowInteraction: true)
   - [ ] Click "Next" (don't actually add a person)

### **Pass 2: Remove & Tonight Steps**

5. **Step 3: Remove People** (`/roster`)
   - [ ] Stays on `/roster`
   - [ ] Tooltip appears and is **FULLY VISIBLE**
   - [ ] `.roster-section` is highlighted
   - [ ] Click "Next"

6. **Step 4: Tonight Picks** (`/tonight`)
   - [ ] Navigates to `/tonight`
   - [ ] Tab **automatically switches to "Tonight"**
   - [ ] Wait for tab content to load (500ms delay)
   - [ ] Tooltip appears and is **FULLY VISIBLE**
   - [ ] `.tonight-recommendations` is highlighted
   - [ ] Click "Next"

### **Pass 3: Battle Mode (CRITICAL TEST)**

7. **Step 5: Battle Mode** (`/tonight`)
   - [ ] Stays on `/tonight`
   - [ ] Tab **automatically switches to "Battle"**
   - [ ] Wait for battle content to load (500ms delay)
   - [ ] Tooltip appears and is **FULLY VISIBLE** (THIS WAS THE BUG!)
   - [ ] `.battle-section` is highlighted
   - [ ] Demo battle cards visible (Jordan vs Taylor)
   - [ ] Tooltip is positioned correctly (not off-screen)
   - [ ] "Next" button is clickable
   - [ ] Click "Next"

### **Pass 4: Profile & Schedule**

8. **Step 6: Profile Stats** (`/profile`)
   - [ ] Navigates to `/profile`
   - [ ] Tooltip appears and is **FULLY VISIBLE**
   - [ ] `.profile-stats` grid is highlighted
   - [ ] Click "Next"

9. **Step 7: Schedule** (`/schedule`)
   - [ ] Navigates to `/schedule`
   - [ ] Tooltip appears and is **FULLY VISIBLE**
   - [ ] `.schedule-grid` is highlighted
   - [ ] Click "Next"

### **Pass 5: Final Step & Completion**

10. **Step 8: FAQ** (`/profile`)
    - [ ] Navigates to `/profile`
    - [ ] Full-screen dark overlay appears
    - [ ] Tooltip appears **CENTERED ON SCREEN** (no spotlight target)
    - [ ] "Finish Tour" button visible
    - [ ] Click "Finish Tour"

11. **Completion**
    - [ ] Confetti animation plays (2 seconds)
    - [ ] Redirects to `/roster`
    - [ ] Toast: "Tour complete! Start building your roster 🥚"
    - [ ] Onboarding doesn't show again on refresh

---

## Mobile Testing (Width < 640px)

### Mobile-Specific Checks

1. **Tooltip Positioning**
   - [ ] Tooltip always appears at bottom of screen
   - [ ] 80px above bottom nav bar
   - [ ] Left/right margins: 1rem (16px)
   - [ ] Max height respects header and nav bar
   - [ ] Scrollable if content too long

2. **All Steps Visible**
   - [ ] Test all 8 steps on mobile viewport
   - [ ] Tooltip never goes off-screen
   - [ ] Buttons always clickable

---

## Common Issues to Check

### ✅ Fixed Issues
- [x] Tooltip hidden/clipped by overflow
- [x] Tooltip off-screen or invisible
- [x] Auto-skip glitching on Steps 4-5
- [x] Step 8 positioning bug
- [x] Mobile calc() failures

### Still Check For
- [ ] No console errors
- [ ] Smooth transitions between steps
- [ ] Tab switching works correctly
- [ ] Demo data loads for battle mode
- [ ] Keyboard navigation works (Arrow keys, Esc)
- [ ] Skip confirmation modal works
- [ ] Previous button works

---

## Debug Commands (Browser Console)

### Reset Onboarding
```js
localStorage.removeItem('onboarding_seen')
localStorage.removeItem('onboarding_completed')
localStorage.removeItem('onboarding_current_step')
localStorage.removeItem('onboarding_skipped')
localStorage.removeItem('onboarding_version')
location.reload()
```

### Check Current State
```js
console.log({
  seen: localStorage.getItem('onboarding_seen'),
  completed: localStorage.getItem('onboarding_completed'),
  step: localStorage.getItem('onboarding_current_step'),
  skipped: localStorage.getItem('onboarding_skipped'),
})
```

### Force Specific Step
```js
// After starting tour, run:
localStorage.setItem('onboarding_current_step', '5') // Change to any step 1-8
location.reload()
```

---

## Performance Check

- [ ] Initial load < 2s
- [ ] Step transitions smooth (no janky animations)
- [ ] Tab switches complete in < 1s
- [ ] Tooltip positioning calculated quickly (< 500ms)
- [ ] No memory leaks (check DevTools Performance tab)

---

## Expected DOM Structure

All overlay elements should be rendered as **direct children of `document.body`**:

```html
<body>
  <div id="__next">...</div>

  <!-- Onboarding overlays (rendered via portal) -->
  <div class="fixed inset-0 bg-black/75">...</div> <!-- SpotlightOverlay -->
  <div class="fixed ...">...</div> <!-- OnboardingTooltip -->
</body>
```

**Verify with DevTools:**
1. Open React DevTools
2. Check that SpotlightOverlay and OnboardingTooltip are portaled
3. Should NOT be inside the `<main className="overflow-y-auto">` container

---

## All DOM Selectors Verified ✅

| Step | Target Selector | File | Line |
|------|-----------------|------|------|
| 1 | `.roster-section` | `/app/(app)/roster/page.tsx` | 216 |
| 2 | `.onboarding-add-button` | `/app/(app)/roster/page.tsx` | 232 |
| 3 | `.roster-section` | `/app/(app)/roster/page.tsx` | 216 |
| 4 | `.tonight-recommendations` | `/app/(app)/tonight/page.tsx` | 492 |
| 5 | `.battle-section` | `/app/(app)/tonight/page.tsx` | 584 |
| 6 | `.profile-stats` | `/app/(app)/profile/page.tsx` | 326 |
| 7 | `.schedule-grid` | `/components/WeekSchedule.tsx` | 282 |
| 8 | `null` (centered) | N/A | N/A |

---

## If Issues Persist

1. **Check Browser Console** for errors
2. **Check React DevTools** for portal rendering
3. **Check Network Tab** for failed requests
4. **Try different browser** (Chrome, Firefox, Safari)
5. **Clear all localStorage** and try again
6. **Check viewport size** (mobile vs desktop)

---

## Success Criteria

✅ **All 8 steps complete without skipping**
✅ **Tooltip visible at every step**
✅ **No console errors**
✅ **Battle mode (Step 5) works perfectly**
✅ **Mobile and desktop both work**
✅ **Completion animation plays**
✅ **Can repeat by clearing localStorage**
