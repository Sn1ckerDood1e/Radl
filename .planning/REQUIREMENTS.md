# Requirements: RowOps v2.2 Security Audit

**Defined:** 2026-01-28
**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

## v2.2 Requirements

Security audit requirements to validate the app before beta testing.

### API Authentication

- [ ] **AUTH-01**: All API routes require authentication (no unprotected endpoints)
- [ ] **AUTH-02**: JWT signatures are verified on every request
- [ ] **AUTH-03**: JWT expiration is enforced (expired tokens rejected)
- [ ] **AUTH-04**: JWT claims are validated against expected structure
- [ ] **AUTH-05**: Session persistence works correctly across browser refresh
- [ ] **AUTH-06**: Logout properly invalidates session
- [ ] **AUTH-07**: Token refresh works without re-authentication

### RBAC Permissions

- [ ] **RBAC-01**: FACILITY_ADMIN can only access facility-level operations
- [ ] **RBAC-02**: CLUB_ADMIN can only access their club's data
- [ ] **RBAC-03**: COACH can manage practices/equipment but not club settings
- [ ] **RBAC-04**: ATHLETE can only view their own schedule and assignments
- [ ] **RBAC-05**: PARENT can only view their linked athlete's data
- [ ] **RBAC-06**: CASL permissions are enforced server-side (not just client)
- [ ] **RBAC-07**: Role changes propagate immediately to permissions

### Tenant Isolation

- [ ] **ISOL-01**: All database tables have RLS policies enabled
- [ ] **ISOL-02**: RLS policies correctly filter by tenant (facility/club/team)
- [ ] **ISOL-03**: Cross-tenant data access is blocked (User A can't see Team B's data)
- [ ] **ISOL-04**: JWT claims (facility_id, club_id, team_id) match data access patterns
- [ ] **ISOL-05**: Prisma queries include tenant filtering
- [ ] **ISOL-06**: API responses don't leak data from other tenants

### Secrets & Environment

- [ ] **SECR-01**: No secrets exposed in client-side JavaScript bundle
- [ ] **SECR-02**: Environment variables properly scoped (NEXT_PUBLIC_ only for public)
- [ ] **SECR-03**: Supabase service role key not accessible from client
- [ ] **SECR-04**: API keys are hashed in database (not plaintext)
- [ ] **SECR-05**: No hardcoded credentials in source code

### Audit Logging

- [ ] **AUDIT-01**: Authentication events are logged (login, logout, failed attempts)
- [ ] **AUDIT-02**: Data modification events are logged (create, update, delete)
- [ ] **AUDIT-03**: Permission denied events are logged
- [ ] **AUDIT-04**: Logs include user ID, timestamp, and action details
- [ ] **AUDIT-05**: Logs are immutable (can't be modified after creation)

### Rate Limiting

- [ ] **RATE-01**: Login endpoint has rate limiting
- [ ] **RATE-02**: Signup endpoint has rate limiting
- [ ] **RATE-03**: Password reset endpoint has rate limiting
- [ ] **RATE-04**: Rate limit responses include proper headers
- [ ] **RATE-05**: Rate limiting is per-IP or per-user (not global)

## Future Requirements

Deferred to future milestones:

### v2.3 Core Flow Testing
- Test complete signup → create team → invite flow
- Test practice creation → lineup assignment flow
- Test equipment management flow

### v2.4 UI Polish
- Consistent styling across all pages
- Mobile responsive fixes
- Loading states and error messages

## Out of Scope

| Feature | Reason |
|---------|--------|
| Penetration testing | Requires external security firm |
| Load testing | Separate performance milestone |
| New feature development | This is audit-only |
| Bug fixes unrelated to security | Separate bug fix milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 25 | Pending |
| AUTH-02 | Phase 25 | Pending |
| AUTH-03 | Phase 25 | Pending |
| AUTH-04 | Phase 25 | Pending |
| AUTH-05 | Phase 25 | Pending |
| AUTH-06 | Phase 25 | Pending |
| AUTH-07 | Phase 25 | Pending |
| RBAC-01 | Phase 26 | Pending |
| RBAC-02 | Phase 26 | Pending |
| RBAC-03 | Phase 26 | Pending |
| RBAC-04 | Phase 26 | Pending |
| RBAC-05 | Phase 26 | Pending |
| RBAC-06 | Phase 26 | Pending |
| RBAC-07 | Phase 26 | Pending |
| ISOL-01 | Phase 26 | Pending |
| ISOL-02 | Phase 26 | Pending |
| ISOL-03 | Phase 26 | Pending |
| ISOL-04 | Phase 26 | Pending |
| ISOL-05 | Phase 26 | Pending |
| ISOL-06 | Phase 26 | Pending |
| SECR-01 | Phase 27 | Pending |
| SECR-02 | Phase 27 | Pending |
| SECR-03 | Phase 27 | Pending |
| SECR-04 | Phase 27 | Pending |
| SECR-05 | Phase 27 | Pending |
| AUDIT-01 | Phase 27 | Pending |
| AUDIT-02 | Phase 27 | Pending |
| AUDIT-03 | Phase 27 | Pending |
| AUDIT-04 | Phase 27 | Pending |
| AUDIT-05 | Phase 27 | Pending |
| RATE-01 | Phase 27 | Pending |
| RATE-02 | Phase 27 | Pending |
| RATE-03 | Phase 27 | Pending |
| RATE-04 | Phase 27 | Pending |
| RATE-05 | Phase 27 | Pending |

**Coverage:**
- v2.2 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-28*
*Last updated: 2026-01-28 after initial definition*
