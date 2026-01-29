# Requirements: Radl v2.3 Core Flow Testing

**Defined:** 2026-01-29
**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

## v2.3 Requirements

Verify all major user journeys work end-to-end, fix bugs, and polish UX before beta release.

### Onboarding Flow

- [ ] **ONBD-01**: User can sign up with email and password
- [ ] **ONBD-02**: User receives and can complete email verification
- [ ] **ONBD-03**: User can create a new team/club after signup
- [ ] **ONBD-04**: Coach/admin can invite members via email
- [ ] **ONBD-05**: Invited user can accept invitation and join team
- [ ] **ONBD-06**: New users see helpful empty states guiding next actions

### Practice Flow

- [ ] **PRAC-01**: Coach can create a practice with date, time, and location
- [ ] **PRAC-02**: Coach can add blocks to practice (water, erg, land, meeting)
- [ ] **PRAC-03**: Coach can assign athletes to lineup seats via drag-drop
- [ ] **PRAC-04**: Coach can publish practice and athletes see assignments
- [ ] **PRAC-05**: Calendar view is easy to read and understand

### Equipment Flow

- [ ] **EQUP-01**: Admin/coach can add equipment with full details
- [ ] **EQUP-02**: Equipment usage is tracked when assigned to lineups
- [ ] **EQUP-03**: Anyone can report damage via QR code without login
- [ ] **EQUP-04**: Coach can view damage reports and mark resolved

### UX Quality

- [ ] **UXQL-01**: Error messages are clear and actionable
- [ ] **UXQL-02**: Empty states guide users to their next action
- [ ] **UXQL-03**: Mobile touch targets meet 44px accessibility minimum
- [ ] **UXQL-04**: Forms validate before submission with inline errors
- [ ] **UXQL-05**: Settings page cleaned up (hide unused options like team colors)

## Future Requirements

Deferred to future milestones:

### v3.0 Notifications
- **NOTIF-01**: Push notification for equipment damage
- **NOTIF-02**: Push notification for lineup published

### v3.0 Parent Role
- **RBAC-05**: PARENT can only view their linked athlete's data

### v3.0 Advanced Features
- Season templates — reusable practice structures
- RC team-specific OAuth — requires credentials
- Email digest notifications

## Out of Scope

| Feature | Reason |
|---------|--------|
| Push notifications | Separate milestone (v3.0) |
| Parent role | Requires ParentAthleteLink table design |
| New feature development | This is testing/polish only |
| Automated E2E test suite | Manual verification this milestone |
| Performance optimization | Separate milestone if needed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ONBD-01 | TBD | Pending |
| ONBD-02 | TBD | Pending |
| ONBD-03 | TBD | Pending |
| ONBD-04 | TBD | Pending |
| ONBD-05 | TBD | Pending |
| ONBD-06 | TBD | Pending |
| PRAC-01 | TBD | Pending |
| PRAC-02 | TBD | Pending |
| PRAC-03 | TBD | Pending |
| PRAC-04 | TBD | Pending |
| PRAC-05 | TBD | Pending |
| EQUP-01 | TBD | Pending |
| EQUP-02 | TBD | Pending |
| EQUP-03 | TBD | Pending |
| EQUP-04 | TBD | Pending |
| UXQL-01 | TBD | Pending |
| UXQL-02 | TBD | Pending |
| UXQL-03 | TBD | Pending |
| UXQL-04 | TBD | Pending |
| UXQL-05 | TBD | Pending |

**Coverage:**
- v2.3 requirements: 20 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 20

---
*Requirements defined: 2026-01-29*
*Last updated: 2026-01-29 after initial definition*
