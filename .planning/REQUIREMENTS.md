# Requirements: Radl v3.1 Admin Panel

**Defined:** 2026-01-30
**Core Value:** Platform owner can manage all users, clubs, and memberships through a super-admin panel

## v3.1 Requirements

Super-admin panel for platform management with full CRUD operations, admin-created user onboarding, and audit compliance.

### Authentication & Foundation

- [ ] **AUTH-01**: Super admin role stored in database table (not JWT claims only)
- [ ] **AUTH-02**: Super admin login verified against database on every request
- [ ] **AUTH-03**: Admin session timeout at 30 minutes of inactivity
- [ ] **AUTH-04**: Super admin check in CASL abilities (`can('manage', 'all')`)
- [ ] **AUTH-05**: Separate `(admin)` route group with protected layout
- [ ] **AUTH-06**: MFA enforcement for super admin accounts

### User Management

- [ ] **USER-01**: List all users with pagination (25 per page)
- [ ] **USER-02**: Search users by email, name, facility, club
- [ ] **USER-03**: Create user bypassing signup (admin sets email, generates password link)
- [ ] **USER-04**: View user details (profile, memberships, created date, last login)
- [ ] **USER-05**: Edit user profile (name, email, phone)
- [ ] **USER-06**: Deactivate user (soft disable, blocks login, preserves data)
- [ ] **USER-07**: Reactivate deactivated user
- [ ] **USER-08**: Reset user password (generate recovery link via Supabase Admin API)
- [ ] **USER-09**: Bulk user creation via CSV upload (email, name, optional role)

### Facility Management

- [ ] **FCLT-01**: List all facilities with club counts and member counts
- [ ] **FCLT-02**: Create facility (name, slug, location, contact info)
- [ ] **FCLT-03**: Edit facility details
- [ ] **FCLT-04**: View facility details with clubs and aggregate stats
- [ ] **FCLT-05**: Delete facility (soft delete with confirmation, cascade check)

### Club Management

- [ ] **CLUB-01**: List all clubs with member counts (global and by facility)
- [ ] **CLUB-02**: Create club (name, facility assignment, colors)
- [ ] **CLUB-03**: Edit club details
- [ ] **CLUB-04**: View club details with members and settings
- [ ] **CLUB-05**: Delete club (soft delete with confirmation, cascade check)
- [ ] **CLUB-06**: Move club between facilities

### Membership Management

- [ ] **MEMB-01**: Add user to club with role(s) (bypasses invitation flow)
- [ ] **MEMB-02**: Remove user from club
- [ ] **MEMB-03**: Change user roles within club
- [ ] **MEMB-04**: View all memberships for a user (cross-org visibility)
- [ ] **MEMB-05**: Bulk add users to club via CSV (email + role)

### Audit Logging

- [ ] **AUDT-01**: Log all admin actions (actor, action, target, timestamp, before/after)
- [ ] **AUDT-02**: Audit log viewer in admin panel (filterable by action, actor, date)
- [ ] **AUDT-03**: Audit log export (CSV download with date range filter)

## Future Requirements

Deferred to v3.2 or later:

### Enhanced Admin Features

- **ADMN-01**: User impersonation (login as user for debugging)
- **ADMN-02**: IP allowlist for admin panel access
- **ADMN-03**: View user login history
- **ADMN-04**: Platform-wide announcements

### Advanced Organization Management

- **ORG-01**: Merge facilities (combine two facilities)
- **ORG-02**: Facility suspension (block all logins for facility)
- **ORG-03**: Facility dashboard with usage metrics

## Out of Scope

| Feature | Reason |
|---------|--------|
| God-mode data access | Super admin manages structure, not operational content (practices, lineups) |
| Direct database editing | All changes through validated API endpoints |
| Shared admin credentials | Individual admin accounts with audit trail |
| Impersonation | HIGH complexity, security considerations - defer to v3.2 |
| Hard delete without soft delete first | Data safety - 30-day grace period before permanent deletion |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Pending | - |
| AUTH-02 | Pending | - |
| AUTH-03 | Pending | - |
| AUTH-04 | Pending | - |
| AUTH-05 | Pending | - |
| AUTH-06 | Pending | - |
| USER-01 | Pending | - |
| USER-02 | Pending | - |
| USER-03 | Pending | - |
| USER-04 | Pending | - |
| USER-05 | Pending | - |
| USER-06 | Pending | - |
| USER-07 | Pending | - |
| USER-08 | Pending | - |
| USER-09 | Pending | - |
| FCLT-01 | Pending | - |
| FCLT-02 | Pending | - |
| FCLT-03 | Pending | - |
| FCLT-04 | Pending | - |
| FCLT-05 | Pending | - |
| CLUB-01 | Pending | - |
| CLUB-02 | Pending | - |
| CLUB-03 | Pending | - |
| CLUB-04 | Pending | - |
| CLUB-05 | Pending | - |
| CLUB-06 | Pending | - |
| MEMB-01 | Pending | - |
| MEMB-02 | Pending | - |
| MEMB-03 | Pending | - |
| MEMB-04 | Pending | - |
| MEMB-05 | Pending | - |
| AUDT-01 | Pending | - |
| AUDT-02 | Pending | - |
| AUDT-03 | Pending | - |

**Coverage:**
- v3.1 requirements: 34 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 34

---
*Requirements defined: 2026-01-30*
