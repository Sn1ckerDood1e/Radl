# Phase 18: Navigation Redesign - Research

**Researched:** 2026-01-26
**Domain:** Next.js App Router layouts, responsive navigation, master-detail UI pattern
**Confidence:** HIGH

## Summary

Navigation redesign from dashboard cards to persistent navigation shell using Next.js App Router's nested layouts. Desktop uses sidebar (left), mobile uses bottom navigation bar (iOS tab bar pattern), with responsive breakpoint at 768px (Tailwind's `md:` prefix). Current tech stack (Next.js 16, React 19, Tailwind CSS 4, lucide-react icons) already includes all necessary tools.

Master-detail pattern: navigation sidebar/bottom bar remains visible, center content area updates when nav items are clicked. Next.js layouts provide partial rendering - layouts preserve state and don't re-render on navigation, only page content updates. This is exactly what the phase needs.

Role-based navigation filtering using existing CASL integration: conditionally render nav items based on user permissions, athletes see subset of coach navigation.

**Primary recommendation:** Implement using Next.js nested layout with conditional rendering based on screen size (Tailwind responsive classes). No additional libraries needed - use existing stack (Next.js layouts, Tailwind responsive utilities, lucide-react icons, CASL permissions).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.1.3 (current) | Layout system, routing, partial rendering | Built-in layout nesting, automatic code splitting, no re-render on navigation |
| Tailwind CSS | 4 (current) | Responsive styling, mobile-first breakpoints | Mobile-first approach, `md:` breakpoint at 768px matches requirements exactly |
| React | 19.2.3 (current) | Component rendering, conditional display | Hooks for scroll detection, client components for interactivity |
| lucide-react | 0.562.0 (current) | Navigation icons | Tree-shakeable, consistent design, 1000+ icons including all navigation needs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @casl/react | 5.0.1 (current) | Permission-based rendering | Conditionally show/hide nav items by role |
| Headless UI Transition | Latest | Animation components | Optional: smooth transitions between sections |
| vaul | 1.1.2 (current) | Bottom drawer (optional) | If mobile nav needs drawer pattern vs fixed bottom bar |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Next.js layouts | React Router nested routes | Next.js already in use, App Router layouts are built for this |
| Tailwind responsive | CSS media queries | Tailwind mobile-first is cleaner, already in stack |
| lucide-react | Heroicons, react-icons | lucide-react already installed, tree-shakeable, consistent |
| CASL conditional | Manual role checks | CASL already integrated, handles complex permissions better |

**Installation:**
No new packages needed - all tools already in package.json

## Architecture Patterns

### Recommended Project Structure
```
src/app/(dashboard)/
├── layout.tsx              # Current dashboard layout (has header)
├── [teamSlug]/
│   ├── layout.tsx          # NEW: Navigation shell layout (sidebar/bottom nav)
│   ├── page.tsx            # Dashboard landing/home
│   ├── roster/
│   │   └── page.tsx        # Roster content (unchanged)
│   ├── practices/
│   │   └── page.tsx        # Practices content (unchanged)
│   ├── equipment/
│   │   └── page.tsx        # Equipment content (unchanged)
│   ├── schedule/
│   │   └── page.tsx        # Schedule content (unchanged)
│   └── settings/
│       └── page.tsx        # Settings content (unchanged)

src/components/layout/
├── navigation-sidebar.tsx  # NEW: Desktop sidebar navigation
├── bottom-navigation.tsx   # NEW: Mobile bottom navigation
└── navigation-item.tsx     # NEW: Shared nav item component
```

### Pattern 1: Nested Layout with Responsive Navigation
**What:** Create nested layout at `/[teamSlug]/layout.tsx` that wraps all team pages with navigation shell
**When to use:** Master-detail pattern where navigation persists across route changes
**Example:**
```typescript
// Source: Next.js official docs - layouts and pages
// https://nextjs.org/docs/app/getting-started/layouts-and-pages

// src/app/(dashboard)/[teamSlug]/layout.tsx
export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      {/* Desktop sidebar - hidden on mobile */}
      <aside className="hidden md:flex md:w-64 md:flex-col">
        <NavigationSidebar />
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav - hidden on desktop */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden">
        <BottomNavigation />
      </nav>
    </div>
  );
}
```

### Pattern 2: Mobile-First Responsive Classes
**What:** Use Tailwind's mobile-first approach - base styles for mobile, `md:` prefix for desktop
**When to use:** All responsive navigation styling
**Example:**
```typescript
// Source: Tailwind CSS responsive design docs
// https://tailwindcss.com/docs/responsive-design

// Mobile by default (bottom nav visible, sidebar hidden)
// Desktop at md: breakpoint (768px+): sidebar visible, bottom nav hidden

<aside className="hidden md:flex md:w-64">
  {/* Hidden on mobile, flex sidebar on desktop */}
</aside>

<nav className="fixed bottom-0 left-0 right-0 md:hidden">
  {/* Fixed bottom on mobile, hidden on desktop */}
</nav>
```

### Pattern 3: Active State with usePathname
**What:** Use Next.js `usePathname` hook to highlight current navigation item
**When to use:** Visual indicator for currently selected section
**Example:**
```typescript
// Source: Next.js App Router navigation patterns
// https://nextjs.org/docs/app/api-reference/functions/use-pathname

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function NavigationItem({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`
        px-4 py-2 rounded-lg transition-colors
        ${isActive
          ? 'bg-emerald-500/20 text-emerald-500'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }
      `}
    >
      {children}
    </Link>
  );
}
```

### Pattern 4: Role-Based Navigation Filtering
**What:** Use CASL `Can` component to conditionally render navigation items
**When to use:** Showing different nav items for coaches vs athletes
**Example:**
```typescript
// Source: CASL React documentation
// https://www.permit.io/blog/how-to-use-casl-for-implementing-authorization-in-react

'use client';

import { Can } from '@casl/react';
import { useAbility } from '@/components/permissions/ability-provider';

export function NavigationSidebar() {
  const ability = useAbility();

  return (
    <nav>
      {/* Always visible */}
      <NavigationItem href="/roster" icon={Users}>Roster</NavigationItem>
      <NavigationItem href="/schedule" icon={Calendar}>Schedule</NavigationItem>

      {/* Coach only */}
      <Can I="manage" a="Team" ability={ability}>
        <NavigationItem href="/equipment" icon={Package}>Equipment</NavigationItem>
        <NavigationItem href="/settings" icon={Settings}>Settings</NavigationItem>
      </Can>
    </nav>
  );
}
```

### Pattern 5: Hide-on-Scroll for Mobile Bottom Nav (Optional)
**What:** Hide bottom nav when scrolling down, show when scrolling up
**When to use:** Content-heavy pages where nav can obstruct reading
**Example:**
```typescript
// Source: React scroll detection patterns
// https://dev.to/biomathcode/navbar-hide-and-show-on-scroll-using-custom-react-hooks-1k98

'use client';

import { useState, useEffect } from 'react';

export function BottomNavigation() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false); // Scrolling down
      } else {
        setIsVisible(true); // Scrolling up
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <nav
      className={`
        fixed bottom-0 left-0 right-0 md:hidden
        transition-transform duration-300
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
      `}
    >
      {/* Navigation items */}
    </nav>
  );
}
```

### Anti-Patterns to Avoid
- **Don't create multiple root layouts:** Navigating between different root layouts causes full page reload. Keep one root layout, nest the navigation layout inside.
- **Don't pass data from layout to page via props:** Layouts can't pass data to children. Use parallel data fetching with React `cache()` deduplication instead.
- **Don't access pathname in Server Component layout:** Layouts can't use `usePathname()`. Active state must be in Client Component.
- **Don't use hamburger menu on mobile:** Context decision specifies iOS tab bar pattern (visible bottom nav), not hidden menu.
- **Don't create nav items smaller than 44x44px:** iOS Human Interface Guidelines minimum touch target. Current dashboard cards are 6 sections for coaches, which violates 5-item max for bottom nav - must prioritize/group.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Active route detection | String comparison with `window.location` | Next.js `usePathname()` hook | Handles dynamic routes, works with prefetching, SSR-safe |
| Responsive breakpoint detection | `window.matchMedia()` with listeners | Tailwind responsive classes | Mobile-first built-in, no JS needed, SSR-compatible |
| Navigation transitions | Custom animation state machine | Headless UI Transition or CSS transitions | Handles enter/exit, interruption, accessibility |
| Permission checking | Manual role string comparisons | CASL `Can` component | Handles complex rules, composable, already integrated |
| Scroll direction detection | Manual scroll listeners without cleanup | Custom hook with proper cleanup | Memory leaks, inconsistent behavior, needs debouncing |
| Icon loading | SVG files or icon font | lucide-react individual imports | Tree-shakeable, TypeScript types, consistent sizing |

**Key insight:** Next.js App Router is specifically designed for this use case. Layouts preserve state, don't re-render, support nesting, and provide instant loading states. Don't fight the framework by building custom routing/layout systems.

## Common Pitfalls

### Pitfall 1: Layout Remounting on Navigation
**What goes wrong:** Navigation causes layout to unmount/remount, losing scroll position and component state
**Why it happens:** Multiple root layouts or incorrect layout hierarchy
**How to avoid:** Use single root layout, nest navigation layout inside. Next.js only re-renders page content, layouts persist.
**Warning signs:** Sidebar scroll resets on navigation, context state is lost, flashing navigation

### Pitfall 2: Mobile Bottom Nav with Too Many Items
**What goes wrong:** 6+ items in bottom nav creates cramped, hard-to-tap interface
**Why it happens:** Trying to show all navigation options on mobile
**How to avoid:** Limit to 5 items max. Current dashboard has Equipment, Roster, Settings, Schedule, Practices, Lineups - need to combine or prioritize. Settings could be in profile menu instead of bottom nav.
**Warning signs:** Text wrapping, icons overlapping, touch targets < 44px

### Pitfall 3: Forgetting to Make Navigation Client Component
**What goes wrong:** `usePathname()` fails, "use client" directive missing error
**Why it happens:** Navigation needs active state which requires hooks, but layouts are Server Components by default
**How to avoid:** Create separate Client Component for navigation UI, import into Server Component layout
**Warning signs:** Build error "usePathname can only be used in Client Components"

### Pitfall 4: Hardcoded Navigation Items Without Role Filtering
**What goes wrong:** Athletes see Settings, Equipment that they can't access, resulting in 403 errors
**Why it happens:** Rendering all nav items without checking permissions
**How to avoid:** Wrap nav items in CASL `Can` component or filter nav array based on ability
**Warning signs:** Users clicking nav items that show "Access Denied" or empty pages

### Pitfall 5: Inconsistent Active States Across Layouts
**What goes wrong:** Desktop sidebar shows different active item than mobile bottom nav
**Why it happens:** Different active state logic in sidebar vs bottom nav components
**How to avoid:** Create shared NavigationItem component that both layouts use, single source of active state logic
**Warning signs:** Sidebar highlights "Roster" while bottom nav highlights "Schedule"

### Pitfall 6: Not Accounting for Bottom Nav Height
**What goes wrong:** Content hidden behind fixed bottom nav on mobile
**Why it happens:** Fixed positioning removes element from document flow
**How to avoid:** Add `pb-16` (padding-bottom) to main content area on mobile, remove on desktop with `md:pb-0`
**Warning signs:** Last item in scrollable content is cut off, can't scroll to see it

### Pitfall 7: Small Touch Targets on Mobile
**What goes wrong:** Users struggle to tap nav items, especially on smaller phones
**Why it happens:** Icons and text too small, insufficient padding
**How to avoid:** Minimum 44x44px touch target (iOS HIG), 48x48px recommended. Use `h-12 w-full` classes with adequate padding.
**Warning signs:** Users complaining about mis-taps, analytics showing repeated clicks on same nav item

## Code Examples

Verified patterns from official sources:

### Navigation Layout Structure
```typescript
// Source: Next.js layouts documentation
// https://nextjs.org/docs/app/getting-started/layouts-and-pages

// src/app/(dashboard)/[teamSlug]/layout.tsx
import { NavigationSidebar } from '@/components/layout/navigation-sidebar';
import { BottomNavigation } from '@/components/layout/bottom-navigation';

export default function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ teamSlug: string }>;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-[var(--border-subtle)]">
        <NavigationSidebar teamSlug={params.teamSlug} />
      </aside>

      {/* Main content area - scrollable, with bottom padding on mobile */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <BottomNavigation teamSlug={params.teamSlug} />
      </nav>
    </div>
  );
}
```

### Desktop Sidebar Component
```typescript
// Source: Next.js usePathname, CASL conditional rendering
// https://nextjs.org/docs/app/api-reference/functions/use-pathname

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Calendar, Package, Settings } from 'lucide-react';
import { Can } from '@casl/react';
import { useAbility } from '@/components/permissions/ability-provider';

interface NavItem {
  href: string;
  icon: typeof Users;
  label: string;
  permission?: { action: string; subject: string };
}

export function NavigationSidebar({ teamSlug }: { teamSlug: string }) {
  const pathname = usePathname();
  const ability = useAbility();

  const navItems: NavItem[] = [
    { href: `/${teamSlug}/roster`, icon: Users, label: 'Roster' },
    { href: `/${teamSlug}/practices`, icon: Calendar, label: 'Practices' },
    { href: `/${teamSlug}/equipment`, icon: Package, label: 'Equipment', permission: { action: 'read', subject: 'Equipment' } },
    { href: `/${teamSlug}/settings`, icon: Settings, label: 'Settings', permission: { action: 'manage', subject: 'Team' } },
  ];

  return (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;

        const navLink = (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
              ${isActive
                ? 'bg-emerald-500/20 text-emerald-500'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
              }
            `}
          >
            <Icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        );

        // Conditionally render based on permission
        if (item.permission) {
          return (
            <Can key={item.href} I={item.permission.action} a={item.permission.subject} ability={ability}>
              {navLink}
            </Can>
          );
        }

        return navLink;
      })}
    </nav>
  );
}
```

### Mobile Bottom Navigation Component
```typescript
// Source: iOS tab bar pattern, Tailwind responsive design
// https://reactnavigation.org/docs/native-bottom-tab-navigator/

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Calendar, Package, Settings, Home } from 'lucide-react';
import { Can } from '@casl/react';
import { useAbility } from '@/components/permissions/ability-provider';

interface NavItem {
  href: string;
  icon: typeof Users;
  label: string;
  permission?: { action: string; subject: string };
}

export function BottomNavigation({ teamSlug }: { teamSlug: string }) {
  const pathname = usePathname();
  const ability = useAbility();

  // Limit to 5 items for mobile (iOS tab bar best practice)
  const navItems: NavItem[] = [
    { href: `/${teamSlug}`, icon: Home, label: 'Home' },
    { href: `/${teamSlug}/roster`, icon: Users, label: 'Roster' },
    { href: `/${teamSlug}/practices`, icon: Calendar, label: 'Practices' },
    { href: `/${teamSlug}/equipment`, icon: Package, label: 'Equipment', permission: { action: 'read', subject: 'Equipment' } },
    { href: `/${teamSlug}/settings`, icon: Settings, label: 'Settings', permission: { action: 'manage', subject: 'Team' } },
  ].filter((item) => {
    // Filter out items user doesn't have permission for
    if (item.permission) {
      return ability.can(item.permission.action, item.permission.subject);
    }
    return true;
  });

  return (
    <div className="bg-[var(--surface-1)] border-t border-[var(--border-subtle)]">
      <nav className="flex justify-around items-center h-16 max-w-screen-sm mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== `/${teamSlug}` && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-0
                transition-colors rounded-lg
                ${isActive
                  ? 'text-emerald-500'
                  : 'text-[var(--text-muted)] active:text-[var(--text-primary)]'
                }
              `}
            >
              <Icon className="h-6 w-6 flex-shrink-0" />
              <span className="text-xs font-medium truncate w-full text-center">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

### Loading State for Section Transitions
```typescript
// Source: Next.js loading.js convention
// https://nextjs.org/docs/app/api-reference/file-conventions/loading

// src/app/(dashboard)/[teamSlug]/roster/loading.tsx
export default function RosterLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[var(--surface-2)] rounded w-1/4"></div>
        <div className="h-64 bg-[var(--surface-2)] rounded"></div>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dashboard cards as only navigation | Persistent sidebar/bottom nav | 2020s responsive app era | Better discoverability, faster navigation, standard app UX |
| Hidden hamburger menu on mobile | Bottom tab bar (iOS pattern) | 2018+ mobile-first | Higher engagement, easier thumb access, no menu hunting |
| CSS media queries for responsive | Tailwind mobile-first classes | Tailwind v3+ (2021) | Cleaner code, SSR-compatible, utility-first |
| Pages Router with `_app.js` layout | App Router nested layouts | Next.js 13+ (2022) | Partial rendering, no layout re-render, better loading states |
| Manual role checks `if (role === 'coach')` | CASL declarative permissions | Modern RBAC (2020+) | Composable, testable, handles complex rules |
| react-transition-group animations | Headless UI Transition or CSS | Headless UI v2 (2023) | Simpler API, better accessibility, smaller bundle |

**Deprecated/outdated:**
- **Hamburger menus on mobile:** UX research shows 67% of mobile sites still have "mediocre" navigation. Bottom tabs have higher engagement for primary navigation (3-5 items).
- **Next.js Pages Router layouts:** App Router is stable in Next.js 16, provides better performance and DX for nested layouts.
- **Icon fonts (Font Awesome, etc.):** Replaced by tree-shakeable SVG imports (lucide-react). Icon fonts load all icons, SVG imports only what's used.

## Open Questions

Things that couldn't be fully resolved:

1. **Should mobile bottom nav hide on scroll?**
   - What we know: Pattern exists, useful for content-heavy pages, requires scroll direction detection
   - What's unclear: User preference (convenience vs screen space), performance impact
   - Recommendation: Start without hide-on-scroll. Test with users after launch. Context decision says "Claude's discretion" - I recommend keeping it visible initially for discoverability, can add hide-on-scroll in Phase 19 if users request it.

2. **How to reduce 6 dashboard sections to 5 mobile nav items?**
   - What we know: Equipment, Roster, Settings, Schedule, Practices, Lineups (coming soon) = 6 sections. iOS tab bar best practice: 5 max.
   - What's unclear: Priority order, which items to combine/demote
   - Recommendation:
     - Mobile: Home (dashboard), Roster, Practices, Schedule, Equipment (coach only, filtered by CASL)
     - Settings moves to profile menu in header (not bottom nav)
     - Athletes see: Home, Roster, Practices, Schedule (4 items, plenty of space)

3. **Loading state granularity?**
   - What we know: Next.js supports route-level `loading.tsx` files, shows during navigation
   - What's unclear: Whether to create loading.tsx for every route or just top-level sections
   - Recommendation: Start with top-level section loading states (roster, practices, equipment, settings). Add per-route loading if specific pages have slow data fetching.

## Sources

### Primary (HIGH confidence)
- Next.js App Router Layouts - https://nextjs.org/docs/app/getting-started/layouts-and-pages
- Next.js usePathname Hook - https://nextjs.org/docs/app/api-reference/functions/use-pathname
- Next.js Loading States - https://nextjs.org/docs/app/api-reference/file-conventions/loading
- Tailwind CSS Responsive Design - https://tailwindcss.com/docs/responsive-design
- Tailwind CSS Breakpoints (md: 768px) - https://tailwindcss.com/docs/responsive-design
- lucide-react Documentation - https://lucide.dev/guide/packages/lucide-react
- lucide-react Icons Library - https://lucide.dev/icons/
- Radix UI Navigation Menu - https://www.radix-ui.com/primitives/docs/components/navigation-menu
- Headless UI Transition - https://headlessui.com/react/transition

### Secondary (MEDIUM confidence)
- Next.js App Router Common Mistakes (Vercel) - https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them
- CASL React Authorization Guide - https://www.permit.io/blog/how-to-use-casl-for-implementing-authorization-in-react
- Mobile Navigation UX Best Practices 2026 - https://www.designstudiouiux.com/blog/mobile-navigation-ux/
- React Navigation Best Practices 2025 - https://viewlytics.ai/blog/react-navigation-best-practices-guide
- Bottom Navigation UX Design - https://arounda.agency/blog/bottom-navigation-for-mobile-ux-design
- Vaul Drawer Component - https://github.com/emilkowalski/vaul
- Next.js Loading States Best Practices - https://www.getfishtank.com/insights/best-practices-for-loading-states-in-nextjs
- LogRocket: Next.js Layouts Guide - https://blog.logrocket.com/guide-next-js-layouts-nested-layouts/

### Tertiary (LOW confidence - WebSearch only)
- Master-Detail Pattern Discussion - https://medium.com/@lucasurbas/case-study-master-detail-pattern-revisited-86c0ed7fc3e
- Hide-on-Scroll Patterns - https://dev.to/biomathcode/navbar-hide-and-show-on-scroll-using-custom-react-hooks-1k98
- Role-Based Menu Rendering - https://www.sevensquaretech.com/role-based-menu-reactjs-with-github-code/

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in package.json, official documentation verified
- Architecture: HIGH - Next.js App Router patterns verified with official docs, Tailwind responsive breakpoints confirmed
- Pitfalls: HIGH - Verified from official Vercel blog post and Next.js documentation, supplemented with community patterns
- CASL integration: HIGH - Package already in use, patterns verified in codebase (layout.tsx uses AbilityProvider)
- Mobile UX patterns: MEDIUM - iOS tab bar pattern widely documented, 5-item limit from multiple sources
- Hide-on-scroll: LOW - Community patterns only, not official framework feature

**Research date:** 2026-01-26
**Valid until:** ~30 days (2026-02-26) - Stack is stable (Next.js 16, React 19, Tailwind 4), but mobile UX patterns evolve quickly
