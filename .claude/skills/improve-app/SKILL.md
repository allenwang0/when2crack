---
name: improve-app
description: Systematically fix bugs, TypeScript errors, and code quality issues in When2Crack app through iterative improvements
when_to_use: Use when the user wants to fix bugs, improve code quality, resolve TypeScript errors, clean up console logs, or make the app better iteratively
argument-hint: "[quick|focus:typescript|focus:logs|focus:performance|continue]"
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

## Current Build Status

```!
npm run build 2>&1 | head -40 || echo "Build command not available"
```

## Known Issues Summary

```!
echo "=== TypeScript Issues ===" && \
(grep -r "@ts-ignore\|@ts-expect-error" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null | wc -l || echo "0") && \
echo "" && \
echo "=== Console Logs ===" && \
(grep -r "console\.\(log\|warn\|error\|debug\)" --include="*.ts" --include="*.tsx" app/ lib/ components/ 2>/dev/null | wc -l || echo "0") && \
echo "" && \
echo "=== Recent Git Status ===" && \
git status --short 2>/dev/null | head -10 || echo "Not in git repo"
```

---

## Your Mission

Based on the mode argument (`$ARGUMENTS`), perform the appropriate action:

### Mode: `quick` (Default)
Fix **only P0 critical issues** that block builds or break core functionality.
- Focus on build errors first
- Fix type errors
- Resolve import issues
- Target: Get build passing in <10 minutes

### Mode: `focus:typescript`
Clean up **all TypeScript issues**:
1. Find all `@ts-ignore` and `@ts-expect-error` comments
2. Fix the underlying type issues
3. Remove the suppression comments
4. Ensure `npm run build` passes without errors

### Mode: `focus:logs`
Remove **console.log statements**:
1. Scan for console.log/warn/error/debug
2. Delete debugging logs
3. Keep critical error logs (wrap in proper error handling)
4. Add dev-only checks for necessary logs: `if (process.env.NODE_ENV === 'development') console.log(...)`

### Mode: `focus:performance`
Optimize **performance bottlenecks**:
1. Find large components without React.memo
2. Check for unnecessary re-renders
3. Optimize expensive operations (image handling, algorithms)
4. Review MutationObserver usage

### Mode: `continue`
Resume from the last session (check FIXES_NEEDED.md for progress).

---

## Process (Keep it Simple)

1. **Scan** (30 seconds)
   - If build failing: Read error output → identify file/line
   - If mode specified: Grep for patterns → count issues
   - Prioritize: P0 (critical) > P1 (high) > P2 (medium)

2. **Fix** (iteratively)
   - Read affected files
   - Make **minimal, focused changes**
   - Fix one issue type at a time
   - Don't refactor working code

3. **Verify** (after each fix)
   - Run `npm run build` (for TS fixes)
   - Check `git diff` (ensure no unintended changes)
   - Verify no new errors introduced

4. **Track** (update FIXES_NEEDED.md)
   - Mark completed items with ✅
   - Add new issues discovered
   - Note any trade-offs

---

## Priority Definitions

**P0 (Critical) - Fix Immediately**
- Build/compilation errors
- Runtime crashes
- Security vulnerabilities
- Data loss risks

**P1 (High) - Fix This Session**
- Type suppression comments (@ts-ignore)
- Significant bugs affecting UX
- Performance issues (>500ms delays)
- Missing error handling

**P2 (Medium) - Fix When Time Allows**
- Console.log cleanup
- Code quality issues
- Minor bugs
- Documentation gaps

**P3 (Low) - Nice to Have**
- Optimizations
- Refactoring opportunities
- Enhanced documentation

---

## Key Files Reference

### Core Logic
- `lib/algorithms/elo.ts` - Elo rating calculations
- `lib/algorithms/tonight.ts` - Recommendation algorithm
- `lib/algorithms/battles.ts` - Battle matching logic

### Type Definitions
- `lib/types.ts` - Main type definitions
- `lib/types/supabase-helpers.ts` - Supabase types

### Critical Pages
- `app/(app)/add/page.tsx` - Add person form (most complex)
- `app/(app)/roster/page.tsx` - Roster list
- `app/(app)/tonight/page.tsx` - Tonight recommendations
- `app/(app)/battle/page.tsx` - Battle mode

### Utilities
- `lib/hooks/useLocalStorage.ts` - Guest mode persistence
- `lib/contexts/AuthContext.tsx` - Authentication state
- `lib/utils/` - Helper functions

---

## Common Issues & Quick Fixes

### Issue: `Type 'null' is not assignable to type 'string'`
**Quick Fix:** Change type definition to `string | null`
```typescript
// In lib/types.ts
last_contact_date: string | null  // Add | null
```

### Issue: `@ts-ignore` comment
**Quick Fix:** Add proper types instead
```typescript
// Before
// @ts-ignore
const data = await supabase.from('roster').select()

// After
const { data } = await supabase.from('roster').select<'*', RosterPerson>()
```

### Issue: Console logs everywhere
**Quick Fix:** Delete or wrap in dev check
```typescript
// Delete debugging logs
console.log('Debug:', value)  // ❌ Remove

// Keep critical errors with proper handling
if (error) {
  console.error('Critical error:', error)  // ✅ Keep
  // ... handle error
}

// Wrap dev-only logs
if (process.env.NODE_ENV === 'development') {
  console.log('Dev debug:', value)  // ✅ OK for dev
}
```

---

## Guidelines

### DO:
✅ Make **minimal, focused changes** (one issue type at a time)
✅ Read files **before editing** (understand context)
✅ **Test after each fix** (run build, check for regressions)
✅ Follow **existing code patterns** (match style)
✅ Update **FIXES_NEEDED.md** (track progress)
✅ Focus on **quick wins** first (P0/P1 issues)
✅ Preserve **existing functionality** (no refactors)

### DON'T:
❌ Make sweeping refactors (keep changes surgical)
❌ Add new features (only fix existing issues)
❌ Change working code unnecessarily
❌ Skip verification (always run build)
❌ Fix everything at once (iterate in batches)
❌ Add Co-Authored-By to commits (per CLAUDE.md)

---

## Output Format

### After Scan:
```
# Improvement Scan Results

## Mode: $ARGUMENTS

## Critical Issues Found (P0)
- [TS-001] Type error in app/(app)/add/page.tsx:116
  → Type 'null' not assignable to 'string'

## High Priority (P1)
- [TS-002] 14 @ts-ignore comments across files
- [LOG-001] 66 console.log statements

## Proposed Fixes This Session
1. [TS-001] Fix last_contact_date type (1 min)
2. [TS-002] Remove 5 @ts-ignore in add/page.tsx (5 min)
3. [LOG-001] Clean up 14 console.logs in add/page.tsx (2 min)

Ready to proceed? (If yes, start fixing)
```

### After Each Fix:
```
✅ [TS-001] Fixed last_contact_date type
   - Changed lib/types.ts:48 to `string | null`
   - Build now passes
   - Files: lib/types.ts (1 line)

Next: [TS-002] Remove @ts-ignore in add/page.tsx
```

### After Session:
```
# Session Complete

## Fixed (3 items)
✅ [TS-001] Type error in add/page.tsx
✅ [TS-002] 14 @ts-ignore comments → 9 remaining
✅ [LOG-001] 66 console.logs → 52 remaining

## Build Status
✅ npm run build: PASSING

## Progress
- P0 issues: 1 → 0
- P1 issues: 2 → 2 (partial)
- P2 issues: 1 → 1 (partial)

## Next Session Targets
1. [TS-002] Finish removing @ts-ignore (9 remaining)
2. [LOG-001] Continue console.log cleanup (52 remaining)

Run `/improve-app continue` to resume.
```

---

## Special Notes

### Build Configuration
- `next.config.ts` has `ignoreBuildErrors: false` (good!)
- Type errors **will fail the build** (intentional)
- Always verify builds pass before committing

### Guest Mode Considerations
- localStorage used for guest mode (5MB limit)
- Data structure must match Supabase types
- Test both guest and authenticated modes

### Recent Fixes
Per FIXES_NEEDED.md, these are already complete:
- ✅ Onboarding flow bugs (13 items)
- ✅ MutationObserver performance
- ✅ Tab switching issues

Don't re-fix these unless new issues emerge.

---

## Edge Cases

### If Build Already Passing
Focus on P1/P2 improvements (logs, @ts-ignore, performance).

### If No Issues Found
Run comprehensive scan:
```bash
npm run build && npm run lint && echo "All checks passed!"
```

### If User Requests Tests
Defer to separate session. Testing setup is complex (P2 issue).
Suggest: "Test infrastructure is a larger effort. Should we focus on P0/P1 issues first?"

---

## Ready to Start

**Current mode:** `$ARGUMENTS` (or `quick` if no argument)

Begin scanning for issues now. After scan, present findings and proposed fixes. Wait for confirmation, then start fixing iteratively.

**Remember:** Quick wins first. Build must pass. Track progress. One issue at a time.

Go!
