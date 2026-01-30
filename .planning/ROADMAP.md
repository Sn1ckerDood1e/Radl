# Roadmap: Radl

## Milestones

- v1.0 MVP - Phases 1-5 (shipped 2026-01-22)
- v1.1 Polish - Phases 6-9 (shipped 2026-01-22)
- v2.0 Commercial Readiness - Phases 10-17 (shipped 2026-01-26)
- v2.1 UX Refinement - Phases 18-24 (shipped 2026-01-27)
- v2.2 Security Audit - Phases 25-27 (shipped 2026-01-29)
- v2.3 Core Flow Testing - Phases 28-31 (shipped 2026-01-29)
- v3.0 Production Polish - Phases 32-35 (in progress)

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

## v3.0 Production Polish (Phases 32-35)

**Milestone Goal:** Production-ready polish before user launch with branding, UX improvements, device-specific fixes, and legal compliance.

**Requirements:** 29 total across 8 categories

---

### Phase 32: Safe Areas & Branding Foundation

**Goal:** App displays correctly on all devices with consistent Radl branding

**Dependencies:** None (foundational)

**Plans:** 4 plans

Plans:
- [ ] 32-01-PLAN.md — Safe area configuration (viewport-fit, bottom nav padding)
- [ ] 32-02-PLAN.md — Color migration (emerald -> teal)
- [ ] 32-03-PLAN.md — PWA manifest and icons
- [ ] 32-04-PLAN.md — Header branding and crest placeholder

**Requirements:**
- SAFE-01: Viewport uses viewport-fit=cover for edge-to-edge
- SAFE-02: Content respects safe-area-inset-* for notched devices
- SAFE-03: Bottom navigation accounts for home indicator
- BRND-01: App renamed from "Strokeline" to "Radl" throughout all UI text
- BRND-02: Color palette updated to brand teal (#0d9488) as primary color
- BRND-03: App icons and favicons updated with brand assets
- BRND-04: PWA manifest updated with correct name, colors, and icons
- BRND-05: Crest/logo integrated in header when asset is available

**Success Criteria:**
1. User on iPhone 15 Pro sees full content without notch overlap in any orientation
2. User on any device sees "Radl" branding (never "Strokeline") in header and page titles
3. User installing PWA sees Radl icon on home screen with brand teal theme color
4. User with bottom navigation sees content above the home indicator bar
5. User opening app sees brand teal (#0d9488) as the consistent primary accent color

---

### Phase 33: Legal Pages

**Goal:** App meets legal compliance requirements with accessible Terms and Privacy pages

**Dependencies:** None (can run parallel with Phase 32)

**Plans:** 2 plans

Plans:
- [ ] 33-01-PLAN.md — Terms of Service and Privacy Policy pages
- [ ] 33-02-PLAN.md — Footer component with legal links

**Requirements:**
- LEGL-01: Terms of Service page with current date and company info
- LEGL-02: Privacy Policy page with data collection and usage details
- LEGL-03: Footer links to Terms and Privacy on all pages
- LEGL-04: Legal pages accessible without authentication

**Success Criteria:**
1. User can access /terms and /privacy without logging in
2. User sees Terms of Service with effective date and company contact information
3. User sees Privacy Policy explaining what data is collected and how it is used
4. User can navigate to legal pages from footer on any authenticated page

---

### Phase 34: UX Polish - Loading, Errors, Empty States

**Goal:** App provides clear, consistent feedback during all loading, error, and empty conditions

**Dependencies:** Phase 32 (safe areas affect layouts)

**Plans:** 4 plans

Plans:
- [ ] 34-01-PLAN.md — Core UX components (DelayedSpinner, ProgressIndicator, EmptyState variants)
- [ ] 34-02-PLAN.md — Detail page loading states (roster/equipment/practices [id])
- [ ] 34-03-PLAN.md — Error handling standardization (Button loading, ERRR verification)
- [ ] 34-04-PLAN.md — Empty state polish (audit and contextual messaging)

**Requirements:**
- LOAD-01: Skeleton loading states on all list views (roster, equipment, practices)
- LOAD-02: Skeleton loading states on detail pages during data fetch
- LOAD-03: 300ms delay before showing spinners (prevent flash)
- LOAD-04: Progress indicators for operations longer than 10 seconds
- ERRR-01: Error messages formatted consistently with icon and clear action
- ERRR-02: Form validation errors shown inline on blur (not submit)
- ERRR-03: Network error states with retry action
- ERRR-04: Optimistic UI updates with rollback on failure
- EMPT-01: Empty state variants implemented (informational, celebration, error)
- EMPT-02: All major list views have contextual empty states
- EMPT-03: Empty states include clear call-to-action for next step

**Success Criteria:**
1. User navigating to roster/equipment/practices sees skeleton placeholders (not blank or spinner) during load
2. User with slow network does not see spinner flash for fast operations (300ms+ only)
3. User encountering network error sees message with "Retry" button that re-attempts the request
4. User with empty roster/equipment/practices sees helpful message explaining what to do next
5. User filling form sees validation error appear when leaving invalid field (not after submit)

---

### Phase 35: Device-Specific Polish - Calendar & Drag-Drop

**Goal:** Calendar and drag-drop interactions work optimally on mobile touch devices

**Dependencies:** Phase 32 (safe areas), Phase 34 (loading states)

**Requirements:**
- CALM-01: Calendar opens in bottom sheet (Drawer) on mobile viewports
- CALM-02: Date picker optimized for touch with larger tap targets
- CALM-03: Practice list view readable on mobile without horizontal scroll
- DRAG-01: Touch drag-drop uses 250ms hold delay activation
- DRAG-02: Explicit drag handles with touch-action: none CSS
- DRAG-03: Visual feedback during drag (shadow, scale, color change)

**Success Criteria:**
1. User on mobile tapping date field sees calendar appear from bottom as a sheet (not modal overlay)
2. User can tap calendar dates without mis-taps (44px+ touch targets)
3. User viewing practice list on mobile sees all content without horizontal scrolling
4. User on touch device can initiate drag by holding for 250ms (accidental scrolls do not trigger drag)
5. User dragging lineup item sees visual feedback (elevation, color change) confirming the drag is active

---

## Progress

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 32 | Safe Areas & Branding | 8 | Complete |
| 33 | Legal Pages | 4 | Complete |
| 34 | UX Polish | 11 | Planned |
| 35 | Device-Specific | 6 | Pending |

**Total:** 29 requirements, 4 phases

---

*Last updated: 2026-01-30 (Phase 34 planned)*
