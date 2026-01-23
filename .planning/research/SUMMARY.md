# Project Research Summary

**Project:** RowOps v2.0 Commercial Readiness
**Domain:** Multi-tenant SaaS for rowing team operations
**Researched:** 2026-01-22
**Confidence:** HIGH

## Executive Summary

RowOps v2.0 represents a strategic upgrade from single-team operations to commercial-grade multi-facility SaaS. Research reveals this is fundamentally a **structure and polish effort, not new infrastructure**. The validated v1.0/v1.1 stack (Next.js 16, React 19, Prisma 6, Supabase, Tailwind v4, Serwist, Dexie) already provides the foundation. Success depends on careful hierarchical multi-tenancy implementation, mobile-first responsive design, design system adoption, and RBAC hardening.

The recommended approach centers on **backward-compatible expansion**: extend existing JWT claims to support facility/club hierarchy while maintaining team-only installations; adopt shadcn/ui component primitives without replacing the entire UI at once; implement database-level RLS alongside application filtering for defense-in-depth; and enhance existing PWA capabilities with tenant-aware caching and touch-optimized interactions. This incremental strategy minimizes migration risk while enabling facility-level features.

Critical risks cluster around **data migration and tenant isolation**: JWT claims migration breaking existing sessions, service worker cache serving stale tenant data across facility switches, RLS implementation creating connection pooling leaks, and component drift from design system adoption creating duplicates instead of replacements. Mitigation requires expand-migrate-contract patterns for schema evolution, tenant-scoped cache keys, explicit transaction management for RLS, and systematic component migration tracking. The highest-risk integration point is the intersection of facility model and RBAC—tenant scoping must be bulletproof across both facility and club boundaries.

## Key Findings

### Recommended Stack

RowOps v2.0 needs selective library additions rather than framework changes. The existing stack is production-validated and appropriate—don't introduce new infrastructure.

**Core additions:**
- **shadcn/ui (canary with Tailwind v4)**: Copy-paste component primitives built on Radix UI—provides mobile-first accessibility, native Tailwind v4 support, and full code ownership without runtime dependencies
- **@use-gesture/react (10.x+)**: Lightweight touch gestures for mobile lineup editing—15KB, works with mouse and touch, handles swipe-to-dismiss and drag-to-reorder patterns
- **@casl/ability + @casl/react (6.8.0/4.x+)**: Isomorphic RBAC with type-safe permissions—same logic on client (UI hiding) and server (API enforcement), zero vendor lock-in
- **PostgreSQL RLS (native Supabase)**: Database-level multi-tenant isolation—defense-in-depth enforcement, already available via Supabase, no library installation needed

**What NOT to add:**
- Avoid Chakra UI/Mantine/Material Tailwind (heavier runtime, styling conflicts with existing Tailwind v4)
- Skip Framer Motion until UX testing proves need (YAGNI for animation library)
- Don't use closure tables for hierarchy (overkill for shallow Facility→Club→Team structure)
- Reject external auth services (Clerk/Auth.js RBAC insufficient, existing Supabase auth works)

### Expected Features

Research across multi-tenant SaaS, PWA best practices, design systems, and RBAC patterns reveals clear table stakes vs differentiators.

**Must have (table stakes):**
- **Facility Model**: Hierarchical tenancy (facility→club), shared resource management, tenant-scoped data isolation, facility admin role, club isolation by default
- **Mobile PWA**: Touch-friendly targets (≥44px), responsive breakpoints, network-aware UI, conflict resolution for offline sync
- **UI/UX**: Design system with consistent components, empty states with guidance, dark mode support, accessible form validation, loading states (skeletons)
- **Security/RBAC**: Tenant-scoped roles (user = admin in Club A, athlete in Club B), invite flow with role assignment, audit logging, MFA support, permission delegation

**Should have (competitive differentiators):**
- Equipment reservation system (prevent booking conflicts for shared boats)
- Granular sync status ("3 changes pending" with list of queued operations)
- Smart defaults (auto-fill practice duration from team's usual patterns)
- Contextual help (inline tooltips, hints without leaving page)
- Bulk invite (CSV upload with roles for large rosters)

**Defer (v2.0+):**
- Custom roles/hybrid RBAC (20% use case, high complexity)
- SSO/SAML support (enterprise feature, not MVP)
- Cross-club lineup sharing (complex permissions, rare need)
- Temporary role elevation (advanced delegation scenario)

### Architecture Approach

Extend current application-level tenant filtering (JWT claims + manual Prisma `where: { teamId }`) to hierarchical multi-tenancy with database-level RLS enforcement. Migration strategy: expand-migrate-contract pattern to avoid breaking existing installations.

**Major components:**

1. **Hierarchical JWT Claims** — Extend CustomJwtPayload with facility_id, club_id, team_id (nullable for backward compatibility); implement via Supabase Custom Access Token Hook querying TeamMember→Team→Club→Facility on token issuance
2. **Prisma Client Extensions** — Automatic tenant filtering via extended client that injects facility/club/team context into all queries; prevents accidental data leaks through centralized tenant logic
3. **PostgreSQL RLS Policies** — Database-level enforcement using `SET LOCAL` session variables inside explicit transactions; guards against connection pooling leaks where one user's context bleeds into another's
4. **Tenant-Aware PWA Cache** — Service worker cache keys include facility/club IDs; cache cleared on tenant switch; IndexedDB prefixed with tenant identifiers to prevent cross-tenant data exposure
5. **shadcn/ui Component Library** — Copy-paste Radix UI primitives into `/src/components/ui/` with CVA variants for mobile-first responsive design; 44px minimum touch targets, focus-visible keyboard navigation
6. **RBAC Hierarchy** — Five roles (FACILITY_ADMIN→CLUB_ADMIN→COACH→ATHLETE→PARENT) with inheritance; hierarchical permissions where facility admin inherits club admin capabilities, avoiding role explosion

**Integration strategy:**
- Phase 1: Add nullable facility/club schema fields before removing team-only patterns
- Phase 2: Dual-write old and new claim structures during transition period
- Phase 3: Implement RLS alongside existing application filtering for verification
- Phase 4: Systematic component migration with deprecation tracking

### Critical Pitfalls

1. **JWT Claims Migration Without Backward Compatibility** — Adding facility_id/club_id breaks all existing sessions with team_id-only claims; users see empty data or 403 errors after deploy. **Avoid:** Use expand-migrate-contract (dual claims during transition), forced re-login with user messaging, feature flag for gradual rollout, database fallback that works regardless of claim structure.

2. **Service Worker Cache Invalidation Across Tenants** — Cache keyed by URL only; user switching from Facility A to Facility B sees stale cached data creating silent data leak. **Avoid:** Tenant-aware cache keys (`${facilityId}-${clubId}-${url}`), clear cache on tenant switch, Clear-Site-Data header on logout, IndexedDB tenant scoping, cache validation headers with tenant ID verification.

3. **Application-Level to RLS Migration Data Leaks** — Connection pooling reuses connections; `SET LOCAL` becomes `SET` accidentally, persisting tenant context globally; User A's facility_id leaks into User B's pooled connection. **Avoid:** Always use SET LOCAL inside explicit transactions, test with connection pooling enabled, monitor RLS violations (0-row queries), use LEAKPROOF functions for index usage, dual-run period comparing application-level and RLS results.

4. **Component Drift - Duplicates Instead of Replacement** — New shadcn/ui components created but 50 old components stay in use; design inconsistency grows instead of shrinking. **Avoid:** Component inventory audit before starting, deprecation with linting, codemods for automated replacement, migration tracking checklist, aggressive deletion of deprecated components.

5. **RBAC Absolutism - Role Explosion** — Creating role for every job title (FACILITY_ADMIN, CLUB_ADMIN, CLUB_COACH, ASSISTANT_COACH, HEAD_COACH, ATHLETE_CAPTAIN, etc.); 20+ roles become unmanageable. **Avoid:** 80/20 rule (roles cover 80%, permissions cover 20%), design around tasks not titles, role hierarchy with inheritance, audit role usage (<5 checks = removal candidate).

## Implications for Roadmap

Based on research findings, v2.0 should follow a **security-first, incremental expansion** approach. The facility model and RBAC changes are foundational and carry the highest migration risk—these must be stable before UI/UX polish. Mobile PWA improvements and design system adoption can proceed in parallel once security foundation is solid.

### Phase 1: Security Foundation & Auth Hardening
**Rationale:** All subsequent features depend on hierarchical auth working correctly. Security changes are foundational—cannot build facility features without stable JWT claims and RLS patterns.

**Delivers:** Hardened auth layer with hierarchical tenant support, Prisma Client Extensions for automatic filtering, Data Access Layer pattern for Server Actions, migration-ready schema with backward compatibility.

**Addresses:** Tenant-scoped roles (FEATURES), audit logging infrastructure (FEATURES), backward-compatible JWT migration (PITFALLS), TypeScript branded types for facility/club/team IDs (PITFALLS)

**Avoids:** JWT claims migration breaking sessions (PITFALLS #1), client-side only RBAC (PITFALLS #6), data migration without dry-run (PITFALLS #9)

**Stack:** Prisma Client Extensions, Supabase Custom Access Token Hook, Next.js 16 proxy.ts (middleware rename)

### Phase 2: Facility Model Schema & Data Migration
**Rationale:** Database schema is foundation for all facility features. Backward-compatible approach allows existing team-only installations to continue working while enabling facility hierarchy.

**Delivers:** Facility/Club models with adjacency list hierarchy, Equipment ownership types (FACILITY/CLUB/TEAM), nullable foreign keys for graceful migration, data migration scripts with dry-run and rollback.

**Addresses:** Hierarchical tenancy (FEATURES), shared resource management (FEATURES), equipment ownership isolation (ARCHITECTURE)

**Avoids:** Breaking existing installations (PITFALLS #1), foreign key cascade deletion destroying data (PITFALLS #4), shared resource booking conflicts (PITFALLS #3)

**Stack:** Prisma schema evolution, PostgreSQL migrations, equipment booking model

### Phase 3: Facility Auth Integration & RLS
**Rationale:** Auth must understand hierarchy before UI can use it. RLS provides defense-in-depth enforcement at database level.

**Delivers:** Extended JWT claims (facility_id, club_id, team_id), Custom Access Token Hook implementation, RLS policies for Equipment/Practice/Team, CASL ability definitions for hierarchical permissions.

**Addresses:** Facility admin role (FEATURES), permission delegation (FEATURES), tenant-scoped data isolation (FEATURES)

**Avoids:** RLS connection pooling leaks (PITFALLS #2), application-level filtering gaps (ARCHITECTURE)

**Stack:** @casl/ability + @casl/react, Supabase RLS, Supabase Custom Access Token Hook

**Research Flag:** NEEDS DEEPER RESEARCH for Custom Access Token Hook implementation patterns—Supabase Edge Functions have specific memory/timeout constraints that may require batching for large facility hierarchies.

### Phase 4: Mobile PWA Improvements
**Rationale:** Mobile improvements are independent of facility model and can proceed in parallel with Phase 3. Builds on existing Serwist/Dexie foundation (70% complete from v1.0).

**Delivers:** Touch-optimized drag-and-drop with dnd-kit TouchSensor, 44px minimum touch targets, tenant-aware service worker caching, sync queue pattern in Dexie with conflict resolution, responsive breakpoints for mobile-first layout.

**Addresses:** Touch-friendly targets (FEATURES), offline-first data sync (FEATURES), conflict resolution (FEATURES), network-aware UI (FEATURES)

**Avoids:** Service worker tenant cache leaks (PITFALLS #2), iOS PWA limitations breaking functionality (PITFALLS #5), responsive retrofit breaking desktop workflows (PITFALLS #6)

**Stack:** @use-gesture/react, enhanced Serwist configuration, Dexie sync queue

**Research Flag:** STANDARD PATTERNS—PWA offline-first and touch optimization are well-documented (MDN, Serwist docs, dnd-kit docs). Skip phase-specific research.

### Phase 5: Design System Integration
**Rationale:** Design system changes are mostly visual and can proceed in parallel with Phases 3-4. Start small (top 5 components) and expand based on actual usage.

**Delivers:** shadcn/ui infrastructure with Tailwind v4 theme, Button/Dialog/DropdownMenu primitives, component migration tracking, refactored high-traffic components (PracticeEditor, LineupEditor).

**Addresses:** Design system with consistent components (FEATURES), empty states (FEATURES), dark mode support (FEATURES), accessible form validation (FEATURES)

**Avoids:** Component drift with duplicates (PITFALLS #4), building too much too soon (PITFALLS #7), fragmented tooling (PITFALLS #8)

**Stack:** shadcn/ui (canary), CVA for variants, Radix UI primitives

**Research Flag:** STANDARD PATTERNS—shadcn/ui installation and component usage are well-documented. Component inventory and migration planning needed but no technical research gaps.

### Phase 6: Facility UI Features
**Rationale:** UI features require all foundation work complete (schema, auth, design system). This phase delivers user-facing facility management capabilities.

**Delivers:** Facility admin dashboard, club management interface, equipment ownership selector, owner badges in equipment list, multi-team user switcher dropdown.

**Addresses:** Facility management UI (FEATURES), equipment visibility controls (FEATURES), club isolation (FEATURES)

**Avoids:** Building UI before auth/schema ready (dependencies)

**Stack:** Integrates all previous phases—shadcn/ui components, CASL permissions, hierarchical JWT claims

### Phase 7: Integration Testing & Polish
**Rationale:** End-to-end testing ensures all pieces work together correctly. Validates multi-facility scenarios and accessibility standards.

**Delivers:** Multi-facility scenario tests (Chattanooga Rowing example), offline sync queue with conflict testing, role-based access control audit for all roles, WCAG 2.1 AAA accessibility validation, mobile device performance testing.

**Addresses:** Overall system integration and validation

**Avoids:** Shipping before end-to-end validation

### Phase Ordering Rationale

**Critical path:** Phase 1 (Security) → Phase 2 (Schema) → Phase 3 (Auth) → Phase 6 (UI) forms the blocking chain for facility features. Phases 4 (Mobile) and 5 (Design System) can run parallel with Phase 3 since they have no facility model dependency.

**Grouping logic:** Security changes precede all feature work to avoid building on unstable foundation. Schema evolution comes before auth integration because Custom Access Token Hook needs database structure to query. UI features are last because they require stable auth and design system.

**Pitfall mitigation:** Phasing follows expand-migrate-contract pattern—Phase 1 expands auth patterns, Phase 2 adds schema alongside old structure, Phase 3 migrates to new patterns while maintaining backward compatibility. Component migration in Phase 5 uses systematic tracking to avoid drift. Testing in Phase 7 validates all integration points including RLS connection pooling and tenant cache isolation.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (Facility Auth Integration):** Custom Access Token Hook implementation with Supabase Edge Functions—need to research memory/timeout constraints, batching strategies for large hierarchies, error handling patterns for hook failures
- **Phase 6 (Facility UI Features):** Equipment reservation/booking conflict detection—need to research calendar conflict algorithms, timezone handling for multi-facility scenarios, UI patterns for booking management

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Security Foundation):** Prisma Client Extensions and Data Access Layer are well-documented patterns
- **Phase 4 (Mobile PWA):** PWA offline-first, touch gestures, responsive design have extensive MDN/vendor documentation
- **Phase 5 (Design System):** shadcn/ui installation and component adoption are thoroughly documented
- **Phase 7 (Integration Testing):** Standard testing patterns, no novel technical challenges

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Tailwind v4 support verified for shadcn/ui, @use-gesture/react actively maintained (2M+ weekly downloads), CASL latest version 6.8.0 published recently, RLS production-proven via Supabase |
| Features | HIGH | Multi-tenancy patterns from Microsoft/AWS/Google/Oracle (authoritative), RBAC from WorkOS/Permit.io/AWS, PWA from MDN best practices, WCAG 2.5.5 touch targets (official W3C standard) |
| Architecture | HIGH | Prisma Client Extensions officially documented, Supabase Custom Claims/RLS extensively documented, Next.js 16 auth patterns from official guides, hierarchical multi-tenancy patterns from Crunchy Data/ZenStack |
| Pitfalls | HIGH | RLS footguns from ByteBase/Permit.io (production experience), PWA cache invalidation from hasura/iInteractive, component drift from Netguru/HubSpot, RBAC pitfalls from IdenHaus/Microsoft, data migration from Brainhub/Rivery |

**Overall confidence:** HIGH

Research sources are authoritative (official documentation, cloud provider best practices, established SaaS platforms) and findings are corroborated across multiple sources. The four research dimensions (stack, features, architecture, pitfalls) have consistent HIGH confidence because they draw from production-validated patterns rather than experimental approaches.

### Gaps to Address

**Custom Access Token Hook performance:** Supabase Edge Functions have execution limits (10s timeout, 50MB memory). For facilities with 100+ clubs, the hierarchy query in the hook could exceed limits. **Resolution:** Test hook performance during Phase 3 planning with synthetic large datasets; consider caching strategy or denormalized claims table if needed.

**Equipment reservation conflict detection:** Research identified the pattern (booking calendar with conflict checks) but not the specific algorithm for rowing equipment which can have partial availability (8+ boat can row as 4+). **Resolution:** Research during Phase 6 planning—likely needs domain-specific logic for equipment subdivision.

**iOS PWA storage limits:** 50MB storage limit may be insufficient for offline regatta data with large rosters and multi-day schedules. **Resolution:** Monitor storage usage in Phase 4, implement data pruning strategy (keep only current season offline, archive older data to server-only).

**Shadcn/ui long-term stability:** Radix UI team shifted focus to Base UI; shadcn/ui may migrate in future. **Resolution:** Not blocking for v2.0 (shadcn components are copy-pasted, not runtime dependency), but monitor for long-term roadmap beyond v2.0.

## Sources

### Stack Research (HIGH confidence)
- [shadcn/ui Tailwind v4 Documentation](https://ui.shadcn.com/docs/tailwind-v4) — Official Tailwind v4 support verified
- [@use-gesture/react npm](https://www.npmjs.com/package/@use-gesture/react) + [GitHub](https://github.com/pmndrs/use-gesture) — 2M+ weekly downloads, actively maintained
- [@casl/ability npm](https://www.npmjs.com/package/@casl/ability) — Version 6.8.0 latest, 517+ projects
- [Securing Multi-Tenant Applications Using RLS with Prisma ORM](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35)
- [15 Best React UI Libraries for 2026](https://www.builder.io/blog/react-component-libraries-2026)

### Features Research (HIGH confidence)
- [Multi-Tenant Architecture - Microsoft Azure](https://learn.microsoft.com/en-us/azure/architecture/guide/saas-multitenant-solution-architecture/)
- [Best Practices for Enterprise Multi-Tenancy - Google Cloud](https://cloud.google.com/kubernetes-engine/docs/best-practices/enterprise-multitenancy)
- [Best Practices for Multi-Tenant Authorization - Permit.io](https://www.permit.io/blog/best-practices-for-multi-tenant-authorization)
- [Mobile Accessibility WCAG - W3C](https://www.w3.org/TR/mobile-accessibility-mapping/) — Touch target standards
- [PWA 2.0 + Edge Runtime 2026 - Zignuts](https://www.zignuts.com/blog/pwa-2-0-edge-runtime-full-stack-2026)

### Architecture Research (HIGH confidence)
- [Prisma Client Extensions Preview](https://www.prisma.io/blog/client-extensions-preview-8t3w27xkrxxn) — Official documentation
- [Custom Claims & RBAC | Supabase](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Custom Access Token Hook | Supabase](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)
- [Multi-Tenancy with Prisma - ZenStack](https://zenstack.dev/blog/multi-tenant)
- [Designing Postgres Database for Multi-tenancy - Crunchy Data](https://www.crunchydata.com/blog/designing-your-postgres-database-for-multi-tenancy)
- [Next.js 16 Authentication Guide](https://nextjs.org/docs/app/guides/authentication) — Official proxy.ts patterns

### Pitfalls Research (HIGH confidence)
- [Common Postgres RLS Footguns - ByteBase](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- [Why Tenant Context Must Be Scoped Per Transaction](https://dev.to/m_zinger_2fc60eb3f3897908/why-tenant-context-must-be-scoped-per-transaction-3aop)
- [Strategies for Service Worker Caching - Hasura](https://hasura.io/blog/strategies-for-service-worker-caching-d66f3c828433)
- [Design System Adoption Pitfalls - Netguru](https://www.netguru.com/blog/design-system-adoption-pitfalls)
- [6 Common RBAC Implementation Pitfalls - IdenHaus](https://idenhaus.com/rbac-implementation-pitfalls/)
- [Data Migration Challenges & Risks - Brainhub](https://brainhub.eu/library/data-migration-challenges-risks-legacy-modernization)
- [Backward Compatible Database Changes - PlanetScale](https://planetscale.com/blog/backward-compatible-databases-changes)

### Cross-Reference Sources (aggregated)
- Multi-tenant SaaS: Frontegg, Clerk, ClickIT, Oracle Cloud, Microsoft Entra
- PWA offline-first: MobiDev, GTC Systems, eLuminous, Microsoft Dynamics
- UI/UX design systems: Millipixels, Index.dev, Eleken, Candu, Makers Den
- RBAC security: WorkOS, Aserto, EnterpriseReady.io, AWS Prescriptive Guidance, Concentric AI
- Sports team management (domain): CrewTimer, iCrew, CrewLAB, TeamSnap, EZFacility

---
*Research completed: 2026-01-22*
*Ready for roadmap: yes*
