# Phase 19: Announcements System - Research

**Researched:** 2026-01-26
**Domain:** Broadcast announcement system with priority display
**Confidence:** HIGH

## Summary

Announcement systems enable coaches to broadcast important messages to their team with priority-based visual treatment. The standard approach uses a database model for persistence (enabling cross-device sync and analytics), priority-based sorting with visual color coding, and dismissible banners for urgent items with localStorage for client-side dismissal state.

**Key architectural decisions:**
- Database storage for announcements (team-scoped) with expiry and archive capabilities
- Per-user read state tracking (mark as read, not dismiss)
- Priority enum (INFO, WARNING, URGENT) driving sort order and visual treatment
- Dual display: urgent banners at top of pages + dashboard section for all announcements
- Optional practice linking for context-specific announcements with auto-expiry

**Primary recommendation:** Store announcements in database with priority and expiry fields, use localStorage for banner dismissal state (per-announcement, device-specific), and leverage existing shadcn/ui Alert component patterns with class-variance-authority for priority variants.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 6.0.0 | Data model & queries | Already in use, handles relations & timestamps |
| Zod | 4.3.5 | Validation schemas | Already in use for all API validation |
| date-fns | 4.1.0 | Date comparison for expiry | Already in use, tree-shakeable, timezone-aware |
| class-variance-authority | 0.7.1 | Component variants | Already in use for button variants, perfect for priority levels |
| Next.js Server Actions | 16.1.3 | Mutations | Built-in, optimal for create/update/dismiss actions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.562.0 | Priority icons (Info, AlertTriangle, AlertCircle) | Already in use, consistent icon system |
| sonner | 2.0.7 | Success/error toasts | Already in use for feedback, NOT for announcements themselves |
| @casl/ability | 6.8.0 | Permission checks (coach-only create) | Already in use for RBAC |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Database storage | localStorage only | Would lose cross-device sync, no analytics, no coach dashboard view of active announcements |
| Prisma model | Notification table reuse | Announcements are broadcasts (1-to-many), notifications are targeted (1-to-1); mixing them creates query complexity |
| Server state | React Context | Announcements need persistence and team-wide visibility, not ephemeral client state |

**Installation:**
No new dependencies required — all libraries already present in package.json.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (dashboard)/[teamSlug]/
│   │   ├── page.tsx                    # Add announcement display widget
│   │   ├── announcements/
│   │   │   └── page.tsx                # Coach management page (create/edit/archive)
│   ├── api/
│   │   ├── announcements/
│   │   │   ├── route.ts                # GET list, POST create
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts            # PATCH update, DELETE archive
│   │   │   │   └── read/
│   │   │   │       └── route.ts        # POST mark as read
│   │   │   └── dismiss/
│   │   │       └── route.ts            # POST dismiss banner (localStorage only)
├── components/
│   ├── announcements/
│   │   ├── announcement-banner.tsx     # Urgent banner at page top
│   │   ├── announcement-card.tsx       # Dashboard widget card
│   │   ├── announcement-list.tsx       # List view with expand/collapse
│   │   ├── create-announcement-form.tsx# Coach creation form
│   │   └── announcement-priority-badge.tsx # Color-coded priority indicator
├── lib/
│   ├── validations/
│   │   └── announcement.ts             # Zod schemas
│   └── utils/
│       └── announcement-helpers.ts     # Priority sorting, expiry checks
```

### Pattern 1: Database Model with Expiry
**What:** Announcement model with priority, expiry, and optional practice linking
**When to use:** Core data model for all announcement features
**Example:**
```prisma
// Source: Prisma best practices (https://www.prisma.io/docs/orm/prisma-schema/data-model/models)
model Announcement {
  id          String              @id @default(uuid())
  teamId      String
  title       String              // 100 char limit
  body        String              // 1000 char limit, supports basic formatting
  priority    AnnouncementPriority @default(INFO)
  createdBy   String              // userId
  practiceId  String?             // Optional practice link
  expiresAt   DateTime?           // Null = no expiry
  archivedAt  DateTime?           // Soft delete
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  team        Team                @relation(fields: [teamId], references: [id], onDelete: Cascade)
  practice    Practice?           @relation(fields: [practiceId], references: [id], onDelete: SetNull)
  readReceipts AnnouncementRead[]

  @@index([teamId, archivedAt])        // Active announcements query
  @@index([teamId, priority, createdAt]) // Dashboard sorted view
  @@index([practiceId])                // Practice-linked announcements
}

model AnnouncementRead {
  id             String      @id @default(uuid())
  announcementId String
  userId         String      // Who marked as read
  readAt         DateTime    @default(now())

  announcement   Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)

  @@unique([announcementId, userId]) // One read per user per announcement
  @@index([userId])
  @@index([announcementId])
}

enum AnnouncementPriority {
  INFO
  WARNING
  URGENT
}
```

### Pattern 2: Priority-Based Sorting
**What:** Sort announcements by priority (URGENT → WARNING → INFO), then by date within priority
**When to use:** Dashboard display, API responses
**Example:**
```typescript
// Source: Standard sorting pattern
function sortAnnouncements(announcements: Announcement[]): Announcement[] {
  const priorityOrder = { URGENT: 0, WARNING: 1, INFO: 2 };

  return announcements.sort((a, b) => {
    // Sort by priority first
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by date (newest first within same priority)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// Query pattern with Prisma
const announcements = await prisma.announcement.findMany({
  where: {
    teamId,
    archivedAt: null,
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } }
    ]
  },
  include: {
    readReceipts: {
      where: { userId }
    },
    practice: {
      select: { id: true, name: true, date: true }
    }
  },
  orderBy: [
    { priority: 'asc' }, // Prisma sorts enums alphabetically, so INFO < URGENT < WARNING
    { createdAt: 'desc' }
  ]
});
// NOTE: Enum alphabetical sorting doesn't match priority order — use client-side sort
```

### Pattern 3: Dismissible Banner with localStorage
**What:** Urgent announcements show as dismissible banner, dismissal state persists per-device via localStorage
**When to use:** Top-of-page urgent announcements
**Example:**
```typescript
// Source: Next.js cookie banner patterns (https://posthog.com/tutorials/nextjs-cookie-banner)
'use client';

import { useState, useEffect } from 'react';

export function AnnouncementBanner({ announcement }: { announcement: Announcement }) {
  const [visible, setVisible] = useState(false);
  const dismissalKey = `announcement-dismissed-${announcement.id}`;

  useEffect(() => {
    // Check localStorage after mount (avoid hydration mismatch)
    const dismissed = localStorage.getItem(dismissalKey);
    setVisible(!dismissed);
  }, [dismissalKey]);

  function handleDismiss() {
    localStorage.setItem(dismissalKey, new Date().toISOString());
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="urgent-banner">
      <div>{announcement.title}</div>
      <button onClick={handleDismiss} aria-label="Dismiss announcement">
        <X />
      </button>
    </div>
  );
}
```

### Pattern 4: Mark as Read (Not Dismiss)
**What:** Athletes can mark announcements as read (visual change), but announcements stay visible
**When to use:** Dashboard announcement list
**Example:**
```typescript
// Source: PatternFly notification drawer patterns (https://www.patternfly.org/components/notification-drawer/design-guidelines/)
async function markAsRead(announcementId: string) {
  const response = await fetch(`/api/announcements/${announcementId}/read`, {
    method: 'POST',
  });

  if (!response.ok) throw new Error('Failed to mark as read');

  // Update local state to show read status
  // (dimmed opacity, checkmark, etc.)
}

// Display pattern
<div className={cn(
  "announcement-card",
  isRead && "opacity-60" // Dimmed for read announcements
)}>
  <div className="flex items-center gap-2">
    {isRead && <Check className="size-4 text-zinc-500" />}
    <h3>{announcement.title}</h3>
  </div>
  {!isRead && (
    <Button variant="ghost" size="sm" onClick={() => markAsRead(announcement.id)}>
      Mark as read
    </Button>
  )}
</div>
```

### Pattern 5: Priority Color Variants with CVA
**What:** Use class-variance-authority for priority-based color coding
**When to use:** All announcement displays (banner, cards, badges)
**Example:**
```typescript
// Source: shadcn/ui Alert component (https://ui.shadcn.com/docs/components/alert)
import { cva, type VariantProps } from 'class-variance-authority';

const announcementVariants = cva(
  "rounded-lg border p-4 [&>svg]:size-5",
  {
    variants: {
      priority: {
        info: "bg-blue-500/10 border-blue-500/30 text-blue-100 [&>svg]:text-blue-400",
        warning: "bg-amber-500/10 border-amber-500/30 text-amber-100 [&>svg]:text-amber-400",
        urgent: "bg-red-500/10 border-red-500/30 text-red-100 [&>svg]:text-red-400",
      },
    },
    defaultVariants: {
      priority: "info",
    },
  }
);

// Icon mapping
const priorityIcons = {
  INFO: Info,
  WARNING: AlertTriangle,
  URGENT: AlertCircle,
} as const;
```

### Pattern 6: Practice-Linked Auto-Expiry
**What:** Announcements linked to practices auto-hide after practice date passes
**When to use:** Practice-specific announcements (e.g., "Meet at dock 30 min early")
**Example:**
```typescript
// Source: date-fns comparison patterns (already in use in codebase)
import { isPast, parseISO } from 'date-fns';

// Query active announcements with practice auto-expiry
const now = new Date();

const announcements = await prisma.announcement.findMany({
  where: {
    teamId,
    archivedAt: null,
    OR: [
      // Standard expiry check
      {
        practiceId: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      // Practice-linked: auto-expire after practice end
      {
        practiceId: { not: null },
        practice: {
          endTime: { gt: now }
        }
      }
    ]
  },
  include: {
    practice: { select: { name: true, date: true, endTime: true } }
  }
});
```

### Anti-Patterns to Avoid

- **Multiple banner stacks:** Don't show multiple urgent banners simultaneously — show only the most recent urgent announcement as banner, rest in dashboard
- **Permanent dismissal:** Don't use dismissal for dashboard announcements — use "mark as read" to preserve visibility while reducing visual weight
- **Client-only storage for announcements:** Don't use localStorage/sessionStorage for announcement content — only for dismissal state. Content must be in database for team-wide broadcasting
- **Notification table reuse:** Don't add announcements to existing Notification table — they have different semantics (broadcast vs targeted), different queries (active vs read), different lifecycle (archive vs delete)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Priority-based color variants | Manual className conditionals | class-variance-authority (CVA) | Already in use for buttons; type-safe, maintainable, prevents className duplication |
| Date expiry checks | Manual date parsing | date-fns (isPast, isFuture, isAfter) | Already in use; handles timezones, edge cases, consistent with codebase |
| Dismissal state per-announcement | Custom localStorage keys | Namespaced key pattern: `announcement-dismissed-${id}` | Prevents key collisions, enables targeted clearing, standard pattern from banner research |
| Form validation | Manual field checks | Zod schemas (matching practice.ts pattern) | Already in use; runtime validation, type inference, consistent error handling |
| Permission checks | Manual role checks | CASL ability with accessibleBy | Already in use; handles complex rules, RLS-ready, audit trail compatible |

**Key insight:** Announcements require dual state management — server-side for content (database) and client-side for UI preferences (localStorage for dismissals). Don't try to do both in one place.

## Common Pitfalls

### Pitfall 1: Hydration Mismatch from localStorage
**What goes wrong:** Banner visibility reads from localStorage on server render, causing React hydration errors when client state differs
**Why it happens:** Server doesn't have access to localStorage, so SSR renders banner as visible while client may have dismissed it
**How to avoid:**
- Initialize banner visibility to `false` in useState
- Read localStorage only in useEffect (client-side only)
- Accept brief flash of no content, or use CSS-only hiding until hydrated
**Warning signs:**
- Console errors: "Hydration failed because initial UI does not match server-rendered HTML"
- Banner flickers on page load
**Example:**
```typescript
// WRONG: Causes hydration mismatch
const [visible, setVisible] = useState(
  !localStorage.getItem(dismissalKey) // Crashes on server
);

// CORRECT: Hydration-safe
const [visible, setVisible] = useState(false);

useEffect(() => {
  const dismissed = localStorage.getItem(dismissalKey);
  setVisible(!dismissed);
}, [dismissalKey]);
```

### Pitfall 2: Banner Fatigue from Always Showing
**What goes wrong:** Showing banner on every page load, even when user repeatedly dismisses, causes "banner blindness" where users automatically ignore announcements
**Why it happens:** Not respecting dismissal state, or re-showing banner too aggressively (e.g., on every new urgent announcement)
**How to avoid:**
- Respect localStorage dismissal for at least 24 hours
- For new urgent announcements: only show banner if previous one was dismissed >1 hour ago
- Use "reappear on new urgent" sparingly — most warnings don't need banner treatment
**Warning signs:**
- User feedback: "I keep seeing the same announcement"
- Low engagement with urgent announcements (users ignore them)
- Multiple urgent announcements active simultaneously
**Source:** [Banner blindness research](https://www.imarkinfotech.com/why-users-ignore-your-ads-the-truth-about-banner-blindness/)

### Pitfall 3: Enum Sort Order Mismatch
**What goes wrong:** Prisma sorts enum values alphabetically (INFO, URGENT, WARNING), but desired priority order is URGENT > WARNING > INFO
**Why it happens:** Database enum ordering doesn't match business logic priority
**How to avoid:**
- Don't rely on Prisma `orderBy: { priority: 'asc' }` for priority sorting
- Sort client-side with explicit priority map: `{ URGENT: 0, WARNING: 1, INFO: 2 }`
- OR: Store numeric priority field (1, 2, 3) alongside enum for database sorting
**Warning signs:**
- INFO announcements appear before URGENT in dashboard
- Priority filter/sort produces unexpected order
**Example:**
```typescript
// WRONG: Relies on enum alphabetical order
orderBy: { priority: 'asc' } // Returns INFO, URGENT, WARNING

// CORRECT: Client-side sort with explicit priority
const priorityOrder = { URGENT: 0, WARNING: 1, INFO: 2 };
announcements.sort((a, b) =>
  priorityOrder[a.priority] - priorityOrder[b.priority]
);
```

### Pitfall 4: Practice-Linked Expiry Query Complexity
**What goes wrong:** Query becomes complex trying to handle both standard expiry (expiresAt field) and practice-linked auto-expiry (practice.endTime) in single WHERE clause
**Why it happens:** Different expiry rules for different announcement types, combined with NULL handling
**How to avoid:**
- Use Prisma OR clause to separate standard and practice-linked expiry logic
- Include practice relation when needed for expiry check
- Consider denormalizing: update expiresAt on practice-linked announcements when practice date changes
**Warning signs:**
- Prisma query with deeply nested OR/AND conditions
- Practice-linked announcements showing after practice ends
- NULL expiresAt causing query issues
**Example:**
```typescript
// CORRECT: Clear OR clause for different expiry types
where: {
  teamId,
  archivedAt: null,
  OR: [
    // Non-practice announcements: check expiresAt
    {
      practiceId: null,
      OR: [
        { expiresAt: null },        // No expiry
        { expiresAt: { gt: now } }  // Not yet expired
      ]
    },
    // Practice-linked: check practice.endTime
    {
      practiceId: { not: null },
      practice: { endTime: { gt: now } }
    }
  ]
}
```

### Pitfall 5: Missing Keyboard Accessibility for Dismissal
**What goes wrong:** Banner dismiss button only works with mouse clicks, keyboard users cannot dismiss
**Why it happens:** Using div with onClick instead of button, or missing keyboard event handlers
**How to avoid:**
- Use semantic `<button>` for dismiss action (gets keyboard handling free)
- Add aria-label for screen readers: "Dismiss announcement"
- Support Escape key to dismiss banner (common UX pattern)
- Ensure focus indicator visible on dismiss button
**Warning signs:**
- Tab key skips dismiss button
- Screen reader doesn't announce dismiss action
- Keyboard users report cannot dismiss banners
**Source:** [WCAG keyboard accessibility guidelines](https://webaim.org/techniques/keyboard/)

## Code Examples

Verified patterns from official sources:

### Zod Validation Schema
```typescript
// Source: Existing practice.ts validation pattern
import { z } from 'zod';

export const announcementPrioritySchema = z.enum(['INFO', 'WARNING', 'URGENT']);

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  body: z.string().min(1, 'Body is required').max(1000),
  priority: announcementPrioritySchema.default('INFO'),
  practiceId: z.string().uuid().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
}).refine(
  (data) => {
    // If expiry set, must be in future
    if (data.expiresAt) {
      return new Date(data.expiresAt) > new Date();
    }
    return true;
  },
  { message: 'Expiry date must be in the future', path: ['expiresAt'] }
);

export const updateAnnouncementSchema = createAnnouncementSchema.partial();
```

### API Route with CASL Authorization
```typescript
// Source: Existing practices/route.ts pattern
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/get-auth-context';
import { accessibleBy } from '@casl/prisma';
import { ForbiddenError } from '@casl/ability';
import { prisma } from '@/lib/prisma';
import { createAnnouncementSchema } from '@/lib/validations/announcement';

// POST: Create announcement (coaches only)
export async function POST(request: NextRequest) {
  const result = await getAuthContext(request);
  if (!result.success) {
    return result.status === 401
      ? unauthorizedResponse()
      : forbiddenResponse(result.error);
  }

  const { context } = result;

  // Check permission
  if (!context.ability.can('manage', 'Announcement')) {
    return forbiddenResponse('Only coaches can create announcements');
  }

  const body = await request.json();
  const validation = createAnnouncementSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.flatten() },
      { status: 400 }
    );
  }

  const announcement = await prisma.announcement.create({
    data: {
      ...validation.data,
      teamId: context.clubId,
      createdBy: context.userId,
    },
  });

  return NextResponse.json({ announcement }, { status: 201 });
}
```

### Priority Badge Component
```typescript
// Source: shadcn/ui badge + CVA pattern
import { cva, type VariantProps } from 'class-variance-authority';
import { Info, AlertTriangle, AlertCircle } from 'lucide-react';

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
  {
    variants: {
      priority: {
        info: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
        warning: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
        urgent: "bg-red-500/15 text-red-400 border border-red-500/20",
      },
    },
  }
);

const priorityIcons = {
  INFO: Info,
  WARNING: AlertTriangle,
  URGENT: AlertCircle,
};

export function AnnouncementPriorityBadge({
  priority
}: { priority: 'INFO' | 'WARNING' | 'URGENT' }) {
  const Icon = priorityIcons[priority];

  return (
    <span className={badgeVariants({ priority: priority.toLowerCase() as any })}>
      <Icon className="size-3" />
      {priority}
    </span>
  );
}
```

### Dashboard Widget with Mark as Read
```typescript
// Source: Existing dashboard structure + PatternFly notification patterns
'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { AnnouncementPriorityBadge } from './announcement-priority-badge';
import { cn } from '@/lib/utils';

export function AnnouncementCard({
  announcement,
  isRead: initialIsRead
}: {
  announcement: Announcement;
  isRead: boolean;
}) {
  const [isRead, setIsRead] = useState(initialIsRead);
  const [expanded, setExpanded] = useState(false);

  async function handleMarkAsRead() {
    const response = await fetch(`/api/announcements/${announcement.id}/read`, {
      method: 'POST',
    });

    if (response.ok) {
      setIsRead(true);
    }
  }

  return (
    <div className={cn(
      "rounded-lg border border-zinc-800 p-4 transition-opacity",
      isRead && "opacity-60"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          {isRead && <Check className="size-4 text-zinc-500 shrink-0" />}
          <AnnouncementPriorityBadge priority={announcement.priority} />
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-300"
          aria-expanded={expanded}
        >
          <ChevronDown className={cn(
            "size-4 transition-transform",
            expanded && "rotate-180"
          )} />
        </button>
      </div>

      <h3 className="text-lg font-medium text-zinc-100 mt-2">
        {announcement.title}
      </h3>

      {expanded && (
        <div className="mt-3 text-sm text-zinc-400 whitespace-pre-wrap">
          {announcement.body}
        </div>
      )}

      {!isRead && (
        <button
          onClick={handleMarkAsRead}
          className="mt-3 text-xs text-zinc-500 hover:text-zinc-400"
        >
          Mark as read
        </button>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Notifications for broadcasts | Separate Announcement model | 2024-2025 pattern shift | Announcements are 1-to-many broadcasts with priority/expiry; Notifications are 1-to-1 targeted messages. Mixing them causes query complexity |
| localStorage for all state | Database + localStorage hybrid | Next.js 13+ era | Content in database (SSR, cross-device), dismissal in localStorage (device-specific UX preference) |
| Framer Motion | Motion library | 2025 rebranding | Same AnimatePresence API, lighter bundle, better tree-shaking |
| CSS-in-JS (styled-components) | Tailwind + CVA | 2023-2024 shift | Faster, better DX, no runtime CSS generation, type-safe variants |

**Deprecated/outdated:**
- **react-announcement package:** Last updated 2019, not maintained, doesn't support React 18+
- **Framer Motion package name:** Now published as "motion" (lighter, faster), though "framer-motion" still works as alias
- **Global banner state in React Context:** Loses on page refresh, doesn't respect SSR, localStorage + database hybrid is standard

## Open Questions

Things that couldn't be fully resolved:

1. **Banner dismissal re-triggering logic**
   - What we know: User can dismiss urgent banner via X button, state saved in localStorage
   - What's unclear: Should new urgent announcements re-show banner if previous one dismissed? Or wait until next session?
   - Recommendation: Start with "reappear on new urgent" — if banner fatigue emerges, add cooldown (don't show new banner if previous dismissed <1 hour ago)

2. **Practice-linked announcement visibility on practice detail page**
   - What we know: Practice-linked announcements show on dashboard AND practice detail page
   - What's unclear: Should they show on practice detail page even after practice ends? (For reference/history)
   - Recommendation: Hide on dashboard after practice ends (auto-expiry), but keep visible on practice detail page (historical context)

3. **Read state tracking for archived announcements**
   - What we know: AnnouncementRead tracks who marked as read
   - What's unclear: Should read receipts be deleted when announcement archived? (Cascade)
   - Recommendation: Keep read receipts on cascade delete — if needed for analytics, they're available; if not needed, onDelete: Cascade prevents orphaned records

4. **Multi-device dismissal sync**
   - What we know: Dismissal state in localStorage is device-specific
   - What's unclear: Should dismissals sync across devices? (Would require database tracking per-user dismissals)
   - Recommendation: Start with device-local dismissals (simpler, standard pattern). If users request cross-device sync, add AnnouncementDismissal table similar to AnnouncementRead

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Alert component](https://ui.shadcn.com/docs/components/alert) - Component structure and variants
- [Prisma Schema Reference](https://www.prisma.io/docs/orm/prisma-schema/data-model/models) - Model patterns with timestamps and relations
- [Shopify Polaris Banner Guidelines](https://polaris-react.shopify.com/components/feedback-indicators/banner) - UX best practices for banners
- Existing codebase patterns (practice.ts validation, API routes with CASL, button.tsx CVA variants)

### Secondary (MEDIUM confidence)
- [PostHog Next.js Cookie Banner Tutorial](https://posthog.com/tutorials/nextjs-cookie-banner) - Dismissible banner with localStorage pattern
- [Build with Matija GDPR Banner](https://www.buildwithmatija.com/blog/build-cookie-consent-banner-nextjs-15-server-client) - Next.js 15 Server/Client patterns
- [Medium: Dismissible Banner State Storage](https://medium.com/front-end-weekly/dismissible-banner-continued-storing-component-state-8e60f88e3e64) - localStorage patterns for dismissal
- [Motion AnimatePresence Docs](https://motion.dev/docs/react-animate-presence) - Exit animations for dismissible components
- [PatternFly Notification Drawer](https://www.patternfly.org/components/notification-drawer/design-guidelines/) - Mark as read patterns

### Secondary (MEDIUM confidence) - UX Research
- [Banner Fatigue Research](https://www.imarkinfotech.com/why-users-ignore-your-ads-the-truth-about-banner-blindness/) - Banner blindness phenomenon
- [MagicBell: Notification Fatigue](https://www.magicbell.com/blog/help-your-users-avoid-notification-fatigue) - Best practices for avoiding overload
- [WebAIM Keyboard Accessibility](https://webaim.org/techniques/keyboard/) - WCAG keyboard requirements
- [WCAG 2.1.1 Keyboard Accessibility](https://www.uxpin.com/studio/blog/wcag-211-keyboard-accessibility-explained/) - Dismissible content requirements

### Tertiary (LOW confidence)
- [RxDB localStorage Guide](https://rxdb.info/articles/localstorage.html) - localStorage vs database tradeoffs (general guidance, not announcement-specific)
- [Dev.to: Stop Using localStorage for Everything](https://dev.to/dmsmenula/stop-using-localstorage-for-everything-heres-what-to-use-instead-5f59) - Storage option comparison (opinionated, not authoritative)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, versions confirmed in package.json
- Architecture patterns: HIGH - Prisma patterns match existing schema, API patterns match practices/route.ts, CVA patterns match button.tsx
- Pitfalls: MEDIUM-HIGH - Hydration mismatch and enum sorting verified from known issues; banner fatigue sourced from UX research; keyboard accessibility from WCAG guidelines
- Code examples: HIGH - Based on existing codebase patterns (practice.ts, API routes, button.tsx) with minor adaptations for announcements domain

**Research date:** 2026-01-26
**Valid until:** ~30 days (stable patterns; re-validate if Next.js or Prisma major version upgrade occurs)
