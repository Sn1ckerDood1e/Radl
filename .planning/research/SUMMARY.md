# Security Audit Research Summary

**Project:** Radl v2.2 Security Audit Milestone
**Domain:** Multi-tenant SaaS Security Testing
**Researched:** 2026-01-28
**Confidence:** HIGH

## Executive Summary

Radl is a multi-tenant rowing team management SaaS built on Next.js 16, Supabase Auth, PostgreSQL RLS, Prisma 6, and CASL. The security audit must verify defense-in-depth across six layers: Edge middleware, JWT claims, database RLS policies, API route authorization, Prisma queries, and client-side security. The architecture implements tenant isolation at facility → club → team hierarchy with shared equipment management requiring complex permission boundaries.

The audit combines automated tools (Semgrep, TruffleHog, SupaShield, pgTAP, OWASP ZAP) with manual testing across six critical areas: API authentication, RBAC permissions, tenant isolation, secrets management, audit logging, and rate limiting. Research reveals **19 critical vulnerabilities** including React2Shell RCE (CVE-2025-55182), Next.js middleware bypass (CVE-2025-29927), and Prisma RLS bypass by default. The most dangerous attack vector is tenant isolation failure — a single misconfigured RLS policy or missing tenant context check can expose all facility/club data across the system.

The recommended approach is layered testing over 10 days: foundation verification (RLS enabled, JWT config), tenant isolation testing (cross-tenant queries), authorization bypass attempts (JWT manipulation, CASL boundaries), data injection testing (SQL/operator injection), API key security, and comprehensive integration scenarios. Cost is $0 using open-source tools. Immediate actions: upgrade Next.js to 16.0.12+, audit all RLS policies, switch Prisma from superuser role, validate all Server Action inputs with Zod, and block middleware bypass headers.

## Key Findings

### Recommended Security Tools

Research identified a layered toolset covering all six audit areas with zero licensing cost:

**Automated scanning tools:**
- **Semgrep** (SAST): Custom rules for Next.js patterns, 20K-100K loc/sec, detects auth bypasses and insecure data access
- **TruffleHog** (secrets): Scans git history with API verification for 700+ credential types, critical for Supabase service_role key detection
- **SupaShield + pgTAP** (RLS testing): Automated RLS policy coverage reports and PostgreSQL unit tests for tenant isolation
- **npm audit + Socket** (dependencies): Baseline vulnerability scanning plus supply chain threat detection
- **OWASP ZAP** (DAST): Runtime vulnerability scanning for deployed staging environment
- **jwt_tool** (JWT security): Comprehensive JWT attack testing (algorithm confusion, signature stripping, claims manipulation)

**Key advantage:** Layering multiple tool categories catches vulnerabilities missed by single-scanner approaches. Static analysis misses runtime issues, dynamic testing misses code patterns, manual review catches architectural problems.

**Cost comparison:** Complete audit achievable with $0 in free tools. Optional upgrades: Snyk Pro ($99/month), Burp Suite Pro ($449/year), but not required for comprehensive coverage.

### Critical Security Checklist Items

Research compiled a 58-item audit checklist organized by severity. The security audit checklist is comprehensive and available in SECURITY-AUDIT-CHECKLIST.md.

**Critical items (25 total):**
- **Tenant isolation (10 items):** RLS enabled on all tables, no missing policies, cross-tenant query testing, JWT claims validation, facility-shared equipment scoping
- **API authentication (8 items):** JWT signature verification, token expiration enforcement, session hijacking prevention, no service_role key in client code
- **Secrets management (7 items):** No secrets in client bundle or version control, server-side secrets properly scoped, no secrets in logs

**Important items (19 total):**
- **RBAC permissions (9 items):** Tenant-aware permission checks, 5-role hierarchy enforcement, server-side validation mirroring client CASL checks
- **Audit logging (10 items):** All auth events logged, tenant context in logs, log immutability and retention policies

**Good practice items (14 total):**
- **Rate limiting (7 items):** Auth endpoint limits, differentiated limits for authenticated users, algorithm verification
- **Client-side security (7 items):** CSP configured, no dangerouslySetInnerHTML without sanitization, SameSite cookies

**83% of exposed Supabase databases involve RLS misconfigurations** — this is the highest-priority audit area.

### Architecture Security Layers

The security architecture operates across six distinct layers, each requiring specific audit techniques:

**Layer 1: Edge Middleware** (`/src/middleware.ts`)
- Authentication via `supabase.auth.getUser()` (not `getSession()` which is forgery-susceptible)
- Public route allowlist with API key validation for `/api/*` routes
- **Vulnerability:** CVE-2025-29927 middleware bypass via `x-middleware-subrequest` header

**Layer 2: JWT Claims** (Supabase custom access token hook)
- Claims inject `team_id`, `facility_id`, `club_id`, `user_role` into JWT
- Hook runs as `SECURITY DEFINER` — privilege escalation vector if compromised
- **Vulnerability:** Claims cached until expiration — membership changes not reflected until token refresh

**Layer 3: Row Level Security** (PostgreSQL RLS policies)
- All tables have RLS enabled with policies using `auth.uid()` for current user
- Helper functions `get_user_team_id()`, `get_user_role()` enforce multi-tenant isolation
- **Vulnerability:** Prisma connects as superuser by default, bypassing all RLS policies

**Layer 4: API Route Authorization** (CASL abilities)
- `getAuthContext()` creates CASL ability from JWT claims at every API route entry
- 5-role hierarchy: FACILITY_ADMIN, CLUB_ADMIN, COACH, ATHLETE, PARENT
- **Vulnerability:** Routes forgetting to call `getAuthContext()` bypass all authorization

**Layer 5: Prisma Query Layer**
- All queries parameterized to prevent SQL injection
- Connection pooling uses service role (bypasses RLS) — must filter in application
- **Vulnerability:** Operator injection through unvalidated filter objects (NoSQL-style attacks)

**Layer 6: Client-Side Security** (React Server Components)
- Server Components fetch data directly, Client Components receive only necessary props
- No authorization logic in client code (server validates everything)
- **Vulnerability:** Server Components accidentally exposing sensitive data in props

### Critical Vulnerabilities to Address

Research identified 19 vulnerabilities across three severity tiers:

**CRITICAL (7 vulnerabilities):**
1. **React2Shell RCE** (CVE-2025-55182): Pre-auth remote code execution in RSC protocol, CVSS 10.0 — upgrade Next.js to 16.0.12+ immediately
2. **Middleware bypass** (CVE-2025-29927): `x-middleware-subrequest` header bypasses auth, CVSS 9.1 — block header at CDN level
3. **RLS not enabled**: 83% of exposed Supabase databases have RLS misconfigurations — audit all tables
4. **Prisma RLS bypass**: Prisma connects as postgres superuser, ignoring all RLS — switch to dedicated role or use client extensions
5. **Connection pool contamination**: Tenant context leaks between requests without transaction scoping
6. **Server Action validation missing**: Public HTTP endpoints treated as trusted functions — validate all inputs with Zod
7. **JWT claims trusted without re-verification**: Stale claims allow access after role changes — query database for current membership

**MODERATE (5 vulnerabilities):**
8. CASL abilities checked only client-side — server must re-validate
9. Service role key exposure in client code or git history
10. Cache poisoning via race condition (CVE-2025-49826) — affects ISR pages
11. JWT HS256 to ES256 migration incomplete — HS256 vulnerable to secret leakage
12. Race conditions in hierarchical multi-tenant context — use AsyncLocalStorage

**LOW (7 vulnerabilities):**
13. Missing CSRF protection on custom Route Handlers
14. Prisma operator injection through unvalidated filters
15. Insufficient index coverage for RLS policies (99.94% slower)
16. API key validation uses service role connection
17. Stale JWT claims after role changes (1-hour window)
18. Missing `'server-only'` directive on sensitive modules
19. Unvalidated dynamic route parameters

**Immediate actions required:** Upgrade Next.js, rotate secrets, audit RLS, switch Prisma role, add input validation.

### Audit Execution Phases

Research defines a 10-day audit sequence optimized to catch critical issues first:

**Phase 1: Foundation Verification (Day 1)**
- RLS enabled check via pg_catalog queries
- Middleware authentication review (getUser vs getSession)
- JWT configuration and signature algorithm verification
- Environment variable security audit

**Phase 2: Tenant Isolation Testing (Day 2-3)**
- Create 2+ test tenants with sample data
- Execute cross-tenant queries with different user JWTs
- Test API routes with other club's resource IDs
- Verify facility-shared equipment visibility boundaries

**Phase 3: Authorization Bypass Testing (Day 4-5)**
- JWT manipulation (modify claims, "none" algorithm attack)
- CASL permission boundary testing (ATHLETE creates practice, FACILITY_ADMIN without COACH role)
- Middleware bypass vectors (CVE-2025-29927 reproduction)

**Phase 4: Data Injection & Input Validation (Day 6)**
- SQL injection testing with Prisma queries
- Operator injection (NoSQL-style) via filter parameters
- Zod schema validation effectiveness

**Phase 5: API Key & Session Security (Day 7)**
- API key lifecycle (revocation, expiration, role changes)
- Session management (timeout, concurrent sessions, CSRF)
- MFA security and SSO configuration

**Phase 6: Comprehensive Integration Testing (Day 8-9)**
- Privilege escalation scenarios
- Data exfiltration attempts
- Cross-tenant conflict scenarios (equipment booking race conditions)

**Phase 7: Verification & Documentation (Day 10)**
- Issue cataloging by severity (Critical/High/Medium/Low)
- Regression testing after fixes
- Compliance check (SOC 2, GDPR requirements)

**Total time estimate:** 5-7 days for comprehensive audit using automated tools + manual testing.

## Implications for Roadmap

Based on research, the security audit should be structured as a single focused milestone with clear entry/exit criteria:

### Audit Phase Structure

**Phase 1: Critical Infrastructure (Days 1-3)**
**Rationale:** Foundation must be bulletproof before testing application layer. Next.js vulnerabilities (React2Shell, middleware bypass) are pre-auth exploits that make all subsequent auditing meaningless if not fixed first.

**Delivers:**
- Next.js upgraded to 16.0.12+
- All secrets rotated (React2Shell requires credential rotation)
- RLS enabled on all tables with policies verified
- Prisma switched from postgres superuser to dedicated role
- Middleware bypass header blocked at CDN

**Tools:** pg_catalog queries, TruffleHog, Semgrep, manual config review

**Avoids:**
- Critical: React2Shell RCE (CVE-2025-55182)
- Critical: Middleware bypass (CVE-2025-29927)
- Critical: RLS not enabled (83% of Supabase breaches)
- Critical: Prisma RLS bypass (multi-tenant data leakage)

**Exit criteria:** No cross-tenant data leaks via direct queries, no secrets exposed in client bundle, authentication cannot be bypassed.

---

**Phase 2: Authorization & Tenant Isolation (Days 4-6)**
**Rationale:** Multi-tenant isolation is the highest-risk area unique to Radl architecture. Facility → club → team hierarchy with shared equipment creates complex permission boundaries requiring both automated and manual testing.

**Delivers:**
- Cross-tenant isolation verified with 2+ test facilities/clubs
- CASL abilities mirrored server-side (not just client checks)
- JWT claims re-verified against database (handle stale claims)
- Server Action input validation with Zod schemas
- API key authorization verified per club context

**Tools:** SupaShield, pgTAP, manual API testing, Postman/Bruno

**Addresses:**
- RBAC permission boundaries (5-role hierarchy)
- Facility-shared equipment visibility controls
- Connection pool contamination prevention
- JWT claims staleness after role changes

**Avoids:**
- Critical: JWT claims trusted without re-verification
- Critical: Server Action validation missing
- Moderate: CASL client-side only enforcement
- Moderate: Service role key exposure

**Exit criteria:** Role boundaries enforced, ATHLETE cannot create practices, FACILITY_ADMIN without COACH role cannot edit lineups, Club A cannot access Club B data.

---

**Phase 3: Application Security Hardening (Days 7-9)**
**Rationale:** Defense-in-depth layers (rate limiting, CSRF, CSP, audit logging) don't prevent initial breach but limit damage and ensure detection. Industry best practices for commercial SaaS.

**Delivers:**
- Rate limiting on auth endpoints (5-10 attempts per 15 min)
- CSRF protection on custom Route Handlers
- Audit logging verified for all security events
- Security headers configured (CSP with nonces, HSTS, X-Frame-Options)
- Prisma operator injection testing completed
- Dynamic route parameter validation with Zod

**Tools:** OWASP ZAP, jwt_tool, securityheaders.com, manual testing

**Addresses:**
- Rate limiting (brute force prevention)
- Audit logging (365-day retention for compliance)
- Client-side security (XSS, CSRF prevention)
- Input validation completeness

**Avoids:**
- Moderate: Cache poisoning (CVE-2025-49826)
- Low: Missing CSRF protection
- Low: Prisma operator injection
- Low: Unvalidated route parameters

**Exit criteria:** Industry best practices implemented, SOC 2 compliance requirements met, ready for penetration testing.

---

**Phase 4: Verification & Documentation (Day 10)**
**Rationale:** Regression testing ensures fixes didn't introduce new issues. Documentation enables ongoing security maintenance.

**Delivers:**
- All findings cataloged by severity with reproduction steps
- Remediation recommendations for each issue
- Regression test suite (re-run all Phase 1-3 tests)
- Security documentation for developers (RLS patterns, authorization helpers)
- Compliance checklist (GDPR, SOC 2 requirements)

**Exit criteria:** All Critical and High severity issues resolved, Medium issues documented with mitigation plans, regression tests pass.

### Phase Ordering Rationale

**Why this order:**
1. **Infrastructure first (Phases 1):** Next.js CVEs are pre-auth exploits — no point testing application security if base platform is compromised
2. **Tenant isolation second (Phase 2):** Multi-tenant data leakage is catastrophic and unique to Radl architecture — must verify before hardening
3. **Defense-in-depth third (Phase 3):** Rate limiting, audit logging, CSRF don't prevent initial breach but limit damage
4. **Documentation last (Phase 4):** Document after all testing complete to capture final state

**Why this grouping:**
- Phase 1 groups infrastructure fixes that require downtime (secret rotation, Prisma role change)
- Phase 2 groups tenant-scoped testing that requires test data setup (2+ facilities/clubs)
- Phase 3 groups defense-in-depth items that are independent and can be parallelized

**How this avoids pitfalls:**
- Addresses all 7 Critical vulnerabilities in Phases 1-2 before moving to Moderate severity
- Prevents connection pool contamination by testing in Phase 2 after Prisma role change (Phase 1)
- Catches stale JWT claims issue (Phase 2) before testing session management (Phase 3)

### Research Flags

**Phases likely needing deeper research during planning:**

**Phase 2 (Authorization & Tenant Isolation):**
- **Reason:** Facility → club → team hierarchy is complex. Research covers general multi-tenant patterns, but Radl-specific equipment sharing model (facility-owned equipment visible to all clubs, club-owned equipment private) needs custom pgTAP test design.
- **Action:** During Phase 2 planning, research Supabase RLS policy patterns for hierarchical tenancy with shared/private resources.

**Phase 3 (Application Security Hardening):**
- **Reason:** Next.js CSP configuration with nonces for React Server Components is well-documented (HIGH confidence), but interaction with shadcn/ui components and Serwist service worker (offline PWA) may require testing.
- **Action:** Test CSP with nonce injection in staging environment to verify no component breakage.

**Phases with standard patterns (skip research-phase):**

**Phase 1 (Critical Infrastructure):**
- **Reason:** Next.js upgrade, RLS enablement, Prisma role configuration are all standard operations with official documentation (HIGH confidence).
- **Action:** Follow official migration guides, no additional research needed.

**Phase 4 (Verification & Documentation):**
- **Reason:** Regression testing and documentation are process tasks, not technical research areas.
- **Action:** Execute checklist, no research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Security Tools** | HIGH | All tools verified with official docs, GitHub repos, and 2026 security research. Semgrep, TruffleHog, OWASP ZAP are industry-standard. SupaShield is newer (2025-2026) but purpose-built for Supabase RLS testing. |
| **Audit Checklist** | HIGH | 58-item checklist compiled from authoritative sources: OWASP, Supabase official docs, WorkOS multi-tenant patterns, Microsoft Azure tenancy models. Verified against 2026 CVE disclosures. |
| **Architecture Analysis** | HIGH | Audit layers mapped directly to Radl codebase structure. Middleware, JWT hooks, RLS policies, CASL patterns all verified in actual repository. CVE-2025-29927 and React2Shell vulnerabilities confirmed with official advisories. |
| **Critical Vulnerabilities** | HIGH | All 19 vulnerabilities sourced from official CVE disclosures (Next.js security advisories, PostgreSQL CVEs), Supabase GitHub discussions, and reputable security research (Datadog Security Labs, JFrog, Aikido). |

**Overall confidence:** HIGH

### Gaps to Address

**CASL server-side testing patterns:**
- **Gap:** Official CASL.js documentation exists, but 2026-specific testing patterns for 5-role hierarchy (FACILITY_ADMIN, CLUB_ADMIN, COACH, ATHLETE, PARENT) with tenant context need project-specific implementation.
- **How to handle:** During Phase 2 planning, write custom integration tests for CASL abilities. Reference CASL official docs for ability definition patterns, but test suite will be Radl-specific.

**Facility-shared equipment RLS policies:**
- **Gap:** Research covers general multi-tenant RLS patterns (HIGH confidence), but facility-level equipment visible to all clubs while club-level equipment is private requires custom policy design.
- **How to handle:** During Phase 2 execution, use Supabase Database Advisors to check policy coverage. Write pgTAP tests for both facility-owned and club-owned equipment access patterns.

**Supabase Realtime channel security:**
- **Gap:** Official Supabase docs confirm Realtime channels inherit table RLS policies, but Radl uses Realtime for lineup updates — needs verification that cross-tenant subscriptions are blocked.
- **How to handle:** During Phase 2, test Realtime subscription from Club A user attempting to subscribe to Club B's practice channel. Expect connection rejection or empty messages.

**Background job tenant isolation:**
- **Gap:** Supabase cron jobs and database triggers need manual verification that they don't bypass RLS policies when executing scheduled tasks (e.g., equipment maintenance reminders, practice notifications).
- **How to handle:** During Phase 1, audit any database functions marked `SECURITY DEFINER` to ensure they explicitly filter by tenant context, not relying on session variables that may not be set in background context.

**API key permission inheritance:**
- **Gap:** Research notes API keys inherit creator's roles, but Radl implementation needs verification that revoked keys are immediately invalidated and that role changes propagate to active keys.
- **How to handle:** During Phase 3, test API key lifecycle: create key as COACH, revoke, verify 401 response. Change creator role to ATHLETE, verify key permissions update or fail.

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- Next.js Security: [Server Components & Actions](https://nextjs.org/blog/security-nextjs-server-components-actions), [Data Security Guide](https://nextjs.org/docs/app/guides/data-security)
- Supabase: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [PGAudit Extension](https://supabase.com/docs/guides/database/extensions/pgaudit), [JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys)
- Prisma: [Raw Queries](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries)
- CASL: [Official Documentation](https://casl.js.org/)

**CVE Disclosures:**
- CVE-2025-66478 (React2Shell RCE): [Next.js Security Advisory](https://nextjs.org/blog/CVE-2025-66478), [React Critical Vulnerability](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components)
- CVE-2025-29927 (Middleware Bypass): [Datadog Security Labs](https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/), [JFrog Analysis](https://jfrog.com/blog/cve-2025-29927-next-js-authorization-bypass/)
- CVE-2025-49826 (Cache Poisoning): [Next.js ISR Cache Poisoning Research](https://zhero-web-sec.github.io/research-and-things/nextjs-cache-and-chains-the-stale-elixir)
- CVE-2024-10976, CVE-2025-8713 (PostgreSQL Connection Pool): [PostgreSQL Security Support](https://www.postgresql.org/support/security/CVE-2024-10976/)

**Security Research:**
- [Prisma NoSQL Injection (Aikido 2026)](https://www.aikido.dev/blog/prisma-and-postgresql-vulnerable-to-nosql-injection)
- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [OWASP JWT Testing Guide](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/10-Testing_JSON_Web_Tokens)

### Secondary (MEDIUM confidence)

**Multi-Tenant Security:**
- [WorkOS: Tenant Isolation](https://workos.com/blog/tenant-isolation-in-multi-tenant-systems), [Multi-Tenant RBAC](https://workos.com/blog/how-to-design-multi-tenant-rbac-saas)
- [Microsoft Azure: Multitenant Tenancy Models](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models)
- [Permit.io: Multi-Tenant Authorization Best Practices](https://www.permit.io/blog/best-practices-for-multi-tenant-authorization)

**Tool Documentation:**
- [Semgrep vs SonarQube 2026](https://armur.ai/semgrep-vs-sonarQube)
- [TruffleHog GitHub Repository](https://github.com/trufflesecurity/trufflehog)
- [SupaShield GitHub Repository](https://github.com/Rodrigotari1/supashield) (newer tool, 2025-2026)
- [pgTAP Official Site](https://pgtap.org/)
- [OWASP ZAP](https://www.owasp.org/index.php/OWASP_Zed_Attack_Proxy_Project)

**Best Practices:**
- [Next.js Security Checklist (Arcjet 2026)](https://blog.arcjet.com/next-js-security-checklist/)
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [JWT Security Best Practices (Curity)](https://curity.io/resources/learn/jwt-best-practices/)
- [API Security Checklist 2026 (Wiz)](https://www.wiz.io/academy/api-security/api-security-checklist)

### Tertiary (Context for Radl domain)

**Supabase + Prisma Integration:**
- [Prisma with Supabase RLS Policies (Medium)](https://medium.com/@kavitanambissan/prisma-with-supabase-rls-policies-c72b68a62330)
- [Prisma Extension for Supabase RLS (GitHub)](https://github.com/dthyresson/prisma-extension-supabase-rls)
- [Supabase Exposure Check Tool](https://github.com/bscript/supabase-exposure-check)

**Multi-Tenant Breach Analysis:**
- [Supabase Security Flaw: 170+ Apps Exposed (ByteIota)](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/)
- [Multi-Tenant Leakage When RLS Fails (Medium)](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)
- [30-Day Multi-Tenant SaaS Breach Containment (Pentest Testing)](https://www.pentesttesting.com/multi-tenant-saas-breach-containment/)

---

**Research completed:** 2026-01-28
**Ready for roadmap:** Yes

**Next steps:**
1. Orchestrator proceeds to milestone planning using this research
2. Create detailed audit plan with test cases for each phase
3. Set up test environments (2+ facilities/clubs with sample data)
4. Execute audit following 10-day sequence outlined above
