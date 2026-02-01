# Phase 40: Audit Log Viewer & Export - Research

**Researched:** 2026-01-31
**Domain:** Audit log viewing, filtering, export, state diff display
**Confidence:** HIGH

## Summary

Phase 40 implements the final requirement for the v3.1 Admin Panel milestone: a comprehensive audit log viewer for super admins to review and export platform-wide audit history. The infrastructure is already complete from Phase 36, including the `AuditLog` model, `logAdminAction()` helper with before/after state capture, and audit action constants.

This phase focuses on the UI layer: building a `/admin/audit` page with table view, multi-filter capabilities (action type, actor, date range), metadata/state diff display, and CSV export. The existing admin panel patterns (users, facilities, clubs pages) provide proven blueprints for pagination, search, and table layouts.

**Primary recommendation:** Follow the established admin page pattern (server-side fetch → table component → filter components) with date range picker using `react-day-picker`, action type dropdown, and CSV export button. Display before/after state as formatted JSON diff using a collapsible detail view per row.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.3 | App framework | Already in use, server-side fetch pattern |
| Prisma | 6.0.0 | Database ORM | AuditLog model, filtering, pagination |
| React | 19.x | UI framework | Already in use |
| TypeScript | 5.x | Type safety | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.1.0 | Date formatting | Display timestamps, format date ranges |
| react-day-picker | 9.13.0 | Date picker UI | Date range filter component |
| @radix-ui/react-popover | 1.1.15 | Popover for filters | Date picker popover container |
| @radix-ui/react-select | 2.2.6 | Dropdown UI | Action type filter dropdown |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server-side CSV generation | Client-side CSV library | Server-side matches existing pattern in `/api/audit-logs/export` |
| JSON diff library | Simple JSON.stringify | Stringify is simpler, sufficient for admin use case |
| Custom date picker | Native input[type=date] | react-day-picker already installed, better UX |

**Installation:**
```bash
# No new dependencies required - all already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (admin)/
│   │   └── admin/
│   │       ├── audit/                        # NEW: Audit log viewer
│   │       │   ├── page.tsx                  # Server component with fetch
│   │       │   ├── loading.tsx               # Loading state
│   │       │   └── audit-filters-client.tsx  # Client component for filters
│   └── api/
│       └── admin/
│           └── audit-logs/                   # NEW: Super admin audit API
│               ├── route.ts                  # GET with filters, pagination
│               └── export/
│                   └── route.ts              # GET CSV export
└── components/
    └── admin/
        └── audit/                             # NEW: Audit components
            ├── audit-log-table.tsx            # Table with expandable rows
            ├── audit-filters.tsx              # Filter bar component
            ├── state-diff-display.tsx         # Before/after JSON display
            └── export-audit-button.tsx        # CSV export trigger
```

### Pattern 1: Super Admin Audit Log API

**What:** Platform-wide audit log API bypassing tenant scoping
**When to use:** Admin audit viewer needs all logs, not just one club
**Example:**
```typescript
// Source: Existing /api/admin/users/route.ts pattern
// src/app/api/admin/audit-logs/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { unauthorizedResponse, serverErrorResponse } from '@/lib/errors';
import { AUDIT_ACTION_DESCRIPTIONS } from '@/lib/audit/actions';

export async function GET(request: NextRequest) {
  try {
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('perPage') || '25', 10)));
    const action = searchParams.get('action') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }

    // Fetch with pagination
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: perPage,
        skip: (page - 1) * perPage,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Enrich with action descriptions
    const enrichedLogs = logs.map((log) => ({
      ...log,
      actionDescription: AUDIT_ACTION_DESCRIPTIONS[log.action as keyof typeof AUDIT_ACTION_DESCRIPTIONS] ?? log.action,
    }));

    return NextResponse.json({
      logs: enrichedLogs,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/audit-logs:GET');
  }
}
```

### Pattern 2: Server-Side Page with Client-Side Filters

**What:** Server component fetches initial data, client component manages filter state
**When to use:** Admin pages with URL-based filtering
**Example:**
```typescript
// Source: Existing /admin/users/page.tsx pattern
// src/app/(admin)/admin/audit/page.tsx

import { cookies } from 'next/headers';
import { AuditLogTable } from '@/components/admin/audit/audit-log-table';
import { AuditFilters } from '@/components/admin/audit/audit-filters';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

async function getAuditLogs(params: Record<string, string>) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const searchParams = new URLSearchParams(params);
  const response = await fetch(`${appUrl}/api/admin/audit-logs?${searchParams}`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  });

  if (!response.ok) return null;
  return response.json();
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getAuditLogs(params);

  if (!data) {
    return <div>Failed to load audit logs</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <AuditFilters initialFilters={params} />
      <AuditLogTable logs={data.logs} />
      {/* Pagination component */}
    </div>
  );
}
```

### Pattern 3: Expandable Table Rows for State Diff

**What:** Table row expands to show before/after state as formatted JSON
**When to use:** Displaying audit log details without leaving the page
**Example:**
```typescript
// Source: Synthesized from admin table patterns
// src/components/admin/audit/audit-log-table.tsx

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { StateDiffDisplay } from './state-diff-display';

interface AuditLogTableProps {
  logs: Array<{
    id: string;
    createdAt: Date;
    action: string;
    actionDescription: string;
    userId: string;
    targetType: string;
    targetId: string | null;
    metadata: Record<string, unknown>;
  }>;
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <table className="w-full">
      <thead>
        <tr>
          <th className="text-left">Timestamp</th>
          <th className="text-left">Action</th>
          <th className="text-left">Actor</th>
          <th className="text-left">Target</th>
          <th className="text-left">Details</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => {
          const isExpanded = expandedRows.has(log.id);
          const hasStateChange = log.metadata.beforeState || log.metadata.afterState;

          return (
            <>
              <tr key={log.id} className="border-b hover:bg-surface-2/50">
                <td>{new Date(log.createdAt).toLocaleString()}</td>
                <td>{log.actionDescription}</td>
                <td>{log.userId}</td>
                <td>{log.targetType} {log.targetId}</td>
                <td>
                  {hasStateChange && (
                    <button onClick={() => toggleRow(log.id)} className="flex items-center gap-1">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      View Changes
                    </button>
                  )}
                </td>
              </tr>
              {isExpanded && hasStateChange && (
                <tr>
                  <td colSpan={5} className="p-4 bg-surface-1">
                    <StateDiffDisplay
                      beforeState={log.metadata.beforeState as Record<string, unknown>}
                      afterState={log.metadata.afterState as Record<string, unknown>}
                    />
                  </td>
                </tr>
              )}
            </>
          );
        })}
      </tbody>
    </table>
  );
}
```

### Pattern 4: CSV Export with Date Range

**What:** Export filtered audit logs as CSV, following existing export API pattern
**When to use:** Compliance requirements, external analysis
**Example:**
```typescript
// Source: Existing /api/audit-logs/export/route.ts pattern
// src/app/api/admin/audit-logs/export/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { AUDIT_ACTION_DESCRIPTIONS } from '@/lib/audit/actions';
import { unauthorizedResponse, serverErrorResponse } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // Build where clause (same as GET route)
    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }

    // Fetch all matching logs (no pagination for export)
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Audit the export action
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'DATA_EXPORTED',
      targetType: 'AuditLog',
      metadata: {
        filters: { action, userId, startDate, endDate },
        recordCount: logs.length,
      },
    });

    // Generate CSV
    const headers = [
      'ID',
      'Timestamp',
      'Action',
      'Action Description',
      'User ID',
      'Target Type',
      'Target ID',
      'Club ID',
      'IP Address',
      'Metadata',
    ];

    const rows = logs.map((log) => [
      log.id,
      log.createdAt.toISOString(),
      log.action,
      AUDIT_ACTION_DESCRIPTIONS[log.action as keyof typeof AUDIT_ACTION_DESCRIPTIONS] ?? log.action,
      log.userId,
      log.targetType,
      log.targetId ?? '',
      log.clubId,
      log.ipAddress ?? '',
      JSON.stringify(log.metadata),
    ]);

    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/audit-logs/export:GET');
  }
}

function escapeCSV(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
```

### Pattern 5: Date Range Filter with react-day-picker

**What:** Client-side date range picker using existing library
**When to use:** Filter audit logs by date range
**Example:**
```typescript
// Source: react-day-picker documentation + existing popover pattern
// src/components/admin/audit/audit-filters.tsx

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DayPicker } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import 'react-day-picker/dist/style.css';

export function AuditFilters({ initialFilters }: { initialFilters: Record<string, string> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: initialFilters.startDate ? new Date(initialFilters.startDate) : undefined,
    to: initialFilters.endDate ? new Date(initialFilters.endDate) : undefined,
  });

  const applyDateRange = () => {
    const params = new URLSearchParams(searchParams);
    if (dateRange.from) {
      params.set('startDate', dateRange.from.toISOString());
    } else {
      params.delete('startDate');
    }
    if (dateRange.to) {
      params.set('endDate', dateRange.to.toISOString());
    } else {
      params.delete('endDate');
    }
    params.set('page', '1');
    router.push(`/admin/audit?${params.toString()}`);
  };

  return (
    <div className="flex gap-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            {dateRange.from ? (
              dateRange.to ? (
                `${format(dateRange.from, 'PPP')} - ${format(dateRange.to, 'PPP')}`
              ) : (
                format(dateRange.from, 'PPP')
              )
            ) : (
              'Select Date Range'
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <DayPicker
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
          />
          <div className="p-3 border-t">
            <Button onClick={applyDateRange} className="w-full">
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {/* Action filter, user filter, etc. */}
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Client-side filtering of all logs:** Always filter server-side, logs can be thousands of records
- **Unescaped CSV values:** Always escape commas, quotes, newlines in CSV export
- **No pagination on export:** Export should fetch all matching records (not paginated), but limit to reasonable timeframe
- **Displaying raw metadata JSON:** Format and syntax-highlight JSON for readability
- **Missing export audit:** CSV export is itself an auditable action, must log it

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV generation | Custom CSV builder | Existing escapeCSV pattern | Already proven in `/api/audit-logs/export` |
| Date range picker | Custom calendar UI | react-day-picker | Already installed, handles edge cases |
| Table pagination | Custom pagination logic | Existing admin table pattern | Users, facilities, clubs all use same pattern |
| State diff display | Custom JSON differ | Simple JSON.stringify formatting | Audit logs are for compliance, not code review |
| Filter state management | Custom state + localStorage | URL search params | Server-side filtering requires URL params anyway |

**Key insight:** This phase is almost entirely UI assembly using existing patterns and libraries. No new infrastructure needed.

## Common Pitfalls

### Pitfall 1: Forgetting Super Admin Scoping
**What goes wrong:** Audit API uses CASL accessibleBy(), only shows logs for clubs admin belongs to
**Why it happens:** Copying from existing `/api/audit-logs/route.ts` which is tenant-scoped
**How to avoid:** Super admin audit API bypasses CASL, queries all logs directly
**Warning signs:** Admin sees empty audit log despite platform activity

### Pitfall 2: Large Metadata in Table Cells
**What goes wrong:** Table becomes unreadable with huge JSON blobs in cells
**Why it happens:** Displaying full metadata.beforeState/afterState inline
**How to avoid:** Use expandable rows or detail drawer, show summary in table
**Warning signs:** Horizontal scroll, unreadable table layout

### Pitfall 3: Date Range Filter Timezone Issues
**What goes wrong:** Date range filter misses events due to timezone conversion
**Why it happens:** Client sends local timezone, server queries UTC
**How to avoid:** Convert date range to UTC start-of-day and end-of-day on server
**Warning signs:** Events missing from filtered results despite matching criteria

### Pitfall 4: CSV Export Timeout on Large Datasets
**What goes wrong:** Export hangs or times out when fetching 100k+ logs
**Why it happens:** No limit on export query size
**How to avoid:** Add reasonable max limit (e.g., 10,000 records) or streaming response
**Warning signs:** 504 Gateway Timeout on export requests

### Pitfall 5: Missing Action Type Filter Options
**What goes wrong:** Filter dropdown shows ROLE_ASSIGNED but not ADMIN_USER_CREATED
**Why it happens:** Filter uses wrong action constants (tenant actions vs admin actions)
**How to avoid:** Filter should show ALL actions from AUDITABLE_ACTIONS constant
**Warning signs:** Super admin actions not filterable

## Code Examples

Verified patterns from official sources:

### State Diff Display Component
```typescript
// Source: Synthesized from existing admin patterns
// src/components/admin/audit/state-diff-display.tsx

interface StateDiffDisplayProps {
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
}

export function StateDiffDisplay({ beforeState, afterState }: StateDiffDisplayProps) {
  if (!beforeState && !afterState) {
    return <p className="text-muted">No state changes recorded</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4 className="font-medium mb-2">Before</h4>
        <pre className="bg-surface-2 p-3 rounded text-xs overflow-auto max-h-60">
          {beforeState ? JSON.stringify(beforeState, null, 2) : 'N/A'}
        </pre>
      </div>
      <div>
        <h4 className="font-medium mb-2">After</h4>
        <pre className="bg-surface-2 p-3 rounded text-xs overflow-auto max-h-60">
          {afterState ? JSON.stringify(afterState, null, 2) : 'N/A'}
        </pre>
      </div>
    </div>
  );
}
```

### Export Button Component
```typescript
// Source: Existing export-button.tsx pattern
// src/components/admin/audit/export-audit-button.tsx

'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportAuditButtonProps {
  filters: {
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  };
}

export function ExportAuditButton({ filters }: ExportAuditButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams(filters as Record<string, string>);
      const response = await fetch(`/api/admin/audit-logs/export?${params}`);

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      // Show error toast
    } finally {
      setTimeout(() => setExporting(false), 500);
    }
  };

  return (
    <Button onClick={handleExport} disabled={exporting} variant="outline">
      <Download className="h-4 w-4" />
      {exporting ? 'Exporting...' : 'Export CSV'}
    </Button>
  );
}
```

### Action Type Filter Dropdown
```typescript
// Source: Existing select patterns + AUDITABLE_ACTIONS
// src/components/admin/audit/action-filter.tsx

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AUDITABLE_ACTIONS, AUDIT_ACTION_DESCRIPTIONS } from '@/lib/audit/actions';

export function ActionFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentAction = searchParams.get('action') || 'all';

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'all') {
      params.delete('action');
    } else {
      params.set('action', value);
    }
    params.set('page', '1');
    router.push(`/admin/audit?${params.toString()}`);
  };

  return (
    <Select value={currentAction} onValueChange={handleChange}>
      <SelectTrigger className="w-[250px]">
        <SelectValue placeholder="Filter by action" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Actions</SelectItem>
        {Object.entries(AUDITABLE_ACTIONS).map(([key, value]) => (
          <SelectItem key={key} value={value}>
            {AUDIT_ACTION_DESCRIPTIONS[key as keyof typeof AUDIT_ACTION_DESCRIPTIONS]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full page refresh on filter | URL params + server component | Next.js 13+ App Router | Better UX, shareable filtered views |
| Client-side CSV generation | Server-side generation + download | Security best practice | Prevents data exposure, audit logging |
| Inline JSON metadata | Expandable row detail | Modern audit log UIs | Cleaner table, better readability |
| Single date picker | Date range picker | Industry standard 2024+ | More flexible filtering |
| Action codes only | Action descriptions + codes | UX improvement | Human-readable logs |

**Deprecated/outdated:**
- Custom audit log viewer libraries: Modern admin panels build in-house with standard table components
- AJAX polling for real-time updates: Audit logs are historical, no need for real-time

## Open Questions

Things that couldn't be fully resolved:

1. **Export record limit**
   - What we know: Export should have reasonable limit to prevent timeouts
   - What's unclear: What's reasonable? 10k? 50k? Configurable?
   - Recommendation: Start with 10,000 record limit, show warning if result truncated

2. **User ID vs Display Name in table**
   - What we know: AuditLog.userId is Supabase auth user ID (UUID)
   - What's unclear: Should we join with auth.users to show email/name?
   - Recommendation: Show UUID in table, add tooltip with email if available (requires Supabase admin query)

3. **JSON diff visualization**
   - What we know: beforeState/afterState are JSON objects
   - What's unclear: Should we highlight changed fields, or just show side-by-side?
   - Recommendation: Side-by-side JSON for MVP, consider diff library if users request it

4. **Retention policy enforcement**
   - What we know: Phase 36 specifies 365-day retention
   - What's unclear: Is this enforced in code or external job?
   - Recommendation: Out of scope for Phase 40, addressed by existing cron job (`/api/cron/audit-cleanup`)

## Sources

### Primary (HIGH confidence)
- Existing codebase audit infrastructure:
  - `/src/lib/audit/actions.ts` - All audit action constants and descriptions
  - `/src/lib/audit/logger.ts` - logAdminAction() with beforeState/afterState
  - `/src/app/api/audit-logs/export/route.ts` - CSV export pattern (tenant-scoped)
  - `/src/app/api/admin/users/route.ts` - Admin API pattern with super admin auth
- Existing admin UI patterns:
  - `/src/app/(admin)/admin/users/page.tsx` - Server-side fetch + pagination
  - `/src/components/admin/users/user-list-table.tsx` - Table component pattern
  - `/src/components/admin/users/user-search.tsx` - Filter component with URL params
- Database schema: `/prisma/schema.prisma` - AuditLog model definition
- Phase 36 Research: `.planning/phases/36-admin-foundation-auth/36-RESEARCH.md` - Admin patterns

### Secondary (MEDIUM confidence)
- [react-day-picker Documentation](https://react-day-picker.js.org/) - Date range picker component API
- [date-fns Documentation](https://date-fns.org/) - Date formatting utilities
- [Best Practices for Authorization Audit Logs](https://www.permit.io/blog/audit-logs) - Audit log UI patterns
- [Guide to Building Audit Logs](https://medium.com/@tony.infisical/guide-to-building-audit-logs-for-application-software-b0083bb58604) - Filtering and export patterns
- [The Developer's Guide to Audit Logs](https://workos.com/blog/the-developers-guide-to-audit-logs-siem) - Industry best practices

### Tertiary (LOW confidence)
- [Audit Trail Filter Documentation](https://support.industry.siemens.com/cs/attachments/109757951/109757951_AuditTrail-Filter_en.pdf) - Filter UI patterns
- [Adobe Marketo Audit Trail](https://experienceleague.adobe.com/docs/marketo/using/product-docs/administration/audit-trail/filtering-in-audit-trail.html) - Date range filtering

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in use
- Architecture: HIGH - All patterns exist in codebase (admin pages, CSV export, audit logging)
- Pitfalls: HIGH - Based on real issues in audit log implementations

**Research date:** 2026-01-31
**Valid until:** 2026-03-02 (30 days - stable patterns, established codebase)

---

## Quick Reference: Requirements Mapping

| Requirement | Implementation |
|-------------|----------------|
| AUDT-02: Audit log viewer | `/admin/audit` page with table, filters, pagination |
| AUDT-02: Filterable by action | Action type dropdown using AUDITABLE_ACTIONS |
| AUDT-02: Filterable by actor | User ID filter (text input or dropdown) |
| AUDT-02: Filterable by date | Date range picker using react-day-picker |
| AUDT-03: CSV export | `/api/admin/audit-logs/export` route + download button |
| AUDT-03: Date range filter | Export accepts startDate/endDate params |
| Success: Browse with filters | Server-side filtering via URL params |
| Success: Before/after state diff | Expandable row showing metadata.beforeState/afterState |
| Success: Export as CSV | CSV download with filtered results |

## Key Implementation Notes

1. **No new database schema:** AuditLog model already exists with all needed fields
2. **No new audit logging:** Infrastructure complete from Phase 36
3. **Follow admin page patterns:** Use existing users/facilities page structure
4. **Super admin scoping:** Bypass CASL, query all logs directly
5. **CSV export is audited:** Export action logs to AuditLog with filter metadata
6. **Date range timezone handling:** Convert to UTC on server to avoid timezone bugs
7. **Metadata display:** Show formatted JSON, not raw database JSON
8. **Pagination required:** Audit logs can be thousands of records, never fetch all
