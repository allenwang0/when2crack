# When2Crack Improvement Roadmap

Generated: 2026-05-11

## Codebase Health Overview

### Current State
- **Total LOC:** ~8,500 lines
- **Tech Stack:** Next.js 16, TypeScript 5, Supabase, Tailwind CSS 4
- **Type:** Progressive Web App (PWA)
- **Status:** Active development, functional with known technical debt

### Health Score: 7/10

**Strengths:**
- ✅ Modern tech stack
- ✅ Good separation of concerns
- ✅ TypeScript usage throughout
- ✅ Security: RLS policies, input sanitization
- ✅ Mobile-first responsive design
- ✅ Error boundaries implemented

**Areas for Improvement:**
- ⚠️ Build errors being ignored
- ⚠️ No test coverage
- ⚠️ Console.log statements in production
- ⚠️ Type safety gaps (@ts-ignore usage)
- ⚠️ Documentation gaps

---

## High-Priority Issues (Recommended First)

### 1. TypeScript Configuration [P1]
**Issue:** `ignoreBuildErrors: true` in next.config.ts masks real type errors
**Impact:** Silent type bugs, harder debugging, reduced code quality
**Files Affected:**
- next.config.ts
- Multiple files with @ts-ignore (~11 instances)

**Fix Strategy:**
1. Remove ignoreBuildErrors flag
2. Fix each TypeScript error systematically
3. Remove @ts-ignore comments
4. Enable strict mode checking

**Complexity:** Medium
**Estimated Fixes:** 15-20 type errors

---

### 2. Development Logging Cleanup [P2]
**Issue:** 91 console.log/warn statements across 22 files
**Impact:** Console noise, potential production logging, debugging clutter
**Files Affected:** Most component and hook files

**Fix Strategy:**
1. Remove debug console.logs
2. Convert useful logs to proper error handling
3. Wrap development-only logs in process.env.NODE_ENV checks
4. Consider adding a proper logging utility

**Complexity:** Small (mostly deletion)
**Estimated Time:** 1-2 iterations

---

### 3. Testing Infrastructure [P2]
**Issue:** Zero test coverage - no Jest/Vitest setup
**Impact:** Risk of regressions, harder to refactor, lower confidence
**Critical Areas Needing Tests:**
- `lib/algorithms/elo.ts` - Core ranking logic
- `lib/algorithms/tonight.ts` - Recommendation algorithm
- `lib/utils/scores.ts` - Score calculations
- `lib/utils/achievements.ts` - Achievement logic

**Fix Strategy:**
1. Set up Vitest (faster, better for Next.js)
2. Add unit tests for algorithms first (highest value)
3. Add tests for utility functions
4. Consider integration tests for critical flows

**Complexity:** Medium-Large
**Estimated Coverage Target:** 60-70% for critical paths

---

### 4. Performance Optimization [P1]
**Issue:** MutationObserver partially addressed, other potential issues
**Impact:** Slower interactions, higher battery usage, poor UX
**Areas to Investigate:**
- Large component re-renders
- Missing React.memo opportunities
- Base64 image storage (large data in DB/localStorage)
- Bundle size optimization

**Fix Strategy:**
1. Profile with React DevTools
2. Add React.memo to expensive components
3. Optimize image handling (consider cloud storage)
4. Code-split large dependencies

**Complexity:** Medium
**Impact:** High user satisfaction

---

### 5. Documentation [P3]
**Issue:** Limited inline documentation, no API docs
**Impact:** Harder onboarding for contributors, maintenance difficulty
**Gaps:**
- JSDoc comments on complex functions
- Component prop documentation
- API endpoint documentation
- Setup/deployment guide

**Fix Strategy:**
1. Add JSDoc to algorithms
2. Document TypeScript interfaces better
3. Create CONTRIBUTING.md
4. Update README with architecture overview

**Complexity:** Small-Medium
**Impact:** Long-term maintainability

---

## Medium-Priority Issues

### 6. Image Handling Optimization [P2]
**Current:** Base64 encoding stored in Supabase/localStorage (5MB limit)
**Issue:** Large data payloads, slow database queries, localStorage bloat
**Better Approach:** Supabase Storage bucket with URLs
**Impact:** Faster loads, smaller database, better scaling

### 7. Error Handling Gaps [P2]
**Issue:** Some API calls lack proper error handling
**Files:** Various API route handlers and client calls
**Fix:** Add try-catch, user-friendly error messages, toast notifications

### 8. Bundle Size [P2]
**Issue:** Large node_modules, potentially unused dependencies
**Fix:** Analyze with next-bundle-analyzer, remove unused deps, optimize imports

---

## Low-Priority Issues

### 9. Code Duplication [P3]
**Issue:** Some logic repeated across components
**Fix:** Extract shared logic to custom hooks or utilities

### 10. Accessibility Audit [P3]
**Issue:** Minimal ARIA labels, keyboard navigation not fully tested
**Fix:** Add proper ARIA attributes, test with screen reader

---

## Recently Completed ✅

From FIXES_NEEDED.md:
- ✅ Onboarding flow bugs (13 items) - All fixed
- ✅ Tab switching for Tonight/Battle steps
- ✅ MutationObserver performance optimization
- ✅ Tooltip positioning
- ✅ Element retry logic
- ✅ Magic number constants

---

## Recommended Improvement Sequence

### Phase 1: Foundation (Week 1)
1. Fix TypeScript configuration (remove ignoreBuildErrors)
2. Clean up console.log statements
3. Set up testing infrastructure
4. Write tests for algorithms

**Goal:** Solid foundation for future changes

### Phase 2: Quality (Week 2)
1. Performance profiling and optimization
2. Add React.memo where needed
3. Improve error handling
4. Add more comprehensive type safety

**Goal:** Production-ready quality

### Phase 3: Scale (Week 3+)
1. Optimize image handling (move to Supabase Storage)
2. Bundle size optimization
3. Documentation improvements
4. Accessibility enhancements

**Goal:** Long-term maintainability and scalability

---

## How to Execute This Plan

### Option 1: Use the Improve App Skill (Recommended)
```bash
/improve-app
```
Let Claude systematically work through the priority queue

### Option 2: Manual Targeted Fixes
Work through each priority item one at a time with Claude's help

### Option 3: Mixed Approach
Use the skill for quick wins, manually tackle complex items

---

## Success Metrics

Track progress with these goals:

- [ ] TypeScript builds without errors
- [ ] No @ts-ignore comments
- [ ] <10 console.log statements (dev-only)
- [ ] 60%+ test coverage on critical paths
- [ ] No P0 or P1 issues remaining
- [ ] Lighthouse score >90
- [ ] Bundle size <500KB (initial load)
- [ ] All components documented

---

## Notes

- This roadmap is living document - update as priorities shift
- New issues will emerge during fixes - that's normal
- Focus on P0/P1 first, P2/P3 as time allows
- Get user feedback after each phase
- Don't over-engineer - keep it simple

**Ready to start? Run `/improve-app` to begin!**
