# Roadmap: RowOps

## Milestones

- ✅ **v1.0 MVP** - Phases 1-5 (shipped 2026-01-22)
- ✅ **v1.1 Polish** - Phases 6-9 (shipped 2026-01-22)
- ✅ **v2.0 Commercial Readiness** - Phases 10-17 (shipped 2026-01-26)
- ✅ **v2.1 UX Refinement** - Phases 18-24 (shipped 2026-01-27)
- 🚧 **v2.2 Security Audit** - Phases 25-27 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) - SHIPPED 2026-01-22</summary>

Core practice planning, equipment management, PWA with offline support, and regatta mode.

**Delivered:** 37 plans, 31 requirements, 79,737 LOC

</details>

<details>
<summary>✅ v1.1 Polish (Phases 6-9) - SHIPPED 2026-01-22</summary>

Regatta Central settings UI, equipment usage display, and data export.

**Delivered:** 9 of 11 requirements (2 deferred to v3.0)

</details>

<details>
<summary>✅ v2.0 Commercial Readiness (Phases 10-17) - SHIPPED 2026-01-26</summary>

Facility model, mobile PWA, UI/UX polish, and security/RBAC foundation.

**Delivered:** 34 requirements across 8 phases

**Features:**
- Facility → club hierarchy with shared equipment
- Mobile-first responsive design with offline-first architecture
- shadcn/ui design system with dark mode
- 5-role hierarchy (FACILITY_ADMIN → CLUB_ADMIN → COACH → ATHLETE → PARENT)
- MFA for admin roles, SSO/SAML for enterprise
- API key management for integrations

</details>

<details>
<summary>✅ v2.1 UX Refinement (Phases 18-24) - SHIPPED 2026-01-27</summary>

Navigation redesign, RIM feature parity, practice flow improvements, RC public API integration.

**Delivered:** 30 requirements across 7 phases

**Features:**
- Desktop sidebar with master-detail pattern, mobile bottom navigation
- Announcements with priority levels (info, warning, urgent)
- Public issue reporting via QR codes (no login required)
- Equipment readiness with traffic-light badges
- Practice block-based structure with drag-drop lineups
- Bulk operations for practice creation/deletion
- Regatta Central calendar integration with caching

</details>

### 🚧 v2.2 Security Audit (In Progress)

**Milestone Goal:** Validate security architecture before beta testing through comprehensive audit of authentication, authorization, tenant isolation, secrets management, logging, and rate limiting.

---

#### ✅ Phase 25: API Authentication & JWT Security — COMPLETE

**Goal:** All API routes are secured with verified JWT authentication and proper session management

**Depends on:** Phase 24 (Practice Flow Redesign - completed)

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07

**Delivered:**
- 88 API routes audited (all protected or justified public)
- JWT signature verification via getUser() on every request
- Expired/tampered tokens rejected server-side
- Session persistence via httpOnly cookies + middleware refresh
- Logout functionality with cookie cleanup

**Plans:** 4 plans (3 audit + 1 gap closure)

Plans:
- [x] 25-01-PLAN.md — API route authentication audit (AUTH-01)
- [x] 25-02-PLAN.md — JWT security testing (AUTH-02, AUTH-03, AUTH-04)
- [x] 25-03-PLAN.md — Session management testing (AUTH-05, AUTH-06, AUTH-07)
- [x] 25-04-PLAN.md — Logout implementation (AUTH-06 gap closure)

---

#### Phase 26: RBAC & Tenant Isolation

**Goal:** Role boundaries are enforced and tenant data is isolated at both database and application layers

**Depends on:** Phase 25

**Requirements:** RBAC-01, RBAC-02, RBAC-03, RBAC-04, RBAC-05, RBAC-06, RBAC-07, ISOL-01, ISOL-02, ISOL-03, ISOL-04, ISOL-05, ISOL-06

**Success Criteria** (what must be TRUE):
1. User cannot access data from facilities, clubs, or teams they don't belong to
2. FACILITY_ADMIN without COACH role cannot create practices or lineups
3. ATHLETE cannot modify practice details or equipment assignments
4. PARENT can only view their linked athlete's schedule and assignments
5. RLS policies prevent cross-tenant data access at database level
6. Role changes propagate immediately to all active sessions

**Plans:** 9 plans in 4 waves

Plans:
- [ ] 26-01-PLAN.md — RLS audit: document all tables, policies, and gaps (ISOL-01, ISOL-02)
- [ ] 26-02-PLAN.md — CASL ability unit tests for all 5 roles (RBAC-01, RBAC-02, RBAC-03, RBAC-04)
- [ ] 26-03-PLAN.md — CASL server-side enforcement audit (RBAC-06)
- [ ] 26-04-PLAN.md — pgTAP tests for RLS cross-tenant isolation (ISOL-03)
- [ ] 26-05-PLAN.md — API integration tests for role boundaries (RBAC-03, RBAC-04)
- [ ] 26-06-PLAN.md — JWT claims to RLS function verification (ISOL-04)
- [ ] 26-07-PLAN.md — API response data leak audit (ISOL-06)
- [ ] 26-08-PLAN.md — Role propagation verification (RBAC-07)
- [ ] 26-09-PLAN.md — Final verification and requirement status (all 13 requirements)

**Note:** RBAC-05 (PARENT role) may be DEFERRED - ParentAthleteLink table does not exist. ISOL-05 (Prisma tenant filtering) covered by RBAC-06 audit.

---

#### Phase 27: Secrets, Logging & Rate Limiting

**Goal:** Sensitive credentials are protected, security events are logged immutably, and authentication endpoints resist brute force attacks

**Depends on:** Phase 26

**Requirements:** SECR-01, SECR-02, SECR-03, SECR-04, SECR-05, AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05, RATE-01, RATE-02, RATE-03, RATE-04, RATE-05

**Success Criteria** (what must be TRUE):
1. No secrets are exposed in client-side JavaScript bundle or git history
2. Supabase service role key is not accessible from client code
3. All authentication events (login, logout, failures) are logged with user ID, timestamp, and action details
4. Audit logs are immutable and cannot be modified after creation
5. Login, signup, and password reset endpoints reject excessive requests with rate limit headers

**Plans:** TBD

Plans:
- [ ] 27-01: TBD
- [ ] 27-02: TBD

---

## Progress

**Execution Order:**
Phases execute in numeric order: 25 → 26 → 27

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 25. API Authentication & JWT Security | v2.2 | 4/4 | ✅ Complete | 2026-01-28 |
| 26. RBAC & Tenant Isolation | v2.2 | 0/9 | Not started | - |
| 27. Secrets, Logging & Rate Limiting | v2.2 | 0/TBD | Not started | - |

---

*Last updated: 2026-01-28 (Phase 26 planned)*
