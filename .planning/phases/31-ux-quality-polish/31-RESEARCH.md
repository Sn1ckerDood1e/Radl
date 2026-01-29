# Phase 31: UX Quality Polish - Research

**Researched:** 2026-01-29
**Domain:** UX/UI patterns, form validation, error handling, mobile accessibility
**Confidence:** HIGH

## Summary

This research covers the UX quality polish requirements for improving error messages, empty states, mobile touch targets, and form validation. The codebase already has solid foundations in place:

- **EmptyState component** exists at `src/components/ui/empty-state.tsx` with icon, title, description, and CTA action support
- **Toast helpers** at `src/lib/toast-helpers.ts` using Sonner with error retry patterns
- **FormField component** at `src/components/ui/form-field.tsx` for consistent validation display
- **Global 44px touch targets** via CSS media queries in `src/app/globals.css`
- **react-hook-form** with Zod validation throughout the codebase

The polish work involves: (1) auditing existing error messages for actionable content, (2) ensuring all major pages have empty states, (3) verifying touch targets on interactive elements, and (4) standardizing form validation modes.

**Primary recommendation:** Standardize on `mode: "onTouched"` + `reValidateMode: "onChange"` for all forms, audit pages for EmptyState usage, and review error message copy for actionable guidance.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | 7.71.1 | Form state and validation | Already in use, de-facto React form standard |
| @hookform/resolvers | 5.2.2 | Zod integration | Connects Zod schemas to react-hook-form |
| zod | 4.3.5 | Schema validation | Already in use for all validation |
| sonner | 2.0.7 | Toast notifications | Already in use, shadcn/ui standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.562.0 | Icons | EmptyState and error display icons |
| tailwind-merge | 3.4.0 | Class merging | Conditional styling for error states |

### Already Implemented
- EmptyState component with action support
- FormField component with inline error animation
- Toast helpers (showErrorToast, showSuccessToast, showActionableError)
- 44px touch target CSS rules for mobile

**No new dependencies required.**

## Architecture Patterns

### Existing Project Structure (Relevant Parts)
```
src/
├── components/
│   └── ui/
│       ├── empty-state.tsx     # Reusable empty state
│       ├── form-field.tsx      # Form field wrapper with validation
│       └── button.tsx          # shadcn button with touch targets
├── lib/
│   ├── toast-helpers.ts        # Sonner wrappers
│   ├── errors/index.ts         # API error responses
│   └── validations/            # Zod schemas
└── app/
    └── globals.css             # 44px touch target rules
```

### Pattern 1: EmptyState Component Usage
**What:** Standardized empty state with icon, messaging, and CTA
**When to use:** Any page or section that can have zero items

**Current Implementation:**
```typescript
// Source: src/components/ui/empty-state.tsx
import { EmptyState } from '@/components/ui/empty-state';
import { Anchor } from 'lucide-react';

// Usage pattern
{equipment.length === 0 ? (
  <EmptyState
    icon={Anchor}
    title="No equipment yet"
    description={isCoach
      ? "Add your team's shells, oars, and launches to start tracking."
      : "Your team hasn't added any equipment yet."
    }
    action={isCoach ? {
      label: "Add Equipment",
      href: `/${teamSlug}/equipment/new`,
    } : undefined}
  />
) : (
  // List content
)}
```

### Pattern 2: Form Validation with react-hook-form
**What:** Inline validation with immediate feedback on field touch
**When to use:** All forms throughout the application

**Recommended Configuration:**
```typescript
// Best practice pattern from react-hook-form docs
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<FormInput>({
  mode: 'onTouched',           // Validate on first blur
  reValidateMode: 'onChange',  // Re-validate on every change after error
  resolver: zodResolver(schema),
});
```

### Pattern 3: Actionable Error Messages in Zod
**What:** Error messages that explain the problem AND how to fix it
**When to use:** All Zod schema definitions

**Current vs Improved:**
```typescript
// Current (less actionable)
email: z.string().email('Invalid email address')

// Improved (actionable)
email: z.string().email('Please enter a valid email (e.g., you@example.com)')

// Current
password: z.string().min(8, 'Password must be at least 8 characters')

// Improved (more specific)
password: z.string()
  .min(8, 'Password needs at least 8 characters')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[0-9]/, 'Include at least one number')
```

### Pattern 4: Toast Error with Retry
**What:** Persistent error toasts with retry action for failed operations
**When to use:** API failures, network errors, save operations

**Current Implementation:**
```typescript
// Source: src/lib/toast-helpers.ts
import { showErrorToast } from '@/lib/toast-helpers';

// Usage in catch blocks
catch (error) {
  showErrorToast({
    message: 'Failed to save changes',
    description: error instanceof Error ? error.message : undefined,
    retry: () => onSubmit(data),  // Re-run with same data
  });
}
```

### Anti-Patterns to Avoid
- **Generic error messages:** "Something went wrong" - Always be specific
- **Validation only on submit:** Use `mode: 'onTouched'` for immediate feedback
- **Empty lists without guidance:** Always provide EmptyState with CTA
- **Blaming the user:** "Invalid input" vs "Please enter a valid email"
- **Missing touch targets:** Icon-only buttons without 44px minimum area

## Don't Hand-Roll

Problems with existing solutions in the codebase:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Empty list display | Custom empty divs | `EmptyState` component | Consistent design, CTA support |
| Form field errors | Inline error text | `FormField` wrapper | Animation, hint text, accessibility |
| Error toasts | Direct `toast.error()` | `showErrorToast()` | Retry action, persistence |
| Touch targets | Inline min-height | Global CSS rules | Already in globals.css |
| Form validation | Manual state | react-hook-form + Zod | Type safety, performance |

**Key insight:** The codebase already has these patterns. The task is auditing for consistent usage, not building new solutions.

## Common Pitfalls

### Pitfall 1: Inconsistent Validation Modes
**What goes wrong:** Some forms use `mode: 'onSubmit'` (default), others use `mode: 'onTouched'`
**Why it happens:** react-hook-form defaults to `mode: 'onSubmit'`
**How to avoid:** Standardize all forms to `mode: 'onTouched'` with `reValidateMode: 'onChange'`
**Warning signs:** Forms where errors only appear after clicking submit button

**Current State (from codebase audit):**
- `create-team-form.tsx`: `mode: 'onTouched'` - Good
- `invite-member-form.tsx`: `mode: 'onTouched'` - Good
- `template-form.tsx`: `mode: 'onTouched'` - Good
- `login/page.tsx`: No mode set (defaults to onSubmit) - Needs fix
- `athlete-form.tsx`: No mode set (defaults to onSubmit) - Needs fix

### Pitfall 2: Missing Empty States
**What goes wrong:** Pages show blank space or just loading spinners when no data exists
**Why it happens:** Developers focus on happy path, forget empty state
**How to avoid:** Every list/grid component should handle `items.length === 0`
**Warning signs:** Blank areas, missing context for new users

**Pages Already Using EmptyState:**
- Equipment page - Yes
- Practices page - Yes
- Roster page - Yes
- Lineup templates - Yes
- Practice templates - Yes
- Announcements - Yes
- Regattas - Yes

**Pages Needing Review:**
- Notifications page - Has basic empty but no CTA
- Invitations page - Needs review
- Settings subpages - N/A (forms, not lists)

### Pitfall 3: Touch Target Size on Icon Buttons
**What goes wrong:** Icon-only buttons are visually small, clickable area too small
**Why it happens:** Developers set icon size, forget about touch area
**How to avoid:** Use the CSS rule that ensures 44px minimum on mobile
**Warning signs:** Difficulty tapping on mobile, accidental mis-taps

**CSS Already in globals.css:**
```css
@media (max-width: 768px) {
  button:has(> svg:only-child),
  [role="button"]:has(> svg:only-child) {
    width: 44px;
    height: 44px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
```

### Pitfall 4: Non-Actionable Error Messages
**What goes wrong:** User sees "Invalid input" with no guidance
**Why it happens:** Using default Zod messages without customization
**How to avoid:** Always include "how to fix" in error message
**Warning signs:** Error messages under 20 characters, no example format

**Error Message Checklist:**
1. What is wrong? (specific field name)
2. Why is it wrong? (validation rule)
3. How to fix it? (example or instruction)

## Code Examples

### EmptyState with Role-Based Actions
```typescript
// Source: src/app/(dashboard)/[teamSlug]/equipment/page.tsx
<EmptyState
  icon={Anchor}
  title="No equipment yet"
  description={isCoach
    ? "Add your team's shells, oars, and launches to start tracking equipment usage and maintenance."
    : "Your team hasn't added any equipment yet."
  }
  action={isCoach ? {
    label: "Add Equipment",
    href: `/${teamSlug}/equipment/new`,
  } : undefined}
/>
```

### FormField Component Usage
```typescript
// Source: src/components/ui/form-field.tsx
<FormField
  label="Team Name"
  htmlFor="name"
  error={errors.name}
  required
  hint="This will be visible to all team members"
>
  <input
    type="text"
    id="name"
    {...register('name')}
    aria-invalid={errors.name ? 'true' : 'false'}
    className={cn(
      'mt-1 block w-full rounded-md border px-3 py-2',
      errors.name ? 'border-red-500' : 'border-gray-300'
    )}
  />
</FormField>
```

### Toast with Retry Pattern
```typescript
// Source: src/lib/toast-helpers.ts usage pattern
const onSubmit = async (data: FormInput) => {
  try {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Operation failed');
    }

    showSuccessToast('Changes saved');
  } catch (error) {
    showErrorToast({
      message: 'Failed to save changes',
      description: error instanceof Error ? error.message : undefined,
      retry: () => onSubmit(data),
    });
  }
};
```

### Improved Zod Validation Messages
```typescript
// Actionable error messages
export const improvedLoginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address (e.g., you@example.com)'),
  password: z.string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Toast on submit only | Inline validation + toast for API errors | Best practice | Better UX, immediate feedback |
| mode: 'onSubmit' | mode: 'onTouched' | react-hook-form v7+ | Errors shown on first interaction |
| 48px touch targets | 44px minimum (WCAG 2.5.5) | WCAG 2.1 | Accessibility compliance |
| Generic errors | Actionable copy | UX writing evolution | User self-service recovery |

**Current Codebase Status:**
- Sonner toast: Configured correctly (dark theme, bottom-right, rich colors)
- Touch targets: CSS rules in place, need verification of coverage
- EmptyState: Component exists, need to ensure consistent use
- Form validation: Mixed modes, need standardization

## Open Questions

Things that couldn't be fully resolved:

1. **Settings page cleanup (UXQL-05)**
   - What we know: Settings page is long, includes team colors section
   - What's unclear: Which specific options should be hidden vs moved vs removed
   - Recommendation: Review with product owner; "team colors" mentioned in requirements

2. **Notifications page empty state**
   - What we know: Has basic "No notifications" message
   - What's unclear: What action should be suggested? "View settings" or "Check back later"?
   - Recommendation: Likely just messaging improvement, not actionable CTA

## Sources

### Primary (HIGH confidence)
- Codebase analysis: src/components/ui/empty-state.tsx, form-field.tsx
- Codebase analysis: src/lib/toast-helpers.ts, src/lib/errors/index.ts
- Codebase analysis: src/app/globals.css (44px touch target rules)
- [react-hook-form docs - useForm](https://react-hook-form.com/docs/useform) - validation modes
- [WCAG 2.5.5 Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html) - 44px requirement

### Secondary (MEDIUM confidence)
- [Sonner shadcn/ui integration](https://ui.shadcn.com/docs/components/sonner) - toast patterns
- [Empty State UX Examples](https://www.eleken.co/blog-posts/empty-state-ux) - design patterns
- [How to Write Error Messages](https://uxcontent.com/how-to-write-error-messages/) - UX writing
- [Google Chat Error Messages](https://developers.google.com/workspace/chat/write-error-messages) - actionable patterns

### Tertiary (LOW confidence)
- General web search for current best practices

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in codebase
- Architecture: HIGH - Patterns exist, need consistent application
- Pitfalls: HIGH - Identified specific issues in codebase audit
- Empty states: MEDIUM - Most pages covered, some need verification

**Research date:** 2026-01-29
**Valid until:** 60 days (patterns are stable, library versions verified)
