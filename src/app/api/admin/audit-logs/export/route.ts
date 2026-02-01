import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { AUDIT_ACTION_DESCRIPTIONS, type AuditAction } from '@/lib/audit/actions';
import { unauthorizedResponse, serverErrorResponse } from '@/lib/errors';

/**
 * GET /api/admin/audit-logs/export
 *
 * Export all audit logs as CSV with optional filters.
 * Super admin only - exports ALL logs including 'PLATFORM' scoped.
 *
 * This action is itself audited (DATA_EXPORTED).
 *
 * Query params (same as list endpoint):
 * - action: Filter by action type
 * - userId: Filter by actor
 * - startDate: Filter by date range start (ISO string)
 * - endDate: Filter by date range end (ISO string)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify super admin access
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause - super admin sees ALL logs (no clubId filter)
    const where: Record<string, unknown> = {};

    if (action) {
      where.action = action;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    // Query ALL matching logs (no pagination for export)
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
      'User Agent',
      'Metadata',
    ];

    const rows = logs.map((log) => [
      log.id,
      log.createdAt.toISOString(),
      log.action,
      AUDIT_ACTION_DESCRIPTIONS[log.action as AuditAction] ?? log.action,
      log.userId,
      log.targetType,
      log.targetId ?? '',
      log.clubId,
      log.ipAddress ?? '',
      log.userAgent ?? '',
      JSON.stringify(log.metadata),
    ]);

    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    // Return as downloadable CSV
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

/**
 * Escape a value for CSV output.
 */
function escapeCSV(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
