# Phase 16: UI/UX Polish - Research

**Researched:** 2026-01-24
**Domain:** UI/UX patterns, loading states, form validation, animations, keyboard accessibility
**Confidence:** HIGH

## Summary

This phase enhances the existing RowOps application with polished UI/UX patterns: empty states, skeleton loading, actionable error toasts, inline form validation, micro-animations, onboarding flow, and command palette with keyboard shortcuts.

The codebase already has strong foundations: shadcn/ui components, Sonner toasts (configured at bottom-right with richColors and closeButton), react-hook-form with Zod, tw-animate-css for animations, and Lucide icons. The primary work involves leveraging these existing tools consistently while adding new patterns (skeletons, command palette, onboarding).

**Primary recommendation:** Use shadcn/ui's Command component (wraps cmdk) for the command palette, add shadcn/ui Skeleton component for loading states, enhance existing forms with `mode: 'onTouched'` validation, and build onboarding as a simple wizard state machine storing completion in localStorage.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sonner | ^2.0.7 | Toast notifications | Already configured with actionable buttons support |
| react-hook-form | ^7.71.1 | Form state and validation | Already used throughout, supports `mode: 'onTouched'` |
| @hookform/resolvers | ^5.2.2 | Zod integration | Already configured for schema validation |
| tw-animate-css | ^1.4.0 | Tailwind animations | Already imported, provides enter/exit animations |
| lucide-react | ^0.562.0 | Icons | Already used for UI icons throughout |

### To Add
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cmdk | ^1.0.0 | Command palette engine | Via shadcn/ui Command component |
| (shadcn components) | latest | Skeleton, Command | Add via `pnpm dlx shadcn@latest add skeleton command` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cmdk | react-hotkeys-hook only | cmdk provides full search/filter UI, not just shortcuts |
| localStorage onboarding | Database UserPreferences table | localStorage simpler, no schema migration needed |
| tw-animate-css | framer-motion | tw-animate-css already installed, framer-motion adds 50KB+ |

**Installation:**
```bash
pnpm dlx shadcn@latest add skeleton command
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── ui/
│   │   ├── skeleton.tsx          # New: shadcn skeleton
│   │   ├── command.tsx           # New: shadcn command palette
│   │   ├── empty-state.tsx       # New: reusable empty state
│   │   └── inline-success.tsx    # New: animated checkmark
│   ├── command-palette/
│   │   ├── command-palette.tsx   # Global Cmd+K palette
│   │   ├── search-results.tsx    # Search athletes/equipment
│   │   └── shortcuts-overlay.tsx # ? key shortcuts help
│   ├── onboarding/
│   │   ├── onboarding-wizard.tsx # Multi-step wizard
│   │   ├── onboarding-step.tsx   # Individual step component
│   │   └── use-onboarding.ts     # Hook for state management
│   └── skeletons/
│       ├── roster-skeleton.tsx   # Page-specific skeleton
│       ├── equipment-skeleton.tsx
│       └── practice-skeleton.tsx
├── app/
│   └── (dashboard)/
│       └── [teamSlug]/
│           ├── roster/
│           │   └── loading.tsx   # Next.js loading boundary
│           ├── equipment/
│           │   └── loading.tsx
│           └── practices/
│               └── loading.tsx
└── hooks/
    ├── use-keyboard-shortcuts.ts # Global keyboard handling
    └── use-onboarding-state.ts   # localStorage-backed state
```

### Pattern 1: Empty State Component
**What:** Reusable empty state with icon, title, description, and action button
**When to use:** Any list view that can be empty (roster, equipment, practices, templates)
**Example:**
```tsx
// Source: Synthesized from codebase patterns + UX best practices
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mx-auto h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-zinc-500" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-zinc-500 max-w-sm mb-6">{description}</p>
      {action && (
        <Button asChild={!!action.href} onClick={action.onClick}>
          {action.href ? <Link href={action.href}>{action.label}</Link> : action.label}
        </Button>
      )}
    </div>
  );
}
```

### Pattern 2: Skeleton Loading with Next.js loading.tsx
**What:** Page-level skeleton that shows during server component data fetching
**When to use:** Pages with server-side data fetching (roster, equipment, practices)
**Example:**
```tsx
// Source: https://ui.shadcn.com/docs/components/skeleton
// app/(dashboard)/[teamSlug]/roster/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function RosterLoading() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
      </div>
      {/* List skeletons */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-zinc-900 rounded-xl">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[150px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Pattern 3: Form Validation with onTouched Mode
**What:** Validate on first blur, then on every change - clear errors when user starts correcting
**When to use:** All forms in the application
**Example:**
```tsx
// Source: https://react-hook-form.com/docs/useform
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<FormInput>({
  resolver: zodResolver(formSchema),
  mode: 'onTouched', // Validate on blur first, then on change
  reValidateMode: 'onChange', // Re-validate on change after submission
});

// In JSX - inline error display
<div>
  <Input
    {...register('name')}
    aria-invalid={!!errors.name}
  />
  {errors.name && (
    <p className="mt-1 text-sm text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
      {errors.name.message}
    </p>
  )}
</div>
```

### Pattern 4: Actionable Error Toast
**What:** Toast with retry/dismiss actions for recoverable errors
**When to use:** API failures, save failures, network errors
**Example:**
```tsx
// Source: https://ui.shadcn.com/docs/components/sonner
import { toast } from 'sonner';

// In error handler
const handleSave = async (data: FormData) => {
  try {
    await saveData(data);
    toast.success('Lineup saved');
  } catch (error) {
    toast.error('Failed to save lineup', {
      description: error instanceof Error ? error.message : 'Unknown error',
      action: {
        label: 'Retry',
        onClick: () => handleSave(data),
      },
      duration: Infinity, // Persist until dismissed
    });
  }
};
```

### Pattern 5: Command Palette with Dialog
**What:** Cmd+K accessible global search and action palette
**When to use:** Global keyboard shortcut, accessible from any page
**Example:**
```tsx
// Source: https://ui.shadcn.com/docs/components/command + https://github.com/pacocoursey/cmdk
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

export function CommandPalette({ teamSlug }: { teamSlug: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const navigate = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate(`/${teamSlug}/roster`)}>
            Go to Roster
          </CommandItem>
          <CommandItem onSelect={() => navigate(`/${teamSlug}/practices`)}>
            Go to Practices
          </CommandItem>
          <CommandItem onSelect={() => navigate(`/${teamSlug}/equipment`)}>
            Go to Equipment
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => navigate(`/${teamSlug}/practices/new`)}>
            Create Practice
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

### Pattern 6: Micro-Animation with tw-animate-css
**What:** Subtle enter/exit animations for state changes
**When to use:** List item additions/removals, success states, modal open/close
**Example:**
```tsx
// Source: tw-animate-css README
// Delete slide-out animation
<div className={cn(
  "p-4 bg-zinc-900 rounded-xl",
  isDeleting && "animate-out fade-out slide-out-to-right duration-300"
)}>
  {/* content */}
</div>

// Success checkmark animation
<div className="animate-in zoom-in fade-in duration-200">
  <CheckCircle className="h-5 w-5 text-emerald-500" />
</div>

// List item enter
<div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
  {/* new item */}
</div>
```

### Pattern 7: Onboarding Wizard State Machine
**What:** Multi-step wizard with progress tracking stored in localStorage
**When to use:** First-time user experience after joining a team
**Example:**
```tsx
// Source: Synthesized from https://radzion.com/blog/onboarding/
// hooks/use-onboarding-state.ts
const STORAGE_KEY = 'rowops-onboarding-completed';

export function useOnboardingState() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    if (typeof window === 'undefined') return true; // SSR: assume complete
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const completeOnboarding = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setHasCompletedOnboarding(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasCompletedOnboarding(false);
  };

  return { hasCompletedOnboarding, completeOnboarding, resetOnboarding };
}

// Wizard step structure
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<{ onComplete: () => void }>;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 'welcome', title: 'Welcome to RowOps', ... },
  { id: 'roster', title: 'Meet Your Team', ... },
  { id: 'practice', title: 'Create Your First Practice', ... },
  { id: 'equipment', title: 'Review Equipment', ... },
];
```

### Anti-Patterns to Avoid
- **Spinner overuse:** Don't use loading spinners for content that takes <300ms. Use skeleton placeholders for better perceived performance.
- **Alert boxes for errors:** Don't use `window.alert()` or blocking modals for errors. Use actionable toast notifications.
- **Validate on every keystroke:** Don't use `mode: 'onChange'` for complex forms. It causes too much noise. Use `onTouched`.
- **Custom animation implementations:** Don't build CSS keyframes from scratch. Use tw-animate-css classes.
- **Disabled submit buttons without explanation:** Always show inline errors explaining why the form can't submit.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Command palette | Custom modal with search | shadcn/ui Command (cmdk) | Keyboard navigation, filtering, accessibility |
| Toast notifications | Custom notification div | Sonner (already installed) | Stacking, dismissal, actions, animations |
| Form validation | Custom blur/change handlers | react-hook-form mode options | State management, error tracking, re-validation |
| Loading skeletons | Custom animated divs | shadcn/ui Skeleton | Consistent pulse animation, accessible |
| Enter/exit animations | Custom CSS @keyframes | tw-animate-css classes | Composable, tested, Tailwind-native |
| Keyboard shortcuts | Manual event listeners | Centralized hook with cmdk | Conflict prevention, scope management |

**Key insight:** The codebase already has most tools installed (sonner, react-hook-form, tw-animate-css). The phase is about consistent application of these tools, not adding new dependencies.

## Common Pitfalls

### Pitfall 1: Skeleton/Content Layout Shift
**What goes wrong:** Skeleton dimensions don't match actual content, causing jarring shift when data loads
**Why it happens:** Guessing at dimensions instead of measuring actual content
**How to avoid:** Create page-specific skeleton components that mirror actual layout. Use exact same padding, gaps, and approximate text heights.
**Warning signs:** Visual "jump" when content appears

### Pitfall 2: Form Validation Mode Confusion
**What goes wrong:** Using wrong react-hook-form mode, causing too much or too little feedback
**Why it happens:** Not understanding difference between `onSubmit`, `onChange`, `onBlur`, and `onTouched`
**How to avoid:** Use `mode: 'onTouched'` for all forms - validates on first blur, then on change
**Warning signs:** Users confused about why form won't submit, or annoyed by constant error messages while typing

### Pitfall 3: Toast Spam
**What goes wrong:** Showing toasts for every small action, training users to ignore them
**Why it happens:** Treating toasts as default feedback mechanism
**How to avoid:** Use toasts only for significant actions (create, delete, publish). Use inline feedback (checkmarks) for quick saves.
**Warning signs:** Multiple toasts stacking, users dismissing without reading

### Pitfall 4: Animation Performance Issues
**What goes wrong:** Animations cause jank or stutter
**Why it happens:** Animating layout properties (width, height) instead of transform/opacity
**How to avoid:** tw-animate-css uses transform-based animations. Don't add custom `transition-all` classes.
**Warning signs:** Dropped frames during animations, slow mobile performance

### Pitfall 5: Command Palette Search Performance
**What goes wrong:** Search becomes slow with large datasets (many athletes, equipment)
**Why it happens:** Fetching all data client-side, filtering in JS
**How to avoid:** For entity search, debounce input and query API. Keep navigation commands client-side only.
**Warning signs:** Lag between typing and results

### Pitfall 6: Onboarding Re-shows Unexpectedly
**What goes wrong:** Users see onboarding multiple times
**Why it happens:** localStorage cleared, or checking wrong completion flag
**How to avoid:** Use consistent storage key, check on initial render only, handle SSR properly
**Warning signs:** Returning users complaining about "seeing the tutorial again"

## Code Examples

Verified patterns from official sources:

### Skeleton Component (shadcn/ui)
```tsx
// Source: https://ui.shadcn.com/docs/components/skeleton
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-zinc-800", className)}
      {...props}
    />
  )
}

export { Skeleton }
```

### Toast with Action (Sonner)
```tsx
// Source: https://ui.shadcn.com/docs/components/sonner
toast("Event has been created", {
  description: "Sunday, December 03, 2023 at 9:00 AM",
  action: {
    label: "Undo",
    onClick: () => console.log("Undo"),
  },
})

// Error toast that persists
toast.error("Failed to save lineup", {
  description: "Network error occurred",
  action: {
    label: "Retry",
    onClick: () => retryAction(),
  },
  duration: Infinity, // Won't auto-dismiss
})
```

### Form Validation Mode (react-hook-form)
```tsx
// Source: https://react-hook-form.com/docs/useform
const { register, formState: { errors } } = useForm({
  mode: 'onTouched', // Initial validation on blur
  reValidateMode: 'onChange', // Re-validate on change after submit
  resolver: zodResolver(schema),
});
```

### Enter/Exit Animations (tw-animate-css)
```tsx
// Source: tw-animate-css README
// Fade and slide in
<div className="animate-in fade-in slide-in-from-bottom-4 duration-300">

// Fade and slide out
<div className="animate-out fade-out slide-out-to-right duration-200">

// Zoom in with fade
<div className="animate-in zoom-in-95 fade-in duration-200">
```

### Command Dialog (cmdk via shadcn)
```tsx
// Source: https://ui.shadcn.com/docs/components/command
<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="Type a command or search..." />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Suggestions">
      <CommandItem onSelect={() => navigate('/roster')}>
        <Users className="mr-2 h-4 w-4" />
        <span>Go to Roster</span>
        <CommandShortcut>R</CommandShortcut>
      </CommandItem>
    </CommandGroup>
  </CommandList>
</CommandDialog>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Spinner loading | Skeleton placeholders | 2022+ | Better perceived performance, less jarring |
| Alert/modal errors | Toast with actions | 2023+ | Non-blocking, actionable feedback |
| Validate all fields on submit | Validate on blur (onTouched) | react-hook-form v7 | Immediate feedback without annoyance |
| Separate keyboard shortcut libraries | Command palette with shortcuts | 2023+ (Linear/Raycast pattern) | Unified search + actions + shortcuts |
| Custom animation CSS | Utility-based animations | Tailwind v4 + tw-animate-css | Composable, performant, consistent |

**Deprecated/outdated:**
- `mode: 'all'` in react-hook-form: Too aggressive, poor UX
- Separate modal for keyboard shortcuts: Integrate into command palette with `?` key
- tailwindcss-animate plugin: Replaced by tw-animate-css for Tailwind v4

## Open Questions

Things that couldn't be fully resolved:

1. **Onboarding step content**
   - What we know: Should guide first practice creation, have 3-4 steps
   - What's unclear: Exact content/copy for each step, which features to highlight
   - Recommendation: Define steps in planning based on user journey: (1) Welcome + team overview, (2) View roster, (3) Create first practice, (4) Done

2. **Which pages need skeletons**
   - What we know: Pages with server-side data fetching benefit most
   - What's unclear: Full list of pages with noticeable loading time
   - Recommendation: Start with roster, equipment, practices pages. Add more based on user feedback.

3. **Keyboard shortcut conflicts**
   - What we know: Browser and OS shortcuts can conflict
   - What's unclear: Exact shortcuts that work cross-platform without conflicts
   - Recommendation: Use standard conventions (Cmd/Ctrl+K for palette, arrows for navigation, Escape to close). Test on Mac/Windows/Linux.

## Sources

### Primary (HIGH confidence)
- shadcn/ui Command docs - https://ui.shadcn.com/docs/components/command
- shadcn/ui Skeleton docs - https://ui.shadcn.com/docs/components/skeleton
- shadcn/ui Sonner docs - https://ui.shadcn.com/docs/components/sonner
- react-hook-form useForm docs - https://react-hook-form.com/docs/useform
- cmdk GitHub - https://github.com/pacocoursey/cmdk
- tw-animate-css README (local)

### Secondary (MEDIUM confidence)
- Empty state UX patterns - https://www.eleken.co/blog-posts/empty-state-ux
- Onboarding flow patterns - https://radzion.com/blog/onboarding/
- Nielsen Norman empty states - https://www.nngroup.com/articles/empty-state-interface-design/

### Tertiary (LOW confidence)
- Micro animation best practices (various blog posts)
- Keyboard shortcut accessibility guidelines (various sources)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed or are shadcn/ui additions
- Architecture: HIGH - Patterns follow established React/Next.js conventions
- Pitfalls: MEDIUM - Based on general UX best practices, not project-specific testing
- Onboarding: MEDIUM - General patterns clear, specific content needs definition

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - stable domain)
