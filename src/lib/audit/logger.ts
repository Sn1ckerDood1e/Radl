import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';
import type { AuditAction } from './actions';

/**
 * Context for audit log entries.
 * Captures who and where.
 */
export interface AuditContext {
  clubId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Entry data for audit log.
 * Captures what happened.
 */
export interface AuditEntry {
  action: AuditAction;
  targetType: string;       // e.g., 'ClubMembership', 'Practice', 'Equipment'
  targetId?: string;        // ID of affected record (nullable for bulk ops)
  metadata?: Prisma.InputJsonValue;  // Action-specific details
}

/**
 * Logs a security-critical action to the audit log.
 *
 * @param context - Who performed the action and from where
 * @param entry - What action was performed
 *
 * @example
 * await logAuditEvent(
 *   { clubId, userId, ipAddress: '1.2.3.4' },
 *   {
 *     action: 'ROLE_CHANGED',
 *     targetType: 'ClubMembership',
 *     targetId: membership.id,
 *     metadata: { oldRoles: ['ATHLETE'], newRoles: ['COACH'] }
 *   }
 * );
 */
export async function logAuditEvent(
  context: AuditContext,
  entry: AuditEntry
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      clubId: context.clubId,
      userId: context.userId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata ?? {},
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    },
  });
}

/**
 * Creates a bound audit logger from request headers.
 * Extracts IP and user agent automatically.
 *
 * @param request - Next.js request object
 * @param context - Base context (clubId, userId)
 * @returns Bound logger with log() method
 *
 * @example
 * const audit = createAuditLogger(request, { clubId, userId });
 * await audit.log({
 *   action: 'MEMBER_REMOVED',
 *   targetType: 'ClubMembership',
 *   targetId: membership.id,
 * });
 */
export function createAuditLogger(
  request: Request,
  context: Pick<AuditContext, 'clubId' | 'userId'>
) {
  // Extract IP from x-forwarded-for (first IP in chain) or x-real-ip
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ipAddress = forwardedFor?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    undefined;

  const userAgent = request.headers.get('user-agent') ?? undefined;

  return {
    /**
     * Log an audit event with auto-extracted request context.
     */
    log: (entry: AuditEntry) =>
      logAuditEvent(
        {
          ...context,
          ipAddress,
          userAgent,
        },
        entry
      ),
  };
}

/**
 * Batch log multiple audit events (for bulk operations).
 *
 * @param context - Shared context for all events
 * @param entries - Array of audit entries
 */
export async function logAuditEventBatch(
  context: AuditContext,
  entries: AuditEntry[]
): Promise<void> {
  if (entries.length === 0) return;

  await prisma.auditLog.createMany({
    data: entries.map((entry) => ({
      clubId: context.clubId,
      userId: context.userId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata ?? {},
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    })),
  });
}
