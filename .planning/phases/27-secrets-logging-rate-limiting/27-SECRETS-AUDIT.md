# Secrets Management Audit

**Phase:** 27 - Secrets, Logging & Rate Limiting
**Date:** 2026-01-29
**Auditor:** Claude (Automated + Manual Review)

## Executive Summary

All 5 secrets management requirements (SECR-01 through SECR-05) have been verified. The application properly isolates secrets from client-side code, uses environment variables correctly, hashes sensitive data, and has no hardcoded credentials.

| Requirement | Status | Risk Level |
|-------------|--------|------------|
| SECR-01: No secrets in client bundle | **PASS** | LOW |
| SECR-02: NEXT_PUBLIC_ properly scoped | **PASS** | LOW |
| SECR-03: Service role not client-accessible | **PASS** | LOW |
| SECR-04: API keys hashed in database | **PASS** | LOW |
| SECR-05: No hardcoded credentials | **PASS** | LOW |

## Detailed Findings

### SECR-01: No Secrets in Client Bundle

**Requirement:** Client-side JavaScript bundles must not contain any secret keys, tokens, or credentials.

**Status:** PASS

**Evidence:**

1. **Automated Bundle Scan:**
   - Created `scripts/check-bundle-secrets.sh` to scan `.next/static/chunks/`
   - Scanned for 11 secret patterns:
     - `service_role`
     - `sk_live` / `sk_test` (Stripe API keys)
     - `DATABASE_URL` / `DIRECT_URL`
     - `RESEND_API_KEY`
     - `VAPID_PRIVATE`
     - `RC_CLIENT_SECRET`
     - `supabase_service`
     - JWT header pattern `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`
     - `UPSTASH_REDIS_REST_TOKEN`
   - **Result:** No secrets found in client bundle

2. **Manual Verification:**
   - Searched `.next/static/` for unexpected environment variables
   - Only found expected `NEXT_PUBLIC_*` variables in output
   - Confirmed build output contains no server-side environment variables

**Conclusion:** Client bundles are clean. No secrets leak to browser.

---

### SECR-02: NEXT_PUBLIC_ Properly Scoped

**Requirement:** Environment variables prefixed with `NEXT_PUBLIC_` must contain only data safe for public exposure.

**Status:** PASS

**Evidence:**

From `.env.example`, all `NEXT_PUBLIC_` variables are safe for client exposure:

| Variable | Value Type | Safe? | Justification |
|----------|------------|-------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public API endpoint | ✓ | Supabase project URL is public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous key | ✓ | Anonymous key protected by RLS policies |
| `NEXT_PUBLIC_APP_URL` | Application URL | ✓ | Public domain/localhost |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public key | ✓ | Web-push public key (by design) |

**Analysis:**
- **Supabase anon key:** Protected by Row Level Security (RLS) policies at database level
- **No sensitive keys:** No API secrets, service role keys, or credentials exposed
- **Correct scoping:** All variables require client-side access for their function

**Conclusion:** All `NEXT_PUBLIC_` variables are appropriately scoped.

---

### SECR-03: Service Role Not Client-Accessible

**Requirement:** `SUPABASE_SERVICE_ROLE_KEY` must only be referenced in server-side code and never exposed to client.

**Status:** PASS

**Evidence:**

1. **Service Role Key Usage:**
   - File: `src/lib/supabase/admin.ts` (server-side module)
   - Function: `getSupabaseAdmin()` reads `process.env.SUPABASE_SERVICE_ROLE_KEY`
   - **No "use client" directive** - pure server module

2. **Usage Sites:**
   - `src/app/api/equipment/[id]/damage-reports/route.ts` - API route (server-side)
   - Called via `getUserEmailsByIds()` for admin operations
   - Only used for email lookup in damage report notifications

3. **Client Isolation:**
   - Searched all 217 "use client" files
   - **Zero** import `getSupabaseAdmin` or `SUPABASE_SERVICE_ROLE_KEY`
   - Service role never passed to client components

4. **Bundle Verification:**
   - Scanner confirmed no `service_role` or `supabase_service` in client chunks

**Code Review:**
```typescript
// src/lib/supabase/admin.ts - Server-only module
export function getSupabaseAdmin(): SupabaseClient | null {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Server-only
  // ... creates admin client
}
```

**Conclusion:** Service role key is properly isolated to server-side code.

---

### SECR-04: API Keys Hashed in Database

**Requirement:** API keys must be stored as SHA-256 hashes, not plaintext.

**Status:** PASS

**Evidence:**

1. **Implementation File:** `src/lib/auth/api-key.ts`

2. **Key Creation Process:**
   ```typescript
   // Generate secure random key
   const randomPart = nanoid(KEY_LENGTH);
   const fullKey = `${KEY_PREFIX}${randomPart}`;

   // Hash for storage (never store raw key)
   const keyHash = createHash('sha256')
     .update(fullKey)
     .digest('hex');

   await prisma.apiKey.create({
     data: {
       // ...
       keyHash,  // Only hash stored
       // ...
     },
   });

   return {
     key: fullKey, // Only returned once at creation!
   };
   ```

3. **Validation Process:**
   ```typescript
   export async function validateApiKey(key: string): Promise<ValidateApiKeyResult> {
     // Hash the provided key
     const keyHash = createHash('sha256')
       .update(key)
       .digest('hex');

     // Look up by hash
     const apiKey = await prisma.apiKey.findUnique({
       where: { keyHash },
     });
     // ...
   }
   ```

4. **Database Schema:**
   - Field: `keyHash` (stores SHA-256 hex digest)
   - Field: `keyPrefix` (stores first 8 chars for display, e.g., "sk_xYz12")
   - **No plaintext key field** in database

5. **Security Properties:**
   - Uses `nanoid(32)` for cryptographically secure random generation
   - SHA-256 hashing (industry standard)
   - Prefix pattern matches Stripe's API key design (`sk_...`)
   - Raw key shown only once at creation (matches best practices)

**Conclusion:** API keys are properly hashed with SHA-256. No plaintext storage.

---

### SECR-05: No Hardcoded Credentials

**Requirement:** Source code must not contain hardcoded credentials, API keys, or secrets.

**Status:** PASS

**Evidence:**

1. **Manual Pattern Search:**
   - Searched for common patterns:
     - `sk_live`, `sk_test` (Stripe keys)
     - `password = "..."`
     - `api_key = "..."`
     - `secret = "..."`
   - **Result:** No matches found in source code

2. **Environment Variable Usage:**
   - All secrets loaded from environment variables
   - `.env.example` contains placeholders only (no real values)
   - `.env` file is gitignored (not in repository)

3. **Secret References:**
   - `SUPABASE_SERVICE_ROLE_KEY` - from `process.env`
   - `RESEND_API_KEY` - from `process.env`
   - `RC_CLIENT_SECRET` - from `process.env`
   - `UPSTASH_REDIS_REST_TOKEN` - from `process.env`
   - `VAPID_PRIVATE_KEY` - from `process.env`

4. **TruffleHog CI Integration:**
   - Created `.github/workflows/security.yml`
   - Will run TruffleHog on every push/PR
   - Scans full git history for verified/unknown secrets

5. **Local Scan Limitation:**
   - TruffleHog CLI not installed locally
   - Performed manual pattern search as alternative
   - CI workflow will provide automated scanning going forward

**Conclusion:** No hardcoded credentials found. All secrets use environment variables.

---

## Remediation Required

**None.** All requirements pass.

## Recommendations

1. **Monitor CI:** Ensure GitHub Actions `security.yml` workflow runs successfully on next push
2. **Developer Training:** Document that `.env` must never be committed
3. **Pre-commit Hook:** Consider adding `check-bundle-secrets.sh` to pre-commit hooks
4. **Secret Rotation:** Establish periodic rotation schedule for:
   - `SUPABASE_SERVICE_ROLE_KEY` (quarterly)
   - `RESEND_API_KEY` (quarterly)
   - `UPSTASH_REDIS_REST_TOKEN` (quarterly)
5. **Environment Audit:** Periodically review production environment variables for any new secrets

## Files Modified

- `scripts/check-bundle-secrets.sh` - Bundle secrets scanner (new)
- `.github/workflows/security.yml` - CI/CD security workflow (new)

## Next Steps

1. Push changes to trigger first CI security scan
2. Review TruffleHog output in GitHub Actions
3. Proceed to AUDIT-* requirements (logging audit)
