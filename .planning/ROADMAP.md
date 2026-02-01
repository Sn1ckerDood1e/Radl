# Roadmap: Radl

## Milestones

- v1.0 MVP - Phases 1-5 (shipped 2026-01-22)
- v1.1 Polish - Phases 6-9 (shipped 2026-01-22)
- v2.0 Commercial Readiness - Phases 10-17 (shipped 2026-01-26)
- v2.1 UX Refinement - Phases 18-24 (shipped 2026-01-27)
- v2.2 Security Audit - Phases 25-27 (shipped 2026-01-29)
- v2.3 Core Flow Testing - Phases 28-31 (shipped 2026-01-29)
- v3.0 Production Polish - Phases 32-35 (shipped 2026-01-30)
- v3.1 Admin Panel - Phases 36-40 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-5) - SHIPPED 2026-01-22</summary>

Core practice planning, equipment management, PWA with offline support, and regatta mode.

**Delivered:** 37 plans, 31 requirements, 79,737 LOC

</details>

<details>
<summary>v1.1 Polish (Phases 6-9) - SHIPPED 2026-01-22</summary>

Regatta Central settings UI, equipment usage display, and data export.

**Delivered:** 9 of 11 requirements (2 deferred to v3.0)

</details>

<details>
<summary>v2.0 Commercial Readiness (Phases 10-17) - SHIPPED 2026-01-26</summary>

Facility model, mobile PWA, UI/UX polish, and security/RBAC foundation.

**Delivered:** 34 requirements across 8 phases

**Features:**
- Facility -> club hierarchy with shared equipment
- Mobile-first responsive design with offline-first architecture
- shadcn/ui design system with dark mode
- 5-role hierarchy (FACILITY_ADMIN -> CLUB_ADMIN -> COACH -> ATHLETE -> PARENT)
- MFA for admin roles, SSO/SAML for enterprise
- API key management for integrations

</details>

<details>
<summary>v2.1 UX Refinement (Phases 18-24) - SHIPPED 2026-01-27</summary>

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

<details>
<summary>v2.2 Security Audit (Phases 25-27) - SHIPPED 2026-01-29</summary>

**Milestone Goal:** Validate security architecture before beta testing through comprehensive audit of authentication, authorization, tenant isolation, secrets management, logging, and rate limiting.

**Results:** 31 PASS, 2 CONDITIONAL PASS, 2 DEFERRED, 0 FAIL

**Delivered:**
- 88 API routes audited (all protected or justified public)
- 163 security tests (109 CASL, 17 API, 17 role propagation, 20 pgTAP)
- Bundle secrets scanner + GitHub Actions CI/CD
- Immutable audit logging with 8 auth event types
- Auth rate limiting (5/15min login, 3/hr signup)

</details>

<details>
<summary>v2.3 Core Flow Testing (Phases 28-31) - SHIPPED 2026-01-29</summary>

**Milestone Goal:** Verify all major user journeys work end-to-end, fix bugs discovered, and polish UX before beta release.

**Delivered:** 20 requirements across 4 phases, 10 plans

**Bug Fixes:**
- Signup redirect parameter handling
- Team creation ClubMembership record
- Invitation toast text accuracy
- Equipment empty state for new teams

**UX Polish:**
- Form validation standardized (onTouched mode)
- Actionable error messages with examples
- 44px mobile touch targets verified
- Settings page cleanup (removed non-functional Team Colors)

**Verified Flows:**
- Onboarding: signup -> email verify -> create team -> invite -> join
- Practice: create -> add blocks -> drag-drop lineup -> publish
- Equipment: add -> assign to lineup -> QR damage report -> resolve

</details>

<details>
<summary>v3.0 Production Polish (Phases 32-35) - SHIPPED 2026-01-30</summary>

**Milestone Goal:** Production-ready polish before user launch with branding, UX improvements, device-specific fixes, and legal compliance.

**Delivered:** 29 requirements across 4 phases

**Features:**
- Safe area handling for notched devices (iPhone home indicator)
- Radl branding (teal color palette, icons, PWA manifest)
- Legal pages (Terms of Service, Privacy Policy)
- UX polish (loading skeletons, error states, empty states)
- Mobile-optimized calendar and drag-drop

</details>

---

## v3.1 Admin Panel (Phases 36-40)

**Milestone Goal:** Platform owner can manage all users, clubs, and memberships through a super-admin panel

**Requirements:** 34 total across 6 categories

---

### Phase 36: Admin Foundation & Authentication

**Goal:** Super admin can securely access a protected admin panel with database-verified permissions

**Dependencies:** None (foundational)

**Plans:** 5 plans

Plans:
- [x] 36-01-PLAN.md — Database foundation (SuperAdmin model, migration, seed script)
- [x] 36-02-PLAN.md — Auth & CASL (admin-authorize.ts, ability.ts extension, audit logger extension)
- [x] 36-03-PLAN.md — MFA setup (enrollment and verification pages)
- [x] 36-04-PLAN.md — Admin route group (layout, dashboard, sidebar, header)
- [x] 36-05-PLAN.md — Session timeout and verification checkpoint

**Requirements:**
- AUTH-01: Super admin role stored in database table (not JWT claims only)
- AUTH-02: Super admin login verified against database on every request
- AUTH-03: Admin session timeout at 30 minutes of inactivity
- AUTH-04: Super admin check in CASL abilities (`can('manage', 'all')`)
- AUTH-05: Separate `(admin)` route group with protected layout
- AUTH-06: MFA enforcement for super admin accounts
- AUDT-01: Log all admin actions (actor, action, target, timestamp, before/after)

**Success Criteria:**
1. Super admin can navigate to /admin and see admin dashboard after login
2. Non-admin user attempting /admin is redirected to home (not shown admin UI)
3. Super admin session expires after 30 minutes of inactivity requiring re-login
4. Super admin without MFA enabled is prompted to configure MFA before accessing panel
5. Every admin action (create, update, delete) creates an audit log entry with before/after state

---

### Phase 37: User Management

**Goal:** Super admin can fully manage platform users including creation, editing, deactivation, and bulk operations

**Dependencies:** Phase 36 (admin auth required)

**Plans:** 5 plans

Plans:
- [x] 37-01-PLAN.md — Core user APIs (list, search, view, edit)
- [x] 37-02-PLAN.md — User operations APIs (create, deactivate, reactivate, password reset)
- [x] 37-03-PLAN.md — User list page with table, search, pagination
- [x] 37-04-PLAN.md — User detail and create pages
- [x] 37-05-PLAN.md — Bulk user creation via CSV upload

**Requirements:**
- USER-01: List all users with pagination (25 per page)
- USER-02: Search users by email, name, facility, club
- USER-03: Create user bypassing signup (admin sets email, generates password link)
- USER-04: View user details (profile, memberships, created date, last login)
- USER-05: Edit user profile (name, email, phone)
- USER-06: Deactivate user (soft disable, blocks login, preserves data)
- USER-07: Reactivate deactivated user
- USER-08: Reset user password (generate recovery link via Supabase Admin API)
- USER-09: Bulk user creation via CSV upload (email, name, optional role)

**Success Criteria:**
1. Super admin can browse paginated user list and search by email/name/facility/club
2. Super admin can create a new user who receives password setup email without self-signup
3. Super admin can view user profile showing all memberships across facilities/clubs
4. Super admin can deactivate user who then cannot log in, and reactivate to restore access
5. Super admin can upload CSV to create multiple users in one operation with progress feedback

---

### Phase 38: Facility & Club Management

**Goal:** Super admin can manage all facilities and clubs with full CRUD operations and cross-facility actions

**Dependencies:** Phase 36 (admin auth required)

**Plans:** 6 plans

Plans:
- [x] 38-01-PLAN.md — Facility APIs (list, create, detail, update, delete)
- [x] 38-02-PLAN.md — Club APIs (list, create, detail, update, delete, move)
- [x] 38-03-PLAN.md — Facility list and detail pages
- [x] 38-04-PLAN.md — Facility forms and type-to-confirm delete dialog
- [x] 38-05-PLAN.md — Club list and detail pages
- [x] 38-06-PLAN.md — Club forms and move dialog

**Requirements:**
- FCLT-01: List all facilities with club counts and member counts
- FCLT-02: Create facility (name, slug, location, contact info)
- FCLT-03: Edit facility details
- FCLT-04: View facility details with clubs and aggregate stats
- FCLT-05: Delete facility (soft delete with confirmation, cascade check)
- CLUB-01: List all clubs with member counts (global and by facility)
- CLUB-02: Create club (name, facility assignment, colors)
- CLUB-03: Edit club details
- CLUB-04: View club details with members and settings
- CLUB-05: Delete club (soft delete with confirmation, cascade check)
- CLUB-06: Move club between facilities

**Success Criteria:**
1. Super admin can browse all facilities with summary stats (club count, member count)
2. Super admin can create, edit, and soft-delete facilities with cascade warnings
3. Super admin can browse all clubs globally or filtered by facility
4. Super admin can create, edit, and soft-delete clubs with membership impact warnings
5. Super admin can move a club from one facility to another preserving all club data

---

### Phase 39: Membership Management

**Goal:** Super admin can directly manage user-club relationships bypassing invitation flows

**Dependencies:** Phase 37 (user management), Phase 38 (club management)

**Plans:** 4 plans

Plans:
- [ ] 39-01-PLAN.md — Membership CRUD APIs (create, update roles, delete, list club members)
- [ ] 39-02-PLAN.md — User detail membership UI (add to club, edit roles, remove)
- [ ] 39-03-PLAN.md — Club members section (member list with add/edit/remove)
- [ ] 39-04-PLAN.md — Bulk membership import via CSV

**Requirements:**
- MEMB-01: Add user to club with role(s) (bypasses invitation flow)
- MEMB-02: Remove user from club
- MEMB-03: Change user roles within club
- MEMB-04: View all memberships for a user (cross-org visibility)
- MEMB-05: Bulk add users to club via CSV (email + role)

**Success Criteria:**
1. Super admin can add any user to any club with specified role(s) immediately (no invitation)
2. Super admin can remove user from club, ending their access instantly
3. Super admin can change user's role within a club (e.g., ATHLETE to COACH)
4. Super admin viewing user detail sees all their memberships across all facilities/clubs
5. Super admin can upload CSV to add multiple users to a club in one operation

---

### Phase 40: Audit Log Viewer & Export

**Goal:** Super admin can review and export audit history for compliance and debugging

**Dependencies:** Phase 36 (audit logging infrastructure)

**Requirements:**
- AUDT-02: Audit log viewer in admin panel (filterable by action, actor, date)
- AUDT-03: Audit log export (CSV download with date range filter)

**Success Criteria:**
1. Super admin can browse audit log with filters for action type, actor, and date range
2. Super admin can see before/after state diff for any logged action
3. Super admin can export filtered audit log as CSV for external analysis or compliance

---

## Progress

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 36 | Admin Foundation & Auth | 7 | Complete |
| 37 | User Management | 9 | Complete |
| 38 | Facility & Club Management | 11 | Complete |
| 39 | Membership Management | 5 | Complete |
| 40 | Audit Log Viewer & Export | 2 | Pending |

**Total:** 34 requirements, 5 phases (32/34 complete)

---

*Last updated: 2026-01-31 (Phase 39 complete)*
