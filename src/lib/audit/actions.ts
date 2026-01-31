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

  // MFA operations
  MFA_ENROLLED: 'MFA_ENROLLED',                           // User enrolled in MFA
  MFA_VERIFIED: 'MFA_VERIFIED',                           // User verified MFA code
  MFA_UNENROLLED: 'MFA_UNENROLLED',                       // User removed MFA
  MFA_BACKUP_CODES_REGENERATED: 'MFA_BACKUP_CODES_REGENERATED',  // User regenerated backup codes
  MFA_BACKUP_CODE_USED: 'MFA_BACKUP_CODE_USED',           // User used backup code for recovery
  MFA_RESET_BY_ADMIN: 'MFA_RESET_BY_ADMIN',               // Admin reset user MFA settings

  // Authentication events (Phase 27 - AUDIT-01)
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',                         // User logged in successfully
  LOGIN_FAILED: 'LOGIN_FAILED',                           // Failed login attempt
  LOGOUT: 'LOGOUT',                                       // User logged out
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',   // Password reset email sent
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',   // Password successfully reset
  SIGNUP_SUCCESS: 'SIGNUP_SUCCESS',                       // New user registered
  SIGNUP_FAILED: 'SIGNUP_FAILED',                         // Registration failed (after rate limit)

  // Permission grants
  PERMISSION_GRANT_CREATED: 'PERMISSION_GRANT_CREATED',   // Admin granted temporary elevated permissions
  PERMISSION_GRANT_REVOKED: 'PERMISSION_GRANT_REVOKED',   // Admin revoked temporary permissions
  PERMISSION_GRANT_EXPIRED: 'PERMISSION_GRANT_EXPIRED',   // Temporary permissions expired automatically

  // Permission events (Phase 27 - AUDIT-03)
  PERMISSION_DENIED: 'PERMISSION_DENIED',                 // 403 response logged

  // SSO configuration
  SSO_CONFIG_UPDATED: 'SSO_CONFIG_UPDATED',               // Facility admin updated SSO configuration
  SSO_ENABLED: 'SSO_ENABLED',                             // SSO was enabled for facility
  SSO_DISABLED: 'SSO_DISABLED',                           // SSO was disabled for facility
  SSO_ROLE_MAPPING_CHANGED: 'SSO_ROLE_MAPPING_CHANGED',   // SSO role mappings were modified

  // Admin panel actions (super admin operations)
  ADMIN_USER_CREATED: 'ADMIN_USER_CREATED',               // Super admin created a new user
  ADMIN_USER_UPDATED: 'ADMIN_USER_UPDATED',               // Super admin updated user profile
  ADMIN_USER_DEACTIVATED: 'ADMIN_USER_DEACTIVATED',       // Super admin deactivated a user
  ADMIN_USER_REACTIVATED: 'ADMIN_USER_REACTIVATED',       // Super admin reactivated a user
  ADMIN_PASSWORD_RESET: 'ADMIN_PASSWORD_RESET',           // Super admin reset a user's password
  ADMIN_ROLE_CHANGED: 'ADMIN_ROLE_CHANGED',               // Super admin changed user's roles
  ADMIN_MEMBERSHIP_ADDED: 'ADMIN_MEMBERSHIP_ADDED',       // Super admin added user to club
  ADMIN_MEMBERSHIP_REMOVED: 'ADMIN_MEMBERSHIP_REMOVED',   // Super admin removed user from club
  ADMIN_FACILITY_CREATED: 'ADMIN_FACILITY_CREATED',       // Super admin created a facility
  ADMIN_FACILITY_UPDATED: 'ADMIN_FACILITY_UPDATED',       // Super admin updated a facility
  ADMIN_CLUB_CREATED: 'ADMIN_CLUB_CREATED',               // Super admin created a club
  ADMIN_CLUB_UPDATED: 'ADMIN_CLUB_UPDATED',               // Super admin updated a club
  ADMIN_USERS_BULK_CREATED: 'ADMIN_USERS_BULK_CREATED',   // Super admin bulk created users
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
  MFA_ENROLLED: 'User enrolled in multi-factor authentication',
  MFA_VERIFIED: 'User verified MFA code successfully',
  MFA_UNENROLLED: 'User removed multi-factor authentication',
  MFA_BACKUP_CODES_REGENERATED: 'User regenerated MFA backup codes',
  MFA_BACKUP_CODE_USED: 'User used MFA backup code for recovery',
  MFA_RESET_BY_ADMIN: 'Admin reset user MFA settings',
  LOGIN_SUCCESS: 'User logged in successfully',
  LOGIN_FAILED: 'Failed login attempt',
  LOGOUT: 'User logged out',
  PASSWORD_RESET_REQUESTED: 'Password reset requested',
  PASSWORD_RESET_COMPLETED: 'Password reset completed',
  SIGNUP_SUCCESS: 'New user registered',
  SIGNUP_FAILED: 'User registration failed',
  PERMISSION_GRANT_CREATED: 'Admin granted temporary elevated permissions to user',
  PERMISSION_GRANT_REVOKED: 'Admin revoked temporary permissions from user',
  PERMISSION_GRANT_EXPIRED: 'Temporary permissions expired automatically',
  PERMISSION_DENIED: 'Access denied to resource',
  SSO_CONFIG_UPDATED: 'Facility admin updated SSO configuration',
  SSO_ENABLED: 'SSO was enabled for facility',
  SSO_DISABLED: 'SSO was disabled for facility',
  SSO_ROLE_MAPPING_CHANGED: 'SSO role mappings were modified',
  ADMIN_USER_CREATED: 'Super admin created a new user',
  ADMIN_USER_UPDATED: 'Super admin updated user profile',
  ADMIN_USER_DEACTIVATED: 'Super admin deactivated a user',
  ADMIN_USER_REACTIVATED: 'Super admin reactivated a user',
  ADMIN_PASSWORD_RESET: 'Super admin reset a user password',
  ADMIN_ROLE_CHANGED: 'Super admin changed user roles',
  ADMIN_MEMBERSHIP_ADDED: 'Super admin added user to club',
  ADMIN_MEMBERSHIP_REMOVED: 'Super admin removed user from club',
  ADMIN_FACILITY_CREATED: 'Super admin created a facility',
  ADMIN_FACILITY_UPDATED: 'Super admin updated a facility',
  ADMIN_CLUB_CREATED: 'Super admin created a club',
  ADMIN_CLUB_UPDATED: 'Super admin updated a club',
  ADMIN_USERS_BULK_CREATED: 'Super admin bulk created users',
};
