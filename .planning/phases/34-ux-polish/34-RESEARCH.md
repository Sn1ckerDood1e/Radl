# Phase 34: UX Polish - Loading, Errors, Empty States - Research

**Researched:** 2026-01-29
**Domain:** Loading states, error handling, empty states, React 19 + Next.js 16 patterns
**Confidence:** HIGH

## Summary

This phase enhances user feedback during loading, error, and empty states across the application. The codebase already has solid foundations in place:

1. **Loading states:** Next.js route-level `loading.tsx` files exist for major list views (roster, equipment, practices) using the `Skeleton` component from shadcn/ui. Detail pages lack loading states.

2. **Error handling:** Toast-based error system (`sonner` + `toast-helpers.ts`) with retry support exists. The `OfflineProvider` and `useOfflineIndicator` hook provide network error detection with retry. Form validation uses `react-hook-form` with `mode: 'onTouched'` already configured.

3. **Empty states:** The `EmptyState` component exists and is used consistently across list pages. It supports icon, title, description, and action props. Currently only one variant (informational).

**Primary recommendation:** Extend existing patterns rather than introducing new systems. Add delayed spinner wrapper, progress indicator component, and empty state variants.

## Current State Analysis

### What Exists

| Area | Status | Location |
|------|--------|----------|
| Skeleton component | Complete | `src/components/ui/skeleton.tsx` |
| EmptyState component | Basic | `src/components/ui/empty-state.tsx` |
| Route loading.tsx (list pages) | Complete | roster, equipment, practices, regattas |
| Route loading.tsx (detail pages) | Missing | No `[id]/loading.tsx` files exist |
| Toast error system | Complete | `src/lib/toast-helpers.ts` + sonner |
| Offline error handling | Complete | `src/components/pwa/offline-indicator.tsx` |
| Form validation (onTouched) | Complete | All forms use `mode: 'onTouched'` |
| FormField component | Complete | `src/components/ui/form-field.tsx` |
| Spinner component | Partial | Inline in notification-settings.tsx |
| Delayed spinner | Missing | No 300ms delay logic |
| Progress indicator | Missing | No long operation progress UI |
| Optimistic updates | Partial | `useOfflineMutation` hook exists |

### Loading State Patterns (Current)

**Route-level loading.tsx files exist for:**
- `/[teamSlug]/roster/loading.tsx` - 5 skeleton cards
- `/[teamSlug]/equipment/loading.tsx` - header + grid of 6 cards
- `/[teamSlug]/practices/loading.tsx` - header + 5 practice cards
- `/[teamSlug]/regattas/loading.tsx`
- `/[teamSlug]/schedule/loading.tsx`
- `/facility/[facilitySlug]/equipment/loading.tsx`

**Missing loading states:**
- Detail pages (`/roster/[id]`, `/equipment/[id]`, `/practices/[id]`)
- Settings pages
- Template pages

### Empty State Usage (Current)

The `EmptyState` component is used in:
- Roster page (no members)
- Equipment page (no equipment)
- Practices page (no practices)
- Regattas page (no regattas)
- Lineup templates page (no templates)
- Announcements list (no announcements)
- Notifications page (no notifications)

Current signature:
```typescript
interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; href?: string; onClick?: () => void }
  className?: string
}
```

### Error Handling Patterns (Current)

**Toast helpers (`src/lib/toast-helpers.ts`):**
```typescript
showErrorToast({ message, description, retry })  // Persists until dismissed
showSuccessToast(message, description)           // Auto-dismiss 4s
showActionableError(message, data, retryFn)      // With retry action
```

**Form validation errors:**
- Use `FormField` component with animated error messages
- `mode: 'onTouched'` already configured in all forms
- Inline errors with red-400 text + slide-in animation

**Network errors:**
- `OfflineProvider` wraps app
- `useOfflineIndicator` hook for detecting offline
- `useOfflineAction` wrapper for network operations
- Visual indicator at bottom of screen with retry button

## Gap Analysis by Requirement

### LOAD-01: Skeleton loading states on list views
**Status:** MOSTLY COMPLETE
**Gap:** All major list views have loading.tsx files
**Action:** Verify coverage, possibly add to minor lists

### LOAD-02: Skeleton loading states on detail pages
**Status:** NOT STARTED
**Gap:** No detail page loading states exist
**Files to create:**
- `roster/[id]/loading.tsx`
- `equipment/[id]/loading.tsx`
- `practices/[id]/loading.tsx`
- Other detail pages as needed

### LOAD-03: 300ms delay before showing spinners
**Status:** NOT STARTED
**Gap:** No delayed spinner implementation exists
**Approach:** Create `DelayedSpinner` component with 300ms threshold

### LOAD-04: Progress indicators for operations > 10 seconds
**Status:** NOT STARTED
**Gap:** No progress indicator component exists
**Approach:** Create `ProgressIndicator` component, integrate into bulk operations

### ERRR-01: Error messages with icon and clear action
**Status:** MOSTLY COMPLETE
**Gap:** Toast system has retry, but some inline errors lack icons
**Action:** Audit and standardize error display

### ERRR-02: Form validation errors shown on blur
**Status:** COMPLETE
**Gap:** None - all forms use `mode: 'onTouched'`
**Action:** Verify coverage, no changes needed

### ERRR-03: Network error states with retry
**Status:** COMPLETE
**Gap:** None - `OfflineProvider` + `showErrorToast` with retry
**Action:** Verify consistent usage across all API calls

### ERRR-04: Optimistic UI updates with rollback
**Status:** PARTIAL
**Gap:** `useOfflineMutation` exists but not widely used
**Action:** Identify key operations to add optimistic updates

### EMPT-01: Empty state variants
**Status:** NOT STARTED
**Gap:** Only one EmptyState variant exists
**Action:** Add variants: informational (default), celebration, error

### EMPT-02: All list views have contextual empty states
**Status:** MOSTLY COMPLETE
**Gap:** Most list views have empty states
**Action:** Audit for consistency and context-appropriate messaging

### EMPT-03: Empty states include call-to-action
**Status:** MOSTLY COMPLETE
**Gap:** Most have actions, some are coach-only
**Action:** Ensure all empty states guide user to next step

## Standard Stack

### Core Components (Existing)
| Component | Location | Status |
|-----------|----------|--------|
| Skeleton | `src/components/ui/skeleton.tsx` | Use as-is |
| EmptyState | `src/components/ui/empty-state.tsx` | Extend with variants |
| FormField | `src/components/ui/form-field.tsx` | Use as-is |
| Button | `src/components/ui/button.tsx` | Use for retry actions |

### New Components (To Create)
| Component | Purpose | Location |
|-----------|---------|----------|
| DelayedSpinner | 300ms delay spinner | `src/components/ui/delayed-spinner.tsx` |
| ProgressIndicator | Long operation progress | `src/components/ui/progress-indicator.tsx` |
| ErrorBoundary | Catch component errors | `src/components/ui/error-boundary.tsx` |

### Libraries (Already Installed)
| Library | Version | Purpose |
|---------|---------|---------|
| sonner | 2.0.7 | Toast notifications |
| react-hook-form | 7.71.1 | Form validation |
| lucide-react | 0.562.0 | Icons for empty states |
| tw-animate-css | 1.4.0 | Animations |

## Architecture Patterns

### Delayed Spinner Pattern
```typescript
// src/components/ui/delayed-spinner.tsx
'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DelayedSpinnerProps {
  delay?: number;  // Default 300ms
  className?: string;
}

export function DelayedSpinner({ delay = 300, className }: DelayedSpinnerProps) {
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSpinner(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!showSpinner) return null;

  return (
    <svg
      className={cn('animate-spin h-5 w-5 text-teal-500', className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
```

### Empty State Variants Pattern
```typescript
// Enhanced EmptyState with variants
type EmptyStateVariant = 'informational' | 'celebration' | 'error';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href?: string; onClick?: () => void };
  variant?: EmptyStateVariant;  // New prop
  className?: string;
}

// Variant styling:
// informational: zinc-800 bg, zinc-500 icon (current)
// celebration: teal-500/20 bg, teal-400 icon, confetti optional
// error: red-500/20 bg, red-400 icon
```

### Detail Page Loading Pattern
```typescript
// src/app/(dashboard)/[teamSlug]/equipment/[id]/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function EquipmentDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Title + badge */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Detail card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Progress Indicator Pattern
```typescript
// src/components/ui/progress-indicator.tsx
'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  isActive: boolean;
  threshold?: number;  // Show after this many ms (default 10000)
  message?: string;
  className?: string;
}

export function ProgressIndicator({
  isActive,
  threshold = 10000,
  message = 'This is taking longer than expected...',
  className,
}: ProgressIndicatorProps) {
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setShowProgress(false);
      return;
    }

    const timer = setTimeout(() => setShowProgress(true), threshold);
    return () => clearTimeout(timer);
  }, [isActive, threshold]);

  if (!isActive || !showProgress) return null;

  return (
    <div className={cn(
      'p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg',
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="animate-spin h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full" />
        <p className="text-amber-400 text-sm">{message}</p>
      </div>
    </div>
  );
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast system | sonner + toast-helpers.ts | Already integrated, consistent |
| Form validation display | Custom error rendering | FormField component | Has animations, accessibility |
| Loading skeletons | Custom shimmer CSS | Skeleton component | shadcn standard, accessible |
| Offline detection | Custom navigator.onLine | useOnlineStatus hook | Already handles edge cases |

## Common Pitfalls

### Pitfall 1: Spinner Flash
**What goes wrong:** Showing spinner immediately causes flash on fast loads
**Why it happens:** Network requests often complete < 300ms
**How to avoid:** Always use DelayedSpinner with minimum 300ms threshold
**Warning signs:** Users see brief spinner flashes on fast connections

### Pitfall 2: Missing Loading States
**What goes wrong:** White/blank screen during navigation
**Why it happens:** Forgetting to add loading.tsx for new routes
**How to avoid:** Create loading.tsx alongside each new page.tsx
**Warning signs:** Blank screen between page navigations

### Pitfall 3: Inconsistent Empty States
**What goes wrong:** Different pages show different empty state styles
**Why it happens:** Creating inline empty states instead of using component
**How to avoid:** Always use EmptyState component, not inline divs
**Warning signs:** Empty states with different padding, icons, button styles

### Pitfall 4: Error Toast Without Retry
**What goes wrong:** Users can't retry failed operations
**Why it happens:** Using basic toast.error() instead of showErrorToast with retry
**How to avoid:** Always include retry callback for retriable errors
**Warning signs:** Error toasts without "Retry" button

### Pitfall 5: Optimistic Update Without Rollback
**What goes wrong:** UI shows success but server fails, data out of sync
**Why it happens:** Implementing optimistic update without rollback handler
**How to avoid:** Always pair optimistic update with rollback in useOfflineMutation
**Warning signs:** Stale data after network errors

## Code Examples

### Using DelayedSpinner in Button
```typescript
<Button disabled={isSubmitting}>
  {isSubmitting ? (
    <DelayedSpinner className="mr-2 h-4 w-4" />
  ) : null}
  {isSubmitting ? 'Saving...' : 'Save'}
</Button>
```

### Using EmptyState with Variants
```typescript
// Informational (default) - for first-time users
<EmptyState
  icon={Users}
  title="No team members yet"
  description="Invite your first athlete or coach to get started."
  action={{ label: "Invite Member", href: `/${teamSlug}/invitations` }}
/>

// Celebration - for completed states
<EmptyState
  icon={Trophy}
  title="All caught up!"
  description="You've reviewed all pending invitations."
  variant="celebration"
/>

// Error - for fetch failures
<EmptyState
  icon={AlertCircle}
  title="Couldn't load data"
  description="Something went wrong. Please try again."
  variant="error"
  action={{ label: "Retry", onClick: refetch }}
/>
```

### Network Error with Retry
```typescript
const handleSave = async (data: FormData) => {
  try {
    await saveData(data);
    showSuccessToast('Changes saved');
  } catch (error) {
    showErrorToast({
      message: 'Failed to save changes',
      description: error instanceof Error ? error.message : undefined,
      retry: () => handleSave(data),
    });
  }
};
```

## Files to Modify/Create

### New Files
| File | Purpose |
|------|---------|
| `src/components/ui/delayed-spinner.tsx` | Spinner with 300ms delay |
| `src/components/ui/progress-indicator.tsx` | Long operation progress |
| `src/app/(dashboard)/[teamSlug]/roster/[id]/loading.tsx` | Roster detail loading |
| `src/app/(dashboard)/[teamSlug]/equipment/[id]/loading.tsx` | Equipment detail loading |
| `src/app/(dashboard)/[teamSlug]/practices/[id]/loading.tsx` | Practice detail loading |

### Files to Modify
| File | Change |
|------|--------|
| `src/components/ui/empty-state.tsx` | Add variant prop and styles |
| Various list pages | Verify empty state coverage |
| Forms with isSubmitting | Replace inline spinner with DelayedSpinner |

## Recommended Wave Grouping

### Wave 1: Core Components (2-3 tasks)
- Create DelayedSpinner component
- Enhance EmptyState with variants
- Create ProgressIndicator component

### Wave 2: Loading States (2-3 tasks)
- Add detail page loading.tsx files
- Audit and verify list view loading coverage
- Integrate DelayedSpinner into form buttons

### Wave 3: Error Handling (2-3 tasks)
- Audit error toast usage, add retry where missing
- Verify FormField error display consistency
- Add optimistic updates to key operations

### Wave 4: Empty States (1-2 tasks)
- Audit all list views for empty state coverage
- Update empty state messaging to be contextual
- Add celebration variant where appropriate

## Open Questions

1. **Progress indicator threshold:** 10 seconds specified in requirements - confirm this is the right threshold or if it should be configurable per operation.

2. **Celebration variant usage:** When should celebration variant be used? After completing actions like "all invitations reviewed"?

3. **Optimistic update scope:** Which operations should have optimistic updates? Currently useOfflineMutation exists but scope is unclear.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `/home/hb/radl/src/components/ui/skeleton.tsx`
- Codebase analysis: `/home/hb/radl/src/components/ui/empty-state.tsx`
- Codebase analysis: `/home/hb/radl/src/lib/toast-helpers.ts`
- Codebase analysis: `/home/hb/radl/src/components/pwa/offline-indicator.tsx`
- Codebase analysis: `/home/hb/radl/src/hooks/use-offline-mutation.ts`

### Secondary (MEDIUM confidence)
- shadcn/ui Skeleton pattern (standard implementation)
- React 19 + Next.js 16 loading.tsx conventions (established patterns)

## Metadata

**Confidence breakdown:**
- Current state analysis: HIGH - Direct codebase examination
- Gap analysis: HIGH - Requirements mapped to existing code
- Architecture patterns: HIGH - Based on existing codebase patterns
- Implementation approach: MEDIUM - Some patterns need validation

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (patterns are stable)
