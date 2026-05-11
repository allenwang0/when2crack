# Remaining Work - When2Crack

**Status:** 17 of 33 bugs remaining (52%)
**Priority:** All critical and high-priority bugs are fixed

---

## 🎯 Quick Summary

### What's Left
- 4 Medium priority bugs
- 4 Code quality improvements
- 3 Security enhancements
- 3 Accessibility fixes
- 2 Testing gaps
- 1 Performance optimization

### Estimated Effort
- **Sprint 2 (1 week):** Medium priority bugs
- **Sprint 3 (1 week):** Code quality + security
- **Sprint 4 (2 weeks):** Testing + accessibility

---

## 📋 Medium Priority (P2) - 4 bugs

### 14. Add Battle Undo Functionality
**Status:** Not started
**Effort:** 3-4 hours
**Impact:** UX improvement

**Description:**
Users can't correct accidental battle selections. Add either:
- Confirmation dialog before commit
- Short undo window (5 seconds)
- Undo button in battle result display

**Files to modify:**
- `app/(app)/battle/page.tsx`
- `app/(app)/tonight/page.tsx` (battle tab)

**Implementation:**
```typescript
const [lastBattle, setLastBattle] = useState<{
  winner: string,
  loser: string,
  timestamp: number
} | null>(null)

const handleUndo = () => {
  if (!lastBattle) return
  // Reverse ELO changes
  // Remove battle record
  // Refresh UI
}
```

---

### 15. Fix Schedule Touch Handling
**Status:** Not started
**Effort:** 2-3 hours
**Impact:** Mobile UX

**Description:**
Touch events don't support drag/swipe on schedule grid. Only single taps work.

**Files to modify:**
- `components/WeekSchedule.tsx:340-358`

**Current Issue:**
```typescript
onTouchStart={() => {
  toggleSlot(day, hour) // BUG: Doesn't set dragging state
}}
// Missing: onTouchMove, onTouchEnd
```

**Implementation:**
```typescript
const [touchDragging, setTouchDragging] = useState(false)

onTouchStart={(e) => {
  setTouchDragging(true)
  toggleSlot(day, hour)
}}
onTouchMove={(e) => {
  if (touchDragging) {
    // Get element at touch point
    // Toggle that slot
  }
}}
onTouchEnd={() => {
  setTouchDragging(false)
}}
```

---

### 16. Make Time Range Configurable
**Status:** Not started
**Effort:** 3-4 hours
**Impact:** Flexibility

**Description:**
Schedule hardcoded to 8pm-4am. Some users need different ranges.

**Files to modify:**
- `components/WeekSchedule.tsx`
- `lib/constants.ts`

**Current:**
```typescript
{[20, 21, 22, 23, 0, 1, 2, 3, 4].map(hour => (
  // Hardcoded range
```

**Options:**
1. Add time range picker to schedule component
2. User profile setting for preferred hours
3. Smart detection based on availability patterns

---

### 11. Fix useEffect Dependency Arrays
**Status:** Not started
**Effort:** 1-2 hours
**Impact:** Stability

**Description:**
Multiple components have incomplete dependency arrays causing stale closures.

**Files to check:**
- `app/(app)/battle/page.tsx:109-135`
- `app/(app)/tonight/page.tsx`
- Other components with useEffect

**Pattern:**
```typescript
// Bad
useEffect(() => {
  fetchData() // fetchData not in deps
}, [user])

// Good
const fetchData = useCallback(() => {
  // ...
}, [dependencies])

useEffect(() => {
  fetchData()
}, [user, fetchData])
```

---

## 🔧 Code Quality - 4 improvements

### 17. Replace Remaining console.logs
**Status:** Partially complete
**Effort:** 2-3 hours
**Impact:** Production readiness

**What's Done:**
- ✅ Logger utility created
- ✅ AuthContext updated

**What's Left:**
- Replace ~40-50 remaining console.logs in:
  - `app/(app)/add/page.tsx`
  - `app/(app)/roster/page.tsx`
  - Other component files

**Pattern:**
```typescript
// Replace
console.log('Debug info:', data)
console.error('Error:', error)

// With
logger.debug('Debug info:', data)
logger.error('Error:', error)
```

---

### 17b. Add Error Boundaries to Pages
**Status:** Component created, not integrated
**Effort:** 1 hour
**Impact:** Better error recovery

**What's Done:**
- ✅ ErrorBoundaryWrapper created

**What's Left:**
Wrap major page sections:
```typescript
// app/layout.tsx
<ErrorBoundaryWrapper>
  {children}
</ErrorBoundaryWrapper>

// Or per-page
<ErrorBoundaryWrapper fallback={<CustomError />}>
  <RosterPage />
</ErrorBoundaryWrapper>
```

---

### 17c. Add Loading Skeletons
**Status:** Not started
**Effort:** 2-3 hours
**Impact:** Perceived performance

**Files to add:**
- `components/RosterSkeleton.tsx`
- `components/BattleSkeleton.tsx`
- `components/TonightSkeleton.tsx`

**Implementation:**
```typescript
export function RosterSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[1,2,3].map(i => (
        <div key={i} className="bg-gray-200 h-20 rounded-2xl" />
      ))}
    </div>
  )
}
```

---

### 17d. Comprehensive Error Handling
**Status:** Partially complete
**Effort:** 2-3 hours
**Impact:** Production stability

**Add try-catch to:**
- All database queries
- All API calls
- All localStorage operations
- All image operations

**Pattern:**
```typescript
try {
  const result = await operation()
  return result
} catch (error) {
  logger.error('Operation failed:', error)
  setError('User-friendly message')
  // Optional: Track in production
  return fallbackValue
}
```

---

## 🔒 Security - 3 enhancements

### 18a. Add CSRF Protection
**Status:** Not started
**Effort:** 3-4 hours
**Impact:** Security

**Description:**
API routes only check authentication, no CSRF token validation.

**Implementation:**
1. Generate CSRF token on session creation
2. Include in API requests
3. Validate on server

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('csrf_token')
  const headerToken = request.headers.get('x-csrf-token')

  if (token !== headerToken) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  return NextResponse.next()
}
```

---

### 18b. Review Client-Side ELO
**Status:** Not started
**Effort:** 1-2 hours
**Impact:** Data integrity

**Description:**
Guest mode calculates ELO client-side, could be manipulated.

**Options:**
1. Accept risk (guest mode is temporary)
2. Add server-side validation when migrating
3. Add checksums to guest data

---

### 18c. Content Escaping Audit
**Status:** Partially complete
**Effort:** 2 hours
**Impact:** XSS prevention

**What's Done:**
- ✅ Input sanitization added
- ✅ URL sanitization improved

**What's Left:**
- Audit all `dangerouslySetInnerHTML` usage
- Verify React's default escaping
- Check markdown rendering if used
- Audit user-generated content display

---

## ⚡ Performance - 1 optimization

### 19b. Image Caching Strategy
**Status:** Not started
**Effort:** 2-3 hours
**Impact:** Network usage

**Description:**
Base64 images loaded fresh each time, no caching.

**Options:**
1. Use external image service (Cloudinary, Imgix)
2. Add Cache-Control headers
3. Implement service worker caching (PWA)

**Implementation:**
```typescript
// Option 1: Next.js Image with caching
<Image
  src={avatarUrl}
  alt={name}
  width={48}
  height={48}
  priority={false}
  loading="lazy"
/>

// Option 2: Add to service worker
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('avatars/')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    )
  }
})
```

---

## 🧪 Testing - 2 gaps

### 29. Add Unit Tests
**Status:** Not started
**Effort:** 2-3 days
**Impact:** Code quality

**Priority Tests:**
1. `lib/utils/dates.ts` - daysBetween, formatRelativeTime
2. `lib/algorithms/elo.ts` - ELO calculations
3. `lib/algorithms/battles.ts` - Pair selection
4. `lib/algorithms/tonight.ts` - Recommendations
5. `lib/utils/sanitize.ts` - All sanitization functions
6. `lib/utils/timezone.ts` - Timezone conversion

**Setup:**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

**Example:**
```typescript
// lib/utils/__tests__/dates.test.ts
import { daysBetween } from '../dates'

describe('daysBetween', () => {
  it('calculates days correctly', () => {
    const result = daysBetween('2024-01-01', '2024-01-10')
    expect(result).toBe(9)
  })
})
```

---

### 30. Add Integration Tests
**Status:** Not started
**Effort:** 2-3 days
**Impact:** Confidence

**Priority Tests:**
1. Auth flow (sign up, sign in, sign out)
2. Add person to roster
3. Battle flow
4. Tonight recommendations
5. Guest migration
6. Schedule sharing

**Setup:**
```bash
npm install --save-dev @playwright/test
```

**Example:**
```typescript
// e2e/roster.spec.ts
test('add person to roster', async ({ page }) => {
  await page.goto('/add')
  await page.fill('input[name="name"]', 'Test Person')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/roster')
  await expect(page.getByText('Test Person')).toBeVisible()
})
```

---

## ♿ Accessibility - 3 fixes

### 31. Add ARIA Labels
**Status:** Not started
**Effort:** 2-3 hours
**Impact:** Screen reader support

**Files to update:**
- All buttons without text
- All form inputs
- Schedule grid cells
- Battle cards
- Navigation items

**Pattern:**
```typescript
<button aria-label="Previous week" onClick={...}>
  <svg>...</svg>
</button>

<div role="grid" aria-label="Weekly availability schedule">
  <div role="gridcell" aria-label="Monday 8pm">
    ...
  </div>
</div>
```

---

### 32. Increase Touch Targets
**Status:** Not started
**Effort:** 1-2 hours
**Impact:** Mobile usability

**Description:**
Some interactive elements < 44px (iOS minimum).

**Files to check:**
- `components/WeekSchedule.tsx` - Schedule cells (currently 40px)
- Small buttons throughout app

**Fix:**
```typescript
// Before
className="h-10 w-10" // 40px

// After
className="h-11 w-11" // 44px
```

---

### 33. Color Contrast Audit
**Status:** Not started
**Effort:** 1-2 hours
**Impact:** WCAG compliance

**Description:**
Some text/background combinations may not meet WCAG AA standard.

**Tools:**
- Chrome DevTools Lighthouse
- axe DevTools
- Contrast checker extension

**Common Issues:**
- Light gray text on white
- Disabled button text
- Placeholder text

**Fix:**
```typescript
// Update in constants or Tailwind config
const TEXT_COLORS = {
  muted: 'text-gray-600', // Instead of text-gray-400
}
```

---

## 📊 Progress Tracking

### Completed: 16/33 (48%)
- ✅ All P0 (Critical)
- ✅ All P1 (High Priority)
- ✅ 50% of P2 (Medium Priority)

### Sprint 2 Goals (1 week)
- [ ] Battle undo (#14)
- [ ] Touch handling (#15)
- [ ] Time range config (#16)
- [ ] useEffect deps (#11)

### Sprint 3 Goals (1 week)
- [ ] Console.logs (#17)
- [ ] Error boundaries (#17b)
- [ ] CSRF protection (#18a)
- [ ] Client ELO review (#18b)

### Sprint 4 Goals (2 weeks)
- [ ] Unit tests (#29)
- [ ] Integration tests (#30)
- [ ] ARIA labels (#31)
- [ ] Touch targets (#32)
- [ ] Color contrast (#33)

---

## 🎯 Recommendation

**Focus Order:**
1. Sprint 2 - UX improvements (battle undo, touch handling)
2. Sprint 3 - Production readiness (logging, security)
3. Sprint 4 - Quality assurance (tests, accessibility)

**Can Deploy Now:** Yes! All critical bugs are fixed.

**Should Deploy After Sprint 2:** For better UX.

**Should Deploy After Sprint 4:** For full production quality.

---

*Last Updated: 2026-05-11*
