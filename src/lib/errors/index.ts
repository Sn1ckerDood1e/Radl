import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { logAuditEvent, type AuditContext } from '@/lib/audit/logger';

/**
 * Generate an 8-character alphanumeric error reference ID.
 * Used for correlating error reports with server logs.
 */
export function generateErrorRef(): string {
  return nanoid(8);
}

/**
 * Standard 401 Unauthorized response.
 * Returns JSON with error message, no reference ID (auth errors are expected).
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}

/**
 * Standard 403 Forbidden response with optional audit logging.
 * @param message - Optional custom message, defaults to 'Forbidden'
 * @param auditContext - Optional context for audit logging (clubId, userId required for logging)
 * @param targetInfo - Optional target info for audit log (targetType, targetId)
 */
export function forbiddenResponse(
  message?: string,
  auditContext?: Pick<AuditContext, 'clubId' | 'userId' | 'ipAddress'>,
  targetInfo?: { targetType: string; targetId?: string }
): NextResponse {
  // Log PERMISSION_DENIED if context provided
  if (auditContext?.clubId && auditContext?.userId) {
    logAuditEvent(
      {
        clubId: auditContext.clubId,
        userId: auditContext.userId,
        ipAddress: auditContext.ipAddress,
      },
      {
        action: 'PERMISSION_DENIED',
        targetType: targetInfo?.targetType || 'Unknown',
        targetId: targetInfo?.targetId,
        metadata: { message: message || 'Forbidden' },
      }
    ).catch((err) => {
      // Fire-and-forget, but log errors
      console.error('[audit] Failed to log PERMISSION_DENIED:', err);
    });
  }

  return NextResponse.json(
    { error: message || 'Forbidden' },
    { status: 403 }
  );
}

/**
 * Standard 404 Not Found response.
 * @param resource - Optional resource name (e.g., 'Equipment', 'Invitation')
 */
export function notFoundResponse(resource?: string): NextResponse {
  const message = resource ? `${resource} not found` : 'Not found';
  return NextResponse.json(
    { error: message },
    { status: 404 }
  );
}

/**
 * Standard 500 Internal Server Error response.
 * Logs error with reference ID for debugging, returns safe message to client.
 *
 * @param error - The caught error (unknown type for catch blocks)
 * @param context - Optional context string for log clarity (e.g., 'equipment:POST')
 */
export function serverErrorResponse(error: unknown, context?: string): NextResponse {
  const ref = generateErrorRef();

  // Log with reference ID for support correlation
  console.error(`[${ref}]${context ? ` ${context}:` : ''} Server error:`, error);

  return NextResponse.json(
    { error: 'An unexpected error occurred', ref },
    { status: 500 }
  );
}
