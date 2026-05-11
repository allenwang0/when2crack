# When2Crack Onboarding Workflow Design Document
## Version 1.0 - Production Ready

---

## Overview
This document outlines the design and implementation plan for a first-time user onboarding experience for When2Crack. The onboarding will guide users through core features across all tabs, ending with the FAQ section, while seamlessly integrating with existing app architecture.

---

## Goals

### Primary Objectives
1. **Educate** users on core features within 60-90 seconds
2. **Drive engagement** by showing value props of each tab
3. **Reduce confusion** around ELO battles and scoring systems
4. **Increase conversion** from guest to authenticated users
5. **Lower support queries** by proactive feature education
6. **Encourage first action** - adding a person to roster

### Success Metrics
- 80%+ onboarding completion rate
- 70%+ of users add at least one person within 5 minutes
- 50%+ reduction in "What is this?" confusion
- Decreased time-to-first-battle
- 30%+ increase in sign-in conversion

---

## User Experience Flow

### Onboarding Sequence (7 Steps)

#### **Step 0: Welcome Screen**
- **Trigger**: First app launch (no `onboarding_seen` localStorage flag)
- **Location**: Full-screen modal overlay (z-index: 10000)
- **Timing**: Shows AFTER AuthContext resolves (3s max timeout)
- **Content**:
  - App icon from `/icon.jpg`
  - Tagline: "Your roster, ranked. Your night, decided."
  - Description: "When2Crack helps you manage your romantic prospects with smart rankings and recommendations. Take a 60-second tour to get started!"
  - CTA: Primary button "Start Tour" (variant="primary")
  - Secondary: "Skip" text link (text-sm text-gray-500)
- **Design**:
  - Full viewport height with gradient background
  - Safe zone: 96px from bottom (nav + buffer)
  - Mobile-optimized: icon 80px, padding 6

#### **Step 1: Roster Tab - Overview**
- **Trigger**: User clicks "Start Tour"
- **Route**: Navigate to `/roster`
- **Spotlight Target**: Entire roster section (or empty state if no data)
- **Spotlight Shape**: Rounded rectangle (border-radius: 24px)
- **Tooltip Position**: Bottom center (mobile), right side (desktop)
- **Content**:
  - **Title**: "Build Your Roster"
  - **Description**: "Add people you're interested in. Rate each on three dimensions: Looks (face), Personality (heart), and Reliability (star). These scores create your rankings."
  - **Visual Aid**: None (show actual UI)
  - **CTA**: "Next" button (primary variant)
  - **Progress**: "Step 1 of 7" (text-xs text-gray-500)
- **Interactions**: Spotlight is static, user cannot interact with underlying UI

#### **Step 2: Roster Tab - Add Person Action**
- **Route**: Stay on `/roster`
- **Spotlight Target**: `.onboarding-add-button` (Add Person button)
- **Spotlight Shape**: Circle (56px diameter)
- **Content**:
  - **Title**: "Add Your First Person"
  - **Description**: "Tap here to add someone. You'll rate them on 3 scores to start building your rankings."
  - **Special**: Allow click-through on Add button ONLY
  - **CTA**: "Next" button OR user clicks Add button (both advance)
  - **Progress**: "Step 2 of 7"
- **Interaction Mode**: `allowInteraction: true` for spotlight target only
- **Notes**: If user clicks Add, pause onboarding, show toast "Great! Come back here after adding.", resume on return to /roster

#### **Step 3: Tonight Tab - Recommendations**
- **Route**: Navigate to `/tonight`
- **Tab State**: Ensure "Tonight" tab is active (not Battle)
- **Spotlight Target**: `.tonight-recommendations` section
- **Auto-scroll**: Scroll to top of recommendations
- **Content**:
  - **Title**: "Get Tonight's Picks"
  - **Description**: "Our algorithm ranks who you should reach out to based on ELO rating, reliability score, and how recently you connected. No more overthinking who to text!"
  - **CTA**: "Next" button
  - **Progress**: "Step 3 of 7"
- **Edge Case**: If no recommendations (empty roster), show sample card with fake data: "Alex - 1350 ELO - Last contact: 3 days ago"

#### **Step 4: Tonight Tab - Battle System**
- **Route**: Stay on `/tonight`
- **Tab State**: Switch to "Battle" tab programmatically
- **Spotlight Target**: Battle cards section
- **Content**:
  - **Title**: "Battle to Rank"
  - **Description**: "Can't decide who's really #1? Play head-to-head battles. Your picks update ELO ratings (like chess). The more you play, the smarter your rankings get."
  - **Interactive Demo**:
    - If roster has 2+ people: Show actual battle pair
    - If roster empty: Show TWO demo cards with fake people
      - Person A: "Jordan, 1200 ELO"
      - Person B: "Taylor, 1200 ELO"
    - Allow ONE battle to be completed before proceeding
  - **CTA**: "Next" button (enabled after 1 battle OR immediate if demo data)
  - **Progress**: "Step 4 of 7"

#### **Step 5: Profile & Stats**
- **Route**: Navigate to `/profile`
- **Spotlight Target**: Stats cards section (roster count, battles, achievements)
- **Content**:
  - **Title**: "Track Your Progress"
  - **Description**: "See your stats, unlock achievements, and customize your profile. 🎯 Pro tip: Sign in to sync your data across all devices and access full history."
  - **Visual Callout**: Subtle pulsing glow on "Sign In" button if guest mode
  - **CTA**: "Next" button
  - **Progress**: "Step 5 of 7"
- **Guest vs Auth**:
  - Guest: Emphasize sign-in benefits
  - Authenticated: Highlight cloud sync status

#### **Step 6: Schedule Sharing**
- **Route**: Navigate to `/schedule`
- **Spotlight Target**: Weekly availability grid
- **Content**:
  - **Title**: "Share Your Availability"
  - **Description**: "Set when you're free this week (6pm-2am) and generate a shareable link. They can view your schedule and share theirs back—coordinate without endless texts."
  - **Mini Interaction**: Allow user to tap 2-3 time slots (optional, visual feedback only, no save)
  - **CTA**: "Next" button
  - **Progress**: "Step 6 of 7"

#### **Step 7: Help & FAQ**
- **Route**: Stay on current page
- **Action**: Programmatically open HelpFAQ modal
- **Spotlight Target**: HelpFAQ modal (entire modal highlighted)
- **Content**:
  - **Title**: "Need Help Anytime?"
  - **Description**: "Tap the yellow info button (bottom-right) anytime to revisit these tips or browse detailed FAQs. You've got this! 🎉"
  - **Display**: Show HelpFAQ with all 6 questions collapsed
  - **CTA**: "Finish Tour" button (gradient primary)
  - **Progress**: "Step 7 of 7"
- **Integration**: Override HelpFAQ close button to trigger onboarding completion

#### **Completion Flow**
- **Action**:
  1. Set `onboarding_completed: true` in localStorage
  2. Set `onboarding_completed_at: timestamp`
  3. Set `onboarding_version: 1` for future migrations
  4. Close all overlays
  5. Show success toast: "Tour complete! Start building your roster 🥚" (3s duration)
  6. Navigate to `/roster`
  7. If roster empty, pulse/highlight the Add Person button for 2 seconds
- **Analytics Event**: Track `onboarding_complete` with duration

---

## Design Specifications

### Visual Components

#### **Full-Screen Welcome Modal (Step 0)**
- **Background**: `bg-gradient-to-br from-pink via-purple to-yellow-bright`
- **Content Card**: White rounded card (rounded-3xl) centered, max-w-md, p-8
- **Icon**: App icon 80x80, border-2 border-yellow-bright, rounded-full
- **Typography**:
  - Tagline: font-serif text-2xl font-bold text-gray-800
  - Description: text-base text-gray-600 leading-relaxed
- **Buttons**:
  - Primary: Full-width Button component (variant="primary")
  - Skip: text-sm text-gray-500 hover:text-gray-700 underline, centered, mt-4

#### **Spotlight Overlay System**
- **Background**: `bg-black/75` (semi-transparent, full viewport)
- **Z-index**: 10000 (above HelpFAQ's 9999)
- **Spotlight Area**:
  - Uses CSS clip-path for performance
  - Shape: `inset(0 round 24px)` for rect, `circle(50%)` for circle
  - Padding: 8px buffer around target element
  - Pulsing animation: Subtle scale 1.0 to 1.02 (2s ease-in-out infinite)
- **Target Calculation**:
  - Use `getBoundingClientRect()` of spotlighted element
  - Recalculate on window resize (debounced 200ms)
  - If element off-screen, scroll into view with `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- **Pointer Events**:
  - Overlay: `pointer-events: auto` (blocks clicks)
  - Spotlight area: `pointer-events: none` if `allowInteraction: false`
  - Tooltip: `pointer-events: auto`

#### **Tooltip Card**
- **Positioning Logic**:
  - Desktop (>640px):
    - Prefer right of spotlight (16px gap)
    - If no room, try left, then bottom, then top
  - Mobile (≤640px):
    - Bottom fixed position: 96px from bottom (above nav + 16px buffer)
    - Full width minus 32px padding
- **Style**:
  - Background: `bg-white`
  - Border: `border-3` with `border-yellow-bright`
  - Shadow: `shadow-2xl` (elevated)
  - Radius: `rounded-3xl`
  - Padding: `p-6`
  - Max width: 360px (mobile), 400px (desktop)
- **Content Structure**:
  ```
  ┌────────────────────────────┐
  │ [Progress Dots]            │ ← Top
  │                            │
  │ ## Title (text-xl bold)    │
  │                            │
  │ Description text...        │ ← text-sm text-gray-600
  │                            │
  │ [Visual Aid if present]    │
  │                            │
  │ ┌──────────────────────┐   │
  │ │  [Primary CTA]       │   │ ← Full width button
  │ └──────────────────────┘   │
  │      [Skip Tour]           │ ← text-xs text-gray-500
  └────────────────────────────┘
  ```
- **Typography**:
  - Title: text-xl font-bold text-gray-800 mb-3
  - Description: text-sm text-gray-600 leading-relaxed mb-4
  - Progress: text-xs text-gray-500 mb-3

#### **Progress Indicator**
- **Format**: "Step X of 7" (text-xs text-gray-500)
- **Position**: Top of tooltip card, centered
- **Visual Dots**: 7 dots below text
  - Completed: `bg-yellow-bright` w-2 h-2 rounded-full
  - Current: `bg-yellow-bright` w-3 h-3 rounded-full (larger)
  - Upcoming: `bg-gray-300` w-2 h-2 rounded-full
  - Spacing: gap-1.5

#### **Navigation Controls**
- **Primary CTA**:
  - Button component with variant="primary"
  - Text changes per step: "Start Tour", "Next", "Finish Tour"
  - Full width on mobile
  - Disabled state while processing
- **Secondary Actions**:
  - "Skip Tour" link: Always visible, text-xs text-gray-500 hover:text-gray-700 underline
  - "Previous" button: Appears from Step 2+ (variant="ghost", size="sm")
    - Position: Left-aligned, above primary CTA on mobile

#### **Animation & Transitions**
- **Overlay Fade**: 300ms ease-in-out
- **Spotlight Transition**: 400ms ease-in-out when changing steps
- **Tooltip Slide**:
  - Enter: translateY(20px) opacity-0 → translateY(0) opacity-100, 300ms
  - Exit: Reverse
- **Success Confetti** (Step 7 completion):
  - Use CSS-only confetti (emoji): 🎉 🥚 ⚔️ 📅 falling animation
  - Duration: 2 seconds
  - No external library needed

---

## Technical Implementation

### Architecture

#### **Component Structure**

```
/components/Onboarding/
├── OnboardingProvider.tsx      # Context provider for onboarding state
├── OnboardingController.tsx    # Main orchestrator, handles step flow
├── WelcomeModal.tsx            # Step 0 full-screen welcome
├── SpotlightOverlay.tsx        # Overlay with spotlight effect
├── OnboardingTooltip.tsx       # Tooltip card with content
├── ProgressIndicator.tsx       # Dots + step counter
├── DemoData.tsx                # Fake roster data for empty state demos
└── index.ts                    # Exports
```

#### **Data Models**

```typescript
// /lib/types/onboarding.ts

export interface OnboardingStep {
  id: number
  route: string                    // Next.js route to navigate to
  title: string
  description: string
  spotlightTarget: string          // CSS selector or null for full-screen
  spotlightShape: 'circle' | 'rect' | 'none'
  spotlightPadding: number         // Buffer around target (px)
  allowInteraction: boolean        // Allow clicks on spotlighted element
  requiresAction: boolean          // User must complete action to proceed
  customContent?: React.ReactNode  // For battle demo, etc.
  tabState?: {                     // For Tonight tab switching
    activeTab: 'tonight' | 'battle'
  }
  autoScroll: boolean              // Auto-scroll spotlight into view
  edgeCase?: {                     // Conditional rendering
    condition: 'empty_roster' | 'has_roster'
    fallbackContent?: React.ReactNode
  }
}

export interface OnboardingState {
  version: number                  // For future migrations
  currentStep: number              // 0-7
  isActive: boolean                // Tour in progress
  hasCompleted: boolean            // Tour finished
  hasSkipped: boolean              // User skipped
  startedAt: string | null         // ISO timestamp
  completedAt: string | null       // ISO timestamp
  pausedForAction: boolean         // Waiting for user action (e.g., add person)
}

export interface OnboardingContextValue {
  state: OnboardingState
  startTour: () => void
  skipTour: () => void
  nextStep: () => void
  previousStep: () => void
  goToStep: (step: number) => void
  completeTour: () => void
  pauseForAction: (actionType: string) => void
  resumeFromAction: () => void
}
```

#### **Step Configuration**

```typescript
// /lib/constants/onboardingSteps.ts

export const ONBOARDING_STEPS: OnboardingStep[] = [
  // Step 0: Welcome - handled separately by WelcomeModal

  {
    id: 1,
    route: '/roster',
    title: 'Build Your Roster',
    description: 'Add people you\'re interested in. Rate each on three dimensions: Looks (face), Personality (heart), and Reliability (star). These scores create your rankings.',
    spotlightTarget: '.roster-section',
    spotlightShape: 'rect',
    spotlightPadding: 16,
    allowInteraction: false,
    requiresAction: false,
    autoScroll: true,
  },
  {
    id: 2,
    route: '/roster',
    title: 'Add Your First Person',
    description: 'Tap here to add someone. You\'ll rate them on 3 scores to start building your rankings.',
    spotlightTarget: '.onboarding-add-button',
    spotlightShape: 'circle',
    spotlightPadding: 8,
    allowInteraction: true,
    requiresAction: false, // Optional action
    autoScroll: true,
  },
  {
    id: 3,
    route: '/tonight',
    title: 'Get Tonight\'s Picks',
    description: 'Our algorithm ranks who you should reach out to based on ELO rating, reliability score, and how recently you connected. No more overthinking who to text!',
    spotlightTarget: '.tonight-recommendations',
    spotlightShape: 'rect',
    spotlightPadding: 16,
    allowInteraction: false,
    requiresAction: false,
    autoScroll: true,
    tabState: { activeTab: 'tonight' },
    edgeCase: {
      condition: 'empty_roster',
      fallbackContent: <DemoRecommendationCard />
    }
  },
  {
    id: 4,
    route: '/tonight',
    title: 'Battle to Rank',
    description: 'Can\'t decide who\'s really #1? Play head-to-head battles. Your picks update ELO ratings (like chess). The more you play, the smarter your rankings get.',
    spotlightTarget: '.battle-section',
    spotlightShape: 'rect',
    spotlightPadding: 16,
    allowInteraction: true,
    requiresAction: false, // Can do one battle or skip
    autoScroll: true,
    tabState: { activeTab: 'battle' },
    edgeCase: {
      condition: 'empty_roster',
      fallbackContent: <DemoBattleCards />
    }
  },
  {
    id: 5,
    route: '/profile',
    title: 'Track Your Progress',
    description: 'See your stats, unlock achievements, and customize your profile. 🎯 Pro tip: Sign in to sync your data across all devices and access full history.',
    spotlightTarget: '.profile-stats',
    spotlightShape: 'rect',
    spotlightPadding: 16,
    allowInteraction: false,
    requiresAction: false,
    autoScroll: true,
  },
  {
    id: 6,
    route: '/schedule',
    title: 'Share Your Availability',
    description: 'Set when you\'re free this week (6pm-2am) and generate a shareable link. They can view your schedule and share theirs back—coordinate without endless texts.',
    spotlightTarget: '.schedule-grid',
    spotlightShape: 'rect',
    spotlightPadding: 16,
    allowInteraction: true, // Can click slots for demo
    requiresAction: false,
    autoScroll: true,
  },
  {
    id: 7,
    route: '/profile', // Stay on profile or wherever user is
    title: 'Need Help Anytime?',
    description: 'Tap the yellow info button (bottom-right) anytime to revisit these tips or browse detailed FAQs. You\'ve got this! 🎉',
    spotlightTarget: null, // Special: Opens HelpFAQ instead
    spotlightShape: 'none',
    spotlightPadding: 0,
    allowInteraction: true,
    requiresAction: false,
    autoScroll: false,
  },
]
```

#### **State Management**

**localStorage Keys** (snake_case to match existing patterns):
```typescript
{
  'onboarding_seen': boolean,           // Has user seen welcome screen
  'onboarding_completed': boolean,      // Completed tour
  'onboarding_version': number,         // Version of tour completed (for migrations)
  'onboarding_skipped': boolean,        // User skipped tour
  'onboarding_current_step': number,    // Resume capability
  'onboarding_started_at': string,      // ISO timestamp
  'onboarding_completed_at': string,    // ISO timestamp
}
```

**React Context** (Required - not optional):
- `OnboardingContext` created via `OnboardingProvider`
- Wraps app at root level (in app/layout.tsx after AuthProvider)
- Provides state and control methods to all components
- Persists to localStorage via useLocalStorage hook (leverages existing debouncing)

**Integration with Existing Contexts**:
- Depends on AuthContext for user state
- Must wait for `loading: false` before showing welcome screen
- Respects auth timeouts (3s safety timeout)

#### **Routing Integration**

1. **Navigation Strategy**:
   - Use Next.js `useRouter()` from 'next/navigation'
   - `router.push()` for programmatic navigation during tour
   - Add query param `?onboarding=active` to distinguish onboarding navigation
   - Prevent back/forward during active tour (intercept with beforeunload warning)

2. **Layout Integration**:
   - Wrap `<OnboardingController>` around children in app/(app)/layout.tsx
   - Renders conditionally based on onboarding state
   - Does NOT interfere with existing header, nav, or HelpFAQ

3. **Component Marking**:
   - Add className `onboarding-{target}` to key elements:
     - `.onboarding-add-button` on Add Person button
     - `.roster-section` on roster container
     - `.tonight-recommendations` on recommendations section
     - `.battle-section` on battle cards container
     - `.profile-stats` on stats section
     - `.schedule-grid` on availability grid

4. **Tab State Management** (Tonight page):
   - OnboardingController can programmatically set active tab
   - Pass `forceTab` prop to TonightPage when onboarding active
   - Override user tab clicks during onboarding

#### **Conflict Resolution with HelpFAQ**

**Problem**: Both HelpFAQ and Onboarding auto-show on first visit

**Solution**:
1. Modify HelpFAQ.tsx to check `onboarding_completed` flag
2. If onboarding not completed, HelpFAQ does NOT auto-show
3. Onboarding Step 7 programmatically opens HelpFAQ
4. After onboarding complete, HelpFAQ resumes normal behavior
5. Update HelpFAQ localStorage key: `faq_auto_shown` (separate from manual opens)

**Code Change in HelpFAQ.tsx**:
```typescript
useEffect(() => {
  const onboardingCompleted = localStorage.getItem('onboarding_completed')
  if (!onboardingCompleted) return // Don't auto-show during/before onboarding

  if (!hasSeen) {
    setIsOpen(true)
    setHasSeen(true)
  }
}, [hasSeen, setHasSeen])
```

#### **Loading State Coordination**

**Challenge**: Each page has loading states that could interfere with onboarding

**Strategy**:
1. Onboarding starts AFTER initial page load completes
2. Detect loading state of current page before showing tooltip
3. If page is loading, show simplified loading indicator in tooltip: "Loading this section..."
4. Once loaded, show full tooltip content
5. Max wait time: 8 seconds (matches existing safety timeouts)

**Implementation**:
- OnboardingTooltip component accepts `isPageLoading` prop
- Each page exposes loading state via data attribute: `data-page-loading="true"`
- OnboardingController observes this attribute

#### **Realtime Subscription Handling**

**Challenge**: Supabase subscriptions could update UI during onboarding

**Strategy**:
1. Do NOT pause subscriptions (maintains data freshness)
2. Allow UI updates but prevent jarring changes:
   - If spotlighted element changes size, recalculate spotlight (debounced 300ms)
   - If spotlighted element disappears (e.g., roster person deleted), advance to next step automatically with toast: "Oops! That changed. Moving on..."
3. If new data causes major layout shift, show brief loading state in tooltip

---

## Implementation Plan

### Phase 1: Core Infrastructure (Days 1-3)

**Day 1: Setup & Context**
- [ ] Create `/components/Onboarding/` directory structure
- [ ] Implement `OnboardingProvider` with Context
- [ ] Implement `onboardingSteps.ts` configuration
- [ ] Create TypeScript types in `/lib/types/onboarding.ts`
- [ ] Integrate OnboardingProvider in app/layout.tsx (after AuthProvider)
- [ ] Add localStorage persistence with useLocalStorage hook

**Day 2: Welcome & Spotlight**
- [ ] Build `WelcomeModal` component (Step 0)
- [ ] Implement `SpotlightOverlay` with clip-path
- [ ] Create spotlight position calculation algorithm
- [ ] Add auto-scroll functionality
- [ ] Test spotlight on different viewport sizes

**Day 3: Tooltip & Navigation**
- [ ] Build `OnboardingTooltip` component
- [ ] Implement smart positioning logic (mobile/desktop)
- [ ] Create `ProgressIndicator` component
- [ ] Wire up next/previous/skip navigation
- [ ] Test navigation flow through all 7 steps

### Phase 2: Step Integration (Days 4-6)

**Day 4: Roster & Tonight Steps**
- [ ] Add `.onboarding-*` classes to components
- [ ] Implement Step 1 (Roster overview)
- [ ] Implement Step 2 (Add person action + pause/resume)
- [ ] Implement Step 3 (Tonight recommendations)
- [ ] Create `DemoRecommendationCard` for empty state

**Day 5: Battle & Profile Steps**
- [ ] Implement Step 4 (Battle system)
- [ ] Create `DemoBattleCards` with fake data
- [ ] Add battle interaction allowance
- [ ] Implement Step 5 (Profile stats)
- [ ] Add sign-in button highlight for guests

**Day 6: Schedule & FAQ Steps**
- [ ] Implement Step 6 (Schedule grid)
- [ ] Allow time slot clicks during onboarding (no save)
- [ ] Implement Step 7 (FAQ integration)
- [ ] Modify HelpFAQ to coordinate with onboarding
- [ ] Test HelpFAQ programmatic open

### Phase 3: Polish & Edge Cases (Days 7-9)

**Day 7: Animations & Interactions**
- [ ] Add all CSS transitions and animations
- [ ] Implement confetti completion animation
- [ ] Add pulsing spotlight effect
- [ ] Test tooltip slide animations
- [ ] Optimize for 60fps

**Day 8: Edge Cases & Error Handling**
- [ ] Handle roster already has data
- [ ] Handle localStorage disabled/full
- [ ] Handle manual navigation away from tour
- [ ] Handle auth sign-in during tour
- [ ] Handle realtime subscription UI changes
- [ ] Add error boundaries

**Day 9: Accessibility & Mobile**
- [ ] Add keyboard navigation (Arrow keys, Enter, Escape)
- [ ] Implement focus trapping
- [ ] Add ARIA labels and announcements
- [ ] Test screen reader compatibility
- [ ] Test on iOS Safari and Android Chrome
- [ ] Verify safe zones (bottom nav clearance)

### Phase 4: Testing & Launch (Days 10-12)

**Day 10: QA & Bug Fixes**
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Cross-device testing (iOS, Android, Desktop)
- [ ] Test with slow network (throttling)
- [ ] Test with existing user data vs empty
- [ ] Test auth flow interruptions
- [ ] Fix all critical bugs

**Day 11: Analytics & Monitoring**
- [ ] Add analytics tracking for each step
- [ ] Track completion rates
- [ ] Track skip rates per step
- [ ] Track time-to-complete
- [ ] Track correlation with sign-in conversion
- [ ] Set up error logging

**Day 12: Launch Prep**
- [ ] Final copy review and approval
- [ ] Visual design review
- [ ] Create "Restart Tour" button in Profile
- [ ] Write migration guide for existing users
- [ ] Deploy to production
- [ ] Monitor analytics dashboard

**Total Duration**: 12 days (~2 calendar weeks with buffer)

---

## User Stories & Acceptance Criteria

### Story 1: First-Time User Onboarding
**As a** new user visiting When2Crack for the first time
**I want** to quickly understand what the app does and how to use it
**So that** I can start adding people and getting value immediately

**Acceptance Criteria:**
- [ ] Welcome screen shows after auth resolves (max 3s wait)
- [ ] "Skip Tour" option is always visible on every step
- [ ] Tour progresses through all 7 steps sequentially
- [ ] Each step highlights the correct UI element with spotlight
- [ ] Navigation works smoothly between tabs without jarring transitions
- [ ] Step 7 opens HelpFAQ modal programmatically
- [ ] Completion sets all localStorage flags correctly
- [ ] Completion shows success toast and redirects to /roster
- [ ] Tour never shows again after completion (unless manually restarted)
- [ ] Mobile and desktop experiences are both polished

### Story 2: Empty Roster New User
**As a** user who starts the tour with no roster data
**I want** to see helpful examples and demos
**So that** I understand features even without my own data

**Acceptance Criteria:**
- [ ] Step 3 shows demo recommendation card with fake person "Alex"
- [ ] Step 4 shows demo battle cards with "Jordan" vs "Taylor"
- [ ] Demo data is clearly distinguishable (different styling or badge)
- [ ] User can complete one demo battle (updates fake ELO)
- [ ] Demo data does NOT persist to actual roster
- [ ] User sees encouragement to add real people after tour

### Story 3: Returning User Help Access
**As a** returning user who skipped onboarding or wants a refresher
**I want** to replay the tour or access specific help
**So that** I can learn features I missed

**Acceptance Criteria:**
- [ ] "Restart Tour" button available in Profile settings
- [ ] "Restart Tour" option also in HelpFAQ modal
- [ ] Clicking restart clears all onboarding localStorage flags
- [ ] Tour behaves identically to first-time flow
- [ ] User can skip mid-restart without breaking anything
- [ ] Analytics tracks "restart" vs "first-time" separately

### Story 4: Onboarding Interruption Recovery
**As a** user who started the tour but closed the app mid-way
**I want** to resume where I left off or start over
**So that** I don't lose progress or have to repeat steps

**Acceptance Criteria:**
- [ ] Current step saved to localStorage after each step
- [ ] On return (within 24 hours), show modal: "Resume tour from Step X?" with "Resume" or "Start Over" buttons
- [ ] If >24 hours elapsed, auto-reset and treat as fresh start
- [ ] Resume picks up at exact step with correct route
- [ ] Start Over clears progress and begins at Step 0

### Story 5: User Adds Person During Tour
**As a** user on Step 2 who clicks the Add Person button
**I want** to add someone to my roster without breaking the tour
**So that** I can take action immediately and return to learning

**Acceptance Criteria:**
- [ ] Clicking Add button on Step 2 pauses onboarding
- [ ] User navigates to /add form normally
- [ ] Form works exactly as in non-onboarding mode
- [ ] After submitting person, toast shows: "Great! Let's continue the tour."
- [ ] User auto-redirected back to /roster
- [ ] Tour resumes at Step 3 automatically
- [ ] If user cancels (goes back), tour resumes at Step 2

### Story 6: Authenticated User Tour
**As an** authenticated user taking the tour
**I want** the onboarding to acknowledge my account status
**So that** I see relevant information about syncing and cloud features

**Acceptance Criteria:**
- [ ] Step 5 (Profile) emphasizes cloud sync status instead of sign-in CTA
- [ ] Step 5 mentions "Your data is synced across devices"
- [ ] All steps work identically for auth and guest users
- [ ] Auth users see real roster data if they have any
- [ ] Auth users' battle completions persist to database

---

## Edge Cases & Considerations

### 1. User Has Existing Data
**Scenario**: User signs in on new device, already has roster from another device

**Handling**:
- Welcome screen still shows (device-specific localStorage)
- Steps 1-2 show real roster data, not empty state
- Step 3-4 use real recommendations and battles
- Messaging adjusted: "Let's show you around YOUR roster..."
- Step 2 changes to: "You have people already! Here's how to add more."

### 2. localStorage Disabled/Full
**Scenario**: Browser has localStorage disabled or quota exceeded

**Handling**:
- Detect with try/catch on first localStorage write
- Show warning toast: "Onboarding requires browser storage. Please enable it to continue."
- Provide fallback: Onboarding runs but doesn't save progress (no resume)
- After completion, flag not saved, so tour may re-show on refresh
- Add note in FAQ about localStorage requirement

### 3. User Signs In During Tour
**Scenario**: Guest user decides to sign in mid-onboarding (Step 5 encouraged this)

**Handling**:
- Pause onboarding state is saved before sign-in redirect
- After OAuth callback and return, detect paused onboarding
- Show modal: "Welcome back! Continue your tour?"
- If yes, resume at same step
- If no, mark as skipped
- Handle potential roster migration (guest → auth)

### 4. User Manually Navigates Away
**Scenario**: User bypasses onboarding by typing URL or using browser back/forward

**Handling**:
- Detect route changes that don't match current step's expected route
- Show subtle banner at top: "You're in the middle of a tour. Resume | Skip"
- Banner is dismissible but persists until tour completed/skipped
- If user is idle (no clicks) for 30s, auto-pause tour
- On next interaction, ask if they want to resume

### 5. Element Disappears During Spotlight
**Scenario**: User deletes last person in roster while on Step 1

**Handling**:
- Spotlight calculates position, gets null/invalid result
- Show toast: "That section changed. Let's move on..."
- Auto-advance to next step with 1s delay
- If happens multiple times, offer to skip tour

### 6. Mobile Keyboard Opens
**Scenario**: User taps input field, mobile keyboard pushes UI up

**Handling**:
- Detect `window.visualViewport` resize
- Recalculate spotlight position
- If tooltip would be occluded by keyboard, reposition to top
- If spotlight target occluded, scroll it into view

### 7. Slow Network / Loading Timeout
**Scenario**: User on slow connection, pages take >5s to load

**Handling**:
- Show loading state in tooltip: "Loading this section..."
- Use existing 8s safety timeout per page
- If timeout exceeded, show: "Having trouble loading. Continue | Skip Tour"
- If user continues, move to next step (skip broken step)

### 8. PWA Install Mid-Tour
**Scenario**: User installs PWA to home screen during tour

**Handling**:
- Service worker caches onboarding assets
- On PWA open, check for paused tour
- Resume normally (localStorage persists across PWA)
- No special handling needed beyond initial asset caching

### 9. Auth State Race Condition
**Scenario**: AuthContext still loading when onboarding wants to start

**Handling**:
- OnboardingProvider depends on AuthContext
- Wait for `loading: false` before rendering WelcomeModal
- Use same 3s safety timeout as AuthContext
- If timeout, show tour anyway (assume guest)
- If auth completes mid-tour, no disruption

### 10. Realtime Update During Battle Step
**Scenario**: Another device completes a battle, roster ELO updates while on Step 4

**Handling**:
- Allow update to propagate
- Recalculate spotlight if element size changes
- If battle pair changes (new people added elsewhere), show new pair
- Don't disrupt user if they're mid-click

---

## Mobile vs Desktop Differences

### Mobile (<640px)
- **Welcome Modal**: Full screen, no padding
- **Tooltip**: Fixed at bottom, 96px from bottom, full width minus padding
- **Spotlight**: Smaller padding (8px vs 16px) to maximize usable space
- **Progress Dots**: Below text, horizontal scroll if needed
- **Buttons**: Full width, larger tap targets (min 44px height)
- **Text**: Slightly smaller (text-sm for descriptions)
- **Auto-scroll**: More aggressive to ensure spotlight visible

### Desktop (≥640px)
- **Welcome Modal**: Centered card, max-w-md, breathing room
- **Tooltip**: Adjacent to spotlight (right/left/top/bottom)
- **Spotlight**: Larger padding (16px)
- **Progress Dots**: Inline with text, no scrolling
- **Buttons**: Auto width, normal tap targets
- **Text**: Slightly larger (text-base for descriptions)
- **Hover States**: Functional (not just active states)

### Tablet (640px-1024px)
- Hybrid approach: Desktop layout with mobile touch interactions
- Tooltip prefers bottom position to avoid awkward side placement

---

## Accessibility Standards (WCAG 2.1 AA)

### Keyboard Navigation
- **Tab**: Move focus through interactive elements in tooltip
- **Enter**: Trigger "Next" button
- **Escape**: Skip tour (confirm with modal)
- **Arrow Keys**:
  - Right/Down: Next step (alternative to Enter)
  - Left/Up: Previous step (if available)
- **Focus Trap**: Focus locked within tooltip during tour
- **Focus Visible**: Clear focus indicators on all interactive elements

### Screen Reader Support
- **ARIA Labels**:
  - `role="dialog"` on overlay
  - `aria-label="Onboarding tour, Step X of 7"`
  - `aria-describedby` linking title to description
- **Announcements**:
  - Announce each step title when transitioning
  - "Step 2 of 7: Add Your First Person"
  - Announce when tour completes: "Onboarding complete! Redirecting to roster."
- **Live Regions**:
  - `aria-live="polite"` on tooltip content
  - Announces changes without interrupting screen reader

### Visual Accessibility
- **Color Contrast**: All text meets 4.5:1 ratio minimum
  - White text on gradients: Ensure dark enough background
  - Gray text (text-gray-600) on white: Verified contrast
- **Focus Indicators**:
  - Yellow ring (ring-yellow-bright ring-4)
  - High contrast in all modes
- **Text Size**: Minimum 14px (text-sm), scalable with browser zoom
- **Target Size**: Minimum 44x44px for touch targets

### Motion Preferences
- **Respect `prefers-reduced-motion`**:
  - If enabled, disable confetti, pulsing, slide animations
  - Use instant transitions (duration-0)
  - Keep fade-in/out for clarity but shorten to 100ms

### Error Handling
- **Timeout Warnings**: If loading exceeds 5s, announce progress
- **Error Messages**: Clear, actionable, announced to screen readers

---

## Analytics & Tracking

### Events to Track

**Tour Lifecycle**
```typescript
{
  event: 'onboarding_started',
  properties: {
    user_id: string | 'guest',
    has_roster_data: boolean,
    roster_count: number,
    auth_status: 'guest' | 'authenticated',
    timestamp: ISO string,
  }
}

{
  event: 'onboarding_step_view',
  properties: {
    step: number (1-7),
    step_title: string,
    time_on_previous_step: number (ms),
    timestamp: ISO string,
  }
}

{
  event: 'onboarding_step_complete',
  properties: {
    step: number,
    action_taken: 'next_button' | 'interaction' | 'auto_advance',
    time_on_step: number (ms),
  }
}

{
  event: 'onboarding_skipped',
  properties: {
    at_step: number,
    reason: 'skip_button' | 'navigation_away' | 'timeout',
    time_elapsed_total: number (ms),
  }
}

{
  event: 'onboarding_completed',
  properties: {
    total_duration: number (ms),
    steps_viewed: number[],
    actions_taken: string[],
    added_person_during_tour: boolean,
  }
}
```

**User Actions During Tour**
```typescript
{
  event: 'onboarding_action_add_person',
  properties: {
    at_step: 2,
    completed_add: boolean,
  }
}

{
  event: 'onboarding_action_battle',
  properties: {
    at_step: 4,
    winner_id: string,
    used_demo_data: boolean,
  }
}

{
  event: 'onboarding_action_clicked_signin',
  properties: {
    at_step: 5,
  }
}

{
  event: 'onboarding_resumed',
  properties: {
    from_step: number,
    time_since_pause: number (ms),
  }
}
```

### Drop-off Analysis
- Calculate drop-off rate at each step
- Identify steps with >30% skip rate
- Correlate completion with subsequent retention

### Success Metrics Dashboard
- % Completion rate (target: 80%+)
- Average time to complete (target: 60-90s)
- % Users who add person during/after tour (target: 70%+)
- % Users who complete first battle within 5 min (target: 60%+)
- % Sign-in conversion within 24h (target: 30%+)
- % Tour restarts (measure utility of "Restart Tour" feature)

---

## Copy & Content (Final Version)

### Welcome Screen (Step 0)
**Tagline**: "Your roster, ranked. Your night, decided."
**Description**: "When2Crack helps you manage your romantic prospects with smart rankings and recommendations. Take a 60-second tour to get started!"
**CTA**: "Start Tour"
**Secondary**: "Skip"

### Step 1: Roster Overview
**Title**: "Build Your Roster"
**Description**: "Add people you're interested in. Rate each on three dimensions: Looks (face), Personality (heart), and Reliability (star). These scores create your rankings."

### Step 2: Add Person Action
**Title**: "Add Your First Person"
**Description**: "Tap here to add someone. You'll rate them on 3 scores to start building your rankings."

### Step 3: Tonight Recommendations
**Title**: "Get Tonight's Picks"
**Description**: "Our algorithm ranks who you should reach out to based on ELO rating, reliability score, and how recently you connected. No more overthinking who to text!"

### Step 4: Battle System
**Title**: "Battle to Rank"
**Description**: "Can't decide who's really #1? Play head-to-head battles. Your picks update ELO ratings (like chess). The more you play, the smarter your rankings get."

### Step 5: Profile & Stats
**Title**: "Track Your Progress"
**Description**: "See your stats, unlock achievements, and customize your profile. 🎯 Pro tip: Sign in to sync your data across all devices and access full history."

### Step 6: Schedule Sharing
**Title**: "Share Your Availability"
**Description**: "Set when you're free this week (6pm-2am) and generate a shareable link. They can view your schedule and share theirs back—coordinate without endless texts."

### Step 7: Help & FAQ
**Title**: "Need Help Anytime?"
**Description**: "Tap the yellow info button (bottom-right) anytime to revisit these tips or browse detailed FAQs. You've got this! 🎉"

### Completion Toast
"Tour complete! Start building your roster 🥚"

### Error Messages
- **Timeout**: "Taking longer than expected. Continue waiting or skip this step."
- **Navigation Away**: "You're in the middle of a tour. Resume | Skip"
- **Element Missing**: "That section changed. Let's move on..."
- **localStorage Disabled**: "Onboarding requires browser storage. Please enable it to continue."

---

## Resources Needed

### Design Assets
- [x] App icon: `/icon.jpg` (already exists)
- [ ] Confetti emoji set: 🎉 🥚 ⚔️ 📅 💖 (CSS animation)
- [ ] Loading spinner: Reuse existing (animate-spin border-b-2 border-pink)
- [ ] Progress dots: CSS-only, no images needed

### Development Tasks
- [ ] Frontend: 12 days (96 hours) as per implementation plan
- [ ] Code review: 4 hours
- [ ] QA testing: 8 hours
- [ ] Design review: 2 hours
- **Total effort**: ~110 hours (~3 weeks at 40h/week)

### External Dependencies
- None (all built with existing tech stack)

---

## Migration Strategy for Existing Users

### Scenario 1: User Already Used App (has roster data)
- Show welcome screen anyway (one-time, device-specific)
- Adjust copy to acknowledge existing data
- Steps show real data, not demos
- After completion, set both `onboarding_completed` and `onboarding_version: 1`

### Scenario 2: Future Onboarding V2
- Check `onboarding_version` in localStorage
- If version 1, don't re-show full tour
- Option to show "What's New" micro-tour for new features only
- Versioning schema:
  - v1: Initial launch
  - v2: Major feature updates (e.g., new tab added)
  - Minor updates don't trigger re-tours

### Rollout Plan
1. **Soft Launch** (Week 1):
   - Deploy to production
   - No marketing announcement
   - Monitor first 100 new users for bugs
2. **Bug Fix Window** (Week 2):
   - Address critical issues
   - Optimize based on analytics
   - A/B test copy variations
3. **Full Launch** (Week 3):
   - Announce feature
   - Add "Restart Tour" options
   - Market to existing users

---

## Future Enhancements (V2)

### Contextual Tooltips
- After onboarding, show one-time tooltips on first encounter with specific features:
  - "Shoot Your Shot" button: "Track when you reach out"
  - Archive button: "Archive keeps people but removes from active roster"
  - ELO rating badge: "Your battle win/loss record"
- Persist viewed tips in localStorage: `contextual_tips_seen: string[]`

### Interactive Checklist
- Post-onboarding "Getting Started" checklist in Profile:
  - [ ] Add 3 people
  - [ ] Complete 5 battles
  - [ ] Set your schedule
  - [ ] Log your first hang (auth only)
- Gamified progress bar
- Reward: Unlock special achievement badge

### Personalized Paths
- At welcome screen, ask: "What brings you here?"
  - "I want to rank people" → Focus on battles
  - "I want date recommendations" → Focus on tonight picks
  - "I want to coordinate schedules" → Focus on schedule
- Reorder steps based on choice
- Different copy per path

### Video Walkthrough Option
- Embed 30-second video in welcome screen
- Toggle: "Watch video" or "Take interactive tour"
- Video covers same 7 steps but faster
- Requires video production resources

### Gamification: Onboarding Achievement
- Add to achievements.ts:
  ```typescript
  {
    id: 'tour_complete',
    icon: '🎓',
    title: 'Quick Learner',
    description: 'Completed the onboarding tour',
    unlocked: onboarding_completed
  }
  ```
- Shows immediately after tour completion
- Encourages engagement with achievement system

---

## Open Questions & Decisions

### 1. Should we allow skipping individual steps vs entire tour?
**Decision**: Allow both. "Next" advances, "Skip Tour" exits completely. Users can navigate backward with "Previous" button from Step 2+.

### 2. Should onboarding differ for mobile vs desktop?
**Decision**: Same flow, different positioning and sizing. Core content and steps identical. Ensures consistent learning across devices.

### 3. When should "existing users" see onboarding?
**Decision**: Only on first launch of that device/browser. localStorage is device-specific. "Restart Tour" available for opt-in re-view.

### 4. Should we collect feedback after onboarding?
**Decision**: Yes (V2). After completion, show optional 5-star rating modal: "How was the tour?" with comment field. Non-blocking, dismissible.

### 5. How to handle onboarding for major feature releases?
**Decision**: Check `onboarding_version`. If new version introduces major features, show "What's New" modal highlighting changes, not full tour. Store `whats_new_v2_seen` separately.

### 6. Should battles during onboarding count toward stats?
**Decision**:
- Real battles (user has roster): YES, count toward stats
- Demo battles (fake data): NO, purely educational
- Clear distinction prevents inflated stats

### 7. What if user adds person mid-tour but then deletes them?
**Decision**: Tour doesn't react. Roster count may be 0 again. Encourage adding more after tour completes.

### 8. Should we prevent user from closing browser tab during tour?
**Decision**: No. Show `beforeunload` warning only if tour is active: "You're in the middle of the tour. Resume when you return?" But don't force them to stay.

---

## Technical Constraints & Considerations

### Performance Budget
- **Initial Bundle Size Impact**: +25KB gzipped (onboarding components)
  - Solution: Code-split with dynamic import, lazy load on welcome screen
- **Animation Performance**: All animations must maintain 60fps
  - Use `transform` and `opacity` only (GPU-accelerated)
  - Avoid `height`, `width`, `top`, `left` animations
- **localStorage Writes**: Use existing debounced useLocalStorage hook (100ms)

### Browser Compatibility
- **Minimum Support**: iOS 14+, Android 9+, Chrome 90+, Safari 14+
- **Fallbacks**:
  - No clip-path support: Use solid overlay with border radius
  - No backdrop-filter: Use solid background color
  - No localStorage: Show warning, run tour without persistence

### PWA Considerations
- **Service Worker Caching**:
  - Add onboarding components to precache manifest
  - Cache demo data images (if using)
  - Ensure offline functionality of tour (no external resources)
- **Install Prompt**: Don't show during onboarding (wait until after completion)

### Security & Privacy
- **No External Tracking**: All analytics self-hosted
- **No PII in localStorage**: User IDs only (hashed if guest)
- **No Screenshots**: Visual aids are component renders, not user data

---

## Appendix: CSS-Only Confetti Animation

```css
@keyframes confettiFall {
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

.confetti {
  position: fixed;
  font-size: 2rem;
  animation: confettiFall 2s ease-in forwards;
  pointer-events: none;
  z-index: 10001;
}

.confetti:nth-child(1) { left: 10%; animation-delay: 0s; }
.confetti:nth-child(2) { left: 20%; animation-delay: 0.2s; }
.confetti:nth-child(3) { left: 30%; animation-delay: 0.4s; }
.confetti:nth-child(4) { left: 40%; animation-delay: 0.1s; }
.confetti:nth-child(5) { left: 50%; animation-delay: 0.3s; }
.confetti:nth-child(6) { left: 60%; animation-delay: 0.5s; }
.confetti:nth-child(7) { left: 70%; animation-delay: 0.2s; }
.confetti:nth-child(8) { left: 80%; animation-delay: 0.4s; }
.confetti:nth-child(9) { left: 90%; animation-delay: 0.1s; }
```

Usage:
```tsx
{showConfetti && (
  <div className="confetti-container">
    {['🎉', '🥚', '⚔️', '📅', '💖', '🎉', '🥚', '⚔️', '📅'].map((emoji, i) => (
      <div key={i} className="confetti">{emoji}</div>
    ))}
  </div>
)}
```

---

## Conclusion

This onboarding workflow is designed to:
- **Integrate seamlessly** with existing When2Crack architecture
- **Respect user autonomy** with skip options and non-blocking design
- **Educate efficiently** within 60-90 seconds
- **Drive engagement** by encouraging first actions (add person, battle)
- **Scale gracefully** across mobile and desktop
- **Meet accessibility standards** (WCAG 2.1 AA)
- **Provide measurable impact** via comprehensive analytics

### Next Steps
1. **Stakeholder Review**: Approve design doc (1 day)
2. **Begin Phase 1**: Setup & infrastructure (3 days)
3. **Weekly Check-ins**: Demo progress, gather feedback
4. **Launch**: Soft launch → bug fixes → full launch (3 weeks)

### Success Criteria
- 80%+ completion rate within first month
- 70%+ of new users add ≥1 person within 5 minutes
- Positive user feedback (NPS ≥8/10)
- No critical accessibility issues
- <1% error rate during tours

---

**Document Version**: 1.0
**Last Updated**: 2026-05-11
**Author**: Product & Engineering Team
**Status**: Ready for Implementation
