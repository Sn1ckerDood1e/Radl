---
phase: 14-design-system-foundation
created: 2026-01-23
status: ready-to-plan
---

# Phase 14: Design System Foundation — Context

## Phase Goal

Application has consistent component library with dark mode and mobile-first design.

## Current State Analysis

| Aspect | Status |
|--------|--------|
| Tailwind v4 | Already installed (`"tailwindcss": "^4"`) |
| Dark mode | CSS variables + ThemeProvider exist and work |
| Theme persistence | Already working via localStorage |
| shadcn/ui | Not installed |
| Custom components | 59 components across codebase |
| Touch targets | Currently 24-36px (below 44px requirement) |

### Existing CSS Variables

```css
/* Current theme variables in globals.css */
--surface-1, --surface-2, --surface-3  /* Surface colors */
--border, --border-subtle              /* Borders */
--text-primary, --text-secondary, --text-muted  /* Text */
--team-primary, --team-secondary       /* Team colors (dynamic) */
```

### Existing Components (59 total)

High-traffic patterns:
- Buttons: Inline styles scattered across components
- Dialogs: Custom implementation (MFA, forms)
- Dropdowns: Context switcher, various selects
- Form inputs: Text, date, time inputs
- Selects: Multiple custom implementations

## Decisions Made

### Decision 1: CSS Variable Integration

**Choice:** Map our CSS variables to shadcn variables

**Rationale:**
- Existing components continue working unchanged
- shadcn components inherit our theme
- No migration burden for existing code
- Best of both worlds

**Implementation:**
```css
/* Map our vars to shadcn expectations */
--background: var(--surface-1);
--foreground: var(--text-primary);
--card: var(--surface-2);
--muted: var(--surface-3);
--muted-foreground: var(--text-muted);
--border: var(--border);
/* etc. */
```

### Decision 2: Component Selection

**Choice:** Install Button, Dialog, Select, Input, DropdownMenu

**Rationale:**
- These are the roadmap's specified "top 5 high-traffic components"
- Covers most common UI patterns
- Foundation for future components

**Components:**
1. **Button** — Primary interaction element
2. **Dialog** — Modals, confirmations, forms
3. **Select** — Dropdown selections
4. **Input** — Text fields, form inputs
5. **DropdownMenu** — Context menus, actions

### Decision 3: Migration Approach

**Choice:** Incremental migration

**Rationale:**
- Lower risk than batch update
- New code uses shadcn immediately
- Existing components updated as we touch them
- Prevents phase scope creep

**Rules:**
- New dialogs → use shadcn Dialog
- New forms → use shadcn Input/Select
- Touching existing component → migrate if >50% rewrite

### Decision 4: Migration Tracking

**Choice:** ESLint rule + components/README.md

**Implementation:**
1. ESLint rule warning on deprecated patterns:
   - Custom dialog implementations → suggest shadcn Dialog
   - Inline button styles → suggest shadcn Button
2. components/README.md tracking:
   - Migration status per directory
   - Deprecated patterns list
   - shadcn component usage guide

### Decision 5: Touch Target Enforcement

**Choice:** 44px on mobile breakpoints only

**Rationale:**
- Mobile users need larger touch targets
- Desktop users benefit from compact UI
- Avoids bloated desktop interfaces
- Aligns with platform conventions

**Implementation:**
```css
/* Mobile touch targets */
@media (max-width: 768px) {
  .btn, button, [role="button"] {
    min-height: 44px;
    min-width: 44px;
  }
}
```

Or via shadcn component customization with responsive sizing.

### Decision 6: Dark Mode Toggle Location

**Choice:** Header dropdown + Settings page

**Implementation:**
- **Header:** Quick toggle icon (sun/moon) in user dropdown
- **Settings:** Full theme selector (Dark / Light / System)
- Both use existing ThemeProvider

## Success Criteria Mapping

| Criteria | Approach |
|----------|----------|
| shadcn/ui with Tailwind v4 | Install shadcn, map CSS vars |
| Dark mode toggle, persists | Add toggle UI (header + settings) |
| Top 5 components migrated | Button, Dialog, Select, Input, DropdownMenu |
| Migration tracking | ESLint rule + README |
| 44px touch targets | Mobile-only CSS |

## Technical Notes

### shadcn/ui + Tailwind v4 Compatibility

shadcn/ui now supports Tailwind v4. Installation:
```bash
npx shadcn@latest init
```

Choose:
- Style: New York or Default (recommend New York for compact)
- Base color: Zinc (matches our current palette)
- CSS variables: Yes

### Team Color Integration

Team colors (`--team-primary`, `--team-secondary`) are set dynamically per club.
shadcn's `--primary` should NOT override these. Keep separate:
- `--primary` = app accent color (fixed)
- `--team-primary` = club brand color (dynamic)

## Out of Scope

- Full component migration (only top 5)
- Animation system (Phase 16)
- Mobile-specific components like bottom sheets (Phase 15)
- Onboarding flow (Phase 16)

## Dependencies

- None (can run parallel with Phase 13)

## Risks

| Risk | Mitigation |
|------|------------|
| CSS variable conflicts | Map carefully, test both dark/light modes |
| shadcn update breaks styles | Pin version, test before updates |
| Migration creates inconsistency | Incremental approach, tracking via README |
