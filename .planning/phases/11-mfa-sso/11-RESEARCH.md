# Phase 11: MFA & SSO - Research

**Researched:** 2026-01-23
**Domain:** Enterprise authentication (MFA, SSO/SAML, temporary permissions)
**Confidence:** HIGH

## Summary

Phase 11 implements enterprise authentication features: Multi-Factor Authentication (MFA) via TOTP for admins, SAML 2.0 Single Sign-On for enterprise customers, and temporary elevated permissions for edge cases. The implementation leverages Supabase's built-in MFA and SSO capabilities, with application-level logic for role mapping and permission grants.

Supabase provides native TOTP MFA support with a comprehensive API (`mfa.enroll`, `mfa.challenge`, `mfa.verify`) and Authenticator Assurance Levels (AAL). For SSO, Supabase supports SAML 2.0 via CLI configuration with attribute mapping to custom JWT claims. The application already has qrcode.react for QR code generation and established patterns for cron jobs, push notifications, and audit logging.

Custom permission grants require application-level implementation with a new Prisma model for time-bounded elevated roles, a cron job for automatic expiration, and notifications for users when access expires.

**Primary recommendation:** Use Supabase's native MFA/SSO features with minimal wrapper code. Implement temporary permissions as a separate model (`PermissionGrant`) with Vercel cron for expiration.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.90.1 | MFA and SSO APIs | Native MFA/SSO support via auth.mfa.* methods |
| qrcode.react | ^4.2.0 | QR code generation | Already in use, displays TOTP setup codes |
| prisma | ^6.0.0 | Temp permission storage | Database models for permission grants |

### Supporting (No New Dependencies Needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 | Expiration calculations | Already installed for time handling |
| zod | ^4.3.5 | Input validation | Validating SSO config, grant durations |

### No New Libraries Required

Supabase handles:
- TOTP secret generation (via `mfa.enroll`)
- QR code SVG generation (returned by `mfa.enroll` as `totp.qr_code`)
- SAML metadata parsing (via Supabase CLI)
- JWT claim injection from SAML attributes

The application already has:
- QR code rendering (`qrcode.react`)
- Push notifications (`lib/push/triggers.ts`)
- Cron job patterns (`api/cron/audit-cleanup`)
- Audit logging (`lib/audit/logger.ts`)

**Installation:**
```bash
# No new packages required
# Supabase CLI needed for SSO setup:
npm install -g supabase@latest
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── auth/
│   │   ├── mfa.ts              # MFA helper functions
│   │   ├── sso.ts              # SSO configuration types
│   │   └── permission-grant.ts # Temp permission logic
│   └── validations/
│       ├── mfa.ts              # MFA input schemas
│       └── permission-grant.ts # Grant validation
├── app/
│   ├── api/
│   │   ├── mfa/
│   │   │   ├── enroll/route.ts
│   │   │   ├── challenge/route.ts
│   │   │   ├── verify/route.ts
│   │   │   ├── factors/route.ts
│   │   │   └── unenroll/route.ts
│   │   ├── sso/
│   │   │   └── config/route.ts      # SSO settings read
│   │   ├── permission-grants/
│   │   │   ├── route.ts             # Create/list grants
│   │   │   └── [id]/route.ts        # Revoke grant
│   │   └── cron/
│   │       └── expire-grants/route.ts
│   └── (dashboard)/
│       └── [slug]/
│           └── settings/
│               ├── security/
│               │   └── page.tsx     # MFA setup, admin MFA reset
│               └── sso/
│                   └── page.tsx     # SSO config (facility admin)
└── components/
    └── mfa/
        ├── mfa-setup-dialog.tsx
        ├── mfa-verify-dialog.tsx
        └── backup-codes-display.tsx
```

### Pattern 1: Supabase MFA Integration
**What:** Thin wrappers around Supabase MFA API
**When to use:** All MFA operations - enrollment, challenge, verification
**Example:**
```typescript
// Source: Supabase MFA TOTP docs
// https://supabase.com/docs/guides/auth/auth-mfa/totp

import { createClient } from '@/lib/supabase/server';

// Enrollment - returns QR code and secret
export async function enrollMfa(friendlyName: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName,
  });

  if (error) throw error;

  // Returns: { id, totp: { qr_code, secret, uri } }
  return data;
}

// Challenge and verify in one flow
export async function verifyMfaCode(factorId: string, code: string) {
  const supabase = await createClient();

  const { data: challengeData, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError) throw challengeError;

  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });

  if (error) throw error;
  return data; // Session refreshed with aal2
}

// Check if MFA is required
export async function getMfaStatus() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (error) throw error;

  return {
    currentLevel: data.currentLevel, // 'aal1' or 'aal2'
    nextLevel: data.nextLevel,       // 'aal2' if MFA enrolled but not verified
    needsMfaVerification: data.currentLevel === 'aal1' && data.nextLevel === 'aal2',
  };
}
```

### Pattern 2: SSO with Supabase CLI + signInWithSSO
**What:** SAML configuration via CLI, authentication via client SDK
**When to use:** Enterprise SSO authentication flows
**Example:**
```typescript
// Source: Supabase SSO SAML docs
// https://supabase.com/docs/guides/auth/enterprise-sso/auth-sso-saml

// Client-side SSO initiation
import { createClient } from '@/lib/supabase/client';

export async function initiateSSO(domain: string, redirectTo?: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithSSO({
    domain,  // e.g., 'company.com'
    options: { redirectTo },
  });

  if (error) throw error;

  // Redirect to IdP
  if (data?.url) {
    window.location.href = data.url;
  }
}

// CLI configuration (run in terminal, not in code):
// supabase sso add --type saml --project-ref <ref> \
//   --metadata-url 'https://idp.company.com/saml/metadata' \
//   --domains company.com \
//   --attribute-mapping-file ./attribute-mapping.json
```

### Pattern 3: Temporary Permission Grants with Cron Expiration
**What:** Database model + cron job for time-bounded elevated access
**When to use:** Coach covering for admin, temporary elevated access
**Example:**
```typescript
// Prisma model for permission grants
model PermissionGrant {
  id          String   @id @default(uuid())
  clubId      String
  userId      String   // Who receives elevated access
  grantedBy   String   // Who granted it
  roles       Role[]   // Elevated roles granted
  reason      String?  // Why granted (audit trail)
  expiresAt   DateTime
  revokedAt   DateTime? // Soft revoke before expiration
  notifiedAt  DateTime? // When expiration warning sent
  createdAt   DateTime @default(now())

  @@index([clubId])
  @@index([userId])
  @@index([expiresAt]) // For cron job query
}

// Permission checking must include grants
export async function getUserEffectiveRoles(
  userId: string,
  clubId: string
): Promise<string[]> {
  const membership = await prisma.clubMembership.findFirst({
    where: { clubId, userId, isActive: true },
  });

  const baseRoles = membership?.roles ?? [];

  // Check for active grants
  const grants = await prisma.permissionGrant.findMany({
    where: {
      clubId,
      userId,
      expiresAt: { gt: new Date() },
      revokedAt: null,
    },
  });

  // SSO override check (local override takes precedence)
  const ssoOverride = membership?.ssoRoleOverride;
  if (ssoOverride) {
    return [...new Set([...baseRoles, ...ssoOverride])];
  }

  // Merge granted roles
  const grantedRoles = grants.flatMap(g => g.roles);
  return [...new Set([...baseRoles, ...grantedRoles])];
}
```

### Pattern 4: Backup Codes Implementation
**What:** Application-generated backup codes (Supabase doesn't provide them)
**When to use:** MFA recovery - generate during enrollment, store hashed
**Example:**
```typescript
// Source: CONTEXT.md decision - both backup codes and email recovery

import { nanoid } from 'nanoid';
import { createHash } from 'crypto';

// Generate 10 backup codes during MFA setup
export function generateBackupCodes(): { codes: string[], hashes: string[] } {
  const codes: string[] = [];
  const hashes: string[] = [];

  for (let i = 0; i < 10; i++) {
    const code = nanoid(8).toUpperCase(); // 8-char alphanumeric
    codes.push(code);
    hashes.push(createHash('sha256').update(code).digest('hex'));
  }

  return { codes, hashes }; // Display codes to user, store hashes
}

// Prisma model for backup codes
model MfaBackupCode {
  id        String   @id @default(uuid())
  userId    String
  codeHash  String   // SHA-256 hash of code
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([userId])
  @@unique([userId, codeHash])
}

// Verify and consume backup code
export async function useBackupCode(userId: string, code: string): Promise<boolean> {
  const hash = createHash('sha256').update(code.toUpperCase()).digest('hex');

  const backupCode = await prisma.mfaBackupCode.findFirst({
    where: {
      userId,
      codeHash: hash,
      usedAt: null,
    },
  });

  if (!backupCode) return false;

  await prisma.mfaBackupCode.update({
    where: { id: backupCode.id },
    data: { usedAt: new Date() },
  });

  return true;
}
```

### Anti-Patterns to Avoid
- **Building custom TOTP implementation:** Use Supabase's MFA API; don't use otplib/otpauth directly
- **Storing TOTP secrets in application database:** Supabase handles factor storage securely
- **Parsing SAML metadata in application code:** Use Supabase CLI for SSO configuration
- **Syncing roles on every request:** Cache effective roles in JWT claims via Custom Access Token Hook
- **Ignoring AAL levels:** Check `currentLevel` vs `nextLevel` to enforce MFA when enrolled

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TOTP secret generation | Crypto-based secret generation | Supabase `mfa.enroll()` | Returns QR code, secret, URI; handles secure storage |
| QR code generation | Canvas/SVG generation code | Supabase returns `totp.qr_code` SVG | Already formatted correctly |
| SAML metadata parsing | xml2js + validation logic | Supabase CLI `sso add` | Handles validation, certificate extraction |
| Session elevation | Custom token modification | Supabase `mfa.verify()` | Properly updates AAL in JWT |
| Recovery codes | Speakeasy/otplib recovery | Application-level backup codes | Supabase recommends multiple TOTP factors instead |

**Key insight:** Supabase's MFA and SSO features are production-ready. The main implementation work is UI/UX (enrollment flows, dialogs) and application-level features (permission grants, role mapping, notifications).

## Common Pitfalls

### Pitfall 1: Not Checking AAL After Login
**What goes wrong:** User has MFA enrolled but accesses admin features without verification
**Why it happens:** Assuming successful login means full authentication
**How to avoid:** Always check `getAuthenticatorAssuranceLevel()` after login
**Warning signs:** Admin features accessible when `currentLevel: 'aal1'` but `nextLevel: 'aal2'`

### Pitfall 2: SSO Role Mapping on Every Request
**What goes wrong:** Performance degradation from database lookups on each request
**Why it happens:** Mapping IDP groups to roles requires reading configuration
**How to avoid:** Use Supabase Custom Access Token Hook to inject roles into JWT
**Warning signs:** Slow API responses when SSO users are authenticated

### Pitfall 3: Forgot Email Fallback for MFA Recovery
**What goes wrong:** Users locked out when backup codes exhausted
**Why it happens:** Only implementing backup codes, not email verification
**How to avoid:** Per CONTEXT.md: both backup codes AND email verification
**Warning signs:** Support requests for account recovery with no recourse

### Pitfall 4: Temporary Permissions Not Checked Everywhere
**What goes wrong:** User has grant but ability system doesn't see elevated roles
**Why it happens:** Only checking ClubMembership.roles, not PermissionGrant
**How to avoid:** Create `getUserEffectiveRoles()` helper used by ability builder
**Warning signs:** Granted permissions not working until codebase audited

### Pitfall 5: Cron Job for Grant Expiration Not Deployed
**What goes wrong:** Temporary access never expires
**Why it happens:** vercel.json cron config not added or CRON_SECRET not set
**How to avoid:** Add to vercel.json alongside audit-cleanup cron
**Warning signs:** Permission grants past `expiresAt` still active

### Pitfall 6: SSO Users Linked to Wrong Facility
**What goes wrong:** SSO user from Facility A gets access to Facility B
**Why it happens:** SSO domain configured at facility level but not enforced
**How to avoid:** Validate SSO provider ID matches facility on login
**Warning signs:** Cross-facility data exposure via SSO users

## Code Examples

Verified patterns from official sources:

### MFA Enrollment UI Flow
```tsx
// Source: Supabase MFA docs + qrcode.react
'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface MfaSetupProps {
  onComplete: () => void;
}

export function MfaSetupDialog({ onComplete }: MfaSetupProps) {
  const [step, setStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [factor, setFactor] = useState<{
    id: string;
    qrCode: string;
    secret: string;
    uri: string;
  } | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');

  async function handleEnroll() {
    const res = await fetch('/api/mfa/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendlyName: 'Authenticator App' }),
    });

    if (!res.ok) {
      setError('Failed to start MFA setup');
      return;
    }

    const data = await res.json();
    setFactor({
      id: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    });
    setBackupCodes(data.backupCodes); // Application-generated
  }

  async function handleVerify() {
    const res = await fetch('/api/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factorId: factor!.id, code }),
    });

    if (!res.ok) {
      setError('Invalid code. Please try again.');
      return;
    }

    setStep('backup');
  }

  if (step === 'qr' && factor) {
    return (
      <div className="space-y-4">
        <h2>Set Up Two-Factor Authentication</h2>
        <p>Scan this QR code with your authenticator app:</p>

        {/* Supabase returns SVG, but we can also use QRCodeSVG for URI */}
        <div className="flex justify-center p-4 bg-white rounded">
          <QRCodeSVG value={factor.uri} size={200} />
        </div>

        <details className="text-sm text-gray-500">
          <summary>Can't scan? Enter code manually</summary>
          <code className="block mt-2 p-2 bg-gray-100 rounded">
            {factor.secret}
          </code>
        </details>

        <button onClick={() => setStep('verify')}>
          Continue
        </button>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="space-y-4">
        <h2>Verify Setup</h2>
        <p>Enter the 6-digit code from your authenticator app:</p>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="text-center text-2xl tracking-widest"
        />

        {error && <p className="text-red-500">{error}</p>}

        <button onClick={handleVerify} disabled={code.length !== 6}>
          Verify
        </button>
      </div>
    );
  }

  if (step === 'backup') {
    return (
      <div className="space-y-4">
        <h2>Save Your Backup Codes</h2>
        <p>Store these codes somewhere safe. Each can be used once.</p>

        <div className="grid grid-cols-2 gap-2 p-4 bg-gray-100 rounded">
          {backupCodes.map((code, i) => (
            <code key={i} className="font-mono">{code}</code>
          ))}
        </div>

        <button onClick={onComplete}>
          I've saved my backup codes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2>Enable Two-Factor Authentication</h2>
      <p>Add an extra layer of security to your account.</p>
      <button onClick={handleEnroll}>Get Started</button>
    </div>
  );
}
```

### SSO Role Mapping Configuration
```typescript
// Source: Supabase attribute mapping docs

// Facility-level SSO role mapping configuration
// Stored in database, not in SAML metadata

interface SsoRoleMapping {
  facilityId: string;
  idpGroupClaim: string;     // e.g., 'groups', 'memberOf'
  mappings: {
    idpValue: string;        // Value from IdP claim
    radlRoles: Role[];     // Mapped Radl roles
  }[];
  defaultRole: Role;         // Default if no mapping matches (ATHLETE per CONTEXT.md)
}

// Prisma model
model SsoConfig {
  id             String   @id @default(uuid())
  facilityId     String   @unique
  enabled        Boolean  @default(false)
  ssoProviderId  String?  // From Supabase SSO setup
  idpDomain      String?  // e.g., 'company.com'
  idpGroupClaim  String   @default("groups")
  roleMappings   Json     @default("[]")  // Array of { idpValue, radlRoles }
  defaultRole    Role     @default(ATHLETE)
  allowOverride  Boolean  @default(true)  // Facility admin can override
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([facilityId])
  @@index([ssoProviderId])
}

// Role mapping on login
export async function mapSsoRoles(
  facilityId: string,
  idpClaims: Record<string, unknown>
): Promise<Role[]> {
  const config = await prisma.ssoConfig.findUnique({
    where: { facilityId },
  });

  if (!config || !config.enabled) {
    return [config?.defaultRole ?? 'ATHLETE'];
  }

  const groups = idpClaims[config.idpGroupClaim] as string[] ?? [];
  const mappings = config.roleMappings as Array<{
    idpValue: string;
    radlRoles: Role[];
  }>;

  const mappedRoles: Role[] = [];
  for (const mapping of mappings) {
    if (groups.includes(mapping.idpValue)) {
      mappedRoles.push(...mapping.radlRoles);
    }
  }

  return mappedRoles.length > 0
    ? [...new Set(mappedRoles)]
    : [config.defaultRole];
}
```

### Cron Job for Permission Grant Expiration
```typescript
// Source: Existing pattern from api/cron/audit-cleanup

// api/cron/expire-grants/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Verify cron secret (same pattern as audit-cleanup)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // Find grants expiring in next 24h that haven't been notified
  const expiringGrants = await prisma.permissionGrant.findMany({
    where: {
      expiresAt: { lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
      revokedAt: null,
      notifiedAt: null,
    },
    include: {
      user: true,  // For notification
    },
  });

  // Send expiration warnings
  for (const grant of expiringGrants) {
    await sendExpirationWarning(grant);
    await prisma.permissionGrant.update({
      where: { id: grant.id },
      data: { notifiedAt: now },
    });
  }

  // Find and process expired grants
  const expiredGrants = await prisma.permissionGrant.findMany({
    where: {
      expiresAt: { lt: now },
      revokedAt: null,
    },
  });

  // Soft-revoke expired grants
  const expiredIds = expiredGrants.map(g => g.id);
  await prisma.permissionGrant.updateMany({
    where: { id: { in: expiredIds } },
    data: { revokedAt: now },
  });

  // Send expiration notifications
  for (const grant of expiredGrants) {
    await sendExpirationNotice(grant);
    await logAuditEvent({
      action: 'PERMISSION_GRANT_EXPIRED',
      targetType: 'PermissionGrant',
      targetId: grant.id,
      metadata: { roles: grant.roles, reason: grant.reason },
    });
  }

  return NextResponse.json({
    success: true,
    warned: expiringGrants.length,
    expired: expiredGrants.length,
  });
}
```

### vercel.json Cron Configuration
```json
{
  "crons": [
    {
      "path": "/api/cron/audit-cleanup",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/expire-grants",
      "schedule": "0 */4 * * *"
    }
  ]
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SMS OTP | TOTP authenticator apps | 2024+ | NIST guidance against SMS; Supabase supports both |
| Custom SAML parsing | Supabase SSO CLI | 2023 | No need for samlify/passport-saml |
| Recovery codes only | Multiple TOTP factors | Supabase recommendation | More secure than storing codes |
| Middleware auth checks | Data Access Layer | Next.js 2025 | Middleware no longer safe for auth |

**Deprecated/outdated:**
- `speakeasy` npm package: Last updated 7+ years ago; use Supabase MFA instead
- `passport-saml`: Not needed; Supabase handles SAML
- SMS OTP for MFA: Discouraged by NIST; prefer TOTP

## Open Questions

Things that couldn't be fully resolved:

1. **Custom Access Token Hook for SSO Roles**
   - What we know: Supabase supports Custom Access Token Hook for adding claims
   - What's unclear: Edge Function memory/timeout constraints for role lookup
   - Recommendation: Research further in Phase 13 (already flagged in STATE.md)

2. **Email Recovery Flow**
   - What we know: CONTEXT.md specifies email as fallback recovery
   - What's unclear: Exact Supabase flow for email-based MFA bypass
   - Recommendation: May require custom email verification flow separate from MFA

3. **SSO + MFA Interaction**
   - What we know: Both are supported independently
   - What's unclear: Whether MFA can be required for SSO users
   - Recommendation: Test during implementation; may need RLS policy check

## Sources

### Primary (HIGH confidence)
- [Supabase MFA TOTP Documentation](https://supabase.com/docs/guides/auth/auth-mfa/totp) - Complete MFA API reference
- [Supabase SAML SSO Documentation](https://supabase.com/docs/guides/auth/enterprise-sso/auth-sso-saml) - SAML setup guide
- [Supabase JavaScript MFA API](https://supabase.com/docs/reference/javascript/auth-mfa-api) - Method signatures
- [Supabase signInWithSSO Reference](https://supabase.com/docs/reference/javascript/auth-signinwithsso) - Client SDK

### Secondary (MEDIUM confidence)
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs) - Cron configuration
- [qrcode.react GitHub](https://github.com/zpao/qrcode.react) - QR code component

### Codebase (HIGH confidence)
- `/home/hb/radl/src/lib/auth/claims.ts` - Existing JWT claims handling
- `/home/hb/radl/src/lib/audit/logger.ts` - Audit logging pattern
- `/home/hb/radl/src/app/api/cron/audit-cleanup/route.ts` - Cron job pattern
- `/home/hb/radl/src/lib/push/triggers.ts` - Notification pattern
- `/home/hb/radl/package.json` - qrcode.react already installed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Supabase native features, no new dependencies
- Architecture: HIGH - Extends existing patterns (cron, audit, notifications)
- MFA API: HIGH - Verified with official Supabase documentation
- SSO/SAML: MEDIUM - CLI-based setup, attribute mapping verified
- Temporary permissions: HIGH - Standard Prisma + cron pattern
- Pitfalls: MEDIUM - Based on general MFA/SSO knowledge

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - Supabase auth is stable)
