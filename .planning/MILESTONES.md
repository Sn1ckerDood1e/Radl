# Project Milestones: Radl

## v3.1 Admin Panel (Shipped: 2026-01-31)

**Delivered:** Super admin panel for platform-level management of users, facilities, clubs, and memberships with full audit trail.

**Phases completed:** 36-40 (5 phases, 21 plans)

**Key accomplishments:**
- Super admin authentication with database verification, MFA enforcement, and 30-minute session timeout
- User management: list, search, create, edit, deactivate, reactivate, password reset, bulk CSV import
- Facility & club management: full CRUD with cascade-safe delete and cross-facility club moves
- Membership management: direct user-club assignment bypassing invitations, role editing, bulk CSV import
- Audit log viewer with action/actor/date filters, before/after state diff, and CSV export

**Stats:**
- ~27,500 lines added
- 159 files created/modified
- 5 phases, 21 plans
- 34/34 requirements shipped
- 11 days from start to ship (2026-01-20 → 2026-01-31)

**Git range:** Phase 36 → Phase 40

---

## v3.0 Production Polish (Shipped: 2026-01-30)

**Delivered:** Production-ready polish with branding, safe area handling, legal pages, and device-specific optimizations.

**Phases completed:** 32-35 (4 phases)

**Key accomplishments:**
- Radl branding with teal color palette, icons, and PWA manifest
- Safe area handling for notched devices (iPhone home indicator)
- Legal pages (Terms of Service, Privacy Policy)
- UX polish with loading skeletons, error states, and empty states
- Mobile-optimized calendar and drag-drop

**Stats:**
- 29/29 requirements shipped
- 4 phases

**Git range:** Phase 32 → Phase 35

---

## v2.3 Core Flow Testing (Shipped: 2026-01-29)

**Delivered:** End-to-end verification of all major user journeys with bug fixes and UX polish before beta release.

**Phases completed:** 28-31 (4 phases, 10 plans)

**Key accomplishments:**
- E2E verification of onboarding flow (signup → email verify → create team → invite → join)
- E2E verification of practice flow (create → add blocks → drag-drop lineup → publish)
- E2E verification of equipment flow (add → assign to lineup → QR damage report → resolve)
- Bug fixes: signup redirect, team creation ClubMembership, invitation toast, equipment empty state
- Form validation standardized with onTouched mode
- Actionable error messages with examples
- Settings page cleanup (removed non-functional Team Colors)
- 44px mobile touch targets verified

**Stats:**
- ~136,000 lines of TypeScript
- 4 phases, 10 plans
- 20/20 requirements shipped
- 28 cross-phase connections verified
- 6 complete E2E flows verified

**Git range:** Phase 28 → Phase 31

---

## v2.2 Security Audit (Shipped: 2026-01-29)

**Delivered:** Security audit validation for beta testing readiness with comprehensive authentication, RBAC, tenant isolation, and audit logging verification.

**Phases completed:** 25-27 (3 phases, 17 plans)

**Key accomplishments:**
- API authentication verification: all 88+ routes require authentication
- JWT validation with signature, expiration, and claims verification
- RBAC permission boundaries tested across 5-role hierarchy
- Tenant isolation with RLS policies on core tables
- Secrets management audit (no client-side exposure)
- Audit logging for auth events and data modifications
- Rate limiting on authentication endpoints (Upstash Redis)

**Stats:**
- 135,800 lines of TypeScript
- 3 phases, 17 plans, 71 commits
- 33/35 requirements shipped
- 3 conditional passes (RBAC-06, ISOL-01, ISOL-03)
- 1 deferred (RBAC-05 — PARENT role, ParentAthleteLink table missing)

**Git range:** Phase 25 → Phase 27

---

## v2.1 UX Refinement (Shipped: 2026-01-27)

**Delivered:** Desktop/mobile navigation patterns, RIM feature parity, practice flow enhancements, and RC public API integration.

**Phases completed:** 18-24 (7 phases)

**Key accomplishments:**
- Desktop sidebar with master-detail pattern, mobile bottom navigation
- Announcements with priority levels (info, warning, urgent)
- Public QR-based damage reporting without login
- Equipment readiness with traffic-light badges
- Maintenance workflow with resolution notes
- Inline practice editing with block-based structure
- Drag-drop lineups with @dnd-kit
- RC public API integration with 6-hour caching

**Stats:**
- 30 requirements delivered
- 7 phases

**Git range:** Phase 18 → Phase 24

---

## v2.0 Commercial Readiness (Shipped: 2026-01-26)

**Delivered:** Commercial-ready platform with facility model, mobile PWA, design system, and hardened security.

**Phases completed:** 10-17 (8 phases, 63 plans)

**Key accomplishments:**
- Facility → club hierarchy with shared equipment and booking system
- 5-role RBAC with tenant-scoped permissions and audit logging
- MFA for admins, SSO/SAML for enterprise customers
- Mobile-first PWA with offline sync, swipe gestures, bottom sheets
- shadcn/ui design system with dark mode and animations
- Command palette, keyboard shortcuts, onboarding flow

**Stats:**
- 111,682 lines of TypeScript
- 8 phases, 63 plans, 250 commits
- 34/34 requirements implemented
- 4 days from start to ship (2026-01-22 → 2026-01-26)

**Git range:** Phase 10 → Phase 17

---

## v1.1 Polish (Shipped: 2026-01-22)

**Delivered:** RC settings UI, equipment usage display, and data export.

**Phases completed:** 6-9

**Key accomplishments:**
- RC connection management UI (status, connect/disconnect, manual import, auto-sync)
- Equipment usage history on detail page
- Equipment usage summary on list page
- CSV export for equipment, roster, and schedule

**Stats:**
- 80,840 lines of TypeScript
- 4 phases, 13 commits
- 9/11 requirements implemented (2 deferred)

**Deferred:**
- NOTIF-01: Equipment damage push notification
- NOTIF-02: Lineup published push notification

---

## v1.0 MVP (Shipped: 2026-01-22)

**Delivered:** Operational rowing team platform with practice scheduling, lineup management, PWA offline support, and regatta mode.

**Phases completed:** 1-5 (37 plans total)

**Key accomplishments:**

- Secure multi-tenant foundation with centralized JWT claims validation and rate limiting
- Practice scheduling with time blocks, templates, and unified calendar view
- Drag-and-drop lineup editor with boat compatibility and automatic usage logging
- PWA infrastructure with offline data sync and push notifications
- Regatta mode with RC integration, race timeline, entry lineup assignment, and offline viewing

**Stats:**

- 79,737 lines of TypeScript
- 5 phases, 37 plans
- 31 requirements implemented
- 3 days from start to ship (2026-01-20 → 2026-01-22)

**Git range:** `feat(01-01)` → `feat(05-08)`

---
