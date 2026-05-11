# Comprehensive Bug Report - When2Crack

**Generated:** 2026-05-11
**Reviewer:** Staff SWE Code Review
**Scope:** Full codebase analysis

---

## Critical Bugs (P0) - Require Immediate Attention

### 1. Date Calculation Bug - Incorrect Days Between Calculation
**File:** `lib/utils/dates.ts:3-9`
**Severity:** HIGH
**Impact:** Affects all recency calculations, tonight recommendations, and battle selection

```typescript
export function daysBetween(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) // BUG: Math.ceil
  return diffDays
}
```

**Problem:** Using `Math.ceil` means that a difference of 0.1 days (2.4 hours) will round up to 1 day. This causes:
- Incorrect "days ago" displays
- Wrong recency penalties in tonight algorithm
- Battle pair selection using wrong time windows

**Fix:** Use `Math.floor` for more accurate day counting, or `Math.round` if midpoint rounding is desired.

---

### 2. Score Validation Mismatch - Database Constraint Violation
**File:** `app/(app)/add/page.tsx:262-278`
**Severity:** HIGH
**Impact:** Can cause database insert failures

```typescript
<Slider
  label="Looks"
  value={attractionScore}
  onChange={setAttractionScore}
  min={0}  // BUG: Allows 0, but DB requires >= 1
  max={10}
/>
```

**Problem:**
- Sliders allow values from 0-10
- Database schema requires scores >= 1 (CHECK constraints)
- Code attempts to fix this at submit (line 71), but:
  1. User can drag to 0 and see it in UI
  2. If sanitizeScore is bypassed, inserts will fail
  3. Guest mode allows elo_rating calculation with score=0 (line 105)

**Fix:** Set slider min={1} and update UI to show 1-10 range consistently.

---

### 3. Race Condition in Authentication Context
**File:** `lib/contexts/AuthContext.tsx:24-105`
**Severity:** HIGH
**Impact:** Potential authentication state corruption, duplicate user records

```typescript
useEffect(() => {
  let isSubscribed = true

  // Safety timeout
  const timeout = setTimeout(() => {
    if (isSubscribed) {
      console.warn('Auth initialization timeout - proceeding')
      setLoading(false) // BUG: Sets loading to false even if auth failed
    }
  }, 3000)

  const initializeAuth = async () => {
    // ... initialization
    if (isSubscribed) {
      setUser(session?.user ?? null)
      setLoading(false)
      clearTimeout(timeout)
    }
  }

  initializeAuth()

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    // BUG: Can race with initializeAuth, may create duplicate user profiles
    if (event === 'SIGNED_IN' && session?.user) {
      // User creation logic...
    }
  })
})
```

**Problems:**
1. `initializeAuth()` and `onAuthStateChange` can both fire simultaneously on sign-in
2. Both paths attempt to create user profiles, potential duplicate insert attempts
3. Timeout fallback doesn't distinguish between slow network and actual errors
4. No retry logic for failed auth checks

**Fix:** Consolidate user profile creation into a single path with proper locking/idempotency.

---

### 4. localStorage Quota Exceeded Not Handled
**File:** `lib/hooks/useLocalStorage.ts:40-52`
**Severity:** MEDIUM-HIGH
**Impact:** Silent failures when storage is full, data loss for guest users

```typescript
timeoutRef.current = setTimeout(() => {
  try {
    window.localStorage.setItem(key, JSON.stringify(valueToStore))
  } catch (error) {
    console.log('localStorage write error:', error) // BUG: Only logs, doesn't notify user
  }
}, 100)
```

**Problem:**
- localStorage can throw `QuotaExceededError` when full
- Error is silently logged, user not notified
- Guest roster and battle data could be lost without warning
- Image uploads (base64) can easily exceed quota

**Fix:**
1. Check available space before large writes
2. Show user-friendly error message when quota exceeded
3. Suggest clearing old data or signing in

---

### 5. Timezone Conversion Logic Fragile
**File:** `lib/utils/timezone.ts:12-97`
**Severity:** MEDIUM
**Impact:** Incorrect schedule overlaps, wrong meeting times across timezones

```typescript
export function convertScheduleTimezone(slots: string[], fromTimezone: string, toTimezone: string): string[] {
  // ...
  const sourceDate = new Date(referenceDate)
  sourceDate.setDate(sourceDate.getDate() + dayIndex)
  sourceDate.setHours(hour, 0, 0, 0)

  // Format in source timezone
  const sourceTimeStr = sourceDate.toLocaleString('en-US', {
    timeZone: fromTimezone,
    // ... options
  })

  // Parse back to get UTC - BUG: This doesn't actually give UTC time!
  const utcTime = new Date(sourceTimeStr)
```

**Problems:**
1. `new Date(sourceTimeStr)` parses the string in the **local** timezone, not UTC
2. String parsing of date formats is fragile and locale-dependent
3. No validation that timezones are valid IANA identifiers
4. DST transitions not properly handled (using arbitrary reference date)
5. Day boundary crossing can map to wrong days

**Fix:** Use proper timezone libraries (e.g., `date-fns-tz`) or Intl.DateTimeFormat with proper UTC handling.

---

## High Priority Bugs (P1)

### 6. Battle Pair Selection - Recent Battle Check Incorrect
**File:** `lib/algorithms/battles.ts:28-42`
**Severity:** MEDIUM
**Impact:** May show same pairs too frequently

```typescript
const recentBattle = battleHistory.find(
  (b) =>
    (b.winner_id === person1.id && b.loser_id === person2.id) ||
    (b.winner_id === person2.id && b.loser_id === person1.id)
)

const daysSinceBattle = recentBattle
  ? daysBetween(recentBattle.created_at, new Date())
  : Infinity

if (daysSinceBattle > 7) {
  return { person1, person2 }
}
```

**Problem:**
- `.find()` returns the **first** match, not the most recent
- `battleHistory` is sorted by `created_at DESC` (line 35 in API), so this should work
- BUT if sorting fails or isn't applied, wrong battle could be checked
- Also, `daysBetween` bug compounds this issue

**Fix:** Explicitly filter and sort to get most recent battle between the pair.

---

### 7. Image Compression Lacks Error Recovery
**File:** `lib/utils/imageCompression.ts:5-61`
**Severity:** MEDIUM
**Impact:** Failed uploads leave user with no feedback

```typescript
export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Failed to read file'))

    reader.onload = (e) => {
      const img = new Image()

      img.onerror = () => reject(new Error('Failed to load image'))
      // BUG: No handling for corrupt images, wrong MIME types, etc.
```

**Problems:**
1. Generic error messages don't help user understand the issue
2. No file type validation beyond checking MIME (can be spoofed)
3. No handling for non-image files that claim to be images
4. Canvas operations can fail in low memory situations
5. No maximum dimension check before processing (could crash on huge images)

**Fix:** Add more specific error handling and validation before processing.

---

### 8. Missing Null/Undefined Checks in Multiple Components
**File:** Various
**Severity:** MEDIUM
**Impact:** Potential runtime crashes

Examples:
- `components/RosterCard.tsx:14` - `person.name` could be null/undefined
- `components/WeekSchedule.tsx:214` - `localStorage.getItem` parse without null check
- `app/(app)/add/page.tsx:105` - Direct access to `user.email!` with non-null assertion

**Fix:** Add proper null checks and fallbacks throughout.

---

### 9. WeekSchedule - String Parsing Fragility
**File:** `components/WeekSchedule.tsx:63-81`
**Severity:** MEDIUM
**Impact:** Failed schedule decoding, loss of shared schedules

```typescript
const params = new URLSearchParams(window.location.search)
const encodedSchedule = params.get('schedule')
if (encodedSchedule) {
  try {
    const { decodeScheduleWithTimezone } = require('@/lib/utils/timezone')
    const { convertedSlots, originalTimezone } = decodeScheduleWithTimezone(encodedSchedule)
    setComparisonSlots(new Set(convertedSlots))
    setComparisonTimezone(originalTimezone)
  } catch (e) {
    // BUG: Silently fails, user doesn't know schedule wasn't loaded
    try {
      const decoded = JSON.parse(decodeURIComponent(encodedSchedule))
      setComparisonSlots(new Set(decoded))
    } catch (fallbackError) {
      console.error('Failed to decode shared schedule:', fallbackError)
      // BUG: No user notification
    }
  }
}
```

**Problems:**
1. Errors silently caught and logged, user not notified
2. URL parameter could be tampered with
3. No validation of decoded data structure
4. Multiple `require()` calls on client (should use import)

**Fix:** Add validation and user notification for failed decodes.

---

### 10. Excessive TypeScript Ignores - Type Safety Compromised
**Files:** Multiple
**Severity:** MEDIUM
**Impact:** Hidden type errors, runtime crashes

Occurrences:
- `app/api/battles/pair/route.ts:20` - `// @ts-ignore`
- `app/api/tonight/route.ts:20` - `// @ts-ignore`
- `app/(app)/roster/page.tsx:92` - `// @ts-ignore`
- `app/(app)/add/page.tsx:163` - `// @ts-ignore`
- `app/(app)/tonight/page.tsx:290` - `// @ts-ignore`

**Problem:** Type checking disabled at critical database query points, making it easy to:
- Query wrong columns
- Return incorrect data shapes
- Cause runtime errors from type mismatches

**Fix:** Properly type Supabase queries or use code generation.

---

## Medium Priority Bugs (P2)

### 11. useEffect Dependency Arrays Incomplete
**File:** `app/(app)/battle/page.tsx:109-135`
**Severity:** MEDIUM
**Impact:** Stale closures, incorrect re-renders

```typescript
useEffect(() => {
  // ... uses user, authLoading, localRoster
  return () => clearTimeout(safetyTimeout)
}, [user, authLoading, localRoster]) // BUG: Missing dependencies
```

**Problem:**
- `fetchBattlePair` and `fetchBattlePairGuest` are not in dependencies
- If these functions close over stale state, effects will use old data
- ESLint warnings likely disabled for these

**Fix:** Either add all dependencies or use `useCallback` to stabilize function references.

---

### 12. URL Sanitization Incomplete
**File:** `lib/utils/sanitize.ts:57-82`
**Severity:** LOW-MEDIUM
**Impact:** Potential XSS via edge case URLs

```typescript
export function sanitizeUrl(url: string): string {
  if (!url) return ''

  const lower = url.toLowerCase().trim()

  // Block dangerous protocols
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return ''
  }
  // BUG: Doesn't check for encoded versions, e.g., "java%09script:"
```

**Problems:**
1. URL-encoded dangerous protocols bypass check
2. Mixed case with whitespace could bypass (e.g., " JaVaScRiPt :")
3. `data:` URLs should be allowed for images in some contexts
4. No validation that resulting URL is well-formed

**Fix:** Use a proper URL validation library or more robust checking.

---

### 13. Guest Roster and Auth Roster Not Synced
**File:** Multiple
**Severity:** LOW-MEDIUM
**Impact:** Data loss when switching from guest to authenticated

**Problem:**
- Guest roster stored in localStorage
- Upon sign-in, user starts with empty roster
- No migration path from guest data to authenticated account
- User loses all their work

**Fix:** Implement migration flow to copy guest roster to user account on first sign-in.

---

### 14. Battles - No Undo Functionality
**File:** `app/(app)/battle/page.tsx`
**Severity:** LOW-MEDIUM
**Impact:** User can't correct accidental taps

**Problem:**
- One tap immediately commits battle result
- No confirmation dialog
- No undo button
- Affects ELO ratings permanently

**Fix:** Add confirmation or short undo window.

---

### 15. Schedule Grid Touch Handling Issues
**File:** `components/WeekSchedule.tsx:340-358`
**Severity:** LOW
**Impact:** Poor UX on mobile

```typescript
<button
  key={key}
  onMouseEnter={() => isDragging && toggleSlot(day, hour)}
  onMouseDown={() => {
    setIsDragging(true)
    toggleSlot(day, hour)
  }}
  onMouseUp={() => setIsDragging(false)}
  onTouchStart={() => {
    toggleSlot(day, hour) // BUG: Doesn't set dragging state
  }}
```

**Problems:**
1. Touch events don't set drag state, can't swipe across cells
2. `onMouseUp` never fires on touch devices, `isDragging` stuck true
3. No `onTouchEnd`, `onTouchMove` handlers
4. Touch and mouse events might conflict

**Fix:** Implement proper touch event handling with drag support.

---

### 16. Hardcoded Time Range Limits Flexibility
**File:** `components/WeekSchedule.tsx:303-308`
**Severity:** LOW
**Impact:** Limited use cases

```typescript
{[20, 21, 22, 23, 0, 1, 2, 3, 4].map(hour => (
  // Only shows 8pm-4am
```

**Problem:**
- Hardcoded to evening/night hours
- No way for users in different timezones or with different schedules to adjust
- Early morning dates not possible

**Fix:** Make time range configurable or show full day.

---

## Code Quality Issues

### 17. Console.log Statements in Production Code
**Files:** Multiple
**Severity:** LOW
**Impact:** Information leakage, performance

Examples:
- `lib/contexts/AuthContext.tsx:65` - Logs user email
- `app/(app)/add/page.tsx:60-79` - Logs user IDs
- Multiple other locations

**Fix:** Remove or replace with proper logging library that respects environment.

---

### 18. No Error Boundaries
**Files:** Most page components
**Severity:** LOW-MEDIUM
**Impact:** Crashes show blank screen, no recovery

**Problem:**
- Only one ErrorBoundary component exists (`components/ErrorBoundary.tsx`)
- Not used consistently
- No error reporting/logging

**Fix:** Wrap major sections in error boundaries with proper error handling.

---

### 19. No Loading Skeletons
**File:** Multiple pages
**Severity:** LOW
**Impact:** Poor perceived performance

**Problem:**
- Most pages show spinner while loading
- No content skeletons
- Causes layout shift when content loads

**Fix:** Implement skeleton loaders for better UX.

---

### 20. Magic Numbers Throughout Codebase
**Examples:**
- `setTimeout(fetchBattlePairGuest, 2000)` - Why 2000ms?
- `limit(50)` in battles query - Why 50?
- Battle result display duration inconsistent (2000 vs BATTLE_RESULT_DISPLAY_DURATION)

**Fix:** Extract all magic numbers to constants with meaningful names.

---

## Security Issues

### 21. Client-Side ELO Calculation for Guest Mode
**File:** `app/(app)/battle/page.tsx:156-159`
**Severity:** LOW
**Impact:** Could be exploited if guest mode persists

**Problem:**
- Guest users calculate ELO client-side
- Could be manipulated via browser devtools
- No server-side validation

**Fix:** If guest mode is temporary, acceptable. Otherwise, add server-side validation.

---

### 22. No CSRF Protection on API Routes
**Files:** All API routes
**Severity:** LOW-MEDIUM
**Impact:** Potential CSRF attacks

**Problem:**
- API routes only check for authenticated user
- No CSRF token validation
- Could be exploited to make unwanted changes

**Fix:** Implement CSRF protection or use SameSite cookies.

---

### 23. User-Generated Content (Names) Not Properly Escaped in All Contexts
**File:** `components/RosterCard.tsx:46`
**Severity:** LOW
**Impact:** Potential XSS if sanitization fails

**Problem:**
- Names are sanitized on input, but if old data exists or sanitization is bypassed
- Could contain script tags or HTML

**Fix:** Use proper HTML escaping in React (which React does by default for text nodes, but verify all contexts).

---

## Performance Issues

### 24. Inefficient Battle Pair Generation
**File:** `lib/hooks/useBattle.ts:52-60`
**Severity:** LOW
**Impact:** Performance degradation with large rosters

```typescript
for (let i = 0; i < localRoster.length; i++) {
  for (let j = i + 1; j < localRoster.length; j++) {
    const key = getBattleKey(localRoster[i].id, localRoster[j].id)
    if (!completedSet.has(key) && !skippedSet.has(key)) {
      availablePairs.push([localRoster[i], localRoster[j]])
    }
  }
}
```

**Problem:**
- O(n²) complexity on every battle load
- For 100 people, generates 4,950 pairs each time
- Could cause lag on mobile

**Fix:** Optimize by early exit or memoization.

---

### 25. No Image Caching Strategy
**File:** Various avatar renders
**Severity:** LOW
**Impact:** Excessive data usage, slow loads

**Problem:**
- Base64 images loaded fresh each time
- No caching headers
- Could use external image service with CDN

**Fix:** Implement proper image caching or use CDN.

---

### 26. Realtime Subscriptions May Leak
**File:** `app/(app)/roster/page.tsx:116-172`
**Severity:** LOW-MEDIUM
**Impact:** Memory leaks, excessive connections

```typescript
const channel = supabase.channel('roster_changes')
  .on('postgres_changes', ...)
  .subscribe()

return () => {
  supabase.removeChannel(channel)
}
```

**Problem:**
- If cleanup doesn't run properly (component errors), channel stays open
- Multiple rapid mounts/unmounts could create many subscriptions
- No error handling on subscription failures

**Fix:** Add error handling and ensure cleanup always runs.

---

## Data Integrity Issues

### 27. Last Contact Date Auto-Updated on Add
**File:** `app/(app)/add/page.tsx:104`
**Severity:** LOW
**Impact:** Misleading data

```typescript
last_contact_date: new Date().toISOString(),
```

**Problem:**
- Sets last contact to now when adding person
- Should probably be null or user-specified
- Affects "tonight" recommendations immediately

**Fix:** Allow user to specify or leave null.

---

### 28. ELO Rating Calculation Inconsistency
**File:** `app/(app)/add/page.tsx:105` vs `lib/algorithms/elo.ts:62-68`
**Severity:** LOW
**Impact:** Guest mode ELO different from auth mode

```typescript
// add/page.tsx guest mode:
elo_rating: 1000 + (attractionScore + personalityScore + reliabilityScore) * 10,

// elo.ts:
export function calculateInitialElo(...): number {
  return ELO_DEFAULT_RATING + (attractionScore + personalityScore + reliabilityScore) * ELO_SCORE_MULTIPLIER
}
```

**Problem:**
- Guest mode hardcodes formula instead of using utility function
- If constants change, guest mode won't update
- Potential for drift between modes

**Fix:** Use `calculateInitialElo()` in guest mode too.

---

## Testing Gaps

### 29. No Unit Tests for Critical Algorithms
**Files:** `lib/algorithms/*`
**Severity:** MEDIUM
**Impact:** Bugs in core logic go undetected

**Problem:**
- No tests for ELO calculations
- No tests for battle pair selection
- No tests for tonight recommendations
- No tests for timezone conversions

**Fix:** Add comprehensive unit tests for all algorithm files.

---

### 30. No Integration Tests
**Severity:** MEDIUM
**Impact:** Breaking changes not caught

**Problem:**
- No tests for API routes
- No tests for database operations
- No tests for auth flows

**Fix:** Add integration tests for critical paths.

---

## Accessibility Issues

### 31. Missing ARIA Labels
**Files:** Multiple
**Severity:** LOW
**Impact:** Poor screen reader experience

Examples:
- Schedule grid cells have no aria-label
- Battle cards don't announce who they represent
- Navigation buttons lack proper labels

**Fix:** Add proper ARIA labels throughout.

---

### 32. Touch Targets Too Small
**File:** `components/WeekSchedule.tsx:349`
**Severity:** LOW
**Impact:** Difficult to use on mobile

```typescript
className="flex-1 h-10 min-w-[60px]"
```

**Problem:**
- 40px (h-10) is minimum, but smaller than recommended 44-48px
- On small screens, could be hard to tap accurately

**Fix:** Increase touch target sizes for mobile.

---

### 33. Insufficient Color Contrast in Some States
**File:** Various
**Severity:** LOW
**Impact:** WCAG compliance issues

**Problem:**
- Some gray text on gray backgrounds may not meet WCAG AA
- Need audit of all color combinations

**Fix:** Conduct accessibility audit and adjust colors.

---

## Summary Statistics

- **Total Bugs Identified:** 33
- **Critical (P0):** 5
- **High (P1):** 5
- **Medium (P2):** 6
- **Code Quality:** 4
- **Security:** 3
- **Performance:** 3
- **Data Integrity:** 2
- **Testing:** 2
- **Accessibility:** 3

---

## Recommended Prioritization

### Sprint 1 (Critical)
1. Fix date calculation bug (#1)
2. Fix score validation (#2)
3. Fix auth race condition (#3)
4. Add localStorage error handling (#4)

### Sprint 2 (High Priority)
5. Fix timezone conversion (#5)
6. Fix battle pair selection (#6)
7. Improve image compression error handling (#7)
8. Add null checks throughout (#8)
9. Fix schedule decoding errors (#9)
10. Replace TypeScript ignores with proper types (#10)

### Sprint 3 (Medium Priority)
11-16: Address medium priority bugs

### Ongoing
17-33: Code quality, security, performance, and accessibility improvements

---

## Additional Recommendations

1. **Enable Strict TypeScript Mode** - Set `strict: true` in tsconfig.json
2. **Add ESLint Rules** - Enable exhaustive-deps and no-ts-ignore rules
3. **Implement Error Tracking** - Add Sentry or similar for production error monitoring
4. **Add E2E Tests** - Implement Playwright/Cypress tests for critical flows
5. **Code Review Process** - Establish PR review checklist covering common issues
6. **Performance Monitoring** - Add Web Vitals tracking
7. **Security Audit** - Conduct professional security audit before production launch

---

*End of Report*
