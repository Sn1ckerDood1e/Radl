# Roadmap: Radl

## Milestones

- v1.0 MVP - Phases 1-5 (shipped 2026-01-22)
- v1.1 Polish - Phases 6-9 (shipped 2026-01-22)
- v2.0 Commercial Readiness - Phases 10-17 (shipped 2026-01-26)
- v2.1 UX Refinement - Phases 18-24 (shipped 2026-01-27)
- v2.2 Security Audit - Phases 25-27 (verified 2026-01-29)
- **v2.3 Core Flow Testing** - Phases 28-31 (in progress)

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
<summary>v2.2 Security Audit (Phases 25-27) - VERIFIED 2026-01-29</summary>

**Milestone Goal:** Validate security architecture before beta testing through comprehensive audit of authentication, authorization, tenant isolation, secrets management, logging, and rate limiting.

**Results:** 31 PASS, 2 CONDITIONAL PASS, 2 DEFERRED, 0 FAIL

**Delivered:**
- 88 API routes audited (all protected or justified public)
- 163 security tests (109 CASL, 17 API, 17 role propagation, 20 pgTAP)
- Bundle secrets scanner + GitHub Actions CI/CD
- Immutable audit logging with 8 auth event types
- Auth rate limiting (5/15min login, 3/hr signup)

</details>

---

### v2.3 Core Flow Testing

**Milestone Goal:** Verify all major user journeys work end-to-end, fix bugs discovered, and polish UX before beta release.

**Status:** In Progress

---

#### Phase 28: Onboarding Flow Testing

**Goal:** New users can successfully sign up, create a team, invite members, and those members can join

**Depends on:** Phase 27 (Security Audit complete)

**Requirements:** ONBD-01, ONBD-02, ONBD-03, ONBD-04, ONBD-05, ONBD-06

**Success Criteria:**
1. User can complete full signup flow from landing page to verified account
2. Verified user can create a new team and land on team dashboard
3. Coach can send email invitation and invitee receives actionable email
4. Invitee can click link, complete signup (if new), and appear on team roster

**Plans:** 5 plans in 2 waves

Plans:
- [ ] 28-01-PLAN.md - Fix signup redirect parameter handling
- [ ] 28-02-PLAN.md - Fix team creation ClubMembership
- [ ] 28-03-PLAN.md - Update invitation toast + copy-to-clipboard
- [ ] 28-04-PLAN.md - Add equipment empty state
- [ ] 28-05-PLAN.md - E2E verification of onboarding flow

---

#### Phase 29: Practice Flow Testing

**Goal:** Coaches can create complete practices with lineups and athletes see their assignments

**Depends on:** Phase 28 (need team with athletes to test)

**Requirements:** PRAC-01, PRAC-02, PRAC-03, PRAC-04, PRAC-05

**Success Criteria:**
1. Coach can create practice with all required fields and see it on calendar
2. Coach can add multiple block types to a practice and they render correctly
3. Coach can drag athletes into lineup seats and assignments persist after save
4. Athletes see their boat assignment when practice is published

**Plans:** 1 plan in 1 wave

Plans:
- [ ] 29-01-PLAN.md - E2E verification of practice flow

---

#### Phase 30: Equipment Flow Testing

**Goal:** Equipment can be managed through its full lifecycle from creation to damage resolution

**Depends on:** Phase 29 (equipment used in lineups)

**Requirements:** EQUP-01, EQUP-02, EQUP-03, EQUP-04

**Success Criteria:**
1. Admin can add equipment with name, type, status and it appears in equipment list
2. Equipment shows usage history when assigned to practice lineups
3. Anonymous user can scan QR code and submit damage report without login
4. Coach can view damage report details and mark issue as resolved

**Plans:** TBD

---

#### Phase 31: UX Quality Polish

**Goal:** Application provides clear feedback, guides users appropriately, and is accessible on mobile

**Depends on:** Phase 30 (test UX across all flows)

**Requirements:** UXQL-01, UXQL-02, UXQL-03, UXQL-04, UXQL-05

**Success Criteria:**
1. Error messages tell users what went wrong and how to fix it
2. Empty states on all major pages include clear call-to-action for next step
3. All interactive elements on mobile are tappable without accidental mis-taps
4. Form validation errors appear inline before submission attempt

**Plans:** TBD

---

## Progress

**Execution Order:**
Phases execute in numeric order: 28 -> 29 -> 30 -> 31

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 28. Onboarding Flow Testing | v2.3 | 5/5 | ✅ Complete | 2026-01-29 |
| 29. Practice Flow Testing | v2.3 | 0/1 | Ready | - |
| 30. Equipment Flow Testing | v2.3 | 0/? | Pending | - |
| 31. UX Quality Polish | v2.3 | 0/? | Pending | - |

---

## Coverage Validation

**v2.3 Requirements:** 20 total

| Category | Requirements | Phase |
|----------|--------------|-------|
| Onboarding | ONBD-01, ONBD-02, ONBD-03, ONBD-04, ONBD-05, ONBD-06 | Phase 28 |
| Practice | PRAC-01, PRAC-02, PRAC-03, PRAC-04, PRAC-05 | Phase 29 |
| Equipment | EQUP-01, EQUP-02, EQUP-03, EQUP-04 | Phase 30 |
| UX Quality | UXQL-01, UXQL-02, UXQL-03, UXQL-04, UXQL-05 | Phase 31 |

**Mapped:** 20/20 (100%)
**Orphaned:** 0

---

*Last updated: 2026-01-29 (Phase 29 plan created)*
