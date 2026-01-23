# Stack Research: v2.0 Commercial Readiness

**Project:** RowOps v2.0 — Facility Model + Mobile PWA + UI/UX Polish + Security Hardening
**Researched:** 2026-01-22
**Overall Confidence:** HIGH

## Executive Summary

This research focuses on stack additions needed for v2.0's four new capabilities, building on the validated v1.0/v1.1 stack (Next.js 16, React 19, Prisma 6, Supabase, Tailwind v4, Serwist, Dexie). The key insight: **v2.0 is about structure and polish, not new infrastructure**. Most needs are met through patterns and selective library additions rather than major framework changes.

**What's already validated (DO NOT add):**
- Next.js 16 + React 19 (existing)
- Prisma 6 + PostgreSQL via Supabase (existing)
- Tailwind CSS v4 (existing, confirmed in package.json)
- Serwist + Dexie for PWA/offline (existing)
- Lucide React for icons (existing)
- Sonner for toasts (existing)

**What v2.0 needs:**
1. **Facility model**: Schema patterns + database-level RLS (no library needed)
2. **Mobile PWA improvements**: Component library (shadcn/ui) + touch gestures (@use-gesture/react)
3. **UI/UX polish**: Component library (shadcn/ui) + consistent design tokens
4. **Security hardening**: Authorization library (CASL) + RLS enforcement

## Recommended Additions

### UI Component Library

**shadcn/ui** (latest with Tailwind v4 support)

**Purpose:** Mobile-first, accessible component primitives for commercial-grade UI

**Rationale:**
- **Not a traditional NPM dependency** — copies component source code directly into your project (full ownership)
- Built on **Radix UI** primitives (battle-tested accessibility, keyboard navigation, ARIA support)
- **Native Tailwind v4 support** — shadcn/ui CLI (canary) can now initialize projects with Tailwind v4, all components updated for React 19
- **Mobile-responsive by default** — proper touch targets, responsive sizing, mobile-first design
- Fastest-growing React component ecosystem in 2026 (104K+ GitHub stars, 560K+ weekly npm downloads)
- No runtime JavaScript for basic components (CSS-only when possible)

**Why NOT alternatives:**
- **Headless UI**: Tailwind team's library but less comprehensive than shadcn/ui's Radix foundation
- **Chakra UI / Mantine**: Heavier runtime, opinionated styling conflicts with existing Tailwind v4 setup
- **Material Tailwind**: Material Design doesn't match rowing domain (need utility-focused, not consumer app aesthetic)
- **Custom components only**: Commercial products need accessibility guarantees — Radix provides this

**Installation:**
```bash
# Install CLI (canary for Tailwind v4 support)
npx shadcn@canary init

# Add components as needed (examples)
npx shadcn@canary add button
npx shadcn@canary add card
npx shadcn@canary add dialog
npx shadcn@canary add select
npx shadcn@canary add tabs
npx shadcn@canary add dropdown-menu
npx shadcn@canary add sheet  # Mobile drawer/bottom sheet
```

**Integration Notes:**
- Components copied to `/src/components/ui/` (already have export-button.tsx there)
- Uses existing Tailwind v4 setup (no config changes needed)
- Dark mode built-in via Tailwind classes (matches existing zinc-900 palette)
- Customize directly in source (you own the code)

**Confidence:** HIGH — Official Tailwind v4 support, React 19 compatible, proven ecosystem

**Sources:**
- [shadcn/ui Tailwind v4 Documentation](https://ui.shadcn.com/docs/tailwind-v4)
- [15 Best React UI Libraries for 2026](https://www.builder.io/blog/react-component-libraries-2026)
- [shadcn/ui vs Radix UI Comparison](https://scratchdb.com/compare/radix-ui-vs-shadcn-ui/)

---

### Touch Gestures for Mobile

**@use-gesture/react** (latest: 10.x+)

**Purpose:** Native-feeling swipe, drag, pinch gestures for mobile lineup editing and regatta mode

**Rationale:**
- **Lightweight** — Adds gesture handling without bloat (~15KB)
- **Works with mouse AND touch** — Desktop drag-and-drop still works, mobile gets swipe gestures
- **Pairs with animation libraries** — Works seamlessly with CSS transitions or Framer Motion if needed later
- Handles complex gesture combos (swipe to dismiss, drag to reorder, pinch to zoom schedules)
- Maintained by Poimandres (same team as Three.js, React Three Fiber — trusted ecosystem)

**Use cases in RowOps:**
- **Lineup editor**: Swipe to remove athlete from seat, drag to reorder
- **Regatta timeline**: Horizontal scroll/swipe between races, pull-to-refresh
- **Equipment list**: Swipe to mark unavailable
- **Practice calendar**: Pinch to zoom week/month view

**Why NOT alternatives:**
- **react-swipeable**: Swipe-only, no drag or pinch (too limited)
- **react-touch**: Abandoned, last update 5+ years ago
- **React Native Gesture Handler**: React Native only, not for web

**Installation:**
```bash
npm install @use-gesture/react
```

**Example Usage:**
```typescript
import { useDrag } from '@use-gesture/react';

const bind = useDrag(({ movement: [x], swipe: [swipeX] }) => {
  if (swipeX < 0) {
    // Swiped left — remove from lineup
    handleRemove();
  }
});

return <div {...bind()} className="touch-none">Swipeable Item</div>;
```

**Confidence:** HIGH — Actively maintained, proven in production PWAs, 2M+ weekly downloads

**Sources:**
- [@use-gesture/react npm page](https://www.npmjs.com/package/@use-gesture/react)
- [GitHub: pmndrs/use-gesture](https://github.com/pmndrs/use-gesture)
- [React Mobile Responsive Touch Gestures Library 2026](https://codingcops.com/react-swipeable/)

---

### Authorization & Permissions

**@casl/ability** (latest: 6.8.0) + **@casl/react** (latest: 4.x+)

**Purpose:** Fine-grained role-based access control (RBAC) for facility admin vs coach vs athlete

**Rationale:**
- **Isomorphic** — Same permission logic on client (UI hiding) and server (API enforcement)
- **Type-safe** — TypeScript definitions for abilities
- **Declarative** — Define "can(action, subject)" rules, check everywhere
- **Zero vendor lock-in** — Pure JavaScript, no external service required
- **Prisma integration** — `@casl/prisma` package (optional) translates CASL rules to Prisma `where` clauses

**Current roles (from schema):**
```prisma
enum Role {
  COACH
  ATHLETE
  PARENT
}
```

**v2.0 adds Facility Admin (likely new role):**
- Facility Admin: Manage shared equipment, oversee multiple clubs
- Club Admin: Current "COACH" role scoped to club
- Coach: Team-level coach
- Athlete: Existing
- Parent: Existing (read-only)

**Installation:**
```bash
npm install @casl/ability @casl/react
npm install -D @casl/prisma  # Optional for server-side filtering
```

**Example Usage:**
```typescript
// Define abilities
import { defineAbility } from '@casl/ability';

const ability = defineAbility((can, cannot) => {
  if (user.role === 'FACILITY_ADMIN') {
    can('manage', 'all');
  } else if (user.role === 'COACH') {
    can('manage', 'Practice', { teamId: user.teamId });
    can('read', 'Equipment');
  } else if (user.role === 'ATHLETE') {
    can('read', 'Practice', { teamId: user.teamId });
    cannot('delete', 'Practice');
  }
});

// Use in components
import { Can } from '@casl/react';

<Can I="delete" a="Practice" ability={ability}>
  <button>Delete Practice</button>
</Can>
```

**Why NOT alternatives:**
- **Auth.js RBAC**: Session-based, not fine-grained enough (role checks, not resource-level permissions)
- **Clerk RBAC**: Vendor lock-in, paid plans for advanced features, overkill for existing Supabase auth
- **Permit.io / Permify**: External services add cost, latency, complexity — CASL is self-hosted
- **Custom helper functions**: Reinventing the wheel, no type safety, harder to audit

**Confidence:** HIGH — Latest version 6.8.0 published recently, 517+ projects using it, proven Next.js integration

**Sources:**
- [@casl/ability npm](https://www.npmjs.com/package/@casl/ability)
- [Step-By-Step Tutorial: Frontend Authorization with Next.js and CASL](https://www.permit.io/blog/frontend-authorization-with-nextjs-and-casl-tutorial)
- [Building a Scalable RBAC System in Next.js](https://medium.com/@muhebollah.diu/building-a-scalable-role-based-access-control-rbac-system-in-next-js-b67b9ecfe5fa)

---

### Database-Level Security (No Library)

**PostgreSQL Row-Level Security (RLS)** — Native Postgres feature via Supabase

**Purpose:** Enforce multi-tenant isolation at database level (defense-in-depth)

**Rationale:**
- **Defense-in-depth** — Even if application code has bug, RLS prevents cross-tenant data leaks
- **Supabase includes RLS** — Already available, no installation needed
- **Prisma compatible** — Prisma Client Extensions can set tenant context via `SET LOCAL`
- **Hierarchical tenancy** — Facility → Club → Team hierarchy enforced at DB level

**Pattern:**
```sql
-- Enable RLS on Team table
ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see teams they're members of
CREATE POLICY team_member_access ON "Team"
  USING (
    id IN (
      SELECT "teamId" FROM "TeamMember"
      WHERE "userId" = current_setting('app.current_user_id')::text
    )
  );

-- Set user context before queries (via Prisma middleware)
SET LOCAL app.current_user_id = 'user-uuid';
```

**For facility hierarchy:**
- Add `facilityId` and `clubId` to relevant tables
- RLS policies enforce: Facility Admin sees all clubs → Coach sees own club → Athlete sees own team
- Use adjacency list pattern (simple `parentId` foreign key) for facility → club → team hierarchy

**Why NOT closure tables:**
- Closure tables optimize deep hierarchy queries (5+ levels)
- Rowing orgs are shallow: Facility → Club → Team (max 3 levels)
- Adjacency list is simpler, sufficient, and Prisma-native (self-referencing foreign key)

**Confidence:** HIGH — RLS is production-proven for multi-tenant SaaS, Supabase provides it out-of-box

**Sources:**
- [Securing Multi-Tenant Applications Using RLS with Prisma ORM](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35)
- [Using Row-Level Security in Prisma | Atlas Guides](https://atlasgo.io/guides/orms/prisma/row-level-security)
- [Prisma Multi-Tenancy Patterns (2026)](https://github.com/prisma/prisma/discussions/2846)

---

## Integration Notes

### How New Stack Integrates with Existing

| New Addition | Integrates With | How |
|--------------|-----------------|-----|
| **shadcn/ui** | Tailwind v4 | Components use existing Tailwind classes, no config changes |
| **@use-gesture/react** | React 19, dnd-kit | Gesture hooks wrap existing drag-drop, add mobile swipe |
| **@casl/ability** | Supabase auth, Prisma | Reads user role from JWT claims, enforces in API routes |
| **PostgreSQL RLS** | Prisma, Supabase | Prisma middleware sets tenant context, RLS filters at DB |

### Data Model Changes for v2.0

**Add to schema.prisma:**
```prisma
model Facility {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())

  clubs     Club[]
  equipment Equipment[]  // Shared facility equipment
}

model Club {
  id         String   @id @default(uuid())
  facilityId String?  // Nullable for clubs without facility
  name       String
  slug       String   @unique
  createdAt  DateTime @default(now())

  facility   Facility? @relation(fields: [facilityId], references: [id])
  teams      Team[]

  @@index([facilityId])
}

// Update Team model
model Team {
  // ... existing fields
  clubId String?  // Nullable for teams without club
  club   Club?    @relation(fields: [clubId], references: [id])

  @@index([clubId])
}

// Update Equipment model (add optional facility ownership)
model Equipment {
  // ... existing fields
  facilityId String?  // If owned by facility, not team
  facility   Facility? @relation(fields: [facilityId], references: [id])

  @@index([facilityId])
}

// Add new role
enum Role {
  FACILITY_ADMIN  // NEW
  COACH
  ATHLETE
  PARENT
}
```

**Migration strategy:**
- Existing teams without clubs: `clubId` nullable, backfill later
- Existing equipment: `facilityId` nullable, defaults to team-owned
- Adjacency list pattern (simple foreign keys, not closure table)

---

## What NOT to Add

### Libraries/Services to Avoid

| Technology | Why Avoid |
|------------|-----------|
| **Chakra UI, Mantine, Material Tailwind** | Opinionated styling conflicts with Tailwind v4, heavier runtime |
| **Headless UI only** | Less comprehensive than shadcn/ui's Radix foundation |
| **Clerk / Auth.js RBAC** | Vendor lock-in or insufficient granularity, existing Supabase auth works |
| **Permit.io, Permify, Oso** | External authorization services add cost/latency, CASL is self-hosted |
| **Closure tables** | Overkill for shallow hierarchy (Facility→Club→Team = 3 levels max) |
| **Socket.io, Pusher, Ably** | Already have Supabase Realtime for live updates |
| **Framer Motion** | Animation library — defer until UX testing shows need (YAGNI) |
| **React Hook Form replacements** | Already using react-hook-form v7.71.1, works fine |
| **Zod replacements** | Already using Zod v4.3.5 for validation, no need to change |

### Patterns to Avoid

**Don't use multi-database tenancy:**
- Prisma supports multiple databases but not optimized (memory per client instance)
- PostgreSQL RLS + single DB is simpler and performant enough
- Supabase pricing is per database — multi-DB = higher cost

**Don't use multi-schema tenancy (unless 100+ clubs):**
- PostgreSQL multi-schema requires `@@schema` attribute on every model
- Adds complexity for minimal isolation benefit
- RLS on single schema is sufficient for rowing orgs (not Slack-scale)

**Don't add component library for animations yet:**
- CSS transitions handle 90% of needs
- Framer Motion is powerful but heavy (60KB+)
- Wait for user research to prove need before adding

---

## Mobile PWA Best Practices (No Library Needed)

### Viewport Configuration

**Update `app/layout.tsx` or `app/index.html` with:**
```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
/>
```

- `viewport-fit=cover`: Access full screen including notched areas (iPhone)
- `user-scalable=no`: Prevent accidental zoom on tap (standard for app-like PWAs)

**Use CSS safe area insets:**
```css
.header {
  padding-top: max(1rem, env(safe-area-inset-top));
}

.bottom-nav {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

### Touch Target Guidelines

**Minimum touch target size: 44×44px** (iOS) or **48×48px** (Android Material Design)

**Current buttons in export-button.tsx:**
```tsx
className="inline-flex items-center gap-2 px-3 py-1.5"
// py-1.5 = 6px top/bottom = 12px + text height ≈ 28px total — TOO SMALL
```

**Fix for mobile:**
```tsx
// Desktop (hover states work)
className="px-3 py-1.5 hover:bg-zinc-700"

// Mobile-first (larger targets)
className="px-4 py-2.5 min-h-[44px] active:bg-zinc-700"
```

**Use shadcn/ui buttons** — already have proper touch targets built-in

### Eliminate Tap Delay

**Add to global CSS:**
```css
* {
  touch-action: manipulation; /* Eliminates 300ms tap delay */
}
```

**For specific elements with custom gestures:**
```css
.draggable-lineup {
  touch-action: none; /* Allow custom touch handling */
}
```

### Responsive Design for Regatta Mode

**Use container queries** (production-ready in 2026):
```css
.regatta-timeline {
  container-type: inline-size;
}

@container (max-width: 600px) {
  .race-card {
    grid-template-columns: 1fr; /* Stack on mobile */
  }
}
```

**Use dynamic viewport height** for bottom sheets:
```css
.mobile-drawer {
  height: 85dvh; /* Dynamic viewport height (accounts for mobile browser chrome) */
}
```

**Sources:**
- [Best practices for PWAs - MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Best_practices)
- [PWA Design: UX/UI Principles & Best Practices](https://www.gomage.com/blog/pwa-design/)
- [Responsive Design Best Practices 2026 Guide](https://pxlpeak.com/blog/web-design/responsive-design-best-practices)

---

## Installation Summary

```bash
# UI Component Library (copy components, not install package)
npx shadcn@canary init

# Touch Gestures
npm install @use-gesture/react

# Authorization
npm install @casl/ability @casl/react

# Optional: CASL + Prisma integration for server-side filtering
npm install -D @casl/prisma

# Database: No install (use existing Supabase PostgreSQL with RLS)
```

---

## Confidence Summary

| Component | Confidence | Notes |
|-----------|------------|-------|
| shadcn/ui | HIGH | Official Tailwind v4 + React 19 support verified, 100K+ stars |
| @use-gesture/react | HIGH | Active maintenance, 2M+ weekly downloads, Poimandres team |
| @casl/ability | HIGH | Version 6.8.0 published recently, 517+ projects using it |
| PostgreSQL RLS | HIGH | Production-proven multi-tenant pattern, Supabase native |
| Adjacency list | HIGH | Simple, Prisma-native, sufficient for shallow hierarchies |
| Mobile PWA patterns | HIGH | MDN best practices, container queries production-ready |

---

## Sources

### Official Documentation
- [shadcn/ui Tailwind v4 Documentation](https://ui.shadcn.com/docs/tailwind-v4)
- [Prisma Multi-Database Guide](https://www.prisma.io/docs/guides/multiple-databases)
- [Prisma Multi-Schema Guide](https://www.prisma.io/docs/orm/prisma-schema/data-model/multi-schema)
- [Best practices for PWAs - MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Best_practices)

### Library References
- [@use-gesture/react GitHub](https://github.com/pmndrs/use-gesture)
- [@casl/ability npm](https://www.npmjs.com/package/@casl/ability)
- [CASL Official Documentation](https://casl.js.org/)

### Comparison & Analysis
- [15 Best React UI Libraries for 2026](https://www.builder.io/blog/react-component-libraries-2026)
- [shadcn/ui vs Radix UI vs Headless UI Comparison](https://scratchdb.com/compare/radix-ui-vs-shadcn-ui/)
- [Implementing Hierarchical Data in PostgreSQL: LTREE vs Adjacency List vs Closure Table](https://dev.to/dowerdev/implementing-hierarchical-data-structures-in-postgresql-ltree-vs-adjacency-list-vs-closure-table-2jpb)

### Best Practices & Patterns
- [Securing Multi-Tenant Applications Using RLS with Prisma ORM](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35)
- [Using Row-Level Security in Prisma | Atlas Guides](https://atlasgo.io/guides/orms/prisma/row-level-security)
- [Step-By-Step Tutorial: Frontend Authorization with Next.js and CASL](https://www.permit.io/blog/frontend-authorization-with-nextjs-and-casl-tutorial)
- [PWA Design: UX/UI Principles & Best Practices](https://www.gomage.com/blog/pwa-design/)
- [Responsive Design Best Practices 2026 Guide](https://pxlpeak.com/blog/web-design/responsive-design-best-practices)

### Community Discussions
- [Prisma Multi-Tenancy Discussion](https://github.com/prisma/prisma/discussions/2846)
- [Building a Scalable RBAC System in Next.js](https://medium.com/@muhebollah.diu/building-a-scalable-role-based-access-control-rbac-system-in-next-js-b67b9ecfe5fa)
- [shadcn/ui Tailwind v4 Upgrade Discussion](https://github.com/shadcn-ui/ui/discussions/2996)
