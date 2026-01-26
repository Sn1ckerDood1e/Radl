# Project Milestones: RowOps

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
