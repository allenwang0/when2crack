# When2Crack Onboarding Workflow Design Document

## Overview
This document outlines the design and implementation plan for a first-time user onboarding experience for When2Crack. The onboarding will guide users through core features across all tabs, ending with the FAQ section.

---

## Goals

### Primary Objectives
1. **Educate** users on core features within 60-90 seconds
2. **Drive engagement** by showing value props of each tab
3. **Reduce confusion** around ELO battles and scoring systems
4. **Increase conversion** from guest to authenticated users
5. **Lower support queries** by proactive feature education

### Success Metrics
- 80%+ onboarding completion rate
- 50%+ reduction in "What is this?" confusion
- Increased time-to-first-action (adding person, playing battle)

---

## User Experience Flow

### Onboarding Sequence (7 Steps)

#### **Step 0: Welcome Screen**
- **Trigger**: First app launch (no localStorage flag set)
- **Location**: Full-screen overlay
- **Content**:
  - Logo/branding
  - Tagline: "Your roster, ranked. Your night, decided."
  - Brief (2 sentences): "When2Crack helps you manage your romantic prospects with smart rankings and recommendations. Let's take a quick tour!"
  - CTA: "Start Tour" button
  - Secondary: "Skip Tour" link (small, bottom)

#### **Step 1: Roster Tab**
- **Trigger**: User clicks "Start Tour"
- **Location**: Navigate to `/roster` with spotlight overlay
- **Spotlight Target**: Empty roster state / Add Person button
- **Content**:
  - **Title**: "Build Your Roster"
  - **Description**: "Add people you're interested in. Rate them on Looks, Personality, and Reliability to track who matters most."
  - **Visual Aid**: Screenshot/mockup of a filled RosterCard showing the three scores
  - **CTA**: "Next" button
  - **Progress**: "1 of 6" indicator

#### **Step 2: Battle System**
- **Location**: Navigate to `/tonight` (Battles section)
- **Spotlight Target**: Battle card area (or mock battle)
- **Content**:
  - **Title**: "Play Battles to Rank"
  - **Description**: "Can't decide who's really #1? Battle them head-to-head. Your choices update ELO rankings automatically—just like chess ratings."
  - **Visual Aid**: Animated example showing two cards side-by-side
  - **Interactive Element**: Allow user to do ONE sample battle (with fake data if roster is empty)
  - **CTA**: "Next" button
  - **Progress**: "2 of 6"

#### **Step 3: Tonight Recommendations**
- **Location**: Scroll to Tonight section on same page
- **Spotlight Target**: Tonight recommendation cards
- **Content**:
  - **Title**: "Get Tonight's Picks"
  - **Description**: "Our algorithm suggests who to reach out to based on their ranking, reliability, and how recently you connected. No more overthinking!"
  - **Visual Aid**: Example recommendation card with score breakdown
  - **CTA**: "Next" button
  - **Progress**: "3 of 6"

#### **Step 4: Schedule Sharing**
- **Location**: Navigate to `/schedule`
- **Spotlight Target**: Weekly availability grid
- **Content**:
  - **Title**: "Share Your Availability"
  - **Description**: "Set when you're free this week and send a link. They'll see your schedule and can share theirs back—coordinate without endless texting."
  - **Visual Aid**: Example of a filled schedule grid
  - **Interaction**: Optional—let user click a few time slots
  - **CTA**: "Next" button
  - **Progress**: "4 of 6"

#### **Step 5: Profile & Stats**
- **Location**: Navigate to `/profile`
- **Spotlight Target**: Stats cards and achievements section
- **Content**:
  - **Title**: "Track Your Progress"
  - **Description**: "See stats on your roster, unlock achievements, and customize your profile. Sign in to sync your data across devices."
  - **Visual Aid**: Example achievement badges
  - **Call-out**: Highlight "Sign in" benefits (cloud sync, history tracking)
  - **CTA**: "Next" button
  - **Progress**: "5 of 6"

#### **Step 6: FAQ Integration**
- **Location**: Open HelpFAQ modal overlay
- **Content**:
  - **Title**: "Need Help Anytime?"
  - **Description**: "Tap the info icon to revisit these tips or browse our FAQ for detailed answers."
  - **Display**: Show collapsed FAQ accordion with 6 questions
  - **CTA**: "Finish Tour" button
  - **Progress**: "6 of 6"

#### **Step 7: Completion**
- **Action**: Close onboarding, set localStorage flag `onboarding_completed: true`
- **Micro-interaction**: Brief confetti animation or success toast
- **Redirect**: Return to `/roster` to encourage first action (adding someone)
- **Persistent Access**: Info button remains available in navigation for re-access

---

## Design Specifications

### Visual Components

#### **Spotlight Overlay**
- **Background**: Semi-transparent dark overlay (rgba(0, 0, 0, 0.75))
- **Spotlight Area**: Clear circular or rounded rectangle around target element
- **Z-index**: 9999 to sit above all other UI
- **Animation**: Smooth fade-in (300ms) and spotlight transition between steps

#### **Tooltip/Card**
- **Position**: Adjacent to spotlight (right, left, top, or bottom based on available space)
- **Style**: White card with rounded corners (12px border-radius)
- **Shadow**: Elevated shadow (0 8px 24px rgba(0,0,0,0.15))
- **Max Width**: 360px on mobile, 420px on desktop
- **Padding**: 24px
- **Typography**:
  - Title: 20px bold, primary color
  - Description: 16px regular, gray-700
  - Progress indicator: 14px, gray-500

#### **Navigation Controls**
- **Primary CTA**: Full-width button, primary color
- **Secondary Actions**:
  - "Skip Tour" link (gray, underlined)
  - "Previous" button (outline style) appears after step 1
- **Progress Dots**: 6 dots at top of card, filled for completed steps

#### **Interactive Elements**
- For Step 2 (Battle), optionally show a simplified battle interface with two fake profiles
- For Step 4 (Schedule), allow tapping time slots with immediate visual feedback (no save)

---

## Technical Implementation

### Architecture

#### **New Components**

1. **`/components/Onboarding/OnboardingWrapper.tsx`**
   - Main orchestrator component
   - Manages step state and navigation
   - Renders spotlight overlay and tooltip cards
   - Handles routing between tabs

2. **`/components/Onboarding/OnboardingStep.tsx`**
   - Reusable step component
   - Props: step number, title, description, visual aid, spotlight target selector
   - Emits events for next/previous/skip actions

3. **`/components/Onboarding/Spotlight.tsx`**
   - Renders overlay with spotlight effect
   - Calculates spotlight position based on target element
   - Uses CSS clip-path or SVG mask for spotlight effect

4. **`/components/Onboarding/OnboardingTooltip.tsx`**
   - Tooltip card component
   - Handles positioning logic (smart placement based on viewport)
   - Progress indicator UI
   - Navigation buttons

#### **Data Models**

```typescript
interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  route: string; // Next.js route to navigate to
  spotlightTarget: string; // CSS selector for element to highlight
  spotlightShape: 'circle' | 'rect'; // Shape of spotlight
  imageUrl?: string; // Optional visual aid
  allowInteraction?: boolean; // Allow clicking spotted element
  customContent?: React.ReactNode; // For special steps (battle demo)
}

interface OnboardingState {
  currentStep: number;
  isActive: boolean;
  hasCompleted: boolean;
  hasSkipped: boolean;
}
```

#### **State Management**

**localStorage keys:**
- `onboarding_completed`: boolean
- `onboarding_current_step`: number (to resume if interrupted)
- `onboarding_started_at`: timestamp
- `onboarding_completed_at`: timestamp

**React Context** (optional):
- `OnboardingContext` to provide state across app
- Allows any component to trigger onboarding restart or show specific step

#### **Routing Integration**

1. Wrap main app layout with `OnboardingWrapper`
2. Listen to step changes and use `router.push()` for navigation
3. Prevent normal navigation during onboarding (intercept clicks)
4. Add query param `?onboarding=true` to distinguish onboarding navigation

---

## Implementation Steps

### Phase 1: Core Infrastructure (Week 1)
1. Create component structure:
   - `OnboardingWrapper`, `OnboardingStep`, `Spotlight`, `OnboardingTooltip`
2. Implement spotlight overlay with CSS clip-path
3. Build step navigation logic (next/prev/skip)
4. Add localStorage persistence
5. Create onboarding step configuration array

### Phase 2: Step Integration (Week 2)
1. Integrate onboarding with app layout
2. Add routing logic for each step
3. Implement spotlight targeting for each tab
4. Create visual aids (screenshots or illustrations)
5. Add Step 2 interactive battle demo (optional)

### Phase 3: Polish & Testing (Week 3)
1. Add animations and transitions
2. Mobile responsiveness testing
3. Handle edge cases:
   - User already has roster data
   - Onboarding interrupted mid-way
   - User navigates away manually
4. Add analytics tracking for each step
5. A/B test variations (completion rates)

### Phase 4: Iteration (Week 4)
1. Collect user feedback
2. Analyze drop-off points
3. Optimize step content and order
4. Add optional "Restart Tour" button in HelpFAQ

---

## User Stories & Acceptance Criteria

### Story 1: First-Time User Onboarding
**As a** new user visiting When2Crack for the first time
**I want** to quickly understand what the app does and how to use it
**So that** I can start adding people and getting value immediately

**Acceptance Criteria:**
- [ ] Welcome screen shows on first launch (no localStorage flag)
- [ ] "Skip Tour" option is always visible
- [ ] Tour progresses through all 6 steps in order
- [ ] Each step highlights the correct UI element
- [ ] Navigation works smoothly between tabs
- [ ] Tour ends with FAQ modal open
- [ ] Completion flag prevents re-showing on subsequent visits

### Story 2: Returning User Help Access
**As a** returning user who skipped onboarding
**I want** to replay the tour or access specific help
**So that** I can learn features I missed

**Acceptance Criteria:**
- [ ] "Restart Tour" option available in HelpFAQ or Profile
- [ ] Tour behaves identically to first-time flow
- [ ] Option to jump to specific step (e.g., "Learn about Battles")

### Story 3: Onboarding Interruption Recovery
**As a** user who started the tour but closed the app mid-way
**I want** to resume where I left off or start over
**So that** I don't lose progress

**Acceptance Criteria:**
- [ ] Current step saved to localStorage
- [ ] On return, offer "Resume Tour" or "Start Over"
- [ ] If > 24 hours elapsed, default to "Start Over"

---

## Edge Cases & Considerations

### User Has Existing Data
- If roster already has people, show real data instead of placeholders
- Adjust messaging: "Now let's show you how battles work with YOUR roster"

### Mobile vs Desktop
- Spotlight positioning must work on small screens
- Tooltip cards should never overflow viewport
- Consider swipe gestures for next/prev on mobile

### Guest vs Authenticated Users
- Both see same onboarding
- Step 5 (Profile) emphasizes sign-in benefits for guests
- Authenticated users see sync status instead

### Accessibility
- Keyboard navigation: Arrow keys or Tab to progress
- Screen reader announcements for each step
- Focus trapping within onboarding modal
- High contrast mode support

### Performance
- Lazy load onboarding components (not on initial bundle)
- Preload visual aids to avoid loading delays during tour
- Optimize animations for 60fps

---

## Future Enhancements

### V2 Features
1. **Contextual Tips**: After onboarding, show one-time tooltips when user first encounters specific features (e.g., "Shoot Your Shot" button)
2. **Interactive Checklist**: Post-onboarding checklist in Profile: "Add 3 people", "Complete 5 battles", "Set your schedule"
3. **Video Walkthrough**: Embedded 30-second video option for visual learners
4. **Personalized Path**: Different onboarding for "I want to rank" vs "I want recommendations" user intent
5. **Gamification**: Award special "Onboarding Complete" achievement badge

### Analytics to Track
- Step-by-step drop-off rates
- Average completion time
- Skip rate per step
- "Restart Tour" usage
- Correlation between onboarding completion and user retention

---

## Mockup Descriptions

### Welcome Screen
```
+----------------------------------+
|                                  |
|         [When2Crack Logo]        |
|                                  |
|    Your roster, ranked.          |
|    Your night, decided.          |
|                                  |
|  When2Crack helps you manage     |
|  your romantic prospects with    |
|  smart rankings and              |
|  recommendations. Let's take a   |
|  quick tour!                     |
|                                  |
|      [Start Tour Button]         |
|                                  |
|           Skip Tour              |
+----------------------------------+
```

### Step Example (Roster)
```
+----------------------------------+
|  ████████████████████████████    |  <- Dark overlay
|  ████████████████████████████    |
|  ████                            |
|  ████  ╔═══════════════════╗    |
|  ████  ║   Build Your      ║    |  <- Tooltip card
|  ████  ║   Roster          ║    |
|  ████  ║                   ║    |
|  ████  ║ Add people you're ║    |
|  ████  ║ interested in...  ║    |
|  ████  ║                   ║    |
|  ████  ║ ○ ○ ● ○ ○ ○       ║    |  <- Progress dots
|  ████  ║                   ║    |
|       ║   [Next Button]   ║    |
|       ╚═══════════════════╝    |
|                                  |
|  [Spotted: Add Person Button]   |  <- Clear spotlight
|                                  |
|  ████████████████████████████    |
+----------------------------------+
```

---

## Open Questions

1. **Should we allow skipping individual steps vs entire tour?**
   - Recommendation: Allow full skip only, to maintain narrative flow

2. **Should onboarding differ for mobile vs desktop?**
   - Recommendation: Same flow, different positioning/sizing

3. **When should "existing users" see onboarding?**
   - Recommendation: Only on first launch; add manual "Tour" option in FAQ

4. **Should we collect feedback after onboarding?**
   - Recommendation: Yes, simple 1-5 star rating + optional comment

5. **How to handle onboarding for major feature releases?**
   - Recommendation: Create separate "What's New" micro-tours for specific features

---

## Resources Needed

### Design Assets
- [ ] Logo/branding for welcome screen
- [ ] 6 visual aid images (screenshots or illustrations)
- [ ] Confetti animation or success graphic
- [ ] Icons for progress indicators

### Copy/Content
- [ ] Final copy for each step (title + description)
- [ ] Microcopy for buttons and links
- [ ] Error messages if onboarding fails

### Development
- [ ] Frontend: ~40 hours (components + integration + testing)
- [ ] Design: ~16 hours (mockups + assets)
- [ ] QA: ~8 hours (testing across devices)
- **Total estimated effort**: ~64 hours / 1.5 weeks

---

## Appendix: Alternative Approaches Considered

### Approach A: Video Tutorial
**Pros**: High engagement, easy to understand
**Cons**: Bandwidth-heavy, users can't interact, hard to update
**Decision**: Rejected for V1, consider for V2

### Approach B: Coachmarks (Tooltips Only)
**Pros**: Non-intrusive, users control pace
**Cons**: Easy to dismiss without learning, scattered attention
**Decision**: Too passive for complex features like ELO battles

### Approach C: Checklist-Based Onboarding
**Pros**: Gamified, encourages completion
**Cons**: Doesn't explain *why* features matter
**Decision**: Good for V2 post-tour engagement

### Approach D: Interactive Wizard (Selected)
**Pros**: Guides user through app, interactive, memorable
**Cons**: Development time, can feel forced
**Decision**: Best for educating on interconnected features

---

## Conclusion

This onboarding workflow will reduce confusion, increase engagement, and establish When2Crack's value proposition within the first 90 seconds. By walking users through each tab and ending with the FAQ, we ensure they understand both individual features and the holistic experience.

**Next Step**: Review this design doc with stakeholders, then move to prototyping Phase 1 components.
