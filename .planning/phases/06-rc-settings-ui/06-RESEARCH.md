# Phase 6: RC Settings UI - Research

**Researched:** 2026-01-21
**Domain:** Settings UI, OAuth connection management, async operations, toggle controls
**Confidence:** HIGH

## Summary

Phase 6 adds a Regatta Central settings section to the existing team settings page, allowing coaches to manage their RC integration. The core technical challenge is building a robust OAuth connection UI that handles password grant flow (RC's API limitation), provides clear status feedback, manages manual import operations with progress indication, and implements auto-sync toggles with proper accessibility.

The existing codebase already has the RC integration infrastructure (client, encryption, API routes), notification components with toggle patterns, and established settings page structure. This phase extends those patterns with new UI components for connection management.

The key insight: **RC uses password grant OAuth2 (not authorization code flow)**, which means the UI collects RC credentials directly rather than redirecting to RC's authorization page. This is unusual but documented in RC's API v4 cookbook. The existing `connectRegattaCentral()` function already implements this correctly.

**Primary recommendation:** Build on existing settings page patterns with inline status display, modal-based connection form (to avoid page navigation), toast notifications for operations (using Sonner for consistency), and standard toggle switches with ARIA role="switch" for auto-sync control.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Hook Form | 7.71.1 | Form state management | Already used throughout codebase |
| Zod | 4.3.5 | Form validation | Already used for all API validation |
| Lucide React | 0.562.0 | Icon library | Used for all UI icons |
| Tailwind CSS | 4.x | Styling | Established design system |

### To Add
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Sonner | Latest | Toast notifications | Success/error feedback for operations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sonner | react-toastify | react-toastify is popular but Sonner is lighter, better TypeScript support, recommended by shadcn/ui |
| Sonner | Custom toast | Building custom adds complexity without benefit; Sonner is opinionated and works well |
| Modal form | Dedicated page | Modal keeps user in context, avoids navigation; existing settings page uses inline sections |

**Installation:**
```bash
npm install sonner
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── (dashboard)/
│       └── [teamSlug]/
│           └── settings/
│               └── page.tsx                    # Add RC section here
├── components/
│   ├── regatta-central/
│   │   ├── rc-connection-status.tsx           # Status display component
│   │   ├── rc-connect-form.tsx                # Connection modal/form
│   │   ├── rc-import-button.tsx               # Manual import with progress
│   │   └── rc-auto-sync-toggle.tsx            # Auto-sync control
│   └── ui/
│       └── toast.tsx                           # Sonner wrapper
└── app/
    └── api/
        └── regatta-central/
            ├── status/route.ts                 # Already exists
            ├── connect/route.ts                # Already exists
            ├── disconnect/route.ts             # Already exists
            ├── import/route.ts                 # Already exists
            └── auto-sync/route.ts              # NEW: Toggle auto-sync
```

### Pattern 1: Password Grant OAuth Connection Form
**What:** Collect RC credentials in a modal, submit to server API, handle errors gracefully
**When to use:** RC API v4 only supports password grant (no authorization code flow available)
**Example:**
```typescript
// components/regatta-central/rc-connect-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const connectSchema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
  rcClubId: z.string().min(1, 'Club ID required'),
});

type ConnectFormData = z.infer<typeof connectSchema>;

export function RCConnectForm({ onSuccess }: { onSuccess: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ConnectFormData>({
    resolver: zodResolver(connectSchema),
  });

  const onSubmit = async (data: ConnectFormData) => {
    try {
      const response = await fetch('/api/regatta-central/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Connection failed');
      }

      toast.success('Regatta Central connected successfully');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to connect');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields with error display */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Connecting...' : 'Connect'}
      </button>
    </form>
  );
}
```

**Source:** Existing `/api/regatta-central/connect/route.ts` implementation

### Pattern 2: Connection Status Display
**What:** Show connected/disconnected state with account info, clear visual hierarchy
**When to use:** Users need to know connection status at a glance
**Example:**
```typescript
// components/regatta-central/rc-connection-status.tsx
'use client';

import { useEffect, useState } from 'react';

interface ConnectionStatus {
  connected: boolean;
  rcClubId?: string;
  lastSyncAt?: string;
}

export function RCConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      const response = await fetch('/api/regatta-central/status');
      const data = await response.json();
      setStatus(data);
      setLoading(false);
    }
    fetchStatus();
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!status?.connected) {
    return (
      <div className="flex items-center gap-2">
        <StatusDot color="gray" />
        <span className="text-zinc-400">Not connected</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <StatusDot color="green" />
        <span className="text-zinc-300">Connected to Club #{status.rcClubId}</span>
      </div>
      {status.lastSyncAt && (
        <p className="text-xs text-zinc-500">
          Last synced: {new Date(status.lastSyncAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
```

**Source:** Existing `/api/regatta-central/status/route.ts` response structure

### Pattern 3: Async Button with Loading State
**What:** Disable button during async operation, show loading spinner, prevent double-submission
**When to use:** Any button triggering async operations (connect, disconnect, import)
**Example:**
```typescript
// components/regatta-central/rc-import-button.tsx
'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function RCImportButton({ seasonId }: { seasonId: string }) {
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    setImporting(true);

    try {
      const response = await fetch('/api/regatta-central/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const result = await response.json();

      // Show success with details
      toast.success(
        `Imported ${result.imported} new entries, updated ${result.updated}`,
        {
          action: {
            label: 'View',
            onClick: () => window.location.href = `/${teamSlug}/regattas`,
          },
        }
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <button
      onClick={handleImport}
      disabled={importing}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
        importing
          ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
      }`}
    >
      {importing && <Loader2 className="h-4 w-4 animate-spin" />}
      {importing ? 'Importing...' : 'Import Regattas'}
    </button>
  );
}
```

**Source:** [React async button pattern](https://ironeko.com/posts/how-to-asynchronous-buttons-with-loading-state-in-react)

### Pattern 4: Toggle Switch with ARIA
**What:** Accessible toggle with role="switch", aria-checked, keyboard support
**When to use:** Binary settings like auto-sync on/off
**Example:**
```typescript
// components/regatta-central/rc-auto-sync-toggle.tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export function RCAutoSyncToggle() {
  const [enabled, setEnabled] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);

    try {
      const response = await fetch('/api/regatta-central/auto-sync', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });

      if (!response.ok) throw new Error('Failed to update auto-sync');

      setEnabled(!enabled);
      toast.success(`Auto-sync ${!enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update auto-sync setting');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium text-zinc-300">Auto-sync</h3>
        <p className="text-sm text-zinc-500">
          Automatically import regatta updates daily
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={toggling}
        onClick={handleToggle}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900
          ${toggling ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          ${enabled ? 'bg-emerald-600' : 'bg-zinc-700'}
        `}
      >
        <span className="sr-only">Enable auto-sync</span>
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow
            transition duration-200 ease-in-out
            ${enabled ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}
```

**Source:** Existing `notification-settings.tsx` toggle pattern, [W3C ARIA switch role](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)

### Pattern 5: Disconnect Confirmation with Dialog
**What:** Confirm destructive action before execution, focus on cancel by default
**When to use:** Disconnecting removes stored credentials and stops auto-sync
**Example:**
```typescript
// components/regatta-central/rc-disconnect-button.tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export function RCDisconnectButton({ onDisconnect }: { onDisconnect: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleConfirm = async () => {
    setDisconnecting(true);

    try {
      const response = await fetch('/api/regatta-central/disconnect', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to disconnect');

      toast.success('Regatta Central disconnected');
      onDisconnect();
      setShowConfirm(false);
    } catch (error) {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="text-sm text-red-400 hover:text-red-300"
      >
        Disconnect
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md">
            <h3 className="text-lg font-semibold text-white mb-2">
              Disconnect Regatta Central?
            </h3>
            <p className="text-sm text-zinc-400 mb-6">
              This will remove your stored credentials and disable auto-sync.
              You can reconnect anytime.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                autoFocus
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={disconnecting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

**Source:** [NN/G confirmation dialog best practices](https://www.nngroup.com/articles/confirmation-dialog/)

### Anti-Patterns to Avoid
- **Don't use authorization code flow** - RC API v4 only supports password grant; attempting standard OAuth redirect will fail
- **Don't store RC credentials in browser** - Use server-side API route for token exchange; credentials should never touch client storage
- **Don't disable disconnect without explanation** - If disconnecting would break something (active auto-sync, imported data), explain why rather than just disabling the button
- **Don't hide import errors** - If import returns 0 entries due to API error vs. no new data, distinguish these cases for user

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom div positioning | Sonner | Handles stacking, timing, accessibility, animations; battle-tested |
| Toggle switch styling | Custom checkbox + CSS | Existing pattern from notification-settings.tsx | Already matches design system, ARIA compliant |
| OAuth token refresh | Custom timeout logic | Existing RegattaCentralClient.refreshTokenIfNeeded() | Already implements 10-minute buffer, error handling |
| Form validation | Manual error checking | Zod + React Hook Form | Type-safe, already used everywhere, reduces bugs |
| Loading spinners | Custom SVG | Lucide React Loader2 | Consistent with existing UI, optimized, accessible |

**Key insight:** The existing codebase already solves most of these problems. This phase is about composing existing patterns into a new UI, not inventing new infrastructure.

## Common Pitfalls

### Pitfall 1: Password Grant Security Concerns
**What goes wrong:** Collecting user's RC credentials in the app feels insecure; developers try to implement authorization code flow instead
**Why it happens:** Password grant is discouraged in modern OAuth2 best practices; feels like anti-pattern
**How to avoid:**
- RC API v4 only supports password grant (confirmed in API cookbook)
- Credentials are sent directly to server API route, never stored client-side
- Server encrypts tokens with AES-256 before storing in database
- This is the correct implementation for RC's API limitations
**Warning signs:** Attempting to redirect to RC authorization endpoint (doesn't exist), storing credentials in localStorage

**Confidence:** HIGH - Verified in existing `connectRegattaCentral()` implementation and RC API v4 documentation

### Pitfall 2: Missing Toast Container
**What goes wrong:** Call `toast.success()` but nothing appears; no error in console
**Why it happens:** Forgot to add `<Toaster />` component to root layout
**How to avoid:**
```typescript
// app/layout.tsx or app/(dashboard)/layout.tsx
import { Toaster } from 'sonner';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" />
    </>
  );
}
```
**Warning signs:** Toast calls in code but no visible feedback; checking browser console shows no errors

**Confidence:** HIGH - Common Sonner setup issue, well-documented

### Pitfall 3: Import Progress Without Feedback
**What goes wrong:** User clicks "Import Regattas," button goes to loading state, but import takes 5-10 seconds with no indication of what's happening
**Why it happens:** Backend API doesn't stream progress; developer assumes instant operation
**How to avoid:**
- Show loading state immediately on button click
- Display spinner with "Importing..." text
- After success, show result count with link to view data
- Consider progress indicator if import typically > 3 seconds
**Warning signs:** Users click import multiple times thinking it didn't work, support tickets about "slow" import

**Confidence:** MEDIUM - Based on existing import API (no streaming), user feedback patterns

### Pitfall 4: Toggle Without Immediate Feedback
**What goes wrong:** User toggles auto-sync, nothing happens visually until API responds; feels broken
**Why it happens:** Toggle state only updates after successful API call
**How to avoid:**
- Disable toggle during API call (show it's processing)
- Show toast on success/failure
- If API fails, keep toggle in original position
- Don't optimistically update until confirmation
**Warning signs:** Users toggle multiple times, confusion about current state

**Confidence:** HIGH - Existing notification-settings.tsx pattern already implements this correctly

### Pitfall 5: No-Changes Import Messaging
**What goes wrong:** User imports regattas, gets success message, but sees 0 new entries; feels like failure
**Why it happens:** Import API returns `imported: 0, updated: 0` when no changes, but toast says "success"
**How to avoid:**
```typescript
const result = await response.json();
if (result.imported === 0 && result.updated === 0) {
  toast.info('No new regatta data to import');
} else {
  toast.success(`Imported ${result.imported} new, updated ${result.updated}`);
}
```
**Warning signs:** Confused users reporting "import didn't work" when actually there's just no new data

**Confidence:** MEDIUM - Pattern based on UX best practices for zero-result operations

### Pitfall 6: Auto-Sync Without Failure Notification
**What goes wrong:** Auto-sync fails (token expired, RC API down), but coach never knows; discovers missing data at regatta
**Why it happens:** Background sync runs on schedule, but failures aren't surfaced to user
**How to avoid:**
- Send push notification on auto-sync failure (per requirements)
- Store last successful sync timestamp
- Show warning badge in UI if sync hasn't succeeded in > 48 hours
- Provide "Retry" action in failure notification
**Warning signs:** Support tickets about "missing regatta updates" that were imported to RC but not synced

**Confidence:** MEDIUM-HIGH - Critical for auto-sync reliability; push notification already in requirements

## Code Examples

Verified patterns from official sources and existing codebase:

### Connection Status Section (Complete Component)
```typescript
// app/(dashboard)/[teamSlug]/settings/page.tsx - Add this section
<div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
  <h2 className="text-lg font-semibold text-white mb-2">Regatta Central</h2>
  <p className="text-sm text-zinc-400 mb-6">
    Connect your Regatta Central account to automatically import regatta schedules and entries.
  </p>

  <RCConnectionStatus />

  {/* Connected state */}
  {connected && (
    <>
      <div className="mt-4 space-y-4">
        <RCAutoSyncToggle />

        <div className="border-t border-zinc-800 pt-4">
          <RCImportButton seasonId={currentSeasonId} />
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <RCDisconnectButton onDisconnect={() => refetchStatus()} />
        </div>
      </div>
    </>
  )}

  {/* Disconnected state */}
  {!connected && (
    <div className="mt-4">
      <button
        onClick={() => setShowConnectForm(true)}
        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
      >
        Connect Regatta Central
      </button>
    </div>
  )}
</div>
```

**Source:** Pattern adapted from existing team-settings page structure

### Sonner Toast Configuration
```typescript
// app/layout.tsx or root layout
import { Toaster } from 'sonner';

<Toaster
  position="bottom-right"
  expand={false}
  richColors
  closeButton
  toastOptions={{
    style: {
      background: 'rgb(24 24 27)', // zinc-900
      border: '1px solid rgb(63 63 70)', // zinc-700
      color: 'rgb(228 228 231)', // zinc-200
    },
  }}
/>
```

**Source:** [Sonner documentation](https://ui.shadcn.com/docs/components/sonner)

### API Route Error Handling Pattern
```typescript
// app/api/regatta-central/auto-sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const autoSyncSchema = z.object({
  enabled: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can configure auto-sync');

    const body = await request.json();
    const validationResult = autoSyncSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { enabled } = validationResult.data;

    await prisma.regattaCentralConnection.update({
      where: { teamId: claims.team_id },
      data: { autoSyncEnabled: enabled }, // New field to add to schema
    });

    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    return serverErrorResponse(error, 'regatta-central/auto-sync:PATCH');
  }
}
```

**Source:** Existing API route pattern from `connect/route.ts`, adapted for PATCH

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-toastify | Sonner | 2024-2025 | Lighter bundle, better TypeScript, shadcn/ui ecosystem |
| Custom OAuth redirect | Password grant for RC | RC API v4 limitation | Must collect credentials directly vs. standard OAuth flow |
| Manual token refresh | Auto-refresh in client | Existing implementation | RegattaCentralClient handles this transparently |
| Checkbox for toggles | ARIA switch role | WAI-ARIA 1.2+ | Better accessibility, semantic meaning |
| Inline loading text | Spinner + disabled state | Current React patterns | Clearer visual feedback, prevents double-clicks |

**Deprecated/outdated:**
- react-toastify: Still works but Sonner is preferred for new projects (lighter, better DX)
- Authorization code flow: Not available for RC API; password grant is the documented approach

## Open Questions

Things that couldn't be fully resolved:

1. **Auto-sync frequency**
   - What we know: Requirements say "auto-sync" but not how often
   - What's unclear: Daily, hourly, or on-demand via cron?
   - Recommendation: Start with daily (midnight team local time), add frequency config later if needed; requires Vercel cron or external scheduler

2. **Import progress granularity**
   - What we know: Import API returns final count after completion
   - What's unclear: Whether to add streaming/progress for long imports
   - Recommendation: Show loading state only; typical import < 5 seconds, not worth progress bar complexity

3. **Auto-sync failure retry strategy**
   - What we know: Send push notification on failure (per requirements)
   - What's unclear: Automatic retry schedule, max retries before giving up
   - Recommendation: Retry once after 1 hour; if still fails, notify and wait for next scheduled sync; log failures for monitoring

4. **Multi-season import**
   - What we know: Import requires seasonId in request
   - What's unclear: UI for selecting which season to import to
   - Recommendation: Default to current active season; add season selector dropdown if team has multiple active seasons

## Sources

### Primary (HIGH confidence)
- Existing codebase patterns:
  - `/src/app/(dashboard)/[teamSlug]/settings/page.tsx` - Settings page structure
  - `/src/components/pwa/notification-settings.tsx` - Toggle switch ARIA pattern
  - `/src/app/api/regatta-central/*` - API route patterns and error handling
  - `/src/lib/regatta-central/client.ts` - RC OAuth implementation (password grant)
- [W3C WAI-ARIA Switch Role](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) - Accessibility standards
- [shadcn/ui Sonner Documentation](https://ui.shadcn.com/docs/components/sonner) - Toast component

### Secondary (MEDIUM confidence)
- [React Hook Form with Switch Pattern](https://www.shadcn.io/patterns/form-advanced-5) - Form integration
- [OAuth2 Best Practices](https://oauth.net/2/oauth-best-practice/) - Security guidelines
- [Confirmation Dialog UX](https://www.nngroup.com/articles/confirmation-dialog/) - NN/G usability research
- [React Async Button Pattern](https://ironeko.com/posts/how-to-asynchronous-buttons-with-loading-state-in-react) - Loading states
- [Next.js Cron Jobs Guide](https://www.schedo.dev/nextjs) - Auto-sync implementation options

### Tertiary (LOW confidence - patterns observed)
- [Material UI Progress Components](https://mui.com/material-ui/react-progress/) - Progress indicator patterns
- [Web Push Error Handling](https://pushpad.xyz/docs/troubleshooting) - Push notification failure patterns
- [Vercel Cron Example](https://vercel.com/templates/next.js/vercel-cron) - Scheduled task patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use or well-established (Sonner)
- Architecture: HIGH - Follows existing codebase patterns, validated by implemented API routes
- Pitfalls: MEDIUM-HIGH - Based on common OAuth/settings UI issues and existing code review

**Research date:** 2026-01-21
**Valid until:** 30 days (stable domain, libraries unlikely to change significantly)
