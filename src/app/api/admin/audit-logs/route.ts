import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { AUDIT_ACTION_DESCRIPTIONS, type AuditAction } from '@/lib/audit/actions';
import { unauthorizedResponse, serverErrorResponse } from '@/lib/errors';

/**
 * Audit log item with enriched description.
 */
interface AuditLogItem {
  id: string;
  createdAt: string;
  action: string;
  actionDescription: string;
  userId: string;
  targetType: string;
  targetId: string | null;
  clubId: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
}

/**
 * GET /api/admin/audit-logs
 *
 * List all audit logs with pagination and filters.
 * Super admin only - sees ALL logs including 'PLATFORM' scoped.
 *
 * Query params:
 * - page: Page number (1-indexed, default 1)
 * - perPage: Logs per page (default 25, max 100)
 * - action: Filter by action type (e.g., 'ADMIN_USER_CREATED')
 * - userId: Filter by actor (user who performed the action)
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('perPage') || '25', 10)));
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

    // Query logs with pagination
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: perPage,
        skip: (page - 1) * perPage,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Enrich logs with action descriptions
    const enrichedLogs: AuditLogItem[] = logs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      action: log.action,
      actionDescription:
        AUDIT_ACTION_DESCRIPTIONS[log.action as AuditAction] ?? log.action,
      userId: log.userId,
      targetType: log.targetType,
      targetId: log.targetId,
      clubId: log.clubId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata,
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
