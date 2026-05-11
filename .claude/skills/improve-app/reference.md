# Improve App - Reference Documentation

This document contains detailed reference information for the improve-app skill.

## Codebase Architecture

### Directory Structure
```
when2crack/
├── app/                    # Next.js App Router pages
│   ├── (app)/             # Authenticated app routes
│   │   ├── add/           # Add person form
│   │   ├── roster/        # Roster list
│   │   ├── tonight/       # Tonight recommendations
│   │   ├── battle/        # Battle mode
│   │   ├── profile/       # User profiles
│   │   ├── schedule/      # Weekly schedule
│   │   └── history/       # Contact history
│   └── api/               # API routes
│       ├── battles/       # Battle processing
│       └── tonight/       # Recommendation generation
│
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── Onboarding/       # Tutorial system
│   └── [feature].tsx     # Feature-specific components
│
├── lib/                  # Business logic & utilities
│   ├── algorithms/       # Core algorithms (Elo, Tonight)
│   ├── contexts/         # React contexts (Auth, Onboarding)
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   ├── types.ts         # TypeScript type definitions
│   └── constants.ts     # App-wide constants
│
└── public/              # Static assets
```

### Key Algorithms

#### Elo Rating System (lib/algorithms/elo.ts)
- Standard chess Elo (K=32)
- Initial rating: 1000 + (attraction + personality + reliability) * 10
- Expected probability: 1 / (1 + 10^((opponent_elo - player_elo) / 400))
- New rating: old_rating + K * (actual_score - expected_score)

#### Tonight Recommendations (lib/algorithms/tonight.ts)
- Base score: Elo rating
- Reliability bonus: (reliability_score - 5) * 20
- Recency penalty: -100 if not contacted in 28+ days
- Returns top 3 sorted by weighted score

#### Battle Matching (lib/algorithms/battles.ts)
- Pairs people with similar Elo ratings
- Avoids recent matchups
- Tracks skip history
- Updates both winners and losers

### Database Schema

**Tables:**
- `users` - User profiles (auth.users extension)
- `roster` - Contact entries (people in roster)
- `hangs` - Interaction history
- `battles` - Pairwise comparison log
- `outreach_log` - Contact attempt tracking

**Key Fields:**
- `roster.elo_rating` - Current Elo rating (integer)
- `roster.last_contact_date` - Last interaction date (string | null)
- `roster.attraction_score` - Visual appeal (1-10)
- `roster.personality_score` - Personality compatibility (1-10)
- `roster.reliability_score` - Reliability/responsiveness (1-10)

### Authentication Flow
1. Guest mode: Data in localStorage (5MB limit)
2. Sign in: Google OAuth via Supabase Auth
3. Data migration: Guest data syncs to Supabase on sign-in
4. Session: Managed by middleware.ts (cookie-based)

---

## Common TypeScript Issues

### Issue: Implicit Any
**Cause:** Function parameters or variables without type annotations
**Fix:** Add explicit types
```typescript
// Before
function calculateScore(person) {  // ❌ Implicit any
  return person.score
}

// After
function calculateScore(person: RosterPerson): number {  // ✅
  return person.score
}
```

### Issue: Null Assignability
**Cause:** Strict null checks enabled, but code assigns null to non-nullable types
**Fix:** Use union types or optional chaining
```typescript
// Before
interface Person {
  name: string
  email: string  // ❌ Can't be null
}

// After
interface Person {
  name: string
  email: string | null  // ✅ Explicitly nullable
}
```

### Issue: Missing Return Type
**Cause:** Async functions without explicit return types
**Fix:** Add Promise<Type> return type
```typescript
// Before
async function fetchData() {  // ❌ Implicit Promise<any>
  return await supabase.from('roster').select()
}

// After
async function fetchData(): Promise<RosterPerson[]> {  // ✅
  const { data } = await supabase.from('roster').select()
  return data || []
}
```

---

## Console.log Cleanup Patterns

### Pattern 1: Debug Logs (Delete)
```typescript
// Before
console.log('Starting function')  // ❌ Debug log
console.log('Value:', value)      // ❌ Debug log
console.log('Done')                // ❌ Debug log

// After
// (deleted) ✅
```

### Pattern 2: Error Logs (Keep with Handling)
```typescript
// Before
console.error('Error:', error)  // ⚠️ Keep but improve

// After
if (error) {
  console.error('Failed to fetch roster:', error)  // ✅
  // Show user-friendly error
  setError('Unable to load your roster. Please try again.')
}
```

### Pattern 3: Dev-Only Logs (Wrap)
```typescript
// Before
console.log('Auth state:', user)  // ⚠️ Useful for dev

// After
if (process.env.NODE_ENV === 'development') {
  console.log('Auth state:', user)  // ✅ Dev-only
}
```

---

## Performance Optimization Checklist

### React Optimization
- [ ] Add React.memo to expensive components
- [ ] Use useMemo for expensive calculations
- [ ] Use useCallback for event handlers passed as props
- [ ] Avoid inline object/array creation in JSX
- [ ] Check for unnecessary re-renders with React DevTools

### Data Optimization
- [ ] Minimize Supabase queries (use select with specific columns)
- [ ] Add indexes to frequently queried columns
- [ ] Use RPC functions for complex operations
- [ ] Implement pagination for large lists
- [ ] Cache static data in localStorage

### Image Optimization
- [ ] Compress images before upload (already done with imageCompression.ts)
- [ ] Consider moving from Base64 to Supabase Storage
- [ ] Add lazy loading for images
- [ ] Use appropriate image formats (WebP)

### Code Splitting
- [ ] Use dynamic imports for large components
- [ ] Split routes into separate chunks
- [ ] Lazy load non-critical features
- [ ] Monitor bundle size with next-bundle-analyzer

---

## Testing Strategy (Future)

### Unit Tests (Priority 1)
**Setup:** Vitest + React Testing Library
**Targets:**
- `lib/algorithms/elo.ts` - Elo calculations
- `lib/algorithms/tonight.ts` - Recommendations
- `lib/utils/scores.ts` - Score utilities
- `lib/utils/achievements.ts` - Achievement logic

**Example:**
```typescript
import { calculateEloChange } from '@/lib/algorithms/elo'

test('Elo calculation for equal ratings', () => {
  const result = calculateEloChange(1000, 1000, true, 32)
  expect(result).toBe(16)  // 50% expected, 100% actual, K=32
})
```

### Integration Tests (Priority 2)
**Targets:**
- Add person flow (guest + authenticated)
- Battle flow (select winner, update Elo)
- Tonight recommendations (query + algorithm)

### E2E Tests (Priority 3)
**Setup:** Playwright
**Critical Flows:**
- Sign in → Add person → View roster
- Complete onboarding tutorial
- Battle mode → Update rankings

---

## Git Workflow

### Commit Message Format
Follow existing patterns from `git log`:
```
Fix UI issue where you cannot click add to roster button
Add egg default profile pic
Add onboarding flow
Performance improvements
Fix mobile issues
```

**Guidelines:**
- Imperative mood ("Fix" not "Fixed")
- Specific, actionable descriptions
- No Co-Authored-By lines (per CLAUDE.md)

### Branch Strategy
- Main branch: `main`
- Feature branches: Optional (currently working directly on main)
- PRs: Create with `gh pr create` when ready

---

## Troubleshooting

### Build Fails with Type Error
1. Read the error message carefully (file + line number)
2. Open the affected file
3. Check type definitions in lib/types.ts
4. Fix the underlying issue (don't use @ts-ignore)
5. Re-run `npm run build`

### Guest Mode Data Not Syncing
1. Check AuthContext.tsx sync logic
2. Verify localStorage key matches: 'when2crack_roster'
3. Ensure data structure matches Supabase schema
4. Check for localStorage quota errors

### Onboarding Issues
1. Check SpotlightOverlay.tsx for target elements
2. Verify custom event system in OnboardingController.tsx
3. Check console for "Onboarding:" logs
4. Ensure MutationObserver cleanup is working

### Performance Issues
1. Profile with React DevTools Profiler
2. Check Network tab for slow queries
3. Verify MutationObserver is disconnecting
4. Look for large re-renders or infinite loops

---

## External Resources

- **Next.js 16 Docs:** https://nextjs.org/docs
- **Supabase Docs:** https://supabase.com/docs
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Elo Rating System:** https://en.wikipedia.org/wiki/Elo_rating_system

---

## Maintenance Notes

### Recent Major Fixes
- ✅ Onboarding flow bugs (13 items) - May 2026
- ✅ Freeze bug fix (localStorage + MutationObserver) - May 2026
- ✅ UI issues with add to roster button - May 2026

### Known Limitations
- Image storage: Base64 in DB (5MB limit, performance concerns)
- No offline mode beyond guest mode
- No multi-device sync for guest mode
- No undo/redo functionality

### Future Enhancements (Backlog)
- Move images to Supabase Storage
- Add test coverage (60% target)
- Implement undo for battles
- Add data export feature
- Enhanced analytics dashboard
- Social sharing features

---

**Last Updated:** 2026-05-11
**Maintained By:** improve-app skill system
