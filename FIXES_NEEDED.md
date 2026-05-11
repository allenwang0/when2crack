# Onboarding Flow - Bug Fixes Implementation Plan

## Summary
Found 13 bugs in the onboarding flow, ranging from critical (breaks functionality) to minor (polish issues).

## Bugs Fixed:
1. ✅ Tab switching for steps 3 & 4 (Tonight/Battle)
2. ✅ Spotlight highlighting non-existent elements
3. ✅ MutationObserver performance issue
4. ✅ Tooltip positioning on desktop
5. ✅ Aggressive auto-scroll behavior
6. ✅ Blocking overlay when target missing
7. ✅ Hardcoded step numbers
8. ✅ Missing useEffect dependency
9. ✅ Inconsistent timeout comment
10. ✅ No retry for missing elements
11. ✅ Mobile positioning magic number
12. ✅ Unused edgeCase field
13. ✅ Unused actionType parameter

## Implementation Approach:
- Use custom event system for tab control (lightweight, non-invasive)
- Add debounced retry logic for missing spotlight targets
- Optimize MutationObserver to only watch specific container
- Fix tooltip positioning with proper style application
- Add loading state detection before showing spotlight
- Replace magic numbers with constants
