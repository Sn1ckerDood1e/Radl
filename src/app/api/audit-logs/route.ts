import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth/get-auth-context';
import { accessibleBy } from '@casl/prisma';
import { ForbiddenError } from '@casl/ability';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { AUDITABLE_ACTIONS, AUDIT_ACTION_DESCRIPTIONS } from '@/lib/audit/actions';

/**
 * GET /api/audit-logs
 * List audit logs with filtering.
 *
 * Query params:
 * - action: Filter by action type
 * - userId: Filter by acting user
 * - startDate: Filter by date range start
 * - endDate: Filter by date range end
 * - limit: Max results (default 50, max 200)
 * - offset: Pagination offset
 *
 * Access:
 * - FACILITY_ADMIN: All logs
 * - CLUB_ADMIN: Their club's logs
 * - COACH: Only their own actions
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

    // Check permission
    if (!context.ability.can('view-audit-log', 'AuditLog')) {
      return forbiddenResponse('You do not have permission to view audit logs');
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Build where clause based on user's access level
    const where: Record<string, unknown> = {};

    // Access control via CASL
    try {
      const accessibleWhere = accessibleBy(context.ability).AuditLog;
      Object.assign(where, accessibleWhere);
    } catch (e) {
      if (e instanceof ForbiddenError) {
        return NextResponse.json({ logs: [], total: 0 });
      }
      throw e;
    }

    // Apply filters
    if (action && action in AUDITABLE_ACTIONS) {
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

    // Query with pagination
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
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
      total,
      limit,
      offset,
      hasMore: offset + logs.length < total,
    });
  } catch (error) {
    return serverErrorResponse(error, 'audit-logs:GET');
  }
}
