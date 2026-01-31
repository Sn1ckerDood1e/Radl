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
 * Extended entry for admin actions with before/after state capture.
 * Used by super admin operations for full audit trail.
 */
export interface AdminAuditEntry extends AuditEntry {
  beforeState?: Record<string, unknown>;  // State before the change
  afterState?: Record<string, unknown>;   // State after the change
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

/**
 * Log a super admin action with before/after state capture.
 * Uses 'PLATFORM' as clubId to indicate platform-level action.
 *
 * AUDT-01 compliance: Records actor, action, target, timestamp, and state changes.
 *
 * @param context - Who performed the action and from where
 * @param entry - Admin action details including before/after state
 *
 * @example
 * await logAdminAction(
 *   { userId: adminId, ipAddress: '1.2.3.4' },
 *   {
 *     action: 'ADMIN_USER_DEACTIVATED',
 *     targetType: 'User',
 *     targetId: userId,
 *     beforeState: { isActive: true, email: 'user@example.com' },
 *     afterState: { isActive: false, email: 'user@example.com' },
 *   }
 * );
 */
export async function logAdminAction(
  context: { userId: string; ipAddress?: string; userAgent?: string },
  entry: AdminAuditEntry
): Promise<void> {
  // Build metadata with before/after state
  const metadata = {
    ...(entry.metadata as Record<string, unknown> || {}),
    beforeState: entry.beforeState ?? null,
    afterState: entry.afterState ?? null,
  } as Prisma.InputJsonValue;

  await prisma.auditLog.create({
    data: {
      clubId: 'PLATFORM',  // Special marker for platform-level actions
      userId: context.userId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      metadata,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    },
  });
}

/**
 * Create a bound admin audit logger from request.
 * Auto-extracts IP and user agent from request headers.
 *
 * @param request - Next.js request object
 * @param userId - ID of the super admin performing the action
 * @returns Bound logger with log() method
 *
 * @example
 * const audit = createAdminAuditLogger(request, adminId);
 * await audit.log({
 *   action: 'ADMIN_CLUB_CREATED',
 *   targetType: 'Club',
 *   targetId: newClub.id,
 *   afterState: { name: newClub.name, slug: newClub.slug },
 * });
 */
export function createAdminAuditLogger(
  request: Request,
  userId: string
) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ipAddress = forwardedFor?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    undefined;
  const userAgent = request.headers.get('user-agent') ?? undefined;

  return {
    /**
     * Log an admin audit event with auto-extracted request context.
     */
    log: (entry: AdminAuditEntry) =>
      logAdminAction({ userId, ipAddress, userAgent }, entry),
  };
}
