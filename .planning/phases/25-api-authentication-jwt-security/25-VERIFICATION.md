---
phase: 25-api-authentication-jwt-security
verified: 2026-01-28T23:15:00Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "User can log out and session is invalidated"
    status: failed
    reason: "No logout functionality exists in the application"
    artifacts:
      - path: "src/app/api/auth/logout/route.ts"
        issue: "File does not exist"
      - path: "src/components/layout/navigation-sidebar.tsx"
        issue: "No logout button or link"
      - path: "src/app/(dashboard)/[teamSlug]/settings/page.tsx"
        issue: "No logout option in settings"
    missing:
      - "POST /api/auth/logout endpoint that calls supabase.auth.signOut()"
      - "Clear context cookies (clearCurrentClubId, clearCurrentFacilityId)"
      - "Logout button in UI (settings page or navigation)"
      - "Redirect to /login after logout"
---

# Phase 25: API Authentication & JWT Security Verification Report

**Phase Goal:** All API routes are secured with verified JWT authentication and proper session management
**Verified:** 2026-01-28T23:15:00Z
**Status:** gaps_found
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | No API route accepts requests without valid JWT authentication | VERIFIED | All 88 routes have auth checks or are whitelisted public with justification |
| 2 | Expired JWT tokens are rejected with proper error responses | VERIFIED | Supabase getUser() validates expiration server-side |
| 3 | User can log in, maintain session across browser refresh | VERIFIED | signInWithPassword() + httpOnly cookies + middleware refresh |
| 4 | User can log out cleanly | FAILED | No signOut call exists anywhere in src/ |
| 5 | JWT signature verification catches tampered tokens | VERIFIED | getUser() validates signatures server-side |
| 6 | Token refresh flow extends sessions without re-authentication | VERIFIED | middleware getUser() auto-refreshes + manual refreshSession() |

**Score:** 4/5 truths verified (5/6 individual checks, but logout is critical to session management)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/middleware.ts` | JWT verification on every request | VERIFIED | Line 67-72 uses getUser() with security comment |
| `src/lib/auth/claims.ts` | Secure claims extraction | VERIFIED | getUser() at line 68 before getSession() at line 75 |
| `src/lib/auth/get-auth-context.ts` | CASL ability creation | VERIFIED | Calls getClaimsForApiRoute() which uses secure pattern |
| `src/app/(auth)/login/page.tsx` | Login with signInWithPassword | VERIFIED | Line 27-30 uses Supabase signInWithPassword |
| `src/app/api/auth/logout/route.ts` | Logout endpoint | MISSING | File does not exist |
| `package.json` | Next.js 15.2.3+ (CVE patched) | VERIFIED | Next.js 16.1.3 installed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| middleware.ts | Supabase auth | getUser() | WIRED | Line 70-72 verifies JWT server-side |
| claims.ts | getUser() | direct call | WIRED | Line 68 calls getUser() before getSession() |
| API routes | claims.ts | getClaimsForApiRoute() | WIRED | 52 routes use this pattern |
| API routes | get-auth-context.ts | getAuthContext() | WIRED | 25 routes use CASL pattern |
| context-switcher.tsx | Supabase auth | refreshSession() | WIRED | Line 124 refreshes JWT on context switch |

### Authentication Pattern Distribution

| Pattern | Count | Status |
|---------|-------|--------|
| `getClaimsForApiRoute()` | 52 routes | All verified |
| `getAuthContext()` + CASL | 25 routes | All verified |
| Direct `supabase.auth.getUser()` | 4 routes | All verified |
| `CRON_SECRET` header | 2 routes | All verified |
| Intentionally public (justified) | 3 routes | All justified with mitigations |

### Public Routes (Justified)

| Route | Justification | Mitigations |
|-------|---------------|-------------|
| `/api/auth/callback` | OAuth callback for Supabase auth | Supabase secure code exchange |
| `/api/join` | Accept invitations before team membership | Rate limiting, requires Supabase session |
| `/api/equipment/[id]/damage-reports` (POST) | Anonymous damage reporting via QR | Rate limiting (10/15min), honeypot validation |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| N/A | N/A | No logout implementation | BLOCKER | Users cannot end sessions |

### Human Verification Required

### 1. Session Persistence Test
**Test:** Log in, close browser tab, open new tab and navigate to app
**Expected:** Still logged in without re-authentication
**Why human:** Browser behavior cannot be simulated programmatically

### 2. Token Expiry Test
**Test:** Stay logged in but idle for >1 hour, then perform action
**Expected:** Action succeeds without login prompt (auto-refresh)
**Why human:** Requires waiting for actual token expiry

### 3. Invalid Token Test
**Test:** Manually modify JWT in browser cookies, then make API request
**Expected:** 401 response or redirect to login
**Why human:** Requires browser DevTools manipulation

### Gaps Summary

**Critical Gap: Missing Logout Functionality**

The codebase has no logout functionality. Grep for `signOut` in src/ returns zero results. Users cannot:
- End their sessions
- Log out from shared devices
- Invalidate compromised sessions from client side

The only way to "log out" is:
1. Manually clear browser cookies
2. Wait for session token expiry

**Required Fix:**
1. Create `POST /api/auth/logout` endpoint
2. Call `supabase.auth.signOut()` to invalidate session
3. Call `clearCurrentClubId()` and `clearCurrentFacilityId()` to clear context cookies
4. Add logout button to settings page or navigation
5. Redirect to `/login` after logout

**Files that already exist and can be used:**
- `src/lib/auth/club-context.ts` has `clearCurrentClubId()` (line 34-37) - currently unused
- `src/lib/auth/facility-context.ts` has `clearCurrentFacilityId()` (line 34-37) - currently unused

---

## Verification Evidence

### Middleware JWT Verification (VERIFIED)

```typescript
// src/middleware.ts lines 67-72
// IMPORTANT: Use getUser() for auth verification, NOT getSession()
// getSession() doesn't verify the JWT and is susceptible to forgery
// This call refreshes the auth token if needed
const {
  data: { user },
} = await supabase.auth.getUser();
```

### Claims Extraction (VERIFIED)

```typescript
// src/lib/auth/claims.ts lines 67-75
// SECURITY: Call getUser() first - validates JWT with Supabase server
const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user) {
  return { user: null, claims: null, facilityId: null, clubId: null, roles: [], viewMode: null, error: 'Unauthorized' };
}

// Get session for JWT claims (after getUser validates auth)
const { data: { session } } = await supabase.auth.getSession();
```

### No Logout (FAILED)

```bash
# Search for signOut in src/
$ grep -r "signOut" src/
# No results

# Search for logout route
$ ls src/app/api/auth/logout/
# No such file or directory
```

### Next.js Version (CVE-2025-29927 PATCHED)

```json
// package.json
"next": "16.1.3"
```

---

_Verified: 2026-01-28T23:15:00Z_
_Verifier: Claude (gsd-verifier)_
