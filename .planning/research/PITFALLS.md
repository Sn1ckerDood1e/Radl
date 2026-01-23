# Pitfalls Research: v2.0 Commercial Readiness

**Domain:** Multi-tenant SaaS adding hierarchical tenancy, mobile PWA, design system, and RBAC
**Researched:** 2026-01-22
**Confidence:** HIGH (based on authoritative sources and existing codebase analysis)

## Executive Summary

Adding hierarchical multi-tenancy, mobile PWA improvements, design systems, and RBAC to an existing ~80k LOC TypeScript application presents **integration risks** that differ fundamentally from greenfield development. The four most critical pitfalls are:

1. **Data migration without backward compatibility** - Existing team_id JWT claims break when adding facility hierarchy
2. **RLS migration creating data leaks** - Moving from application-level filtering to database RLS with connection pooling
3. **PWA cache serving stale tenant data** - Service worker cache invalidation fails across facility/club context switches
4. **Design system adoption creating component drift** - Retrofitting creates duplicates instead of replacing existing components

This research focuses on **retrofit-specific pitfalls** for existing systems with live data and users.

---

## Facility Model Pitfalls (Hierarchical Multi-Tenancy)

### CRITICAL: JWT Claims Migration Without Backward Compatibility

**Risk:** Existing JWT claims contain `team_id` (flat structure). Adding facility hierarchy requires migrating to `facility_id` + `club_id` claims, breaking all existing sessions and API routes simultaneously.

**What goes wrong:**
- All active user sessions have old claim structure
- 80+ API routes expect `team_id` in claims
- Existing Prisma queries filter by `teamId` field
- Token refresh doesn't update claim structure without re-login
- Users see empty data or 403 errors after deploy

**Warning Signs:**
- Code references `claims.team_id` in >50 locations (current codebase does this)
- No migration path for in-flight sessions
- Testing with fresh tokens only (not simulating existing sessions)
- Planning to rename `Team` model to `Club` in one migration

**Prevention:**
1. **Expand-Migrate-Contract pattern** - Run dual claims during transition:
   ```typescript
   // Phase 1: Add new claims alongside old
   claims: { team_id, facility_id, club_id }

   // Phase 2: Code reads both, prefers new
   const clubId = claims.club_id ?? claims.team_id

   // Phase 3: Remove old claims after all sessions refreshed
   ```
2. **Database schema evolution** - Add `facilityId`, `clubId` columns before removing `teamId`
3. **Forced re-login** - Invalidate all sessions on migration day with clear user messaging
4. **Fallback queries** - Keep database lookup path that works regardless of claim structure
5. **Feature flag** - Deploy new claim structure behind flag, enable gradually

**Data Migration Strategy:**
```sql
-- Add new columns (non-breaking)
ALTER TABLE "Team" ADD COLUMN "facilityId" TEXT;
ALTER TABLE "Team" ADD COLUMN "type" TEXT DEFAULT 'CLUB';

-- Backfill: Convert existing teams to clubs under auto-created facilities
INSERT INTO "Facility" (id, name, createdAt)
SELECT gen_random_uuid(), name || ' Facility', NOW()
FROM "Team";

UPDATE "Team" SET "facilityId" = (
  SELECT id FROM "Facility" WHERE name = "Team".name || ' Facility'
);

-- Later: Remove teamId column (breaking change, requires code migration first)
```

**Phase:** Phase 1 (Data Model Migration) - Must handle before any facility features

**Confidence:** HIGH - [Backward compatible database changes](https://planetscale.com/blog/backward-compatible-databases-changes), [Multi-tenant migration pitfalls](https://medium.com/@niteshthakur498/designing-a-multi-tenant-saas-application-data-isolation-strategies-dea298a1309b)

---

### CRITICAL: Application-Level to RLS Migration Data Leaks

**Risk:** RowOps currently uses application-level tenant filtering (`where: { teamId }`). Moving to database RLS with hierarchical tenancy introduces **connection pooling leaks** where one user's facility context bleeds into another's request.

**What goes wrong:**
- Connection pooling reuses database connections across requests
- `SET LOCAL` becomes `SET` accidentally, persisting tenant context globally
- User A's `facility_id` session variable leaks into User B's pooled connection
- RLS policies rely on `current_setting('app.current_facility')` which returns wrong value
- Silent data leaks - User B sees User A's facility data without errors

**Warning Signs:**
- Testing RLS with single-connection scenarios
- Using `SET` instead of `SET LOCAL` in transaction
- Not explicitly starting transactions for read-only queries
- Missing session variable cleanup between requests
- PgBouncer/Supabase connection pooling enabled without RLS testing

**Prevention:**
1. **Always use SET LOCAL inside explicit transactions:**
   ```typescript
   await prisma.$executeRaw`BEGIN`;
   await prisma.$executeRaw`SET LOCAL app.current_facility = ${facilityId}`;
   await prisma.$executeRaw`SET LOCAL app.current_club = ${clubId}`;
   const result = await prisma.equipment.findMany();
   await prisma.$executeRaw`COMMIT`;
   ```

2. **Test with connection pooling enabled** - Simulate concurrent requests from different tenants
3. **Add RLS violation monitoring** - Log when queries return 0 rows (could indicate context leak)
4. **Use LEAKPROOF functions** - Ensure RLS policy functions can use indexes:
   ```sql
   CREATE POLICY facility_isolation ON equipment
     USING (facility_id = current_setting('app.current_facility')::uuid);

   -- Function must be LEAKPROOF for index usage
   CREATE FUNCTION get_current_facility() RETURNS uuid AS $$
     SELECT current_setting('app.current_facility')::uuid
   $$ LANGUAGE sql STABLE LEAKPROOF;
   ```

5. **Dual-run period** - Keep application-level filtering AND add RLS, compare results to detect mismatches

**Specific to RowOps:**
- 10+ API routes have `getUserClaims()` + `where: { teamId }` pattern
- Currently no explicit transactions for read queries
- Supabase uses connection pooling by default
- No RLS policies exist yet (application-level only per ARCHITECTURE.md)

**Phase:** Phase 2 (Security Hardening) - After data model stable

**Confidence:** HIGH - [PostgreSQL RLS footguns](https://www.bytebase.com/blog/postgres-row-level-security-footguns/), [Tenant context per transaction](https://dev.to/m_zinger_2fc60eb3f3897908/why-tenant-context-must-be-scoped-per-transaction-3aop), [RLS implementation guide](https://www.permit.io/blog/postgres-rls-implementation-guide)

---

### HIGH: Shared Resource Booking Conflicts

**Risk:** Chattanooga Rowing (facility) owns boats shared by Lookout RC and Chattanooga Juniors. Current `Equipment` model has `teamId` (single owner). Shared equipment needs multi-club visibility but single-instance management.

**What goes wrong:**
- Both clubs create separate `Equipment` records for the same physical boat
- Equipment damage reports go to wrong club
- Scheduling conflicts - both clubs book same boat for same time
- Equipment status (damaged, available) out of sync across clubs
- No single source of truth for shared asset state

**Warning Signs:**
- `Equipment.teamId` is non-nullable foreign key
- No `ownerType` or `sharedWith` fields in schema
- Practice scheduling doesn't check cross-club equipment conflicts
- Equipment assignment logic assumes single tenant

**Prevention:**
1. **Add ownership hierarchy to Equipment model:**
   ```prisma
   model Equipment {
     id          String   @id @default(uuid())
     facilityId  String?  // Owned by facility (shared)
     clubId      String?  // Owned by specific club
     facility    Facility? @relation(fields: [facilityId])
     club        Club?     @relation(fields: [clubId])

     // Constraint: exactly one owner
     @@check(
       (facilityId IS NOT NULL AND clubId IS NULL) OR
       (facilityId IS NULL AND clubId IS NOT NULL)
     )
   }
   ```

2. **Equipment availability calendar** - Track bookings across all clubs:
   ```prisma
   model EquipmentBooking {
     id          String   @id @default(uuid())
     equipmentId String
     clubId      String   // Who booked it
     startTime   DateTime
     endTime     DateTime

     @@index([equipmentId, startTime, endTime])
   }
   ```

3. **Booking conflict detection** - Check before allowing practice lineup assignment:
   ```typescript
   // Before assigning boat to practice
   const conflicts = await prisma.equipmentBooking.findFirst({
     where: {
       equipmentId: boatId,
       OR: [
         { startTime: { lte: practiceEnd }, endTime: { gte: practiceStart } }
       ]
     }
   });
   if (conflicts) throw new Error('Boat already booked');
   ```

4. **Shared equipment permissions** - Facility admins manage shared assets, club coaches view/book only

**Specific to RowOps:**
- Current CONCERNS.md notes "No Equipment Availability/Booking System" as missing critical feature
- Real-world scenario in PROJECT.md: "some boats are shared facility equipment"
- `Equipment` model currently has `teamId String` - needs migration

**Phase:** Phase 1 (Data Model Migration) - Foundational for facility model

**Confidence:** HIGH - [Multi-tenant room booking](https://flowscapesolutions.com/blog/multi-tenant-room-booking-solution), [Shared resource conflicts](https://learn.microsoft.com/en-us/answers/questions/5347512/how-to-prevent-recurring-meeting-room-booking-conf)

---

### MEDIUM: Foreign Key Cascades Breaking Data Integrity

**Risk:** Adding `Facility → Club → Equipment` hierarchy creates cascade deletion risks. Deleting facility accidentally deletes all clubs and equipment, despite clubs potentially wanting to migrate to different facility.

**What goes wrong:**
- `ON DELETE CASCADE` destroys dependent records silently
- Coach deletes test facility in production by mistake
- All clubs under facility lose all historical data
- Equipment records orphaned or deleted
- No undo mechanism for cascade deletions

**Warning Signs:**
- Using `onDelete: Cascade` in Prisma schema without soft deletes
- No "archive" or "deactivate" option for facilities/clubs
- Deletion operations don't show impact preview ("This will delete 3 clubs, 47 equipment...")
- No database-level backups before major deletions

**Prevention:**
1. **Soft delete pattern** - Add `deletedAt` timestamp instead of hard deletes:
   ```prisma
   model Facility {
     id        String    @id
     deletedAt DateTime? // NULL = active, timestamp = soft deleted
   }
   ```

2. **Restrict cascade** - Use `onDelete: Restrict` to prevent deletion with dependents:
   ```prisma
   model Club {
     facilityId String
     facility   Facility @relation(fields: [facilityId], onDelete: Restrict)
   }
   ```

3. **Deletion impact preview** - Show user what will be affected:
   ```typescript
   const impact = await prisma.facility.findUnique({
     where: { id },
     include: {
       _count: { select: { clubs: true } }
     }
   });
   // Show: "Deleting this facility will archive 3 clubs. Continue?"
   ```

4. **Migration path** - Allow club to change facility without data loss:
   ```typescript
   // Transfer club to different facility
   await prisma.club.update({
     where: { id: clubId },
     data: { facilityId: newFacilityId }
   });
   ```

**Phase:** Phase 1 (Data Model Migration) - Design schema correctly from start

**Confidence:** MEDIUM - [Database design patterns](https://www.pingcap.com/article/database-design-patterns-for-ensuring-backward-compatibility/)

---

## Mobile PWA Pitfalls

### CRITICAL: Service Worker Cache Invalidation Across Tenants

**Risk:** RowOps uses Serwist service worker for offline mode. Current cache keyed by URL only. User switching from Facility A to Facility B sees stale cached data because cache doesn't include tenant context.

**What goes wrong:**
- User logs in as Chattanooga Rowing (Facility A)
- Service worker caches `/api/equipment` response with Facility A's data
- User logs out, logs in as Lookout Rowing Club (Facility B, different facility)
- Service worker returns cached `/api/equipment` with Facility A's data
- **Silent data leak** - User B sees User A's private equipment list

**Warning Signs:**
- Cache keys are URL-only (no tenant/facility ID in cache key)
- No cache invalidation on login/logout
- Service worker doesn't read JWT claims to scope cache
- Testing only single-user scenarios
- IndexedDB (Dexie.js) stores data without tenant scoping

**Prevention:**
1. **Tenant-aware cache keys:**
   ```typescript
   // In service worker
   const cacheKey = `${facilityId}-${clubId}-${request.url}`;
   const cache = await caches.open(`v1-${facilityId}`);
   ```

2. **Clear cache on tenant switch:**
   ```typescript
   // In login/logout handlers
   if ('serviceWorker' in navigator) {
     const registrations = await navigator.serviceWorker.getRegistrations();
     for (const reg of registrations) {
       await reg.update(); // Force SW update
     }

     // Clear all caches
     const cacheNames = await caches.keys();
     await Promise.all(cacheNames.map(name => caches.delete(name)));
   }
   ```

3. **Clear-Site-Data header** - Nuclear option for logout:
   ```typescript
   // API route for logout
   return new Response(null, {
     headers: {
       'Clear-Site-Data': '"cache", "storage"'
     }
   });
   ```

4. **IndexedDB tenant scoping** - Prefix all Dexie table names with tenant ID:
   ```typescript
   const db = new Dexie(`rowops-${facilityId}-${clubId}`);
   ```

5. **Cache validation headers** - Add tenant ID to response headers for verification:
   ```typescript
   // API response includes
   headers: {
     'X-Facility-ID': facilityId,
     'X-Club-ID': clubId
   }

   // Service worker validates before serving cached response
   if (cachedResponse.headers.get('X-Facility-ID') !== currentFacilityId) {
     return fetch(request); // Cache invalid, fetch fresh
   }
   ```

**Specific to RowOps:**
- Serwist configured in `next.config.ts` (per PROJECT.md)
- IndexedDB via Dexie.js for offline storage
- Background sync for mutations (may queue operations for wrong tenant)
- No mention of tenant-scoped cache in current architecture

**Phase:** Phase 3 (Mobile PWA) - Critical before multi-facility users

**Confidence:** HIGH - [PWA cache invalidation](https://iinteractive.com/resources/blog/taming-pwa-cache-behavior), [Multi-tenant PWA user data](https://hasura.io/blog/strategies-for-service-worker-caching-d66f3c828433)

---

### HIGH: iOS PWA Limitations Breaking Core Functionality

**Risk:** RowOps targets coaches (laptop/tablet) and athletes (mobile phones). iOS PWA constraints severely limit mobile experience - no app store distribution, 50MB storage limit, no Face ID, manual install only.

**What goes wrong:**
- Athletes can't find app (not in App Store)
- Installation requires Safari + manual "Add to Home Screen" (30% awareness)
- 50MB storage limit insufficient for offline regatta data
- No push notification permission prompt on iOS (until home screen install)
- Service worker evicted after 7 days of non-use
- No Bluetooth for potential erg (rowing machine) integration

**Warning Signs:**
- Testing primarily on Android or desktop Chrome
- Assuming push notifications "just work" on iOS
- Planning offline-first features assuming unlimited storage
- No iOS-specific installation instructions in onboarding
- Feature roadmap includes hardware integrations (NFC, Bluetooth, payments)

**Prevention:**
1. **Installation guidance** - Explicit iOS instructions with screenshots:
   ```tsx
   // Detect iOS and show install prompt
   const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
   const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

   if (isIOS && !isInStandaloneMode) {
     return <IOSInstallPrompt />;
   }
   ```

2. **Storage quota management** - Monitor and warn before hitting 50MB:
   ```typescript
   if (navigator.storage && navigator.storage.estimate) {
     const { usage, quota } = await navigator.storage.estimate();
     if (usage / quota > 0.8) {
       // Warn user, clear old data
     }
   }
   ```

3. **Progressive feature detection** - Gracefully degrade on iOS:
   ```typescript
   const features = {
     pushNotifications: 'Notification' in window,
     bluetooth: 'bluetooth' in navigator,
     nfc: 'NDEFReader' in window,
     faceId: window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable
   };

   // Offer email notifications if push unavailable
   if (!features.pushNotifications) {
     return <EmailNotificationFallback />;
   }
   ```

4. **Native app fallback plan** - Design architecture to support future React Native port:
   - Keep API layer stateless (already true for RowOps)
   - Separate business logic from React components
   - Use platform-agnostic data structures

**Specific to RowOps:**
- PROJECT.md states "PWA (web + service workers), architect for future native"
- Push notifications already implemented (Supabase Edge Functions)
- Offline mode required for regatta (unreliable cellular) per constraints

**Phase:** Phase 3 (Mobile PWA) - Test iOS thoroughly before launch

**Confidence:** HIGH - [PWA vs Native 2026](https://topflightapps.com/ideas/native-vs-progressive-web-app/), [PWAs on iOS](https://www.mobiloud.com/blog/progressive-web-apps-ios)

---

### MEDIUM: Responsive Retrofit Breaking Desktop Workflows

**Risk:** RowOps has existing desktop-optimized UI (drag-and-drop lineup editor with dnd-kit). Retrofitting mobile-first responsive design breaks desktop interactions or creates "mobile web" feel on desktop.

**What goes wrong:**
- Drag-and-drop unusable on mobile (no mouse, fat fingers)
- Desktop layout forced into mobile constraints (cramped, inefficient)
- Touch targets too small for mobile, too large for desktop
- Hover states don't work on touch devices
- Context menus (right-click) absent on mobile
- Calendar/schedule views unreadable on small screens

**Warning Signs:**
- Designing mobile-first without preserving desktop workflows
- Using same component for mobile and desktop (no responsive variants)
- Removing desktop features because they don't work on mobile
- Testing on emulator only (not real touch devices)
- Assuming "responsive = mobile-first = good for everyone"

**Prevention:**
1. **Adaptive components** - Different implementations for mobile/desktop:
   ```tsx
   // Lineup editor: drag-drop on desktop, list selection on mobile
   const isMobile = useMediaQuery('(max-width: 768px)');

   return isMobile ? (
     <LineupListSelector athletes={athletes} />
   ) : (
     <LineupDragDropEditor athletes={athletes} />
   );
   ```

2. **Progressive enhancement** - Build mobile-first, enhance for desktop:
   ```tsx
   // Mobile: stacked cards, Desktop: table with more info
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
     {equipment.map(item => (
       <EquipmentCard item={item} showDetails={!isMobile} />
     ))}
   </div>
   ```

3. **Touch target sizing** - Minimum 44px touch targets on mobile:
   ```css
   /* Mobile: larger touch targets */
   @media (max-width: 768px) {
     button { min-height: 44px; min-width: 44px; }
   }
   ```

4. **Test on real devices** - iOS Safari, Android Chrome, iPad Safari
   - Borrow devices from target users (coaches, athletes)
   - Use BrowserStack for cross-device testing
   - Test offline mode on actual cellular networks (not wifi)

**Specific to RowOps:**
- dnd-kit already used for drag-and-drop (desktop-centric)
- Lineup editor is core workflow (coaches think in seats and people)
- Athletes primarily mobile, coaches primarily laptop/tablet per PROJECT.md

**Phase:** Phase 3 (Mobile PWA) - Design mobile variants before retrofitting

**Confidence:** MEDIUM - [Responsive retrofit challenges](https://www.telerik.com/blogs/challenges-with-retrofitting-responsive-design), [Mobile-first guide](https://www.uxpin.com/studio/blog/a-hands-on-guide-to-mobile-first-design/)

---

## UI/UX Pitfalls (Design System Adoption)

### CRITICAL: Component Drift - Duplicates Instead of Replacement

**Risk:** Adopting a design system in existing codebase creates duplicate components. Old components stay in use because no one knows to migrate. Design inconsistency grows instead of shrinking.

**What goes wrong:**
- New `Button` component created from design system
- 50 existing components still use old `<button>` or custom `OldButton`
- Developers don't know which to use
- Old components get bug fixes, new ones don't (or vice versa)
- Codebase has 3+ button variants with different styles/behaviors
- Design system becomes "the new components we don't use"

**Warning Signs:**
- No deprecation plan for old components
- Design system components in `/components/ui/` but old ones in `/components/`
- No component inventory or migration checklist
- Testing new components in isolation but not replacing old usage
- Component library growing (more files) instead of shrinking

**Prevention:**
1. **Component inventory** - Audit existing components before starting:
   ```bash
   # Find all button-like components
   rg -g '*.tsx' "export (const|function) .*Button"

   # Result: OldButton, DangerButton, PrimaryButton, etc.
   ```

2. **Deprecation with linting** - Mark old components as deprecated:
   ```typescript
   /**
    * @deprecated Use components/ui/Button instead
    * Will be removed in v2.1
    */
   export function OldButton() { ... }
   ```

3. **Codemods for migration** - Automate replacement where possible:
   ```typescript
   // jscodeshift script to replace OldButton with Button
   export default function transformer(file, api) {
     const j = api.jscodeshift;
     return j(file.source)
       .find(j.ImportDeclaration, {
         source: { value: './old-button' }
       })
       .replaceWith(
         j.importDeclaration(
           [j.importDefaultSpecifier(j.identifier('Button'))],
           j.literal('./ui/button')
         )
       )
       .toSource();
   }
   ```

4. **Migration tracking** - Track component replacement progress:
   ```markdown
   # Component Migration Checklist
   - [ ] Button (34/87 files migrated)
   - [ ] Input (12/56 files migrated)
   - [ ] Card (0/43 files migrated)
   ```

5. **Delete old components** - Remove deprecated components aggressively after migration

**Specific to RowOps:**
- `src/components/` has ~80 custom components (many forms)
- Tailwind CSS used but no formal design system (per PROJECT.md)
- CONCERNS.md notes component size issues (325-line forms)
- No component library or Storybook mentioned

**Phase:** Phase 4 (UI/UX Polish) - Create inventory in phase planning

**Confidence:** HIGH - [Design system adoption pitfalls](https://www.netguru.com/blog/design-system-adoption-pitfalls), [Gaining adoption](https://product.hubspot.com/blog/how-to-gain-widespread-adoption-of-your-design-system)

---

### HIGH: Building Too Much, Too Soon

**Risk:** Teams create comprehensive design systems with every possible component variant before validating actual needs. Components go unused, system becomes overwhelming.

**What goes wrong:**
- Spend months building 50+ components
- Only 15 components actually used in product
- System too complex to navigate (which button variant to use?)
- Developers rebuild components because they can't find right one
- Design system team maintains unused components
- Stakeholders lose confidence in design system value

**Warning Signs:**
- Planning full component library before building features
- Creating variants without real use cases ("we might need it")
- Storybook has more stories than actual product screens
- Documentation for components that don't exist in product
- Design system roadmap disconnected from product roadmap

**Prevention:**
1. **Extract, don't predict** - Build components only after they exist 2-3 times:
   ```
   Phase 1: Build feature with inline components
   Phase 2: Notice duplication (same button in 3 places)
   Phase 3: Extract to design system component
   ```

2. **Start with foundations** - Color, typography, spacing first:
   ```typescript
   // Design tokens (shared values)
   export const colors = {
     primary: '#3B82F6',
     secondary: '#8B5CF6',
     // ... from team colors in RowOps
   };

   export const spacing = {
     xs: '0.25rem',
     sm: '0.5rem',
     // ... used consistently
   };
   ```

3. **Top 5 components only** - Identify most-used components:
   - Button (primary, secondary, danger)
   - Input (text, number, select)
   - Card (container)
   - Modal/Dialog
   - Toast notifications (already using Sonner)

4. **Usage metrics** - Track which components are actually used:
   ```typescript
   // Add telemetry to design system imports
   import { Button } from '@/components/ui/button'; // Track this import

   // Report: Button used in 42 files, Dropdown used in 3 files
   ```

**Specific to RowOps:**
- Existing components are feature-specific, not reusable
- Sonner already adopted for toasts (good starting point)
- Tailwind provides design tokens foundation
- Team colors in context provider (should inform color system)

**Phase:** Phase 4 (UI/UX Polish) - Start small, expand based on usage

**Confidence:** HIGH - [Building too much too soon](https://www.netguru.com/blog/design-system-adoption-pitfalls)

---

### MEDIUM: Fragmented Tooling and Documentation

**Risk:** Design system assets spread across Figma, Storybook, code, and docs. Developers can't find the right component or don't trust it's current.

**What goes wrong:**
- Design specs in Figma, code in GitHub, docs in Notion
- Designer updates Figma, developer doesn't know
- Code has v2 of Button, Figma shows v1, docs describe v0
- Developer builds custom component instead of using design system
- No single source of truth

**Warning Signs:**
- No automated design-to-code sync
- Documentation separate from code
- Storybook deployments manual and infrequent
- Version numbers in Figma don't match code
- Designers and developers using different names for same component

**Prevention:**
1. **Collocate documentation with code:**
   ```tsx
   /**
    * Primary button component
    * @see Figma: https://figma.com/file/abc/Button
    * @example
    *   <Button variant="primary" onClick={handleClick}>
    *     Save Changes
    *   </Button>
    */
   export function Button({ variant = 'primary', ...props }) { }
   ```

2. **Automated Storybook deployment** - Deploy on every commit:
   ```yaml
   # .github/workflows/storybook.yml
   - name: Build and deploy Storybook
     run: |
       npm run build-storybook
       aws s3 sync storybook-static s3://design-system-docs
   ```

3. **Design tokens sync** - Export Figma tokens to code:
   ```bash
   # Use Figma Tokens plugin + Style Dictionary
   npx style-dictionary build
   # Generates: src/design-tokens/colors.ts, spacing.ts, etc.
   ```

4. **Single source of truth** - Make Storybook the canonical reference:
   - Link Figma specs to Storybook stories
   - Link docs to Storybook
   - Developers consult Storybook, not Figma

**Specific to RowOps:**
- No Storybook or component docs currently
- Tailwind config is de-facto design token source
- Team colors in database (TeamColorProvider context)
- May need to sync database colors → design tokens

**Phase:** Phase 4 (UI/UX Polish) - Set up infrastructure before building components

**Confidence:** MEDIUM - [Fragmented tooling](https://www.netguru.com/blog/design-system-adoption-pitfalls), [Design system FAQ](https://uxdesign.cc/design-system-faq-adoption-implementation-fd7611c56514)

---

## Security/RBAC Pitfalls

### CRITICAL: RBAC Absolutism - Role Explosion

**Risk:** Trying to model every permission variation as a role. Start with COACH, ATHLETE, PARENT; end with FACILITY_ADMIN, CLUB_ADMIN, CLUB_COACH, ASSISTANT_COACH, HEAD_COACH, ATHLETE_CAPTAIN, ATHLETE_NOVICE, PARENT_VOLUNTEER, etc.

**What goes wrong:**
- Roles multiply to cover edge cases
- 20+ roles become unmanageable
- Role assignment UI overwhelming
- No clear hierarchy (is ASSISTANT_COACH > ATHLETE_CAPTAIN?)
- Database has UserRole junction table with hundreds of rows
- Authorization logic becomes complex nested conditionals

**Warning Signs:**
- Creating role for every job title
- Planning roles for features that don't exist yet
- Role names include job titles ("Volunteer Coordinator") not permissions
- Authorization checks like `if (role === 'COACH' || role === 'ASSISTANT_COACH' || role === 'HEAD_COACH')`
- No role hierarchy or inheritance

**Prevention:**
1. **80/20 rule** - Roles cover 80% of access patterns, permissions cover remaining 20%:
   ```prisma
   model TeamMember {
     role        Role         // COACH, ATHLETE, PARENT (broad categories)
     permissions Permission[] // Specific overrides (can_manage_equipment)
   }

   enum Role {
     FACILITY_ADMIN  // Manages facility, all clubs
     CLUB_ADMIN      // Manages single club
     COACH           // Plans practices, assigns lineups
     ATHLETE         // Views schedule, receives assignments
     PARENT          // Read-only child's schedule
   }

   enum Permission {
     MANAGE_SHARED_EQUIPMENT
     VIEW_ALL_CLUBS
     APPROVE_EXPENSES
     // Specific, granular
   }
   ```

2. **Design around tasks, not titles:**
   - Bad: "Head Coach" role
   - Good: "Can publish practices" permission

3. **Role hierarchy** - Tree structure avoids duplication:
   ```typescript
   const roleHierarchy = {
     FACILITY_ADMIN: ['CLUB_ADMIN', 'COACH', 'ATHLETE', 'PARENT'],
     CLUB_ADMIN: ['COACH', 'ATHLETE', 'PARENT'],
     COACH: ['ATHLETE'], // Coaches can do everything athletes can
     ATHLETE: [],
     PARENT: []
   };

   function hasPermission(userRole: Role, requiredRole: Role): boolean {
     if (userRole === requiredRole) return true;
     return roleHierarchy[userRole]?.includes(requiredRole) ?? false;
   }
   ```

4. **Audit role usage** - Track how often each role/permission is checked:
   ```typescript
   // If permission used <5 times in codebase, it's a candidate for removal
   ```

**Specific to RowOps:**
- Current roles: COACH, ATHLETE, PARENT (3 roles - good!)
- Adding facility layer adds FACILITY_ADMIN (4 roles - still good)
- Risk: Adding CLUB_ADMIN, ASSISTANT_COACH, etc. without permission system
- `src/lib/auth/authorize.ts` has `requireRole()` helper (extend for hierarchy)

**Phase:** Phase 5 (Security Hardening) - Design role model before implementing

**Confidence:** HIGH - [RBAC implementation pitfalls](https://idenhaus.com/rbac-implementation-pitfalls/), [Design around tasks not titles](https://www.secureidentityhub.com/rbac-implementation-mistakes-avoid/)

---

### HIGH: Client-Side Only RBAC

**Risk:** Implementing role checks in React components but not server-side. UI hides buttons but API allows unauthorized actions.

**What goes wrong:**
- Component shows equipment form only if `role === 'COACH'`
- User modifies React DevTools or calls API directly
- `POST /api/equipment` has no role check
- Athletes create/delete equipment by calling API
- Security theater - UI restrictions without enforcement

**Warning Signs:**
- Authorization logic in components (`if (role === 'COACH')`)
- API routes missing `requireRole()` checks
- Testing UI but not testing API directly
- Comments like "only coaches can access this page" without server validation
- Assuming route protection equals authorization

**Prevention:**
1. **Always validate server-side:**
   ```typescript
   // API route
   export async function POST(request: Request) {
     const { userId, teamId, role } = await requireAuth();

     if (role !== 'COACH') {
       return NextResponse.json(
         { error: 'Forbidden: Only coaches can create equipment' },
         { status: 403 }
       );
     }

     // Proceed with creation
   }
   ```

2. **Defense in depth** - UI + API checks:
   ```tsx
   // Client component
   {role === 'COACH' && <CreateEquipmentButton />}

   // API route (REQUIRED)
   if (role !== 'COACH') return 403;
   ```

3. **Test API directly** - Bypass UI in tests:
   ```typescript
   test('athlete cannot create equipment', async () => {
     const token = await getAthleteToken();
     const response = await fetch('/api/equipment', {
       method: 'POST',
       headers: { Authorization: `Bearer ${token}` },
       body: JSON.stringify({ name: 'Boat' })
     });

     expect(response.status).toBe(403);
   });
   ```

**Specific to RowOps:**
- CONCERNS.md notes "Authorization Checks Not Systematically Tested"
- Some API routes check role (equipment/route.ts checks COACH)
- No systematic test suite for RBAC matrix
- JWT claims include `user_role` but jwt-decode doesn't verify signature (relies on Supabase getUser)

**Phase:** Phase 5 (Security Hardening) - Audit all endpoints systematically

**Confidence:** HIGH - [RBAC mistakes](https://www.secureidentityhub.com/rbac-implementation-mistakes-avoid/), [Client vs server-side](https://www.permit.io/blog/roll-your-own-rbac)

---

### HIGH: Failing to Plan for Ongoing RBAC Maintenance

**Risk:** RBAC system created once during migration, never updated. Permissions drift as features change, roles decay, exceptions accumulate.

**What goes wrong:**
- Feature added with temporary permission override
- Employee leaves, role stays assigned to user indefinitely
- Permission granted for testing, never revoked
- No audit trail of who changed what permissions
- System has 50 orphaned permissions for deleted features

**Warning Signs:**
- No expiry dates on role assignments
- No audit log of permission changes
- Manual role assignment without approval workflow
- Permissions never removed, only added
- No periodic access review process

**Prevention:**
1. **Audit logging** - Track all RBAC changes:
   ```prisma
   model RBACEvent {
     id        String   @id @default(uuid())
     timestamp DateTime @default(now())
     actorId   String   // Who made the change
     action    String   // GRANT_ROLE, REVOKE_PERMISSION
     targetId  String   // User affected
     details   Json     // { role: 'COACH', reason: 'promoted' }
   }
   ```

2. **Temporary access** - Expiring role assignments:
   ```prisma
   model TeamMember {
     role      Role
     expiresAt DateTime? // Role auto-revoked after date
   }

   // Cron job: revoke expired roles daily
   ```

3. **Periodic access review** - Quarterly audit:
   ```typescript
   // Generate report: Users with COACH role for >1 year
   const staleCoaches = await prisma.teamMember.findMany({
     where: {
       role: 'COACH',
       createdAt: { lt: oneYearAgo }
     }
   });
   // Email facility admin: "Review these coach assignments"
   ```

4. **Permission usage tracking** - Identify unused permissions:
   ```typescript
   // Log every permission check
   logger.info('Permission check', { permission: 'MANAGE_EQUIPMENT', userId });

   // Analyze: Permissions never checked → candidates for removal
   ```

**Specific to RowOps:**
- CONCERNS.md notes "No Audit Logging" as missing critical feature
- TeamMember model has no `expiresAt` or audit fields
- No mention of access review process
- Invitation approval creates TeamMember but no approval audit trail

**Phase:** Phase 5 (Security Hardening) - Build audit infrastructure first

**Confidence:** MEDIUM - [RBAC maintenance](https://idenhaus.com/rbac-implementation-pitfalls/), [Ongoing RBAC effort](https://www.secureidentityhub.com/rbac-implementation-mistakes-avoid/)

---

## Cross-Cutting Pitfalls

### CRITICAL: Data Migration Without Dry-Run and Rollback

**Risk:** Migrating 80k+ lines of code and live production data from flat tenancy to hierarchical tenancy without ability to test migration or rollback on failure.

**What goes wrong:**
- Migration script runs on production
- Script has bug, corrupts 30% of data
- No backup restore procedure tested
- Users see errors, data gone
- Rollback requires manual SQL reconstruction
- Team loses trust in platform

**Warning Signs:**
- Migration tested once on small dataset
- No production backup before migration
- Migration scripts have no transaction wrapping
- Rollback strategy is "restore from backup" without testing restore
- No data validation after migration
- Migration runs during business hours

**Prevention:**
1. **Dry-run mode** - Test migration without committing:
   ```typescript
   async function migrate({ dryRun = false }) {
     const results = [];

     for (const team of teams) {
       const facility = createFacility(team);
       const club = createClub(team, facility);

       results.push({ team: team.id, facility: facility.id, club: club.id });

       if (dryRun) {
         console.log('Would create:', results);
         continue; // Don't commit
       }

       await prisma.$transaction([
         prisma.facility.create({ data: facility }),
         prisma.club.create({ data: club }),
       ]);
     }

     return results;
   }

   // Test migration
   await migrate({ dryRun: true });
   ```

2. **Backup verification** - Test restore before migration:
   ```bash
   # 1. Take production backup
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

   # 2. Restore to staging database
   psql $STAGING_URL < backup-20260122.sql

   # 3. Run migration on staging
   npx prisma migrate deploy --preview-feature

   # 4. Verify data integrity
   npm run verify-migration

   # 5. Only then run on production
   ```

3. **Backward compatibility period** - Dual-write old and new schemas:
   ```typescript
   // During migration transition
   async function createEquipment(data) {
     return await prisma.$transaction([
       // Write to old schema (teamId)
       prisma.equipment.create({
         data: { ...data, teamId: data.clubId }
       }),

       // Write to new schema (facilityId + clubId)
       prisma.equipment.create({
         data: { ...data, facilityId, clubId }
       })
     ]);
   }
   ```

4. **Data validation** - Verify migration correctness:
   ```typescript
   async function validateMigration() {
     const errors = [];

     // Check: All teams have facility
     const teamsWithoutFacility = await prisma.team.count({
       where: { facilityId: null }
     });
     if (teamsWithoutFacility > 0) {
       errors.push(`${teamsWithoutFacility} teams missing facility`);
     }

     // Check: All equipment has club or facility
     const orphanedEquipment = await prisma.equipment.count({
       where: { AND: [{ facilityId: null }, { clubId: null }] }
     });
     if (orphanedEquipment > 0) {
       errors.push(`${orphanedEquipment} equipment orphaned`);
     }

     return errors;
   }
   ```

5. **Migration window** - Run during low-usage time:
   - Schedule for 2-4am user local time
   - Notify users 1 week in advance
   - Enable maintenance mode during migration
   - Have rollback procedure ready

**Specific to RowOps:**
- No migration scripts in codebase yet
- Prisma migrations exist but no custom data migration scripts
- No staging environment mentioned
- No backup/restore procedure documented

**Phase:** Phase 1 (Data Model Migration) - First step before any code changes

**Confidence:** HIGH - [Data migration challenges](https://brainhub.eu/library/data-migration-challenges-risks-legacy-modernization), [Migration checklist 2026](https://rivery.io/data-learning-center/complete-data-migration-checklist/)

---

### HIGH: TypeScript Type Safety Loss During Refactor

**Risk:** Adding facility hierarchy breaks type safety. Code compiles but runtime errors because types don't match new data model.

**What goes wrong:**
- Change `teamId: string` to `clubId: string | facilityId: string`
- TypeScript sees both as `string`, no errors
- Runtime confusion - is this ID a club or facility?
- Queries use wrong ID type, return no data
- Silent failures - no compile errors, no runtime errors, just empty results

**Warning Signs:**
- Using primitive types (`string`) instead of branded types
- No runtime validation of ID types
- Assuming TypeScript prevents all bugs
- Migration changes model but not types
- Tests pass but production has type confusion

**Prevention:**
1. **Branded types** - Make IDs distinct at type level:
   ```typescript
   // Prevent mixing facility and club IDs
   type FacilityId = string & { readonly __brand: 'FacilityId' };
   type ClubId = string & { readonly __brand: 'ClubId' };

   function createFacility(id: string): FacilityId {
     return id as FacilityId;
   }

   function getEquipment(clubId: ClubId) {
     // Can't accidentally pass FacilityId here - compile error
   }
   ```

2. **Discriminated unions** - Make ownership explicit:
   ```typescript
   type Equipment =
     | { owner: 'facility'; facilityId: FacilityId }
     | { owner: 'club'; clubId: ClubId };

   function getOwner(equipment: Equipment) {
     if (equipment.owner === 'facility') {
       return equipment.facilityId; // Type-safe
     } else {
       return equipment.clubId;
     }
   }
   ```

3. **Runtime validation** - Zod schemas match types:
   ```typescript
   const EquipmentSchema = z.discriminatedUnion('owner', [
     z.object({ owner: z.literal('facility'), facilityId: z.string() }),
     z.object({ owner: z.literal('club'), clubId: z.string() })
   ]);

   // Runtime check before database
   const validated = EquipmentSchema.parse(data);
   ```

4. **Prisma type generation** - Regenerate types after schema change:
   ```bash
   # After changing schema.prisma
   npx prisma generate

   # TypeScript errors show incompatible usage
   ```

**Specific to RowOps:**
- Heavy TypeScript usage (80k LOC TypeScript per PROJECT.md)
- Zod schemas in `src/lib/validations/` for runtime validation
- Prisma generates types from schema
- No branded types currently (all IDs are `string`)

**Phase:** Phase 1 (Data Model Migration) - Define types before implementation

**Confidence:** MEDIUM - [TypeScript type safety 2026](https://www.nucamp.co/blog/typescript-fundamentals-in-2026-why-every-full-stack-developer-needs-type-safety), [Multi-tenant TypeScript](https://github.com/mullionlabs/mullion-ts)

---

### MEDIUM: Next.js Context Provider Performance with Facility Hierarchy

**Risk:** Adding facility/club context providers wrapping entire app. Every state change re-renders all children. Performance degrades with deep context nesting.

**What goes wrong:**
- `<FacilityProvider>` wraps `<ClubProvider>` wraps `<TeamColorProvider>` wraps entire app
- Facility switch triggers re-render of every component
- Context value not memoized, new object on every render
- Components re-render even if they don't use context
- Page feels sluggish, especially on mobile

**Warning Signs:**
- Providers at root level (app layout)
- Context value created inline without useMemo
- Multiple contexts for related state
- No code splitting or lazy loading
- React DevTools shows entire tree re-rendering

**Prevention:**
1. **Render providers deep in tree:**
   ```tsx
   // Bad: Provider at root
   <App>
     <FacilityProvider> {/* Wraps everything */}
       <AllPages />
     </FacilityProvider>
   </App>

   // Good: Provider only where needed
   <App>
     <PublicPages />
     <FacilityGate> {/* Only authenticated users */}
       <FacilityProvider>
         <DashboardPages />
       </FacilityProvider>
     </FacilityGate>
   </App>
   ```

2. **Memoize context values:**
   ```tsx
   function FacilityProvider({ children }) {
     const [facility, setFacility] = useState();

     // Prevent new object on every render
     const value = useMemo(
       () => ({ facility, setFacility }),
       [facility]
     );

     return (
       <FacilityContext.Provider value={value}>
         {children}
       </FacilityContext.Provider>
     );
   }
   ```

3. **Split contexts** - Separate state and actions:
   ```tsx
   // Read-only facility data (changes rarely)
   <FacilityDataContext.Provider value={facility}>
     {/* Actions context (stable reference) */}
     <FacilityActionsContext.Provider value={actions}>
       {children}
     </FacilityActionsContext.Provider>
   </FacilityDataContext.Provider>
   ```

4. **Use URL state instead of context** - Facility/club in URL:
   ```tsx
   // URL: /dashboard/facility/abc/club/xyz
   // No context needed, Next.js provides via params

   export default function Page({ params }: { params: { facilityId: string, clubId: string } }) {
     // Fetch data based on URL params
   }
   ```

**Specific to RowOps:**
- Current TeamColorProvider in context (good precedent)
- URL already includes teamSlug for routing
- Could extend to `/facility/{slug}/club/{slug}` pattern
- Server components reduce context need (data from props)

**Phase:** Phase 2 (Security Hardening) - Design context architecture early

**Confidence:** MEDIUM - [React Context performance](https://vercel.com/kb/guide/react-context-state-management-nextjs), [Next.js context providers](https://dev.to/codingbrowny/using-context-providers-in-nextjs-server-components-2gk4)

---

## Sources

### Hierarchical Multi-Tenancy
- [Designing Multi-Tenant SaaS: Data Isolation Strategies](https://medium.com/@niteshthakur498/designing-a-multi-tenant-saas-application-data-isolation-strategies-dea298a1309b)
- [SaaS Multitenancy: Components, Pros and Cons](https://frontegg.com/blog/saas-multitenancy)
- [Approaches to Implementing Multi-Tenancy](https://developers.redhat.com/articles/2022/05/09/approaches-implementing-multi-tenancy-saas-applications)
- [Multi-Tenant Database Architecture Patterns](https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/)

### RBAC Implementation
- [6 Common RBAC Implementation Pitfalls](https://idenhaus.com/rbac-implementation-pitfalls/)
- [RBAC Implementation Mistakes and How to Avoid Them](https://www.secureidentityhub.com/rbac-implementation-mistakes-avoid/)
- [Should You Roll Your Own RBAC?](https://www.permit.io/blog/roll-your-own-rbac)
- [Microsoft: Implement RBAC in Applications](https://learn.microsoft.com/en-us/entra/identity-platform/howto-implement-rbac-for-apps)

### PostgreSQL RLS
- [PostgreSQL RLS Implementation Guide](https://www.permit.io/blog/postgres-rls-implementation-guide)
- [Common Postgres Row-Level-Security Footguns](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- [Why Tenant Context Must Be Scoped Per Transaction](https://dev.to/m_zinger_2fc60eb3f3897908/why-tenant-context-must-be-scoped-per-transaction-3aop)
- [Mastering PostgreSQL RLS for Multi-Tenancy](https://ricofritzsche.me/mastering-postgresql-row-level-security-rls-for-rock-solid-multi-tenancy/)
- [AWS: Multi-Tenant Data Isolation with RLS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)

### PWA & Mobile
- [Progressive Web Apps vs Native in 2026](https://topflightapps.com/ideas/native-vs-progressive-web-app/)
- [Do PWAs Work on iPhone?](https://www.mobiloud.com/blog/progressive-web-apps-ios)
- [Taming PWA Cache Behavior](https://iinteractive.com/resources/blog/taming-pwa-cache-behavior)
- [Strategies for Service Worker Caching](https://hasura.io/blog/strategies-for-service-worker-caching-d66f3c828433)
- [PWA Development: Challenges & Best Practices](https://mobidev.biz/blog/progressive-web-app-development-pwa-best-practices-challenges)

### Responsive Design Retrofit
- [Challenges with Retrofitting Responsive Design](https://www.telerik.com/blogs/challenges-with-retrofitting-responsive-design)
- [Retrofitting Mobile First Design](https://lupinepublishers.com/computer-science-journal/fulltext/retrofitting-mobile-first-design-responsive-design-driving-factors-approach.ID.000131.php)
- [A Hands-On Guide to Mobile-First Design](https://www.uxpin.com/studio/blog/a-hands-on-guide-to-mobile-first-design/)

### Design System Adoption
- [Design System Adoption Pitfalls](https://www.netguru.com/blog/design-system-adoption-pitfalls)
- [How to Gain Widespread Adoption of Your Design System](https://product.hubspot.com/blog/how-to-gain-widespread-adoption-of-your-design-system)
- [Design System FAQ: Adoption and Implementation](https://uxdesign.cc/design-system-faq-adoption-implementation-fd7611c56514)
- [A Developer's Guide to Implementing a Design System](https://www.telerik.com/blogs/developers-guide-implementing-design-system-part-1)

### Data Migration
- [Data Migration: Challenges & Risks](https://brainhub.eu/library/data-migration-challenges-risks-legacy-modernization)
- [Complete Data Migration Checklist for 2026](https://rivery.io/data-learning-center/complete-data-migration-checklist/)
- [Data Migration Risks and Checklist](https://www.montecarlodata.com/blog-data-migration-risks-checklist/)
- [Backward Compatible Database Changes](https://planetscale.com/blog/backward-compatible-databases-changes)
- [Database Design Patterns for Backward Compatibility](https://www.pingcap.com/article/database-design-patterns-for-ensuring-backward-compatibility/)

### TypeScript & Next.js
- [TypeScript Fundamentals in 2026](https://www.nucamp.co/blog/typescript-fundamentals-in-2026-why-every-full-stack-developer-needs-type-safety)
- [Using React Context in Next.js](https://vercel.com/kb/guide/react-context-state-management-nextjs)
- [Next.js Context Provider Performance](https://dev.to/codingbrowny/using-context-providers-in-nextjs-server-components-2gk4)
- [Production-Ready Multi-Tenant Next.js](https://www.buildwithmatija.com/blog/production-ready-multi-tenant-nextjs-payload)

### Shared Resources
- [Multi-Tenant Room Booking Solution](https://flowscapesolutions.com/blog/multi-tenant-room-booking-solution)
- [Preventing Meeting Room Booking Conflicts](https://learn.microsoft.com/en-us/answers/questions/5347512/how-to-prevent-recurring-meeting-room-booking-conf)
- [Room and Equipment Booking Software](https://www.yarooms.com/blog/room-and-equipment-booking-software)

---

*Research completed: 2026-01-22*
*Codebase context: RowOps v1.1, ~80k LOC TypeScript, Next.js 16 + React 19 + Prisma 6*
