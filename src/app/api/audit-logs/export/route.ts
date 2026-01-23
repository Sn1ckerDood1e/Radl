import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth/get-auth-context';
import { accessibleBy } from '@casl/prisma';
import { ForbiddenError } from '@casl/ability';
import { createAuditLogger } from '@/lib/audit/logger';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { AUDIT_ACTION_DESCRIPTIONS } from '@/lib/audit/actions';

/**
 * GET /api/audit-logs/export
 * Export audit logs as CSV.
 *
 * Query params (same as list):
 * - action, userId, startDate, endDate
 *
 * This action is itself audited (DATA_EXPORTED).
 */
export async function GET(request: NextRequest) {
  try {
    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context } = result;

    // Check permission - need both view-audit-log and export-data
    if (!context.ability.can('view-audit-log', 'AuditLog') ||
        !context.ability.can('export-data', 'Team')) {
      return forbiddenResponse('You do not have permission to export audit logs');
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const where: Record<string, unknown> = {};

    try {
      const accessibleWhere = accessibleBy(context.ability).AuditLog;
      Object.assign(where, accessibleWhere);
    } catch (e) {
      if (e instanceof ForbiddenError) {
        return NextResponse.json({ error: 'No access to audit logs' }, { status: 403 });
      }
      throw e;
    }

    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }

    // Query all matching logs (no pagination for export)
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Audit the export
    const audit = createAuditLogger(request, {
      clubId: context.clubId,
      userId: context.userId,
    });

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
      AUDIT_ACTION_DESCRIPTIONS[log.action as keyof typeof AUDIT_ACTION_DESCRIPTIONS] ?? log.action,
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
    return serverErrorResponse(error, 'audit-logs/export:GET');
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
