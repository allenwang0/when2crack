---
name: improve-app
description: Systematically fix ESLint errors, console.log statements, TypeScript issues, and code quality problems in When2Crack app through iterative improvements
when_to_use: Use when the user wants to fix linting errors, clean up console logs, improve code quality, resolve TypeScript issues, or make the app better iteratively
argument-hint: "[quick|focus:lint|focus:logs|focus:typescript|focus:git|continue]"
arguments: [mode, target]
disable-model-invocation: true
user-invocable: true
allowed-tools: Read Grep Edit Write Bash(npm *) Bash(git *) Bash(grep *) Bash(find *)
shell: bash
---

# Improve App - When2Crack Iterative Bug Fix

You are fixing bugs and improving code quality in **When2Crack**, a dating roster management PWA.

## Tech Stack Context
- **Framework:** Next.js 16.2.6 (App Router)
- **Language:** TypeScript 5
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS 4
- **Key Algorithms:** Elo rating (lib/algorithms/elo.ts), Tonight recommendations (lib/algorithms/tonight.ts)

---

## Current Status Check

### Build Status
```!
echo "=== BUILD STATUS ===" && npm run build 2>&1 | tail -15 && echo ""
```

### Linting Status
```!
echo "=== LINTING STATUS ===" && npm run lint 2>&1 | head -40 && echo ""
```

### Type Safety Check
```!
echo "=== @TS-IGNORE USAGE ===" && grep -rn "@ts-ignore\|@ts-expect-error" --include="*.tsx" --include="*.ts" app/ lib/ components/ 2>/dev/null | head -10 && echo ""
```

### Console Logs Count
```!
echo "=== CONSOLE STATEMENTS ===" && echo "Total:" && grep -r "console\." --include="*.tsx" --include="*.ts" app/ lib/ components/ 2>/dev/null | wc -l && echo ""
```

### Git Status
```!
echo "=== UNCOMMITTED FILES ===" && git status --short 2>/dev/null | head -15 && echo ""
```

---

## Known Current Issues (May 11, 2026)

### 🟡 P1 - HIGH PRIORITY (Fix This Week)

**[LINT-001] 6 ESLint Errors (Blocks CI/CD)**
- app/(app)/add/page.tsx:171,187 - 2× no-explicit-any
- app/(app)/add/page.tsx:204 - ban-ts-comment (@ts-ignore → @ts-expect-error)
- app/(app)/battle/page.tsx:195 - set-state-in-effect
- app/(app)/debug-avatar/page.tsx:9,12 - no-explicit-any + set-state-in-effect

**[LINT-002] 6 ESLint Warnings**
- 3× unused variables
- 1× no-img-element (use next/image)
- 1× no-unused-expressions
- 1× assigned but never used

### 🟢 P2 - MEDIUM PRIORITY (This Month)

**[LOG-001] ~73 Console Statements**
- Across 32 files in app/, lib/, components/
- Need: Delete debug logs, wrap dev-only, keep error handling

**[TS-001] 2-3 @ts-ignore Comments**
- app/(app)/add/page.tsx:204 (should be @ts-expect-error)
- next.config.ts:2 (external lib, acceptable)
- Check for others

**[TEST-001] No Test Coverage**
- Zero test files
- No test framework installed
- Critical algorithms untested

**[GIT-001] 7 Untracked Files**
- New onboarding components not committed
- Risk of loss

### 🔵 P3 - LOW PRIORITY

**[PERF-001] Performance Opportunities**
- React.memo usage
- Bundle size
- Image optimization

---

## Your Mission

Based on mode argument (`$ARGUMENTS`), perform the appropriate action:

### Mode: `quick` or Default
Fix **P1 linting errors** (what's currently blocking):
1. Run `npm run lint` to see all errors
2. Fix the 6 errors one by one
3. Fix the 6 warnings if time allows
4. Verify `npm run lint` passes
5. Target: Get linting green in <30 minutes

### Mode: `focus:lint`
Deep clean **all linting issues**:
1. Fix all ESLint errors (currently 6)
2. Fix all ESLint warnings (currently 6)
3. Run `npm run lint` to verify
4. Ensure zero errors, zero warnings

### Mode: `focus:logs`
Remove **console.log statements**:
1. Scan for console.log/warn/error/debug (~73 total)
2. Delete debugging logs
3. Keep critical error logs (proper error handling)
4. Wrap necessary logs: `if (process.env.NODE_ENV === 'development')`
5. Target: 73 → <10 statements

### Mode: `focus:typescript`
Clean up **TypeScript suppressions**:
1. Find all @ts-ignore and @ts-expect-error comments
2. Fix underlying type issues
3. Remove suppressions
4. Verify build passes

### Mode: `focus:git`
Clean up **uncommitted work**:
1. Review 7 untracked onboarding files
2. Test functionality
3. Stage relevant files
4. Commit with descriptive message

### Mode: `continue`
Resume from last session (check FIXES_NEEDED.md).

---

## Process (Keep it Simple)

1. **Scan** (30 seconds)
   - Read dynamic context above (build, lint, logs, git)
   - Prioritize: P1 (linting) > P2 (logs, types) > P3 (perf)
   - Note: Build already passes ✅

2. **Fix** (iteratively)
   - Read affected files
   - Make **minimal, focused changes**
   - Fix one error type at a time
   - Don't refactor working code

3. **Verify** (after each fix)
   - Run `npm run lint` (for lint fixes)
   - Run `npm run build` (for type fixes)
   - Check `git diff` (no unintended changes)

4. **Track** (update progress)
   - Note what was fixed
   - Count remaining issues
   - Update if FIXES_NEEDED.md exists

---

## Priority Definitions

**P0 (Critical) - None Currently**
✅ Build passes
✅ App runs
✅ No runtime crashes

**P1 (High) - Fix This Week**
- Linting errors (blocks CI/CD)
- Linting warnings (best practices)

**P2 (Medium) - Fix This Month**
- Console.log cleanup (production hygiene)
- Type suppressions (code quality)
- Test coverage (regression protection)
- Git hygiene (track all work)

**P3 (Low) - Nice to Have**
- Performance optimizations
- Documentation
- Refactoring

---

## Common Linting Fixes

### Fix 1: `no-explicit-any`
```typescript
// Before (ERROR)
const handleUpload = (event: any) => {
  const file = event.target.files[0]
}

// After (FIXED)
const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
}
```

### Fix 2: `ban-ts-comment` (@ts-ignore → @ts-expect-error)
```typescript
// Before (ERROR)
// @ts-ignore - Supabase types not configured
const { data } = await supabase.from('roster').select()

// After (FIXED)
// @ts-expect-error - Supabase types not fully configured
const { data } = await supabase.from('roster').select()

// Even Better (BEST)
const { data } = await supabase.from('roster').select<'*', RosterPerson>()
```

### Fix 3: `set-state-in-effect`
```typescript
// Before (ERROR)
useEffect(() => {
  if (authLoading) {
    setLoading(true)  // ❌ Don't call setState in effect body
    return
  }
  // ...
}, [authLoading])

// After (FIXED)
useEffect(() => {
  if (authLoading) {
    return  // Let parent component manage loading state
  }
  // ...
}, [authLoading])

// Or use derived state
const loading = authLoading || dataLoading
```

### Fix 4: `no-unused-vars`
```typescript
// Before (WARNING)
const [userProfile, setUserProfile] = useState(null)  // ❌ Never used

// After (FIXED)
// (deleted) ✅ If truly unused
```

### Fix 5: `no-img-element`
```typescript
// Before (WARNING)
<img src={avatarUrl} alt="Avatar" />

// After (FIXED)
import Image from 'next/image'
<Image src={avatarUrl} alt="Avatar" width={100} height={100} />
```

---

## Console.log Cleanup Patterns

### Pattern 1: Debug Logs (Delete)
```typescript
console.log('Starting function')     // ❌ Delete
console.log('Value:', value)         // ❌ Delete
console.log('Auth state:', user)     // ❌ Delete
```

### Pattern 2: Error Logs (Keep with Handling)
```typescript
// Keep error logs but ensure proper handling
console.error('Failed to fetch:', error)  // ✅ Keep
setError('Unable to load data')           // ✅ Show user
```

### Pattern 3: Dev-Only Logs (Wrap)
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data)  // ✅ OK
}
```

---

## Key Files Reference

### Files with Linting Errors
- `app/(app)/add/page.tsx` - 3 errors (any types, @ts-ignore)
- `app/(app)/battle/page.tsx` - 1 error (setState in effect)
- `app/(app)/debug-avatar/page.tsx` - 2 errors (any type, setState)

### Files with Most Console Logs
- Check: AuthContext.tsx, add/page.tsx, battle/page.tsx, profile pages

### Type Definitions
- `lib/types.ts` - Main types
- `lib/types/supabase-helpers.ts` - Supabase types

### Untracked Files (Need Review)
- `components/Onboarding/CarouselCard.tsx`
- `components/Onboarding/FloatingTooltip.tsx`
- `components/Onboarding/InteractiveTip.tsx`
- `components/Onboarding/SubtleSpotlight.tsx`
- `components/Onboarding/WelcomeCarousel.tsx`
- `lib/hooks/useFeatureDiscovery.ts`
- `lib/hooks/useSwipeGesture.ts`

---

## Guidelines

### DO:
✅ **Fix linting errors first** (P1 priority)
✅ Make **minimal, focused changes**
✅ Read files **before editing**
✅ **Test after each fix** (`npm run lint`)
✅ Follow **existing patterns**
✅ Update **progress tracking**
✅ Preserve **functionality**

### DON'T:
❌ Skip linting fixes (they block CI/CD)
❌ Make sweeping refactors
❌ Add new features
❌ Change working code unnecessarily
❌ Fix everything at once
❌ Add Co-Authored-By (per CLAUDE.md)

---

## Output Format

### After Scan:
```
# Improvement Scan Results

## Mode: $ARGUMENTS

## Build Status: ✅ PASSING

## Linting Status: ❌ FAILING
- 6 errors, 6 warnings

## Critical Issues (P1)
- [LINT-001] 6 ESLint errors blocking CI/CD
  → app/(app)/add/page.tsx:171,187,204
  → app/(app)/battle/page.tsx:195
  → app/(app)/debug-avatar/page.tsx:9,12

## Proposed Fixes This Session
1. [LINT-001.1] Fix no-explicit-any in add/page.tsx:171
2. [LINT-001.2] Fix no-explicit-any in add/page.tsx:187
3. [LINT-001.3] Change @ts-ignore to @ts-expect-error in add/page.tsx:204
4. [LINT-001.4] Fix setState in effect in battle/page.tsx:195
5. [LINT-001.5] Fix no-explicit-any in debug-avatar/page.tsx:9
6. [LINT-001.6] Fix setState in effect in debug-avatar/page.tsx:12

Ready to proceed.
```

### After Each Fix:
```
✅ [LINT-001.1] Fixed no-explicit-any in add/page.tsx:171
   - Changed (event: any) to (event: React.ChangeEvent<HTMLInputElement>)
   - File: app/(app)/add/page.tsx (1 line)

Remaining: 5 errors
Next: [LINT-001.2] Fix add/page.tsx:187
```

### After Session:
```
# Session Complete

## Fixed
✅ [LINT-001] 6 ESLint errors → 0 errors
✅ [LINT-002] 6 ESLint warnings → 3 remaining

## Linting Status
✅ npm run lint: PASSING (3 warnings acceptable)

## Build Status
✅ npm run build: PASSING

## Progress
- P1 errors: 6 → 0 ✅
- P1 warnings: 6 → 3 (50% done)
- P2 console.logs: 73 (not tackled this session)
- P2 @ts-ignore: 2-3 (not tackled this session)

## Next Session Targets
1. [LINT-002] Finish remaining 3 warnings
2. [LOG-001] Start console.log cleanup
3. [TS-001] Remove @ts-ignore suppressions

Run `/improve-app focus:logs` to clean up console statements.
```

---

## Special Notes

### Linting is Priority #1
- Build already passes ✅
- Linting fails ❌ (blocks CI/CD)
- Focus on **getting linting green** first

### Recent Fixes Completed
Per FIXES_NEEDED.md:
- ✅ 13 onboarding bugs fixed
- ✅ Freeze bug resolved
- ✅ Performance improvements done

Don't re-fix unless new issues found.

### No Tests Yet
Test setup is a larger effort (P2).
If user asks, suggest: "Test infrastructure is a separate project. Should we focus on P1 linting first?"

---

## Edge Cases

### If Linting Already Passing
Great! Move to P2:
- Run `/improve-app focus:logs` for console cleanup
- Or `/improve-app focus:typescript` for @ts-ignore removal

### If New Linting Errors Found
The dynamic context will show them. Prioritize and fix.

### If User Wants Tests
Tests are P2 (larger effort). Acknowledge importance but suggest fixing P1 first.

---

## Ready to Start

**Current mode:** `$ARGUMENTS` (default: `quick` = fix linting)

**Current Priority:** P1 linting errors (6 errors blocking CI/CD)

Begin by analyzing the dynamic context above. Then:
1. Identify the 6 linting errors
2. Present them in priority order
3. Start fixing one by one
4. Verify with `npm run lint` after each fix
5. Track progress

**Remember:**
- Linting is P1 (blocks CI/CD)
- Build already passes ✅
- Focus on green linting first
- One error at a time

Go!
