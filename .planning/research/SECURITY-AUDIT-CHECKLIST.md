# Security Audit Checklist: Multi-Tenant SaaS

**Project:** RowOps
**Domain:** Multi-tenant SaaS with RBAC and RLS
**Researched:** 2026-01-28
**Overall confidence:** HIGH

## Executive Summary

This checklist covers comprehensive security audit requirements for a multi-tenant SaaS application with 5-role RBAC hierarchy (CASL), Row-Level Security policies (Supabase RLS), and JWT-based authentication. The checklist is organized by risk severity and covers all six audit areas: API authentication, RBAC permissions, tenant isolation, secrets management, audit logging, and rate limiting.

**Critical finding:** Tenant isolation is the highest-risk area. A single misconfigured RLS policy or missing tenant context check can expose all tenant data across the system. WebSearch findings indicate that "tenant isolation without RBAC allows abuse within a tenant; RBAC without tenant isolation turns every IDOR into a cross-tenant incident."

---

## Critical (Data Exposure Risk)

These items represent catastrophic risk if they fail. A single failure could expose tenant data across the entire system.

### Tenant Isolation (Multi-Tenant Data Separation)

- [ ] **RLS enabled on all public tables** - Verify RLS is enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) on every table in the public schema that contains tenant data
- [ ] **No missing RLS policies** - Use Supabase Database Advisors to scan for tables with RLS enabled but no policies defined (which blocks all access)
- [ ] **SELECT policies exist for all tables** - Every tenant-scoped table must have a SELECT policy that filters by `facility_id`, `club_id`, or `team_id`
- [ ] **INSERT/UPDATE/DELETE policies exist** - Verify write operations also enforce tenant context (not just reads)
- [ ] **Cross-tenant query testing** - Execute manual tests: create 2+ test tenants, attempt to access Tenant B's data from Tenant A's session using direct queries, API calls, and ID manipulation
- [ ] **JWT claims validation** - Verify all RLS policies reference JWT claims correctly (`auth.jwt() ->> 'facility_id'`, not `user_metadata` which users can modify)
- [ ] **Automated RLS testing** - Use tools like SupaShield (`supashield audit`, `supashield test`) or pgTAP to automate RLS policy verification
- [ ] **No shared tables without tenant scoping** - Verify any shared/lookup tables either have no sensitive data OR have proper RLS policies
- [ ] **Foreign key tenant consistency** - Verify FK relationships don't allow cross-tenant references (e.g., team.facility_id must match practice.facility_id)
- [ ] **Background job tenant isolation** - Verify cron jobs, triggers, and background workers properly scope queries by tenant

**Testing approach:** Create test accounts for Tenant A and Tenant B. From Tenant A session, attempt:
- Direct SQL: `SELECT * FROM practices WHERE team_id = '[tenant_b_team_id]'`
- API call: `GET /api/practices/[tenant_b_practice_id]`
- Parameter manipulation: Change `facility_id` in request body/query params
- Replay admin endpoints with regular user JWT tokens

### API Authentication (All Routes Require Auth)

- [ ] **No unauthenticated endpoints** - Audit all API routes (Supabase API, custom functions, RPCs) to verify authentication is required; use tools like AuditYourApp to scan for exposed RLS rules and unprotected RPCs
- [ ] **JWT signature verification** - Verify all APIs validate JWT signatures (never accept `{"alg":"none"}` tokens)
- [ ] **JWT claims validation** - Verify APIs validate required claims: `iss` (issuer), `aud` (audience), `exp` (expiration), `sub` (user ID)
- [ ] **Token expiration enforcement** - Verify expired tokens are rejected (access tokens should be 15-60 minutes, refresh tokens 7-14 days per 2026 best practices)
- [ ] **Session hijacking prevention** - Verify refresh token rotation is enabled (new refresh token issued with each access token, old one invalidated)
- [ ] **No API keys in client code** - Verify `SUPABASE_ANON_KEY` is used (not `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS)
- [ ] **Authorization header enforcement** - Verify all authenticated endpoints require `Authorization: Bearer [token]` header
- [ ] **Token storage security** - Verify tokens are stored in httpOnly cookies (not localStorage which is vulnerable to XSS)

**Testing approach:** Use tools like Burp Suite or Postman to test:
- Remove Authorization header → expect 401
- Use expired token → expect 401
- Modify token signature → expect 401
- Use token with wrong `aud` claim → expect 401

### Secrets and Environment Variables

- [ ] **No secrets in client bundle** - Verify production build doesn't contain API keys, service role keys, database passwords, or private keys; inspect bundle with `grep -r "sk_" "service_role" dist/`
- [ ] **No secrets in version control** - Verify `.env`, `.env.local`, `credentials.json` are in `.gitignore`; scan repo history for accidentally committed secrets
- [ ] **No secrets in client-side env vars** - Verify `NEXT_PUBLIC_`, `VITE_`, `REACT_APP_` prefixed vars contain only public keys (anon keys, public IDs)
- [ ] **Server-side secrets properly scoped** - Verify service role keys, database passwords only exist in server runtime environment (Vercel env vars, not client bundle)
- [ ] **Supabase service role key usage** - Verify `SUPABASE_SERVICE_ROLE_KEY` is NEVER exposed to client; only used in server-side API routes that need RLS bypass
- [ ] **No secrets in logs** - Verify application logs don't contain full token values, API keys, or passwords (use structured logging with redacted fields)
- [ ] **Environment variable access audit** - Document which secrets are accessed where (e.g., "DB password: only backend API routes")

**Testing approach:**
- Build production bundle → `grep -r "supabase_service_role" dist/` → should find nothing
- Check browser DevTools Network tab → verify no secrets in API responses or headers
- Review deployment platform env vars → verify separation between public (`NEXT_PUBLIC_`) and private vars

---

## Important (Access Control)

These items represent significant risk. Failures could allow unauthorized actions within a tenant or privilege escalation.

### RBAC Permissions (Role-Based Access Control)

- [ ] **All API endpoints enforce RBAC** - Verify every protected route checks user role/permissions using CASL abilities
- [ ] **Permission checks are tenant-aware** - Verify authorization checks include tenant context (e.g., "is user an admin IN THIS facility?")
- [ ] **5-role hierarchy enforced** - Verify role precedence: verify higher roles inherit lower role permissions where appropriate
- [ ] **CASL ability definitions match requirements** - Review `defineAbility` or `AbilityBuilder` definitions; verify actions (create, read, update, delete) and subjects match actual use cases
- [ ] **UI elements respect permissions** - Verify client-side UI hides/disables actions users can't perform (using `ability.can()` checks)
- [ ] **Server-side permission enforcement** - Verify server validates permissions even if client bypasses UI restrictions (never trust client-side checks alone)
- [ ] **Permission boundary testing** - Test each role's boundaries: can Coach create practices? Can Athlete delete teams? Document expected behavior vs actual
- [ ] **Admin privilege scope** - Verify admin actions are scoped to admin's tenant (facility/club/team), not global
- [ ] **Permission changes audited** - Verify role/permission changes are logged with timestamp, actor, and affected user

**Testing approach:** For each role (admin, coach, athlete, etc.):
- Login as that role
- Attempt actions outside role scope (e.g., athlete tries to delete practice)
- Verify API returns 403 Forbidden (not 404 or 500)
- Verify UI doesn't show forbidden actions

### Audit Logging (Verify Working)

- [ ] **Authentication events logged** - Verify login, logout, password reset, MFA attempts are logged with timestamp, user ID, IP address, user agent
- [ ] **Authorization failures logged** - Verify 401/403 responses are logged with attempted action, resource, user, and reason for denial
- [ ] **RBAC changes logged** - Verify role assignments, permission changes logged with actor, affected user, old role, new role
- [ ] **Sensitive data access logged** - Verify access to sensitive tables (users, billing, etc.) logged with actor, resource, timestamp
- [ ] **Tenant context in logs** - Verify all logs include facility_id/club_id/team_id for multi-tenant audit trails
- [ ] **Log immutability** - Verify logs use append-only storage (Supabase PGAudit, external logging service) that can't be tampered with
- [ ] **Log retention policy** - Verify logs are retained for compliance periods (GDPR: 6 months, SOC 2: 1 year, HIPAA: 6 years)
- [ ] **Log searchability** - Verify logs are searchable by user, tenant, action, date range (using Supabase Log Explorer or external tool)
- [ ] **Cross-tenant access attempts logged** - Verify failed RLS policy checks are logged (attempted cross-tenant data access)
- [ ] **Admin action audit trail** - Verify all admin actions (user impersonation, bulk deletes, config changes) create audit trail entries

**Testing approach:**
- Perform test actions (login, create resource, fail permission check)
- Query audit logs → verify each action has corresponding log entry
- Verify log includes: timestamp, actor (user_id), action, resource, tenant context, outcome (success/failure)

### Session Management

- [ ] **Session timeout enforced** - Verify idle sessions expire (NIST SP 800-63B: max 12 hours for moderate assurance, 1 hour for high assurance, 15 minutes for PCI DSS payment systems)
- [ ] **Concurrent session handling** - Define policy: allow multiple sessions or enforce single session? Verify implementation matches policy
- [ ] **Session revocation works** - Verify logout invalidates refresh token server-side (not just client-side token deletion)
- [ ] **Token refresh monitoring** - Verify refresh token usage is logged with IP, device type, client application for anomaly detection
- [ ] **Replay attack detection** - Verify reusing a revoked refresh token flags session as compromised and requires re-authentication (single-use token rotation)
- [ ] **Session fixation prevention** - Verify new session ID issued after login (Supabase handles this automatically)

**Testing approach:**
- Login → capture refresh token → logout → attempt to use old refresh token → expect 401
- Login on Device A → login on Device B → verify behavior matches policy (concurrent allowed or Device A logged out)
- Monitor logs for refresh patterns → verify unusual refresh patterns (different IPs, rapid succession) are flagged

---

## Good Practice (Defense in Depth)

These items provide additional security layers and align with industry best practices. Not critical but recommended for production systems.

### Rate Limiting (Auth Endpoint Protection)

- [ ] **Authentication endpoint limits** - Verify login/signup endpoints limited to 5-10 attempts per 15 minutes per IP to prevent brute force attacks
- [ ] **Password reset rate limits** - Verify password reset limited to prevent email flooding and account enumeration
- [ ] **Differentiated limits for authenticated users** - Verify authenticated users get higher rate limits than anonymous (you can track/contact them if needed)
- [ ] **Proper HTTP 429 responses** - Verify rate-limited requests return `429 Too Many Requests` with `Retry-After` header
- [ ] **Rate limit bypass testing** - Test if rate limits can be bypassed by changing IP, user agent, or using multiple accounts
- [ ] **API-wide rate limiting** - Verify general API rate limits (e.g., 100 req/min per user) to prevent resource exhaustion
- [ ] **Algorithm verification** - Verify rate limiting uses token bucket or sliding window (allows short bursts while preventing sustained abuse)

**Testing approach:**
- Attempt 20 login requests in 1 minute → expect 429 after 5-10 attempts
- Wait for timeout period → verify access restored
- Check response headers for `Retry-After` value

### Client-Side Security (XSS, CSRF Prevention)

- [ ] **Content Security Policy configured** - Verify CSP header blocks inline scripts and restricts script sources (stops XSS attacks)
- [ ] **No dangerouslySetInnerHTML without sanitization** - Verify any use of `dangerouslySetInnerHTML`, `v-html`, or `innerHTML` sanitizes input with DOMPurify or similar
- [ ] **SameSite cookie attribute** - Verify session cookies use `SameSite=Strict` or `SameSite=Lax` to prevent CSRF
- [ ] **CSRF token implementation** - Verify state-changing operations (POST/PUT/DELETE) validate CSRF tokens or Origin/Referer headers
- [ ] **Input validation and sanitization** - Verify user inputs are validated on client AND server (never trust client-side validation alone)
- [ ] **Output encoding** - Verify React/Vue automatic escaping is used (JSX escapes by default); verify any raw HTML rendering is intentional and sanitized
- [ ] **Subresource Integrity (SRI)** - Verify external scripts/stylesheets use SRI hashes to prevent CDN compromise

**Testing approach:**
- Review CSP header → verify `script-src 'self'` (no `unsafe-inline`)
- Search codebase for `dangerouslySetInnerHTML` → verify each use has sanitization
- Attempt CSRF attack: craft malicious form on attacker.com that POSTs to app → verify request rejected

### Infrastructure and Configuration

- [ ] **HTTPS everywhere** - Verify all production traffic uses HTTPS (no mixed content, no HTTP fallback)
- [ ] **HSTS header configured** - Verify `Strict-Transport-Security` header forces HTTPS for future visits
- [ ] **Secure headers configured** - Verify `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] **Database connection security** - Verify database connections use SSL/TLS (Supabase uses SSL by default)
- [ ] **API versioning strategy** - Verify deprecated API versions have sunset dates (allows security fixes without breaking changes)
- [ ] **Dependency vulnerability scanning** - Verify CI/CD includes `npm audit` or Snyk to detect vulnerable dependencies
- [ ] **Error message sanitization** - Verify production error messages don't expose stack traces, file paths, or database schema
- [ ] **Backup encryption** - Verify database backups are encrypted at rest and in transit

**Testing approach:**
- Use Mozilla Observatory or Security Headers to scan production URL
- Check browser DevTools → verify all resources loaded over HTTPS
- Trigger error (e.g., invalid API request) → verify response doesn't contain stack trace

### Supabase-Specific Security

- [ ] **RLS policies use auth.uid() not request claims** - Verify policies use `auth.uid()` function (server-verified) not `current_setting('request.jwt.claims')` which could be spoofed
- [ ] **PostgREST schema exposure limited** - Verify only necessary tables/views/functions exposed via API (use `GRANT SELECT` selectively, not on public schema)
- [ ] **Functions use SECURITY DEFINER correctly** - Verify functions that bypass RLS have `SECURITY DEFINER` and explicitly validate tenant context
- [ ] **Storage bucket RLS policies** - Verify Supabase Storage buckets have RLS policies (not just table RLS)
- [ ] **Realtime channel authorization** - Verify Supabase Realtime channels enforce RLS policies (channels inherit table RLS)
- [ ] **Database roles properly scoped** - Verify `anon` role has minimal permissions; `authenticated` role has read/write with RLS; `service_role` never exposed to client
- [ ] **Edge Functions authentication** - Verify Supabase Edge Functions validate JWT tokens for protected endpoints

**Testing approach:**
- Review all Supabase policies → ensure they use `auth.uid()` and JWT claims correctly
- Test Storage bucket access → upload file as User A, attempt access as User B → expect 403
- Monitor Realtime subscription → verify User A can't subscribe to User B's tenant channel

---

## Testing Methodology

### Automated Testing

**Tools to integrate:**
- **SupaShield** (`npm install -g supashield`) - Automated RLS policy scanning and testing
- **pgTAP** (Supabase extension) - Database-level RLS policy unit tests
- **AuditYourApp** - SaaS scanner for exposed RLS rules, unprotected RPCs, leaked API keys
- **npm audit / Snyk** - Dependency vulnerability scanning
- **OWASP ZAP / Burp Suite** - API security scanning for auth bypass, injection, IDOR

**Automated test script:**
```bash
# RLS policy audit
supashield audit --project [project-id]

# Dependency vulnerabilities
npm audit --production

# Secret scanning
git secrets --scan

# API security baseline
npm run test:security
```

### Manual Testing

**Cross-tenant isolation testing:**
1. Create 2+ test tenants with sample data
2. Login as Tenant A user
3. Capture Tenant B resource IDs (from database or API)
4. Attempt to access Tenant B resources via:
   - API calls with Tenant B IDs
   - Direct database queries (if SQL access available)
   - Parameter manipulation in UI
5. Verify all attempts return 403 or empty results (NOT Tenant B's data)

**Permission boundary testing:**
1. Create test accounts for each role (admin, coach, athlete, etc.)
2. For each role, test CRUD operations on each resource type
3. Document: Expected behavior vs Actual behavior
4. Verify server enforces permissions (test with API directly, bypassing UI)

**Rate limiting verification:**
1. Script 20 rapid login attempts → expect 429 after threshold
2. Wait for timeout → verify access restored
3. Test with different IPs/user agents → verify limits still enforced

### Penetration Testing Checklist

**OWASP Top 10 verification:**
- [ ] Broken Access Control - Test IDOR, privilege escalation, cross-tenant access
- [ ] Cryptographic Failures - Verify HTTPS, token encryption, password hashing
- [ ] Injection - Test SQL injection via API params (Supabase uses parameterized queries)
- [ ] Insecure Design - Review architecture for tenant isolation, RBAC design
- [ ] Security Misconfiguration - Verify secure headers, error handling, default credentials removed
- [ ] Vulnerable Components - Run `npm audit`, check for outdated Supabase libraries
- [ ] Authentication Failures - Test brute force, session fixation, credential stuffing
- [ ] Software & Data Integrity - Verify SRI for external scripts, validate API responses
- [ ] Logging & Monitoring Failures - Verify security events logged and monitored
- [ ] SSRF - Test if API can be tricked into making requests to internal resources

---

## Audit Areas Coverage

| Audit Area | Critical Items | Important Items | Good Practice Items | Total |
|------------|----------------|-----------------|---------------------|-------|
| API Authentication | 8 | 0 | 0 | 8 |
| RBAC Permissions | 0 | 9 | 0 | 9 |
| Tenant Isolation | 10 | 0 | 7 (Supabase-specific) | 17 |
| Secrets/Env Vars | 7 | 0 | 0 | 7 |
| Audit Logging | 0 | 10 | 0 | 10 |
| Rate Limiting | 0 | 0 | 7 | 7 |
| **TOTAL** | **25** | **19** | **14** | **58** |

**Additional areas:** Session Management (6), Client-Side Security (7), Infrastructure (8)

---

## Risk Prioritization

### Week 1: Critical Items Only
Focus on items that could cause immediate data exposure:
- All tenant isolation testing (10 items)
- JWT signature/claims validation (8 items)
- Secrets in client bundle verification (7 items)

**Exit criteria:** No cross-tenant data leaks, no secrets exposed, authentication cannot be bypassed

### Week 2: Important Items
Focus on access control and audit trail:
- RBAC boundary testing (9 items)
- Audit logging verification (10 items)
- Session management (6 items)

**Exit criteria:** Role boundaries enforced, all security events logged, sessions properly managed

### Week 3: Good Practice Items
Defense in depth and compliance:
- Rate limiting (7 items)
- Client-side security (7 items)
- Infrastructure hardening (8 items)

**Exit criteria:** Industry best practices implemented, ready for SOC 2 / penetration testing

---

## Known Gaps and Limitations

### Research Confidence Levels

| Area | Confidence | Reason |
|------|------------|--------|
| Tenant Isolation | **HIGH** | Multiple authoritative sources (Microsoft Azure docs, WorkOS blog, Supabase official docs) |
| JWT Security | **HIGH** | 2026-specific vulnerability lists, OWASP cheat sheets, official JWT.io guidance |
| RLS Testing | **HIGH** | Supabase official docs, pgTAP examples, SupaShield tool documentation |
| CASL Testing | **MEDIUM** | Official docs exist but 2026-specific testing guidance limited |
| Audit Logging | **HIGH** | Supabase PGAudit docs, SOC 2 compliance requirements |
| Rate Limiting | **HIGH** | Current (2026) best practices from Cloudflare, Levo.ai, Phoenix Strategy |

### Unresolved Questions

1. **CASL integration testing:** Official CASL.js documentation exists but specific testing patterns for 5-role hierarchy with tenant context need project-specific implementation
2. **Background job tenant isolation:** Supabase cron jobs and triggers need manual verification that they don't bypass RLS policies
3. **Realtime subscription security:** Verify Supabase Realtime channels properly enforce tenant isolation (official docs confirm they inherit RLS but needs testing)

---

## Sources

### Tenant Isolation & Multi-Tenancy
- [WorkOS: Tenant Isolation in Multi-Tenant Systems](https://workos.com/blog/tenant-isolation-in-multi-tenant-systems)
- [Microsoft Azure: Multitenant Tenancy Models](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models)
- [TestGrid: Multi-Tenancy Testing](https://testgrid.io/blog/multi-tenancy/)
- [The Nile: Shipping Multi-Tenant SaaS Using Postgres RLS](https://www.thenile.dev/blog/multi-tenant-rls)

### Row-Level Security (RLS)
- [Supabase: Row Level Security Official Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Blair Jordan: Testing RLS Policies with pgTAP](https://blair-devmode.medium.com/testing-row-level-security-rls-policies-in-postgresql-with-pgtap-a-supabase-example-b435c1852602)
- [SupaShield: Automated Supabase RLS Security Testing](https://supashield.app/)
- [Supabase: PGAudit Extension](https://supabase.com/docs/guides/database/extensions/pgaudit)

### JWT & API Authentication
- [Curity: JWT Security Best Practices](https://curity.io/resources/learn/jwt-best-practices/)
- [Red Sentry: JWT Vulnerabilities List 2026](https://redsentry.com/resources/blog/jwt-vulnerabilities-list-2026-security-risks-mitigation-guide)
- [Wiz: API Security Checklist 2026](https://www.wiz.io/academy/api-security/api-security-checklist)
- [Levo.ai: API Security Testing Checklist 2026](https://www.levo.ai/resources/blogs/api-security-testing-checklist-2025)
- [OWASP: REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)

### Secrets Management
- [Security Boulevard: Are Environment Variables Safe for Secrets in 2026?](https://securityboulevard.com/2025/12/are-environment-variables-still-safe-for-secrets-in-2026/)
- [OWASP: Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Wiz: Secrets Management Best Practices](https://www.wiz.io/academy/application-security/secrets-management)

### Rate Limiting
- [Levo.ai: REST API Security Best Practices 2026](https://www.levo.ai/resources/blogs/rest-api-security-best-practices)
- [Phoenix Strategy: API Rate Limiting Best Practices for Security](https://www.phoenixstrategy.group/blog/api-rate-limiting-best-practices-for-security)
- [Cloudflare: Rate Limiting Best Practices](https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/)

### Session Management
- [1Password Passage: Better Session Management with Refresh Tokens](https://passage.1password.com/post/better-session-management-with-refresh-tokens)
- [Reform: How Refresh Tokens Improve API Session Management](https://www.reform.app/blog/how-refresh-tokens-improve-api-session-management)
- [SkyCloak: JWT Token Lifecycle Management](https://skycloak.io/blog/jwt-token-lifecycle-management-expiration-refresh-revocation-strategies/)

### Client-Side Security (XSS, CSRF)
- [Hicron: Essential Frontend Security Checklist](https://hicronsoftware.com/blog/frontend-security-checklist-xss-csrf/)
- [ZuniWeb: Frontend Security Essentials 2026](https://zuniweb.com/blog/-frontend-security-essentials-owasp-top-10-secure-auth-and-pentesting-tips/)
- [OWASP: Cross-Site Request Forgery Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [GloryWebs: React Security Practices 2026](https://www.glorywebs.com/blog/react-security-practices)

### RBAC & Authorization
- [WorkOS: How to Design RBAC for Multi-Tenant SaaS](https://workos.com/blog/how-to-design-multi-tenant-rbac-saas)
- [Permit.io: Best Practices for Multi-Tenant Authorization](https://www.permit.io/blog/best-practices-for-multi-tenant-authorization)
- [CASL.js Official Documentation](https://casl.js.org/)

### Compliance & Audit
- [Qualysec: SaaS Security Compliance Checklist](https://qualysec.com/saas-security-compliance-checklist/)
- [Pentesttesting: 30-Day Multi-Tenant SaaS Breach Containment Blueprint](https://www.pentesttesting.com/multi-tenant-saas-breach-containment/)
