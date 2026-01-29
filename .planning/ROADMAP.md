# Roadmap: Radl

## Milestones

- v1.0 MVP - Phases 1-5 (shipped 2026-01-22)
- v1.1 Polish - Phases 6-9 (shipped 2026-01-22)
- v2.0 Commercial Readiness - Phases 10-17 (shipped 2026-01-26)
- v2.1 UX Refinement - Phases 18-24 (shipped 2026-01-27)
- v2.2 Security Audit - Phases 25-27 (shipped 2026-01-29)
- v2.3 Core Flow Testing - Phases 28-31 (shipped 2026-01-29)

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
- Onboarding: signup → email verify → create team → invite → join
- Practice: create → add blocks → drag-drop lineup → publish
- Equipment: add → assign to lineup → QR damage report → resolve

</details>

---

## Next Milestone

_No milestone in progress. Use `/gsd:new-milestone` to start the next version._

---

*Last updated: 2026-01-29 (v2.3 Core Flow Testing shipped)*
