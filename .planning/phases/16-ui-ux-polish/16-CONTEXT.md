# Phase 16: UI/UX Polish - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Application provides modern, intuitive experience with helpful guidance and polished interactions. Includes empty states, loading states, error handling, form validation, micro-animations, onboarding flow, and keyboard shortcuts. New features or capabilities belong in other phases.

</domain>

<decisions>
## Implementation Decisions

### Decision 1: Empty State Style
- Simple icons with text (not custom illustrations)
- Neutral & instructional tone: "No practices found. Click 'New Practice' to create one."
- Include action buttons to create first item

### Decision 2: Loading States
- Skeleton placeholders with pulse animation (fade in/out)
- Claude decides which pages get skeletons based on content complexity

### Decision 3: Error Display
- Toast notifications at bottom-right (using existing Sonner setup)
- Include action buttons: "Failed to save. [Retry] [Dismiss]"
- Auto-dismiss success toasts but persist errors until dismissed

### Decision 4: Success Feedback
- Brief toast for major actions (create, delete, publish)
- Inline checkmark animation for quick saves (auto-save, field updates)
- Both patterns used appropriately based on action significance

### Decision 5: Form Validation
- Validate on blur (when user leaves field) and on submit
- Inline error messages below fields
- Clear errors when user starts correcting

### Decision 6: Onboarding Flow
- Claude decides the most valuable first steps to guide
- Step indicator: "Step 2 of 4" with progress dots
- Skip anytime with visible "Skip" button
- Show on first login only, never again

### Decision 7: Command Palette (Cmd+K)
- Full search: pages, actions, and search athletes/equipment by name
- Press ? to show keyboard shortcuts overlay
- Claude decides which page-specific shortcuts make sense

### Claude's Discretion
- Skeleton placement (which pages)
- Onboarding content and steps
- Individual keyboard shortcuts beyond essentials
- Micro-animation timing and easing
- Exact empty state icon choices

</decisions>

<specifics>
## Specific Ideas

- Validation follows "on blur + submit" pattern - immediate feedback without being annoying during typing
- Command palette should feel like Linear/Notion - quick, searchable, keyboard-navigable
- Error toasts are actionable - not just informational messages

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-ui-ux-polish*
*Context gathered: 2026-01-24*
