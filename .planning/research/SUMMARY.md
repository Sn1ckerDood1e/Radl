# Project Research Summary

**Project:** RowOps - Rowing Team Operations SaaS
**Domain:** Multi-tenant PWA with offline-first capabilities, push notifications, and external API integration
**Researched:** 2026-01-20
**Confidence:** MEDIUM-HIGH

## Executive Summary

RowOps is building scheduling, lineup management, and regatta-mode features on top of an existing Next.js 16 + Prisma 6 + Supabase foundation. Research confirms this is a **well-trodden domain** with established patterns from competitors (iCrew, CrewLAB, Ludum) but the **offline-first PWA requirement for race-day operations** is the key differentiator that adds complexity. The recommended approach: use Serwist for service workers, Dexie.js for IndexedDB, and web-push for notifications, while leveraging existing Supabase Realtime rather than adding new infrastructure.

The critical insight is that RowOps must operate in **two distinct modes**: normal connected operations (server-authoritative) and regatta mode (local-authoritative with eventual sync). This dual-mode architecture requires careful design of the offline sync strategy before implementation, not after. The existing tech debt (no test coverage, JWT claims gaps) creates compounding risk and must be addressed in Phase 1 before adding complexity.

Key risks center on multi-tenant security (tenant data leakage via missing filters, JWT claims vulnerabilities) and offline sync reliability (data loss on conflict, iOS push notification failures). Mitigation requires: (1) database-level RLS as defense-in-depth, (2) integration tests for tenant isolation, (3) hybrid sync strategy with manual conflict resolution for critical data, and (4) SMS/email fallback for race-day notifications.

## Key Findings

### Recommended Stack

The research confirms an extension of the existing stack rather than replacement. Serwist (successor to abandoned next-pwa) is the official Next.js recommendation for PWA capabilities. Dexie.js provides superior IndexedDB ergonomics over lighter alternatives like idb, which matters when querying lineups and schedules offline. Web-push provides vendor-independent push notifications that integrate cleanly with Supabase triggers.

**Core technologies:**
- **@serwist/next + serwist** (v9.5.0): Service worker for PWA — Workbox-based, officially recommended, replaces abandoned next-pwa
- **Dexie.js** (v4.2.1): IndexedDB wrapper — Fluent API, schema migrations, essential for complex offline queries
- **web-push** (v3.6.7): Push notifications — Standard library, zero vendor lock-in, integrates with Supabase
- **Supabase Broadcast**: Real-time updates — Already available, more scalable than Postgres Changes
- **react-oauth2-code-pkce** (v1.23.4): RegattaCentral OAuth — PKCE security, may need server-side fallback

**What NOT to use:** next-pwa (abandoned), @ducanh2912/next-pwa (deprecated), localforage (legacy), Socket.io/Pusher (redundant with Supabase), OneSignal/Firebase (vendor lock-in).

### Expected Features

Research identified clear separation between table stakes (must ship) and differentiators (competitive advantage).

**Must have (table stakes):**
- Practice calendar with time blocks (water/land/erg) — coaches cannot use app without this
- Athlete availability/RSVP — prerequisite for lineup assignment
- Lineup builder with seat assignment and templates — core coach workflow
- Boat compatibility validation — prevent assigning damaged/incompatible equipment
- Push notifications for practice reminders, lineup assignments, schedule changes
- Regatta calendar with race schedule view
- Role-based views (coach planning / athlete personal / parent read-only)

**Should have (competitive differentiators):**
- **RegattaCentral API integration** — auto-import race schedules, major time saver
- **Regatta mode UX** — dedicated race-day operational state, no competitor has this explicitly
- **Offline-first race day** — cached schedules work without signal at remote venues
- **Race-specific notifications with configurable timing** — "Report to dock in 45 min"
- **Drag-drop lineup builder** — superior UX over form-based competitors

**Defer (v2+):**
- Erg test integration (Concept2 API) — RowHero already exists, complex integration
- Seat racing algorithm — start with data capture, add suggestions later based on patterns
- Weather integration — link to external resources, don't build
- Video analysis — existing tools (Coach's Eye) are better
- Messaging platform — teams use GroupMe/Slack, won't switch

### Architecture Approach

The architecture requires a hybrid pattern: server-first CRUD for connected operations with an overlay of offline-first local storage for regatta scenarios. The key abstraction is a **Repository layer** that reads from IndexedDB first, queues writes for background sync, and handles conflict resolution. Regatta mode operates as a **state machine** (syncing -> active -> reconciling -> complete) with distinct data handling rules per state.

**Major components:**
1. **Prisma Schema + RLS Policies** — Multi-tenant foundation with database-level isolation
2. **Repository Pattern** — Abstraction over IndexedDB + API, handles cache-first reads
3. **Practice Scheduler** — Practice sessions with typed time blocks (water/land/erg)
4. **Lineup Manager** — Seats-first model (define crew, then assign boat)
5. **Service Worker (Serwist)** — Cache shell, offline requests, background sync queue
6. **Sync Queue + Conflict Resolver** — Queue mutations offline, last-write-wins with manual override for critical data
7. **Regatta State Machine** — Manages dual-mode transitions and sync lifecycle

### Critical Pitfalls

Research identified 13 pitfalls across phases. The top 5 that require upfront design decisions:

1. **Multi-tenant data leakage (#1)** — A single missing `WHERE tenant_id = ?` exposes Team A's data to Team B. Enforce tenant context at middleware + use RLS as defense-in-depth + write tenant isolation integration tests.

2. **JWT claims gaps (#2)** — Existing vulnerability in RowOps. Attacker modifies JWT payload to spoof tenant. Fix immediately: always use `verify()` not `decode()`, include tenant_id in claims, validate user belongs to tenant.

3. **Offline sync data loss (#4)** — Coach A edits lineup offline, Coach B edits online, sync loses one version silently. Design sync strategy upfront: queue writes in IndexedDB, implement version tracking, surface conflicts to user for critical lineup data.

4. **iOS push notification failures (#5)** — WebPush endpoints expire after 1-2 weeks on iOS, Safari requires home screen install. Never rely solely on PWA push for race-day alerts — implement SMS/email fallback for critical notifications.

5. **Service worker cache staleness (#6)** — Users stuck on old versions after deploys. Implement versioned caches, update prompts, and `skipWaiting()` for non-breaking changes from day one.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Security Remediation & Foundation
**Rationale:** Existing JWT claims gaps and no test coverage create compounding risk. Must fix before adding features that handle sensitive data.
**Delivers:** Secure multi-tenant foundation, baseline integration tests, JWT validation fixes
**Addresses:** Season model, tenant context provider, eligibility scoping
**Avoids:** Pitfalls #1 (tenant leakage), #2 (JWT spoofing)
**Stack:** Prisma schema updates, Supabase RLS policies

### Phase 2: Practice Scheduling
**Rationale:** Core daily operations — coaches need to plan before assigning lineups. Lower complexity than lineups, establishes data model patterns.
**Delivers:** Practice calendar, time blocks (water/land/erg), template practices, availability/RSVP, attendance tracking
**Uses:** Prisma, standard CRUD patterns (server-first, no offline yet)
**Implements:** Practice Scheduler component, TimeBlock types
**Avoids:** Pitfall #8 (timezone chaos) — get timezone handling right in data model now

### Phase 3: Lineup Management
**Rationale:** Depends on practice scheduling. Core coach workflow, prepares for regatta features.
**Delivers:** Lineup builder, seat assignment, boat compatibility check, lineup templates, export/share
**Uses:** Prisma, existing Supabase Realtime for concurrent edit awareness
**Implements:** Lineup Manager, Boat Matcher, Assignment validation
**Avoids:** Pitfall #3 (race conditions) — design database constraints and optimistic locking upfront

### Phase 4: PWA Offline Infrastructure
**Rationale:** Must establish offline patterns before regatta mode. Service worker and IndexedDB foundations needed.
**Delivers:** Service worker setup, IndexedDB schema, Repository pattern, cache strategies, sync queue foundation
**Uses:** Serwist, Dexie.js
**Implements:** Service Worker, Sync Queue, offline Repository layer
**Avoids:** Pitfalls #4 (sync conflicts), #6 (cache staleness), #9 (storage quota)

### Phase 5: Push Notifications
**Rationale:** Can build in parallel with offline after foundation is ready. Needed before regatta mode for race-day alerts.
**Delivers:** Push subscription management, practice reminders, lineup notifications, schedule change alerts, SMS/email fallback
**Uses:** web-push, Supabase Edge Functions for triggers
**Implements:** Push Manager component
**Avoids:** Pitfalls #5 (iOS failures), #13 (notification spam)

### Phase 6: Regatta Mode & RC Integration
**Rationale:** Highest complexity, requires all prior phases. Offline infrastructure and notifications must exist first.
**Delivers:** Regatta mode state machine, RegattaCentral OAuth integration, race schedule sync, race-specific notifications, meeting location per race, offline race-day operations
**Uses:** react-oauth2-code-pkce (or server-side OAuth), existing offline infrastructure
**Implements:** Regatta State Machine, RegattaCentral sync, Conflict Resolver for regatta data
**Avoids:** Pitfall #7 (OAuth token expiration) — proactive refresh, token health monitoring

### Phase Ordering Rationale

- **Security first (Phase 1)**: Existing JWT gaps are active vulnerabilities. Cannot add features that handle lineup/attendance data without fixing.
- **Scheduling before Lineups (2 before 3)**: Lineups are assigned to practice sessions. Data model dependency.
- **Offline before Regatta (4 before 6)**: Regatta mode is the primary use case for offline. Building regatta features without offline infrastructure would require rework.
- **Notifications in parallel (5)**: Can develop alongside Phase 4 after Phase 3. Independent path.
- **Regatta last (Phase 6)**: Highest complexity, most dependencies. External API integration adds risk. Needs all prior capabilities.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 6 (Regatta Integration):** RegattaCentral API v4 documentation is limited. PKCE support unverified. May need direct contact with RC ([email protected]). OAuth flow may require pure server-side implementation due to CORS restrictions.
- **Phase 4 (Offline Infrastructure):** Background Sync API only 80% browser coverage (no Safari/Firefox). Hybrid approach needed. Conflict resolution strategy needs detailed design per entity type.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Practice Scheduling):** Standard calendar/scheduling patterns. Well-documented.
- **Phase 3 (Lineup Management):** Standard CRUD with constraints. Drag-drop libraries well-established.
- **Phase 5 (Push Notifications):** web-push is mature. Pattern is straightforward. Main decision is fallback strategy.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Serwist is official recommendation, Dexie/web-push are mature libraries with verified versions |
| Features | HIGH | Multiple competitor analyses, clear table stakes vs differentiators identified |
| Architecture | MEDIUM | Patterns synthesized from PWA best practices and rowing domain, dual-mode design is novel |
| Pitfalls | MEDIUM-HIGH | Strong sources for multi-tenant/JWT/PWA issues, rowing-specific pitfalls less documented |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **RegattaCentral OAuth specifics**: PKCE support unverified. May need server-side only OAuth. Test early in Phase 6.
- **Background Sync Safari/Firefox fallback**: Need to design and test hybrid approach (manual sync triggers) for non-Chromium browsers.
- **Conflict resolution per entity**: Research provides general patterns, but exact rules (which entities get last-write-wins vs. manual resolution) need domain validation with coaches.
- **Storage budget for offline**: 50MB iOS limit is hard constraint. Need to define exactly what data gets cached (current season only? last N days?).

## Sources

### Primary (HIGH confidence)
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — official Serwist recommendation
- [Serwist Documentation](https://serwist.pages.dev/docs/next/getting-started) — service worker configuration
- [Supabase Realtime](https://supabase.com/docs/guides/realtime) — Broadcast vs Postgres Changes scaling
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — tenant isolation patterns
- [MDN Storage Quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — iOS limits
- [RegattaCentral API v4](https://api.regattacentral.com/v4/apiV4.jsp) — OAuth2, endpoints

### Secondary (MEDIUM confidence)
- [iCrew](https://www.icrew.club/), [CrewLAB](https://crewlab.io/), [Ludum](https://ludum.com/) — competitor feature analysis
- [JWT Vulnerabilities Best Practices](https://www.vaadata.com/blog/jwt-json-web-token-vulnerabilities-common-attacks-and-security-best-practices/) — security patterns
- [Offline-First PWA IndexedDB](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) — offline patterns
- [Multi-Tenant RLS Patterns](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/) — Prisma + Supabase

### Tertiary (LOW confidence)
- [Data Science of Rowing Crew Selection](https://medium.com/@harry.powell72/the-data-science-of-rowing-crew-selection-16e5692cca79) — lineup algorithm caution
- [British Rowing Seat Racing](https://plus.britishrowing.org/2024/01/02/seat-racing/) — domain patterns

---
*Research completed: 2026-01-20*
*Ready for roadmap: yes*
