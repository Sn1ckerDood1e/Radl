---
phase: 16-ui-ux-polish
plan: 05
subsystem: onboarding
tags: [onboarding, wizard, localStorage, user-experience, first-time-user, guided-tour]
requires: [16-01-loading-empty-states]
provides: [onboarding-wizard, onboarding-state-hook, first-time-user-experience]
affects: [team-dashboard, user-retention]
tech-stack:
  added: []
  patterns: [localStorage-persistence, team-scoped-state, multi-step-wizard, progress-indicators]
key-files:
  created:
    - src/hooks/use-onboarding.ts
    - src/components/onboarding/onboarding-wizard.tsx
    - src/components/onboarding/onboarding-steps.tsx
    - src/components/dashboard/dashboard-with-onboarding.tsx
  modified:
    - src/app/(dashboard)/[teamSlug]/page.tsx
decisions:
  - decision: "Only show onboarding to coaches"
    rationale: "Coaches are primary setup users who need to create practices"
    outcome: "isCoach prop controls onboarding visibility"
  - decision: "Team-specific localStorage key"
    rationale: "Users may be part of multiple teams, each needs separate onboarding state"
    outcome: "Storage key includes teamId: radl-onboarding-{teamId}"
  - decision: "Fullscreen modal instead of inline wizard"
    rationale: "Captures attention and guides focus for first-time users"
    outcome: "Fixed overlay with centered modal and backdrop blur"
  - decision: "Allow skipping at any time"
    rationale: "Users should never feel trapped in onboarding"
    outcome: "Skip button (X) in top-right, sets skipped flag to prevent re-showing"
metrics:
  duration: "3 minutes"
  completed: "2026-01-24"
---

# Phase 16 Plan 05: Onboarding Wizard Summary

Multi-step onboarding wizard guiding new coaches through first steps with team-specific localStorage persistence.

## What Was Built

### 1. Onboarding State Hook (`useOnboarding`)

Team-specific localStorage persistence for onboarding progress:

**Features:**
- Team-scoped storage key (`radl-onboarding-{teamId}`)
- SSR-safe with window checks and loading state
- State tracking: completed, currentStep, skipped, completedAt
- Actions: nextStep, prevStep, goToStep, complete, skip, reset
- Computed `showOnboarding` (not completed and not skipped)

**Pattern:**
```typescript
const { showOnboarding, state, nextStep, complete, skip } = useOnboarding(teamId);
```

### 2. Onboarding Step Components

Four themed steps with gradient icons:

**Step 1: Welcome**
- Sparkles icon with blue/purple gradient
- Welcome message with team name
- "Get Started" button

**Step 2: Roster Overview**
- Users icon with green/teal gradient
- Roster explanation
- "View Roster" + "Continue" buttons

**Step 3: Practice Creation Prompt**
- Calendar icon with orange/red gradient
- Practice scheduling explanation
- "I'll do this later" + "Create Practice" buttons

**Step 4: Completion Celebration**
- CheckCircle icon with purple/pink gradient
- Success message
- "Go to Dashboard" + "Create Practice" buttons

### 3. Onboarding Wizard Container

Modal-style wizard with progress tracking:

**Features:**
- Fullscreen backdrop with blur (bg-black/80 backdrop-blur-sm)
- Centered modal (max-w-2xl)
- Skip button (X) in top-right corner
- Progress dots (animated, shows current step)
- Step counter ("Step X of 4")
- Min height (300px) for consistent sizing

**UX:**
- Only shows for coaches (`isCoach` check)
- Only shows if not completed and not skipped
- Dismisses when completed or skipped

### 4. Dashboard Integration

Client wrapper component for conditional rendering:

**DashboardWithOnboarding:**
- Wraps dashboard content
- Conditionally renders OnboardingWizard for coaches
- Passes teamId, teamSlug, teamName, isCoach props
- Server-side page passes data to client wrapper

**Integration pattern:**
```tsx
<DashboardWithOnboarding teamId={team.id} teamSlug={team.slug} teamName={team.name} isCoach={isCoach}>
  {dashboardContent}
</DashboardWithOnboarding>
```

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

### LocalStorage Key Structure

**Decision:** Use `radl-onboarding-{teamId}` format

**Context:** Users can be part of multiple teams, each team's onboarding should be tracked independently.

**Options considered:**
1. User-level key (single onboarding for all teams)
2. Team-specific key (current approach)

**Choice:** Team-specific for better UX - new coaches need onboarding per team.

### Onboarding Visibility

**Decision:** Only show onboarding to coaches

**Context:** Coaches are primary setup users who create practices and manage equipment.

**Rationale:** Athletes don't need setup guidance, they consume schedules. Coaches need help getting started.

### Modal vs Inline

**Decision:** Fullscreen modal instead of inline wizard

**Context:** First-time user experience needs to capture attention.

**Rationale:** Modal creates focus, prevents distraction, guides sequential flow. Inline could be scrolled past or ignored.

## Implementation Notes

### SSR Safety

Hook uses standard pattern:
- Initial state is null during SSR
- `isLoading` true until mounted
- `useEffect` loads from localStorage after mount
- Window checks prevent server-side errors

### State Persistence

- Loads from localStorage on mount
- Saves to localStorage on every state change
- Try/catch prevents localStorage errors (quota, privacy mode)
- Default state if not found (fresh onboarding)

### Step Flow

1. Welcome → nextStep()
2. Roster → nextStep() or navigate to roster
3. Practice → complete() (whether "later" or "create")
4. Complete → complete() (finishes onboarding)

### Skip Behavior

- Skip button available at all steps
- Sets `skipped: true` and `completedAt`
- `showOnboarding` becomes false
- Never re-appears (unless reset manually)

## Files Changed

**Created:**
- `src/hooks/use-onboarding.ts` (215 lines)
- `src/components/onboarding/onboarding-wizard.tsx` (110 lines)
- `src/components/onboarding/onboarding-steps.tsx` (148 lines)
- `src/components/dashboard/dashboard-with-onboarding.tsx` (45 lines)

**Modified:**
- `src/app/(dashboard)/[teamSlug]/page.tsx` (+19 lines)

## Test Plan

### Manual Testing

**New coach first visit:**
1. Create new team as coach
2. Visit team dashboard
3. Verify onboarding wizard appears
4. Click "Get Started"
5. Verify step 2 appears with progress dots
6. Click "Continue"
7. Verify step 3 appears
8. Click "I'll do this later"
9. Verify wizard closes
10. Refresh page
11. Verify wizard does NOT reappear

**Skip behavior:**
1. Create new team as coach
2. Visit team dashboard
3. Click X (skip button)
4. Verify wizard closes
5. Refresh page
6. Verify wizard does NOT reappear

**Non-coach behavior:**
1. Join team as athlete
2. Visit team dashboard
3. Verify onboarding wizard does NOT appear

**Multi-team behavior:**
1. Complete onboarding for Team A
2. Create new Team B as coach
3. Visit Team B dashboard
4. Verify onboarding wizard appears (separate state)

### localStorage Verification

**Check stored state:**
```javascript
// After completing onboarding for team-id-123
localStorage.getItem('radl-onboarding-team-id-123')
// Expected: {"completed":true,"currentStep":4,"skipped":false,"completedAt":"2026-01-24T13:44:12.000Z"}
```

## Next Phase Readiness

**Dependencies satisfied:**
- ✅ Design system components (Button, icons)
- ✅ Dashboard page structure
- ✅ Team context (teamId, teamSlug, teamName)
- ✅ Role detection (isCoach)

**Provides for future plans:**
- Onboarding pattern can be extended for feature releases
- localStorage persistence pattern for other user preferences
- Multi-step wizard pattern for complex flows

**No blockers for subsequent plans.**

## Success Criteria

✅ New users see onboarding wizard on first visit to team dashboard
✅ Wizard shows step progress (Step 2 of 4)
✅ Users can skip onboarding at any time
✅ Onboarding completion is stored and never shows again
✅ Wizard guides through first practice creation flow

## Key Links

**Pattern verification:**
```bash
# Hook pattern matches established conventions
grep -A 5 "export function use" src/hooks/use-onboarding.ts

# localStorage pattern matches use-pwa-install.ts
grep "localStorage" src/hooks/use-onboarding.ts
grep "localStorage" src/hooks/use-pwa-install.ts
```

**Integration check:**
```bash
# Verify OnboardingWizard import in dashboard
grep "OnboardingWizard" src/app/(dashboard)/[teamSlug]/page.tsx

# Verify conditional rendering for coaches
grep "isCoach.*OnboardingWizard" src/components/dashboard/dashboard-with-onboarding.tsx
```
