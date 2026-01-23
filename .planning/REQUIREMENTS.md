# Requirements: RowOps v2.0

**Defined:** 2026-01-22
**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

## v2.0 Requirements

Commercial readiness — facility model, mobile PWA, UI/UX polish, security hardening.

### Facility Model

- [ ] **FAC-01**: System supports facility → club hierarchy (boathouse owns clubs)
- [ ] **FAC-02**: Equipment can be owned by facility (shared) or club (exclusive)
- [ ] **FAC-03**: Club-level subscriptions with facility oversight
- [ ] **FAC-04**: Tenant-scoped data isolation enforced at database level (RLS)
- [ ] **FAC-05**: Facility admin can view all clubs under facility
- [ ] **FAC-06**: Facility admin can manage shared equipment
- [ ] **FAC-07**: Equipment reservation/booking system for shared equipment
- [ ] **FAC-08**: Cross-club event scheduling (facility-wide events)
- [ ] **FAC-09**: Facility dashboard with aggregate statistics

### Mobile PWA

- [ ] **MOB-01**: Mobile-first responsive design with proper breakpoints
- [ ] **MOB-02**: All interactive elements have 44px minimum touch targets
- [ ] **MOB-03**: Offline-first with conflict resolution for mutations
- [ ] **MOB-04**: Network-aware UI (loading states, connectivity indicator)
- [ ] **MOB-05**: Swipe gesture navigation for common actions
- [ ] **MOB-06**: PWA install prompt for eligible users
- [ ] **MOB-07**: Bottom sheet navigation for mobile context menus
- [ ] **MOB-08**: App-like transitions between views

### UI/UX Polish

- [ ] **UIX-01**: Design system with consistent component library (shadcn/ui)
- [ ] **UIX-02**: Empty states for all list views with helpful guidance
- [ ] **UIX-03**: Loading states with skeleton placeholders
- [ ] **UIX-04**: Error handling UI with recovery actions
- [ ] **UIX-05**: Form validation with inline feedback
- [ ] **UIX-06**: Dark mode theme support
- [ ] **UIX-07**: Micro-animations for state transitions
- [ ] **UIX-08**: Onboarding flow for new users
- [ ] **UIX-09**: Keyboard shortcuts for power users (desktop)

### Security & RBAC

- [ ] **SEC-04**: Role hierarchy (FACILITY_ADMIN → CLUB_ADMIN → COACH → ATHLETE → PARENT)
- [ ] **SEC-05**: Tenant-scoped permissions ("admin of THIS club, not all clubs")
- [ ] **SEC-06**: Audit logging for sensitive operations (365-day retention)
- [ ] **SEC-07**: Session management with secure token refresh
- [ ] **SEC-08**: Multi-factor authentication (MFA) for admin roles
- [ ] **SEC-09**: SSO/SAML integration for enterprise customers
- [ ] **SEC-10**: Custom permission grants for edge cases
- [ ] **SEC-11**: API key management for integrations

## Future Requirements (v3.0+)

Deferred to future release. Tracked but not in current roadmap.

### Features

- **NOTIF-01**: Coach receives notification when equipment is marked damaged
- **NOTIF-02**: Athletes receive notification when lineup is published
- Season templates — reusable season structures
- Email notifications — alternative to push
- Erg results tracking — Concept2 integration
- Attendance analytics — reporting and trends
- Equipment lifecycle tracking — maintenance schedules
- Parent portal — full read-only access for parents (basic parent role in v2.0)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Financial tracking / payroll | Not a team management focus |
| Inventory accounting | Equipment is operational, not financial |
| Checkout systems unrelated to practices | Equipment tied to practices only |
| Results database | Regatta Central handles official results |
| Registration/payment processing | Out of scope for internal execution tool |
| Public scoring | Not a spectator-facing app |
| Messaging-first workflows | Not a communication platform |
| Social features | Not a social network |
| Native mobile apps | PWA with native-app-feel for v2.0, native deferred |
| White-labeling | Single brand for v2.0, consider for enterprise tier |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FAC-01 | TBD | Pending |
| FAC-02 | TBD | Pending |
| FAC-03 | TBD | Pending |
| FAC-04 | TBD | Pending |
| FAC-05 | TBD | Pending |
| FAC-06 | TBD | Pending |
| FAC-07 | TBD | Pending |
| FAC-08 | TBD | Pending |
| FAC-09 | TBD | Pending |
| MOB-01 | TBD | Pending |
| MOB-02 | TBD | Pending |
| MOB-03 | TBD | Pending |
| MOB-04 | TBD | Pending |
| MOB-05 | TBD | Pending |
| MOB-06 | TBD | Pending |
| MOB-07 | TBD | Pending |
| MOB-08 | TBD | Pending |
| UIX-01 | TBD | Pending |
| UIX-02 | TBD | Pending |
| UIX-03 | TBD | Pending |
| UIX-04 | TBD | Pending |
| UIX-05 | TBD | Pending |
| UIX-06 | TBD | Pending |
| UIX-07 | TBD | Pending |
| UIX-08 | TBD | Pending |
| UIX-09 | TBD | Pending |
| SEC-04 | TBD | Pending |
| SEC-05 | TBD | Pending |
| SEC-06 | TBD | Pending |
| SEC-07 | TBD | Pending |
| SEC-08 | TBD | Pending |
| SEC-09 | TBD | Pending |
| SEC-10 | TBD | Pending |
| SEC-11 | TBD | Pending |

**Coverage:**
- v2.0 requirements: 34 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 34

---
*Requirements defined: 2026-01-22*
*Last updated: 2026-01-22 after initial definition*
