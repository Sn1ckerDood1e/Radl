/**
 * Auditable actions for security-critical operations.
 *
 * Per CONTEXT.md decision: ~10 action types covering role changes,
 * deletions, exports, and auth events.
 *
 * These actions are logged to AuditLog with 365-day retention.
 */
export const AUDITABLE_ACTIONS = {
  // Role management
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',      // Role added to user
  ROLE_REMOVED: 'ROLE_REMOVED',        // Role removed from user
  ROLE_CHANGED: 'ROLE_CHANGED',        // Role modified

  // Membership
  MEMBER_INVITED: 'MEMBER_INVITED',    // Invitation sent
  MEMBER_REMOVED: 'MEMBER_REMOVED',    // Member removed from club
  MEMBER_JOINED: 'MEMBER_JOINED',      // Invitation accepted

  // Deletion
  CLUB_DELETED: 'CLUB_DELETED',        // Club/team deleted
  PRACTICE_DELETED: 'PRACTICE_DELETED', // Practice deleted
  EQUIPMENT_DELETED: 'EQUIPMENT_DELETED', // Equipment deleted

  // Data access
  DATA_EXPORTED: 'DATA_EXPORTED',      // CSV export performed

  // API key management
  API_KEY_CREATED: 'API_KEY_CREATED',
  API_KEY_REVOKED: 'API_KEY_REVOKED',

  // Auth events (optional - captured by Supabase, but useful for correlation)
  LOGIN_SUSPICIOUS: 'LOGIN_SUSPICIOUS', // Unusual login pattern detected
} as const;

export type AuditAction = keyof typeof AUDITABLE_ACTIONS;

/**
 * Human-readable descriptions for audit actions.
 * Used in audit log UI for display.
 */
export const AUDIT_ACTION_DESCRIPTIONS: Record<AuditAction, string> = {
  ROLE_ASSIGNED: 'Role assigned to member',
  ROLE_REMOVED: 'Role removed from member',
  ROLE_CHANGED: 'Member role changed',
  MEMBER_INVITED: 'Member invited to club',
  MEMBER_REMOVED: 'Member removed from club',
  MEMBER_JOINED: 'Member joined club',
  CLUB_DELETED: 'Club deleted',
  PRACTICE_DELETED: 'Practice deleted',
  EQUIPMENT_DELETED: 'Equipment deleted',
  DATA_EXPORTED: 'Data exported',
  API_KEY_CREATED: 'API key created',
  API_KEY_REVOKED: 'API key revoked',
  LOGIN_SUSPICIOUS: 'Suspicious login detected',
};
