# RowOps Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** v2.1 UX Refinement — RIM feature parity, navigation redesign, practice flow, RC public API

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v2.1 UX Refinement |
| Phase | 21 — Equipment Readiness |
| Plan | 06 of 6 |
| Status | In progress |
| Last activity | 2026-01-27 — Completed 21-06-PLAN.md |

**Progress:**
```
v1.0: [##########] 100% SHIPPED (2026-01-22)
v1.1: [##########] 100% SHIPPED (2026-01-22) — 9/11 reqs, 2 deferred
v2.0: [##########] 100% SHIPPED (2026-01-26) — 34/34 requirements
v2.1: [███████   ] 71% — 5/7 phases complete (Phase 21 in progress)
```

## v2.1 Scope

**Goal:** Elevate UX with RIM-inspired features, improved navigation, and better practice workflows

**Target features:**

1. **RIM Feature Parity**
   - Announcements — Coach broadcasts with priority levels
   - Public issue reporting — QR-based damage reports (no login)
   - Equipment readiness — Calculated status with maintenance workflow
   - Dashboard analytics — Usage trends, fleet health, insights

2. **Navigation/Layout Redesign**
   - Desktop: Left sidebar nav → content in center (master-detail)
   - Mobile: Bottom navigation bar → content in main area

3. **Practice Flow Improvements**
   - Inline editing — Edit on-page, not separate forms
   - Block-based structure — Type-specific forms (water ≠ erg)
   - Improved lineup creation — Drag athletes into boats
   - Workout display — Structured drills within blocks

4. **Regatta Central Public API**
   - Regatta schedules — Upcoming regattas, dates, locations
   - Foundation for later team-specific OAuth

**Inspired by:** RIM (RowReady) Base44 implementation

## v2.0 Scope (Shipped)

**Goal:** Prepare RowOps for commercial sale to rowing organizations

**Phases:** 10-17 (8 phases total)

**Target features:**
1. **Facility Model** — Facility-level tenancy with shared equipment between clubs
2. **Mobile PWA** — Responsive, touch-friendly, app-like, architect for native
3. **UI/UX Polish** — Modern design + intuitive workflows
4. **Security Hardening** — Roles audit, permissions, multi-tenant confidence

**Real-world scenario:** Chattanooga Rowing (boathouse) hosts Lookout Rowing Club and Chattanooga Juniors. Each club has subscription, some boats are shared.

**Phase structure:**
- Phase 10-11: Security foundation (RBAC, MFA, SSO)
- Phase 12-13: Facility model (schema, auth integration)
- Phase 14: Design system foundation
- Phase 15: Mobile PWA improvements (parallel with 13-14)
- Phase 16: UI/UX polish
- Phase 17: Facility UI features

**Critical path:** Phase 10 → 12 → 13 → 17
**Parallel opportunities:** Phase 15 (Mobile) can run with Phases 13-14

## Shipped Milestones

### v1.1 Polish (2026-01-22)

**Delivered:**
- RC Settings UI (status display, OAuth connect/disconnect, manual import, auto-sync toggle)
- Equipment usage display (history on detail page, summary on list page)
- Data export (equipment, roster, schedule to CSV)

**Deferred:**
- NOTIF-01: Push notification for equipment damage
- NOTIF-02: Push notification for lineup published

### v1.0 MVP (2026-01-22)

**Delivered:** Operational rowing team platform with practice scheduling, lineup management, PWA offline support, and regatta mode.

**Stats:** 5 phases, 37 plans, 31 requirements, 79,737 LOC, 3 days

## Accumulated Context

### Key Decisions

See `.planning/PROJECT.md` for full decision table with outcomes.

**v2.0 decisions:**
- Security foundation first (all features depend on stable hierarchical auth)
- Expand-migrate-contract for schema (backward compatibility for team-only installs)
- JWT claims extension (minimal change to existing auth)
- shadcn/ui over full framework (copy-paste ownership, no runtime dependency)
- Mobile parallel with auth (no dependency, can run simultaneously)
- Facility UI last (requires complete foundation)
- No-inheritance RBAC: FACILITY_ADMIN cannot create lineups without explicit COACH role
- Zinc color scheme for shadcn/ui (matches existing --surface palette)
- Map shadcn variables to existing theme rather than replace (--color-primary uses --team-primary, not new variable)
- Preserve original CSS structure, use @theme inline for Tailwind v4 mapping only
- Use class-variance-authority for component variant management (type-safe with IntelliSense)
- Enable ESLint deprecation tracking for component migration safety
- Include mobile touch target styles for WCAG 2.5.5 compliance (44px minimum)
- ThemeToggle uses DropdownMenu pattern for compact header integration (icon button trigger with sr-only label)
- Use shadcn skeleton component for consistent pulse animation across loading states
- EmptyState component supports both href (Link) and onClick action patterns for flexibility
- Loading skeletons mirror actual content layout dimensions to prevent visual shift on load
- Empty states show contextual action buttons only to coaches based on isCoach check
- cmdk library via shadcn for command palette (Linear/Notion pattern for power users)
- G+key navigation shortcuts timeout after 1 second for sequence completion
- Keyboard shortcuts excluded from input fields to prevent typing conflicts (except Escape)
- ? key opens shortcuts overlay following GitHub/Gmail pattern for global help
- BookingStatus includes CANCELLED state separate from DENIED for requester vs admin actions
- Optional practiceId on bookings allows automatic reservation when creating practices
- Composite index on (equipmentId, startTime, endTime) enables efficient conflict detection

**v2.1 decisions (Phase 18):**
- Master-detail layout: sidebar (desktop) + bottom nav (mobile) replaces card navigation
- Desktop sidebar 256px wide (w-64) for comfortable reading
- Mobile bottom nav limited to 5 items max (iOS Human Interface Guidelines)
- Settings excluded from mobile nav (desktop/profile menu access only)
- Responsive breakpoint at 768px (md:) completely switches layout approach
- Nested layout pattern: [teamSlug]/layout.tsx handles nav shell, parent handles auth/providers
- Navigation components receive teamSlug prop for href construction
- Active detection: exact prop for root pages, startsWith for sections
- Permission filtering via ability.can() simpler than Can component wrapping
- h-[calc(100vh-4rem)] accounts for header height of h-16
- Bottom padding pb-20 (80px) on mobile for fixed nav clearance

**v2.1 decisions (Phase 19 - Plan 01):**
- Announcement priority enum ordered INFO → WARNING → URGENT for display sorting
- AnnouncementRead uses unique constraint to prevent duplicate read receipts
- Practice link optional with SetNull on delete to preserve announcement history
- Expiry validation enforces future dates only at validation layer, not database
- Soft delete via archivedAt timestamp instead of hard delete for audit trail
- Composite index on [teamId, priority, createdAt] optimizes dashboard sorted query

**v2.1 decisions (Phase 19 - Plan 02):**
- Client-side priority sorting required because Prisma sorts enums alphabetically (INFO, URGENT, WARNING) not business order
- Practice-linked announcements auto-expire via practice.endTime filter in buildActiveAnnouncementsQuery
- Upsert pattern for read receipts makes mark-as-read idempotent and prevents duplicate key errors
- PATCH endpoint supports partial updates allowing single field changes without full object

**v2.1 decisions (Phase 19 - Plan 03):**
- CVA badge variants for type-safe priority styling following button.tsx pattern
- Hydration-safe localStorage pattern prevents SSR/client mismatch (start hidden, read in useEffect)
- Client-side state update on mark-as-read avoids full list refetch
- Escape key handler for banner dismissal improves keyboard accessibility

**v2.1 decisions (Phase 20 - Plan 01):**
- reportedBy made optional (null) for public reports while reporterName is always required
- Default severity is MODERATE to encourage accurate classification without blocking submission
- Honeypot field validates empty string to detect bots without blocking legitimate users

**v2.1 decisions (Phase 20 - Plan 02):**
- Honeypot uses off-screen positioning (-9999px) not display:none for better bot detection
- Radio buttons styled as cards with p-4 padding for large tap targets
- Reference number shows first 8 chars of UUID in uppercase for human readability

**v2.1 decisions (Phase 20 - Plan 03):**
- Silent honeypot rejection returns 201 to not reveal detection to bots
- Email gracefully degrades when RESEND_API_KEY or SUPABASE_SERVICE_ROLE_KEY not configured
- Supabase admin client created for user email lookup via service role
- Dynamic import for email template to avoid loading when not needed
- XSS-safe HTML escaping in email templates for user-provided content

**v2.1 decisions (Phase 20 - Plan 04):**
- 3x scale factor for print-quality PNG output (equivalent to 300 DPI)
- QR code section coaches-only since download enables printing physical labels
- Equipment name included in downloaded PNG for label identification
- Canvas-based export: SVG to image conversion, then canvas with text overlay

**v2.1 decisions (Phase 20 - Plan 05):**
- Server-side QR generation via qrcode library for consistent quality
- 12 QR codes per page (3x4 grid) optimized for letter-size printing
- Error correction level M for print reliability
- Equipment names truncated to 20 chars to prevent label overflow

**v2.1 decisions (Phase 21 - Plan 01):**
- Equipment with null lastInspectedAt will show OUT_OF_SERVICE status until first inspection
- MINOR damage reports get archived after resolution, CRITICAL/MODERATE kept forever
- Default readiness thresholds: 14 days (yellow), 21 days (amber), 30 days (red)

**v2.1 decisions (Phase 21 - Plan 02):**
- Readiness calculation priority order: manual override → critical damage → inspection days → moderate damage
- Null lastInspectedAt treated as OUT_OF_SERVICE with 'No inspection record' reason
- Generic batch processing types preserve equipment object shape for type safety

**v2.1 decisions (Phase 21 - Plan 03):**
- ReadinessBadge uses CVA variants with traffic light colors following announcement-priority-badge pattern
- Inline ReadinessStatus type definition for parallel wave execution (import from library when Plan 02 completes)
- showIcon/showLabel props enable flexible display modes (full badge, icon-only, label-only)

**v2.1 decisions (Phase 21 - Plan 05):**
- FleetHealthWidget visible only to coaches (equipment management is coach responsibility)
- Empty state shows "Add equipment" link when no equipment registered
- Status order displays issues first: OUT_OF_SERVICE → NEEDS_ATTENTION → INSPECT_SOON → READY
- Action prompt appears when OUT_OF_SERVICE or NEEDS_ATTENTION items exist
- Widget placed between announcements and practices on dashboard per CONTEXT.md guidance

**v2.1 decisions (Phase 21 - Plan 06):**
- Threshold values validated at API level (1-365 days) using Zod schema
- Default values provided via nullish coalescing (14, 21, 30) for teams without settings
- Threshold section placed after Team Colors, before Appearance Settings for logical grouping
- Success message auto-dismisses after 3 seconds matching existing patterns

### Architecture Notes

- **Multi-tenant:** Team-scoped data with JWT claims, application-level filtering
- **Auth:** Supabase SSR client + JWT claims for team context
- **Stack:** Next.js 16 + Prisma 6 + Supabase
- **PWA:** Serwist (service worker), Dexie.js (IndexedDB), web-push (notifications)
- **External API:** Regatta Central v4 (OAuth2, per-team keys)
- **Toast notifications:** Sonner (dark theme, bottom-right, rich colors)
- **Data export:** CSV with proper escaping, immediate download

**v2.0 additions (implemented in Phase 10):**
- **RBAC:** @casl/ability + @casl/prisma + @casl/react for isomorphic permissions
- **Audit logging:** 13 auditable actions with 365-day retention
- **API keys:** sk_ prefix, SHA-256 hash, admin UI for management
- **Multi-club:** ClubMembership model with roles[] array, cookie-based context

**v2.0 additions (implemented in Phase 12):**
- **Facility model:** Facility table with profile fields (location, contact, branding, billing)
- **FacilityMembership:** Facility-level roles with FACILITY_ADMIN support
- **Equipment ownership:** EquipmentOwnerType enum (FACILITY, CLUB, TEAM) with hierarchy fields
- **RLS helpers:** 8 functions for JWT claim extraction and role checking (facility_id, club_id, has_role, has_any_role)
- **JWT claims hook:** custom_access_token_hook injects facility_id, club_id, user_roles with TeamMember fallback
- **Data migration:** SQL to create Facility wrappers for Teams and set Equipment ownership
- **RLS policies:** 13 policies for Facility, FacilityMembership, Equipment with hierarchical visibility
- **Facility context helpers:** Cookie-based facility context with DB and JWT fallback chain in claims helper

**v2.0 additions (implemented in Phase 13):**
- **viewMode permissions:** FACILITY_ADMIN permissions scope based on viewMode (facility vs club drill-down)
- **Extended UserContext:** facilityId and viewMode fields for hierarchical access control
- **Facility subject:** Added to CASL subjects for facility profile management
- **Context switch API:** Unified /api/context/switch endpoint for facility and club view switching
- **ViewMode derivation:** Computed from cookie state in getClaimsForApiRoute (facilityId + clubId combination)
- **Context validation:** Auto-recovery for invalid club/facility cookies with first-available membership fallback
- **Login restoration:** validateAndRecoverContext and restoreLastContext for continuity across sessions
- **Context switcher UI:** ContextSwitcher component with facility and club views, JWT refresh, router cache invalidation
- **Available contexts API:** /api/context/available returns facility, clubs, currentContext
- **Dashboard layout integration:** AbilityProvider wrapping dashboard children, SSR context hydration for header
- **Onboarding flow:** /onboarding page for users without memberships

**v2.0 additions (implemented in Phase 14):**
- **Design system foundation:** shadcn/ui with Tailwind v4, zinc color scheme
- **CSS variable mapping:** shadcn namespace mapped to existing theme (--color-card uses --surface-2, --color-primary uses --team-primary)
- **Component utilities:** cn() function for className composition with clsx + tailwind-merge
- **Animation library:** tw-animate-css for Tailwind v4 animation support
- **Core components:** Button, Dialog, Select, Input, DropdownMenu with Radix UI primitives
- **Variant system:** class-variance-authority for type-safe component variants
- **Mobile accessibility:** WCAG 2.5.5 touch targets (44px minimum on mobile)
- **Component migration tracking:** ESLint @deprecated rule for safe migrations

**v2.0 additions (implemented in Phase 15):**
- **Touch gestures:** @use-gesture/react for mobile touch interactions
- **Bottom sheets:** vaul-based Drawer component for mobile menus and action sheets
- **View transitions:** Next.js experimental.viewTransition for smooth page navigation
- **Sync status:** useSyncStatus hook combining online/pending/syncing/error states with triggerSync action
- **Network indicator:** SyncStatusIndicator component with dropdown details (hidden when online with no pending)
- **Swipe gestures:** useSwipeGesture hook wrapping useDrag for horizontal swipe-to-reveal
- **Swipeable lists:** SwipeableListItem component for mobile swipe actions (delete/edit)
- **Media queries:** useMediaQuery hook with SSR support for responsive detection
- **Responsive menus:** ResponsiveMenu component adapting Drawer (mobile) and DropdownMenu (desktop)

**v2.0 additions (implemented in Phase 16):**
- **Loading skeletons:** Skeleton component with pulse animation, loading.tsx files for roster/equipment/practices
- **Empty states:** EmptyState component with icon, title, description, and optional action (applied to 6 list pages)
- **Command palette:** cmdk-based command palette with Cmd+K access, navigation items, and action shortcuts
- **Keyboard shortcuts:** G+key navigation (G+R, G+P, G+E, G+S) and shortcuts overlay with ? key
- **URL-based team lookup:** requireTeamBySlug helper for consistent team context from URL slug (fixes JWT claim mismatch)
- **Team colors deferred:** Dynamic team colors temporarily disabled (stored in DB, using fixed emerald) — revisit in future phase

**v2.0 additions (implemented in Phase 17):**
- **Equipment booking:** EquipmentBooking model with time ranges and approval workflow (PENDING → APPROVED/DENIED/CANCELLED)
- **Booking configuration:** Facility.bookingWindowDays field for advance booking limits (default 30 days)
- **Booking notifications:** EQUIPMENT_REQUEST notification type for booking request alerts
- **Facility dashboard:** Card grid navigation with aggregate statistics (clubs, athletes, equipment, events)
- **Navigation pattern:** Facility dashboard follows club dashboard pattern with large clickable cards
- **Shared equipment count:** Includes both facility-owned and club isShared equipment
- **Facility equipment management:** CRUD pages for facility-owned shared equipment with availability indicators
- **Equipment availability status:** Derived from damage reports and manualUnavailable flags
- **Clubs list page:** Facility admins can view all clubs with drill-down to club dashboards (full admin access)
- **Booking helper library:** checkEquipmentAvailability, createEquipmentBooking, approve/deny/cancel functions
- **Booking API:** GET/POST /api/equipment/bookings, GET/PATCH/DELETE /api/equipment/bookings/[id]
- **Conflict detection:** Time range overlap algorithm with race condition protection on approval
- **Equipment requests UI:** EquipmentRequestPanel component with inline deny reason input and optimistic updates
- **Pending request badge:** Equipment list page shows amber badge linking to requests when count > 0
- **Facility settings API:** GET/PATCH /api/facility/[facilityId]/settings for profile and booking config
- **Settings page:** Three-section form for Booking Settings, Facility Profile, Contact Info
- **Cross-club events:** Facility admins can create events that copy to multiple clubs' calendars
- **Event tracking:** facilityEventId stored in practice notes JSON for grouping
- **Clubs API:** /api/facility/[facilityId]/clubs endpoint for club selection
- **Booking dialog:** BookingRequestDialog component with conflict display and notes field
- **Equipment panel enhancement:** EquipmentAvailabilityPanel with shared equipment badges and Request buttons
- **Subscription overview:** SubscriptionOverview component with usage bars (mock data until billing integration)
- **Club detail page:** Facility admin drill-down with stats, admins, practices, and subscription visibility
- **E2E verification:** All 6 Phase 17 requirements verified (FAC-03, 05, 06, 07, 08, 09)

**v2.1 additions (implemented in Phase 18):**
- **Master-detail navigation:** Left sidebar (desktop) and bottom nav bar (mobile) with persistent section access
- **NavigationSidebar component:** Desktop nav with 5 items, CASL filtering, emerald active states
- **BottomNavigation component:** Mobile nav with 5 items max, h-16 touch targets, iOS pattern
- **Team layout shell:** [teamSlug]/layout.tsx wraps all team pages with flex layout and responsive nav
- **Permission-filtered items:** Equipment and Settings require manage permissions, filtered via ability.can()
- **Active state detection:** exact match for Home, startsWith for sections with emerald-500 highlight
- **Responsive architecture:** 768px breakpoint (md:) switches sidebar ↔ bottom nav completely
- **Content scrolling:** pb-20 md:pb-0 ensures mobile content clears fixed bottom nav

### Tech Debt Tracker

| Item | Status | Notes |
|------|--------|-------|
| RC connection testing | DEFERRED | Needs RC_CLIENT_ID and RC_CLIENT_SECRET |
| QR external scanning | DEFERRED | Needs production deployment |
| Push notifications | DEFERRED | NOTIF-01, NOTIF-02 for future milestone |
| Dynamic team colors | DEFERRED | Color settings stored in DB, UI uses fixed emerald colors |

**v2.0 mitigation:**
- Component migration tracking (Phase 14) to prevent drift
- RLS connection pooling tests (Phase 12) to prevent leaks
- Tenant-aware cache keys (Phase 15) to prevent cross-tenant data exposure

### Patterns Established

See `.planning/milestones/v1.0-ROADMAP.md` for full pattern documentation.

### Research Flags for v2.0

**Phases needing deeper research during planning:**
- **Phase 13:** Custom Access Token Hook with Supabase Edge Functions (memory/timeout constraints)
- **Phase 17:** Equipment reservation conflict detection (partial boat availability logic)

**Standard patterns (skip research-phase):**
- **Phase 11:** MFA with Supabase Auth, SSO/SAML integration
- **Phase 14:** shadcn/ui installation
- **Phase 15:** PWA offline-first, touch gestures
- **Phase 16:** Standard UI/UX patterns

## Session Continuity

| Field | Value |
|-------|-------|
| Last session | 2026-01-27 |
| Stopped at | Completed 21-06-PLAN.md |
| Resume file | None |

---

*Last updated: 2026-01-27 (Phase 21 in progress — Readiness threshold settings)*
