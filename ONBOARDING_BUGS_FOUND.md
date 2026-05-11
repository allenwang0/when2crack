# Onboarding Flow - NEW Bugs Found (Post-Fix Analysis)

## Executive Summary
Found **7 new bugs** after re-examining the onboarding flow implementation. These include critical memory leaks, race conditions, and UX issues introduced or missed during the initial fix.

---

## 🔴 CRITICAL BUGS

### Bug #1: Memory Leak - Uncleaned Retry Timeouts in SpotlightOverlay
**Location:** `components/Onboarding/SpotlightOverlay.tsx:60`

**Problem:**
```typescript
if (retryCountRef.current < MAX_RETRIES) {
  retryCountRef.current++
  setTimeout(calculatePosition, RETRY_DELAY) // ⚠️ Never cleaned up!
  return
}
```

The retry timeouts are never stored in a ref, so they cannot be cleaned up when:
- Component unmounts
- Target selector changes
- User skips to next step

**Impact:** Memory leaks, callbacks firing on unmounted components, stale calculations

**Reproduction:**
1. Start onboarding
2. Navigate to a step where element doesn't exist immediately
3. Quickly click "Next" before retries finish
4. Old retry callbacks continue firing for previous step

---

### Bug #2: Memory Leak - Tab Event Dispatch Timeouts Not Cleaned Up
**Location:** `components/Onboarding/OnboardingController.tsx:61-73`

**Problem:**
```typescript
const dispatchTabEvent = (retries = 0) => {
  window.dispatchEvent(event)

  if (retries < 3) {
    setTimeout(() => dispatchTabEvent(retries + 1), 200) // ⚠️ Never cleaned up!
  }
}
setTimeout(() => dispatchTabEvent(), 300) // ⚠️ This too!
```

Creates up to 5 uncleaned timeouts (1 initial + 4 retries). If step changes:
- Old events dispatch for wrong step
- Multiple sets of timeouts run simultaneously
- Tab switches to wrong state

**Impact:**
- Tab switches incorrectly during navigation
- Memory leaks
- Race conditions when user clicks through quickly

**Reproduction:**
1. Start onboarding, get to step 3
2. Immediately click "Next" to step 4
3. Both steps dispatch "tonight" then "battle" events
4. Tab flickers between states

---

### Bug #3: Race Condition - resizeTimeout Closure Issue
**Location:** `components/Onboarding/SpotlightOverlay.tsx:89-100`

**Problem:**
```typescript
// Declared inside effect
let resizeTimeout: NodeJS.Timeout  // ⚠️ Closure issue

const handleResize = () => {
  clearTimeout(resizeTimeout)  // ⚠️ Might clear wrong timeout
  resizeTimeout = setTimeout(calculatePosition, 200)
}

const observer = new MutationObserver(() => {
  clearTimeout(resizeTimeout)  // ⚠️ Might clear wrong timeout
  resizeTimeout = setTimeout(calculatePosition, 500)
})
```

`resizeTimeout` is declared with `let` but captured in closures. When callbacks execute, they reference potentially stale values.

**Impact:** Timeouts not properly debounced, excessive position calculations

**Fix Required:** Use useRef instead of let

---

## 🟡 MEDIUM BUGS

### Bug #4: Transform Property Conflict in Tooltip
**Location:** `components/Onboarding/OnboardingTooltip.tsx:136, 187-196`

**Problem:**
```typescript
style={{
  // ... calculated styles include transform
  transform: 'translateY(-50%)', // Line 69, 78
  transform: 'translateX(-50%)', // Line 87, 96
  ...getMobileStyle(),  // Applied last
}}

// But slideUp animation uses transform too:
@keyframes slideUp {
  to {
    transform: translateY(0);  // ⚠️ Overrides position transform!
    opacity: 1;
  }
}
```

The animation transform overrides the positioning transform, breaking desktop positioning.

**Impact:**
- Tooltip appears in wrong position on desktop
- Centering doesn't work correctly
- Animation completes but element is misaligned

**Reproduction:**
1. Run onboarding on desktop (> 640px width)
2. Watch tooltip position during animation
3. After animation completes, tooltip is offset incorrectly

---

### Bug #5: Missing Style Reset in Tooltip
**Location:** `components/Onboarding/OnboardingTooltip.tsx:50-51`

**Problem:**
```typescript
const calculatePosition = () => {
  const element = document.querySelector(targetSelector)
  if (!element) return  // ⚠️ Doesn't reset tooltipStyle!

  // ... calculate new styles
  setTooltipStyle(style)
}
```

If element doesn't exist, we return early but leave stale styles from the previous target.

**Impact:** Tooltip positioned based on old target's coordinates

**Fix:** Reset styles when element not found:
```typescript
if (!element) {
  setTooltipStyle({})
  return
}
```

---

### Bug #6: Tooltip Calculates Before Spotlight Renders Element
**Location:** `components/Onboarding/OnboardingTooltip.tsx:104`

**Problem:**
```typescript
// SpotlightOverlay waits 100ms
const initialTimeout = setTimeout(calculatePosition, 100)

// But OnboardingTooltip doesn't wait
calculatePosition()  // ⚠️ Runs immediately!
```

The tooltip tries to position itself before the spotlight has found and scrolled to the element.

**Impact:**
- Tooltip positioned incorrectly on first render
- Fixes itself after resize/mutation, but causes flicker
- Bad UX on step changes

**Fix:** Add initial delay matching SpotlightOverlay:
```typescript
const initialTimer = setTimeout(calculatePosition, 150)
// ... cleanup in return
```

---

## 🟢 MINOR BUGS

### Bug #7: Multiple Identical Events Dispatched
**Location:** `components/Onboarding/OnboardingController.tsx:61-73`

**Problem:**
The same event is dispatched 4 times (1 initial + 3 retries) with identical content.

```typescript
const dispatchTabEvent = (retries = 0) => {
  const event = new CustomEvent('onboarding:forceTab', {
    detail: { tab: step.tabState!.activeTab }
  })
  window.dispatchEvent(event)  // Fires immediately

  if (retries < 3) {
    setTimeout(() => dispatchTabEvent(retries + 1), 200)
  }
}
```

**Impact:**
- Tonight page sets tab 4 times unnecessarily
- Potential for race conditions with React state updates
- Performance overhead

**Better Approach:** Only retry if first attempt failed (check if listener exists)

---

## 📊 Bug Summary

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 Critical | 3 | Memory leaks (2), Race condition (1) |
| 🟡 Medium | 3 | Transform conflict, Missing reset, Timing issue |
| 🟢 Minor | 1 | Redundant events |
| **Total** | **7** | **New bugs found** |

---

## 🔧 Recommended Fixes

### Priority 1 (Critical) - Fix Today

1. **Fix Bug #1 (Retry Timeout Cleanup)**
```typescript
const retryTimeoutRef = useRef<NodeJS.Timeout>()

// In retry logic:
retryTimeoutRef.current = setTimeout(calculatePosition, RETRY_DELAY)

// In cleanup:
if (retryTimeoutRef.current) {
  clearTimeout(retryTimeoutRef.current)
}
```

2. **Fix Bug #2 (Tab Event Cleanup)**
```typescript
const tabEventTimeoutsRef = useRef<NodeJS.Timeout[]>([])

const dispatchTabEvent = (retries = 0) => {
  // ... dispatch event
  if (retries < 3) {
    const timeout = setTimeout(() => dispatchTabEvent(retries + 1), 200)
    tabEventTimeoutsRef.current.push(timeout)
  }
}

// Cleanup:
tabEventTimeoutsRef.current.forEach(clearTimeout)
```

3. **Fix Bug #3 (resizeTimeout Closure)**
```typescript
const resizeTimeoutRef = useRef<NodeJS.Timeout>()

const handleResize = () => {
  clearTimeout(resizeTimeoutRef.current)
  resizeTimeoutRef.current = setTimeout(calculatePosition, 200)
}
```

### Priority 2 (Medium) - Fix This Week

4. **Fix Bug #4 (Transform Conflict)**
```typescript
// Use separate properties or combine transforms
style={{
  ...getMobileStyle(),
  animation: 'slideUp 300ms ease-out',
  // Remove transform from animation, use opacity + translate3d
}}
```

5. **Fix Bug #5 (Missing Reset)**
```typescript
if (!element) {
  setTooltipStyle({})
  return
}
```

6. **Fix Bug #6 (Timing)**
```typescript
const initialDelay = setTimeout(calculatePosition, 150)
return () => clearTimeout(initialDelay)
```

### Priority 3 (Minor) - Nice to Have

7. **Fix Bug #7 (Redundant Events)**
```typescript
// Only dispatch once, retry only if needed
let dispatched = false
const dispatchTabEvent = () => {
  if (!dispatched) {
    window.dispatchEvent(event)
    dispatched = true
  }
}
```

---

## 🧪 Testing Checklist

After fixes, test these scenarios:

### Memory Leak Tests
- [ ] Rapidly click through all 7 steps (< 1 sec per step)
- [ ] Check browser DevTools Performance tab for memory growth
- [ ] Monitor setTimeout calls - should clean up properly

### Race Condition Tests
- [ ] Click Next on step 3 immediately after it loads
- [ ] Verify tab switches to "Tonight" only once
- [ ] Click Next again to step 4
- [ ] Verify tab switches to "Battle" correctly

### Position Tests
- [ ] Desktop: Verify tooltip positioned correctly relative to spotlight
- [ ] Mobile: Verify tooltip above navigation bar
- [ ] Resize window during onboarding - tooltip should reposition

### Edge Cases
- [ ] Start onboarding with empty roster
- [ ] Skip tour mid-way
- [ ] Go back to previous steps
- [ ] Refresh page during onboarding

---

## 📈 Impact Assessment

### Before Fixes
- Memory leaks accumulate during tour
- ~4-16 uncleaned timeouts per step
- Race conditions cause tab flickering
- Tooltip positioning unreliable

### After Fixes (Projected)
- Zero memory leaks
- Clean timeout management
- Smooth, predictable tab switching
- Reliable tooltip positioning

---

## 🎯 Root Causes

1. **Inadequate timeout tracking** - Using raw `setTimeout` without refs
2. **Missing cleanup logic** - Effects don't clean up all side effects
3. **Closure issues** - Using `let` instead of `useRef` for mutable values
4. **CSS transform conflicts** - Not considering animation interactions
5. **Race conditions** - Not coordinating timing between components

---

## ✅ Action Items

- [ ] Apply all P1 fixes (Bugs #1-3)
- [ ] Apply all P2 fixes (Bugs #4-6)
- [ ] Apply P3 fix (Bug #7)
- [ ] Run full testing checklist
- [ ] Update ONBOARDING_FIXES.md with new bug list
- [ ] Create regression tests

---

**Status:** 🔴 **BUGS FOUND - NEEDS IMMEDIATE ATTENTION**

The initial fixes were good but introduced/missed these issues. Recommend fixing all critical bugs before deployment to production.
