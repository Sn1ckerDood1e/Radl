# Security Audit Stack

**Project:** Radl Security Audit Milestone
**Domain:** Multi-tenant SaaS Security Testing
**Existing Stack:** Next.js 16 + React 19, Prisma 6 + PostgreSQL (Supabase), CASL + Supabase Auth
**Researched:** 2026-01-28

## Executive Summary

This research identifies tools for auditing an existing Next.js + Supabase + Prisma application before beta testing. The focus is on detecting vulnerabilities in authentication, authorization (RLS policies + CASL), multi-tenant isolation, and infrastructure configuration.

**Key Finding:** Layer multiple tool categories rather than relying on a single scanner. Static analysis misses runtime issues; dynamic testing misses code patterns; manual review catches architectural problems.

**Cost:** $0 for comprehensive audit using open-source tools. Optional upgrades: Snyk Pro (~$99/month), Burp Suite Pro ($449/year).

---

## Recommended Tools by Category

### 1. Dependency & Supply Chain Security

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| **GitHub Dependabot** | Native | Automated vulnerability alerts + PRs | Already integrated with GitHub, free, actively maintained in 2026 |
| **npm audit** | Native | Baseline vulnerability scanning | Built into npm, zero config, scans production dependencies |
| **Socket** | Latest | Malware & suspicious package detection | Detects supply chain attacks npm audit misses (behavioral analysis) |
| **Snyk** | Latest (optional) | Enhanced vulnerability intel + fix guidance | Superior to npm audit for accuracy, friendly UI, but requires account |

**Implementation approach:**
1. Enable Dependabot security updates (automatic PR creation)
2. Run `npm audit` in CI pipeline as baseline check
3. Add Socket for supply chain threat detection
4. Consider Snyk for enhanced reporting (optional upgrade from npm audit)

**Why this matters for Radl:**
- npm audit by default scans both production and dev dependencies
- Socket detects malicious packages that pass traditional scanners
- Dependabot keeps dependencies current automatically

**Confidence:** HIGH

**Sources:**
- [GitHub Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Comparing npm audit with Snyk](https://nearform.com/insights/comparing-npm-audit-with-snyk/)
- [npm Security Guide 2026](https://blog.cyberdesserts.com/npm-security-vulnerabilities/)

---

### 2. Static Code Analysis (SAST)

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| **Semgrep** | Latest | Custom rule-based code scanning | Fast (20K-100K loc/sec), supports custom rules for Next.js patterns, free tier available |
| **ESLint + eslint-plugin-security** | Latest | JavaScript security linting | Already likely in codebase, minimal config, catches common JS vulnerabilities |
| **@next/eslint-plugin-next** | 16.1.2+ | Next.js-specific security rules | Official Next.js plugin, updated for Next.js 16 |

**Alternative:** SonarQube (more comprehensive but slower, better for ongoing monitoring than one-time audit)

**Semgrep rules to enable:**
- Authentication bypasses (JWT validation, session handling)
- SQL injection patterns (Prisma raw queries)
- XSS vulnerabilities (React dangerouslySetInnerHTML)
- Insecure data access patterns (missing authorization checks)
- Environment variable leaks

**Implementation approach:**
1. Add ESLint security plugin to existing ESLint config
2. Run Semgrep with security ruleset: `semgrep --config=auto --config=security`
3. Create custom Semgrep rules for CASL authorization patterns
4. Focus on server components, API routes, server actions

**Why Semgrep over SonarQube for this audit:**
- Semgrep: 20K-100K loc/sec, custom rules, lightweight
- SonarQube: ~400 loc/sec, heavyweight, better for continuous monitoring
- For one-time pre-beta audit, Semgrep is sufficient and faster

**Confidence:** HIGH

**Sources:**
- [Semgrep vs SonarQube Comparison 2026](https://armur.ai/semgrep-vs-sonarQube)
- [ESLint Security Plugin](https://www.npmjs.com/package/eslint-plugin-security)
- [Next.js ESLint Configuration](https://nextjs.org/docs/app/api-reference/config/eslint)

---

### 3. Secrets Scanning

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| **TruffleHog** | Latest | Git history secrets scanning | Scans entire git history (even deleted commits), verifies 700+ credential types via API |
| **GitGuardian** | Latest (optional) | Real-time secret detection | Monitors commits in real-time, good for prevention (less relevant for one-time audit) |

**Critical for Supabase projects - check for leaked:**
- Supabase service_role keys (full database bypass)
- Supabase anon keys in public repos
- Database connection strings
- JWT secrets
- API keys in environment files committed by mistake

**Implementation approach:**
1. Run TruffleHog on entire repository: `trufflehog git file://. --only-verified`
2. Scan build artifacts to ensure no env vars leaked into deployed version
3. Review `.env.example` vs `.env` to ensure no secrets in version control

**TruffleHog verification feature:**
- Default behavior: verifies secrets via dynamic API requests
- Example: For AWS keys, tests against AWS API
- Result: Know if leaked secrets are still active

**Confidence:** HIGH

**Sources:**
- [TruffleHog GitHub Repository](https://github.com/trufflesecurity/trufflehog)
- [Comprehensive Git Secrets Scanning Guide](https://trufflesecurity.com/blog/scanning-git-for-secrets-the-2024-comprehensive-guide)
- [Next.js Security Checklist - Secrets](https://blog.arcjet.com/next-js-security-checklist/)

---

### 4. Database & RLS Policy Testing

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| **pgTAP** | Latest | PostgreSQL unit testing | Native PostgreSQL extension, TAP-emitting assertions, available in Supabase |
| **SupaShield** | Latest | Automated RLS testing CLI | Purpose-built for Supabase RLS, generates coverage reports, exports to pgTAP format |
| **Supabase Database Advisors** | Native | Performance & security checks | Built into Supabase dashboard, detects missing RLS policies |

**Critical tests for multi-tenant isolation:**
1. **Tenant isolation:** User A cannot access User B's data
2. **Role-based access:** Different roles see different data
3. **Table coverage:** All tables have appropriate RLS policies
4. **Storage RLS:** Supabase storage buckets have proper policies
5. **RPC policies:** Database functions respect RLS

**Implementation approach:**
1. Enable pgTAP extension in Supabase: `CREATE EXTENSION IF NOT EXISTS pgtap;`
2. Install SupaShield: `npm install -g supashield`
3. Run SupaShield scan: `supashield scan --export-pgtap`
4. Write manual pgTAP tests for critical tenant isolation scenarios
5. Use test helper procedures to simulate different user contexts

**Example pgTAP test structure:**
```sql
BEGIN;
SELECT plan(3);

-- Test: User cannot see other user's data
SET request.jwt.claims TO '{"sub": "user-1"}';
SELECT is(
  (SELECT COUNT(*) FROM practices WHERE user_id != 'user-1'),
  0::bigint,
  'User 1 cannot query other users practices'
);

SELECT * FROM finish();
ROLLBACK;
```

**Why pgTAP is critical:**
- RLS policies are code-as-configuration
- No easy way to debug when they fail
- pgTAP automates regression testing of policies
- Test helper procedures simulate different user roles without frontend

**Confidence:** MEDIUM (pgTAP is HIGH, SupaShield is newer tool from 2025-2026)

**Sources:**
- [Supabase Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview)
- [SupaShield GitHub Repository](https://github.com/Rodrigotari1/supashield)
- [pgTAP Documentation](https://pgtap.org/)
- [Testing RLS with pgTAP (Medium)](https://blair-devmode.medium.com/testing-row-level-security-rls-policies-in-postgresql-with-pgtap-a-supabase-example-b435c1852602)
- [Supabase Database Advisors](https://supabase.com/docs/guides/database/database-advisors)

---

### 5. Authentication & Authorization Testing

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| **jwt_tool** | Latest | JWT security testing | Comprehensive JWT attack testing, validates token strength, free and open source |
| **Postman/Bruno** | Latest | API endpoint testing | Manual authorization testing, can script multi-user scenarios |

**CASL-specific testing (manual):**
- No dedicated CASL testing tool exists
- Must write integration tests using Jest/Vitest
- Test ability definitions against actual user roles
- Verify frontend Can components match backend enforcement

**Critical authorization tests:**
1. **JWT validation:** Weak signing algorithms, missing expiry, audience claims
2. **Session fixation:** Session tokens properly rotated
3. **Authorization bypass:** Backend re-validates permissions (not just frontend)
4. **CASL rules:** Frontend abilities match backend RLS policies

**Implementation approach:**
1. Use jwt_tool to test Supabase JWT tokens: `jwt_tool [token] -M at`
2. Write integration tests for CASL abilities (no dedicated tool exists)
3. Test server actions enforce authorization (not just client components)
4. Verify Data Access Layer doesn't import outside server contexts

**Example CASL integration test:**
```typescript
// Test that CASL rules match RLS policies
test('CASL and RLS agree on practice access', async () => {
  const user = { id: 'user-1', role: 'coach', teamId: 'team-1' };
  const ability = defineAbilityFor(user);

  // Frontend check
  expect(ability.can('read', practice)).toBe(true);

  // Backend check (should match)
  const result = await prisma.practice.findMany({
    where: { id: practice.id }
  });
  expect(result).toHaveLength(1);
});
```

**jwt_tool attack modes to test:**
- Algorithm confusion attacks (HS256 vs RS256)
- Signature stripping (alg: none)
- JWT crack (weak secrets)
- Claims manipulation (role escalation)

**Confidence:** MEDIUM for CASL (no dedicated tool), HIGH for JWT testing (jwt_tool is mature)

**Sources:**
- [jwt_tool GitHub Repository](https://github.com/ticarpi/jwt_tool)
- [OWASP JWT Testing Guide](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/10-Testing_JSON_Web_Tokens)
- [CASL Testing Documentation](https://casl.js.org/v4/en/advanced/debugging-testing/)
- [Next.js Security - Server Actions](https://nextjs.org/blog/security-nextjs-server-components-actions)

---

### 6. Dynamic Application Security Testing (DAST)

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| **OWASP ZAP** | Latest | Automated vulnerability scanning | Free, open source, excellent for CI/CD, faster than Burp Suite |
| **Burp Suite Community** | Latest (optional) | Manual penetration testing | Industry standard for manual testing, more comprehensive but slower |

**When to use DAST:**
- Test deployed application (staging environment)
- Find runtime vulnerabilities static analysis misses
- Test authentication flows end-to-end
- Discover misconfigurations in headers, CORS, CSP

**Implementation approach:**
1. Deploy to staging environment with test data
2. Run OWASP ZAP automated scan: `zap-cli quick-scan http://staging.url`
3. Use ZAP's authentication scanner for login flows
4. Export results and prioritize findings
5. Consider Burp Suite for deeper manual testing if time permits

**OWASP ZAP advantages for this audit:**
- Automation-friendly (YAML configuration, GitHub Actions integration)
- Faster than Burp Suite
- Free and open source
- Good for CI/CD pipelines

**Burp Suite advantages (if time permits):**
- Better manual testing precision
- More comprehensive API security features
- Industry standard for penetration testing

**Confidence:** MEDIUM (depends on proper staging environment configuration)

**Sources:**
- [OWASP ZAP Tutorial 2026](https://www.stationx.net/owasp-zap-tutorial/)
- [Burp vs ZAP Comparison](https://www.apisec.ai/blog/burp-suite-vs-zap)
- [OWASP ZAP for API Testing](https://www.pynt.io/learning-hub/burp-suite-guides/burp-suite-vs-zap-features-key-differences-limitations)

---

### 7. Infrastructure & Configuration Audit

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| **Next.js Security Headers Middleware** | Native | CSP, HSTS, security headers | Built into Next.js 16, configure via middleware |
| **securityheaders.com** | Web tool | Validate deployed headers | Quick validation of security headers |

**Critical Next.js security configurations:**
1. **Content Security Policy (CSP)** with nonces
2. **Strict-Transport-Security (HSTS)**
3. **X-Frame-Options** (prevent clickjacking)
4. **X-Content-Type-Options: nosniff**
5. **Referrer-Policy**
6. **Permissions-Policy**

**Supabase-specific checks:**
1. **RLS enabled** on all tables
2. **Service role key** never exposed to frontend
3. **Row-level security** policies comprehensive
4. **Database roles** properly scoped
5. **Storage policies** match table RLS

**Implementation approach:**
1. Review Next.js security headers configuration
2. Implement CSP with nonces via middleware
3. Use Supabase Database Advisors to check RLS coverage
4. Test headers in staging: visit securityheaders.com
5. Review Supabase dashboard security recommendations

**Example Next.js CSP middleware with nonces:**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Nonce', nonce);

  return response;
}
```

**Confidence:** HIGH

**Sources:**
- [Next.js Content Security Policy Guide](https://nextjs.org/docs/pages/guides/content-security-policy)
- [Next.js Security Headers Configuration](https://nextjs.org/docs/pages/api-reference/config/next-config-js/headers)
- [Ultimate Guide to HTTP Security Headers](https://medium.com/@rishabhsinghkkr/%EF%B8%8Fthe-ultimate-guide-to-http-security-headers-csp-in-next-js-9a454d72089b)

---

## Critical Prisma Security Concerns

### Operator Injection Vulnerability (2026 Discovery)

**NEW SECURITY CONCERN:** Prisma combined with PostgreSQL is vulnerable to **operator injection** (not just SQL injection).

**What it is:**
```typescript
// Vulnerable code
const user = await prisma.user.findFirst({
  where: {
    email: email,
    password: password // User input passed directly
  }
});

// Attack: pass password = { "not": "" }
// Result: Returns user when only email matches (password check bypassed!)
```

**Affected Prisma methods:**
- `findFirst`
- `findMany`
- `updateMany`
- `deleteMany`

**How to test:**
1. Identify all Prisma queries accepting user input in `where` clauses
2. Test with operator objects: `{ not: "", contains: "", startsWith: "" }`
3. Verify input validation/sanitization before Prisma queries

**Prevention:**
- Validate user input types (reject objects when expecting strings)
- Use TypeScript strict mode to catch type mismatches
- Sanitize user input at application layer before database queries

**Example test:**
```typescript
// Test operator injection vulnerability
test('Prisma query rejects operator objects', async () => {
  const maliciousInput = { not: "" };

  // Should fail validation BEFORE hitting Prisma
  await expect(
    loginUser({ email: "test@example.com", password: maliciousInput })
  ).rejects.toThrow('Invalid input');
});
```

**Why this matters:**
- Traditional SQL injection protection (parameterized queries) doesn't prevent this
- Prisma's type system can be bypassed with `any` types
- Affects authentication, authorization, and data access queries

**Confidence:** HIGH (documented by Aikido security research 2026)

**Sources:**
- [Prisma NoSQL Injection Vulnerability](https://www.aikido.dev/blog/prisma-and-postgresql-vulnerable-to-nosql-injection)
- [Prisma Security Best Practices](https://medium.com/@s.klop/introduction-to-prisma-security-best-practices-in-prisma-applications-part-11-15-19696bdcb99b)
- [Prisma SQL Injection Discussion](https://github.com/prisma/prisma/discussions/19533)

---

## Manual Review Checklist

**No tool can catch these - requires human review:**

### 1. Data Access Layer Isolation
- [ ] Database packages (`@prisma/client`) only imported in server contexts
- [ ] Environment variables not imported in client components
- [ ] No database queries in "use client" files

### 2. Server Component Security (Next.js 16)
- [ ] Component props don't receive private data from server
- [ ] Server action arguments validated with Zod/TypeScript
- [ ] User re-authorized inside each server action (not just in parent)
- [ ] Server actions don't trust client-provided IDs without verification

### 3. CASL + RLS Alignment
- [ ] CASL abilities match RLS policies (no divergence)
- [ ] Frontend CASL rules are subset of backend RLS (never more permissive)
- [ ] Authorization enforced on both frontend (UX) and backend (security)
- [ ] Can component usage matches backend enforcement

### 4. Multi-Tenant Isolation
- [ ] All queries filter by tenant ID (team, organization, user)
- [ ] No raw SQL queries bypass tenant filters
- [ ] File uploads scoped to tenant in Supabase Storage
- [ ] RLS policies prevent cross-tenant data access

### 5. Prisma Raw Queries
- [ ] Use `$queryRaw` with tagged templates (not `$queryRawUnsafe`)
- [ ] Never use `$executeRawUnsafe` or `$queryRawUnsafe` with user input
- [ ] Validate input types to prevent operator injection
- [ ] All user input sanitized before database queries

### 6. Authentication Flows
- [ ] Password reset tokens expire
- [ ] Email verification required before sensitive actions
- [ ] Rate limiting on auth endpoints
- [ ] Session tokens rotated on privilege escalation

### 7. API Routes & Server Actions
- [ ] All API routes validate authentication
- [ ] Authorization checked per-request (not just at route level)
- [ ] Input validation with Zod schemas
- [ ] Error messages don't leak sensitive information

**Sources:**
- [Next.js Data Security Guide](https://nextjs.org/docs/app/guides/data-security)
- [Next.js Security Best Practices](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [Next.js Security Checklist](https://blog.arcjet.com/next-js-security-checklist/)

---

## What NOT to Use

### ❌ Prisma Cloud
**Why:** Prisma Cloud is Palo Alto's CNAPP platform, NOT related to Prisma ORM. Confusion in search results. Not applicable to this audit.

### ❌ GitGuardian (for one-time audit)
**Why:** Best for continuous monitoring, overkill for one-time pre-beta audit. TruffleHog is sufficient and free.

### ❌ SonarQube (for one-time audit)
**Why:** Excellent for ongoing code quality, but slow and heavyweight for one-time audit. Semgrep is faster for this use case (20K-100K loc/sec vs ~400 loc/sec).

### ❌ eslint-plugin-react-security
**Why:** No longer actively maintained by Snyk team as of 2026. Use `eslint-plugin-security` instead.

### ❌ AuditYourApp
**Why:** Commercial SaaS scanner for Supabase/Firebase. Likely overkill for pre-beta. Use SupaShield + pgTAP for RLS testing instead (free, more control).

### ❌ Continuous monitoring tools (for this audit)
**Why:** Tools like Datadog, Sentry, LogRocket are for production monitoring. Not relevant for pre-beta security audit. Add after launch.

---

## Recommended Audit Sequence

### Phase 1: Setup (Day 0)
- Enable Dependabot security updates in GitHub
- Install TruffleHog: `brew install trufflehog` or `docker pull trufflesecurity/trufflehog`
- Install Semgrep: `pip install semgrep`
- Install SupaShield: `npm install -g supashield`
- Enable pgTAP in Supabase: `CREATE EXTENSION IF NOT EXISTS pgtap;`
- Install OWASP ZAP: Download from owasp.org/zap

### Phase 2: Automated Scans (Day 1-2)
**Dependency scanning:**
```bash
npm audit --production
npx socket-cli scan
```

**Secrets scanning:**
```bash
trufflehog git file://. --only-verified
```

**Static analysis:**
```bash
semgrep --config=auto --config=security src/
npx eslint . --ext .js,.jsx,.ts,.tsx
```

**RLS testing:**
```bash
supashield scan --export-pgtap
```

### Phase 3: Manual Testing (Day 3-4)
**JWT security testing:**
```bash
jwt_tool [Supabase access token] -M at
```

**CASL authorization tests:**
- Write integration tests for ability definitions
- Test frontend Can components match backend enforcement

**Prisma operator injection tests:**
- Test all Prisma queries with malicious operator objects
- Verify input validation before database queries

**Multi-tenant isolation tests:**
- Create test users in different teams
- Verify user A cannot access user B's data
- Test RLS policies with pgTAP

### Phase 4: Dynamic Testing (Day 5)
**OWASP ZAP scan:**
```bash
zap-cli quick-scan http://staging.radl.sol
```

**Manual penetration testing:**
- Test authentication flows
- Test authorization bypasses
- Test API endpoints with different user roles

### Phase 5: Configuration Review (Day 6)
**Security headers:**
- Visit securityheaders.com with staging URL
- Review Next.js middleware CSP configuration

**Supabase security:**
- Check RLS enabled on all tables via Database Advisors
- Verify service_role key not in frontend code
- Review Storage bucket policies

**Manual checklist:**
- Review Data Access Layer isolation
- Check Server Component security
- Verify CASL + RLS alignment

### Phase 6: Remediation & Re-scan (Day 7+)
- Fix critical/high severity findings
- Re-run affected scans
- Document accepted risks (low severity issues)
- Create GitHub issues for deferred fixes

---

## Integration with Existing Stack

**Next.js 16 compatibility:**
- All tools support Next.js 16
- ESLint plugin updated to 16.1.2+ (published Jan 2026)
- CSP middleware approach official as of Next.js 13.5+
- Server actions security patterns documented by Next.js team

**Prisma 6 compatibility:**
- Semgrep, ESLint work with any Prisma version
- Operator injection vulnerability applies to Prisma 6
- pgTAP tests database layer (Prisma-agnostic)
- $queryRaw vs $queryRawUnsafe patterns same in Prisma 6

**Supabase compatibility:**
- pgTAP available as Supabase extension
- SupaShield purpose-built for Supabase
- Database Advisors built into Supabase dashboard
- JWT testing with jwt_tool works with Supabase tokens

**CASL compatibility:**
- No dedicated CASL testing tools exist
- Must write custom integration tests
- CASL abilities should mirror RLS policies
- Test both frontend (Can components) and backend enforcement

---

## Cost Breakdown

| Tool | Cost | Notes |
|------|------|-------|
| **Dependabot** | Free | GitHub native |
| **npm audit** | Free | npm native |
| **Socket** | Free tier | Sufficient for small teams, 100 scans/month |
| **Semgrep** | Free | OSS rules, Pro tier for custom rules ($$$) |
| **ESLint plugins** | Free | Open source |
| **TruffleHog** | Free | OSS version, Enterprise version available |
| **pgTAP** | Free | PostgreSQL extension |
| **SupaShield** | Free | Open source CLI |
| **jwt_tool** | Free | Open source Python tool |
| **OWASP ZAP** | Free | Open source |
| **Burp Suite Community** | Free | Pro version $449/year (optional) |
| **securityheaders.com** | Free | Web-based scanner |

**Total cost for comprehensive audit: $0** (all free tools)

**Optional upgrades:**
- Snyk Pro: ~$99/month (better vulnerability intel than npm audit)
- Burp Suite Pro: $449/year (deeper manual penetration testing)
- Socket Pro: ~$50/month (unlimited scans, team features)

**Time estimate:**
- Setup: 2-4 hours
- Automated scans: 4-8 hours
- Manual testing: 8-16 hours
- Remediation: Variable (depends on findings)
- **Total: 5-7 days** for comprehensive audit

---

## Confidence Assessment

| Category | Confidence | Reasoning |
|----------|-----------|-----------|
| **Dependency scanning** | HIGH | npm audit, Dependabot, Snyk are mature, well-documented tools with extensive vulnerability databases |
| **Static analysis** | HIGH | Semgrep actively maintained, official ESLint plugins, proven in production |
| **Secrets scanning** | HIGH | TruffleHog widely adopted (verified 700+ credential types), comprehensive |
| **RLS testing** | MEDIUM | SupaShield is newer (2025-2026), pgTAP is mature but requires custom test writing |
| **CASL testing** | LOW | No dedicated CASL testing tools exist, requires custom integration tests |
| **JWT testing** | HIGH | jwt_tool is mature, OWASP-documented attack vectors |
| **DAST** | MEDIUM | OWASP ZAP is mature, but effectiveness depends on proper staging config and authentication setup |
| **Prisma security** | HIGH | Operator injection documented by Aikido (2026), confirmed in Prisma GitHub discussions |
| **Infrastructure** | HIGH | Next.js CSP patterns official, Supabase security features well-documented |

---

## Sources Summary

### Official Documentation
- [Next.js Security Documentation](https://nextjs.org/docs/app/guides/data-security)
- [Next.js Security - Server Components & Actions](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [Supabase Testing Documentation](https://supabase.com/docs/guides/local-development/testing/overview)
- [Prisma Raw Queries Documentation](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries)
- [GitHub Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)

### Tool Repositories & Documentation
- [Semgrep GitHub](https://github.com/semgrep/semgrep)
- [TruffleHog GitHub](https://github.com/trufflesecurity/trufflehog)
- [SupaShield GitHub](https://github.com/Rodrigotari1/supashield)
- [pgTAP Official Site](https://pgtap.org/)
- [jwt_tool GitHub](https://github.com/ticarpi/jwt_tool)
- [OWASP ZAP](https://www.owasp.org/index.php/OWASP_Zed_Attack_Proxy_Project)

### Security Research & Best Practices
- [Prisma NoSQL Injection Vulnerability (Aikido, 2026)](https://www.aikido.dev/blog/prisma-and-postgresql-vulnerable-to-nosql-injection)
- [Next.js Security Checklist (Arcjet, 2026)](https://blog.arcjet.com/next-js-security-checklist/)
- [npm Security Vulnerabilities Guide](https://blog.cyberdesserts.com/npm-security-vulnerabilities/)
- [Testing RLS with pgTAP (Medium)](https://blair-devmode.medium.com/testing-row-level-security-rls-policies-in-postgresql-with-pgtap-a-supabase-example-b435c1852602)
- [OWASP JWT Testing Guide](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/10-Testing_JSON_Web_Tokens)

### Tool Comparisons
- [Semgrep vs SonarQube 2026](https://armur.ai/semgrep-vs-sonarQube)
- [npm audit vs Snyk](https://nearform.com/insights/comparing-npm-audit-with-snyk/)
- [Burp Suite vs OWASP ZAP](https://www.apisec.ai/blog/burp-suite-vs-zap)
- [TruffleHog vs Gitleaks](https://www.jit.io/resources/appsec-tools/trufflehog-vs-gitleaks-a-detailed-comparison-of-secret-scanning-tools)

### Additional Resources
- [CASL Testing Documentation](https://casl.js.org/v4/en/advanced/debugging-testing/)
- [Supabase Database Advisors](https://supabase.com/docs/guides/database/database-advisors)
- [Next.js Content Security Policy Guide](https://nextjs.org/docs/pages/guides/content-security-policy)
