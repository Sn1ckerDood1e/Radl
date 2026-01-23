/**
 * Permission actions for CASL ability definitions.
 * These match security-critical operations and standard CRUD.
 */

export const ACTIONS = {
  // Standard CRUD
  manage: 'manage',  // All CRUD operations
  create: 'create',
  read: 'read',
  update: 'update',
  delete: 'delete',

  // Role management (auditable)
  assignRole: 'assign-role',

  // Audit and data access
  viewAuditLog: 'view-audit-log',
  exportData: 'export-data',

  // API key management
  manageApiKeys: 'manage-api-keys',

  // Member management (auditable)
  inviteMember: 'invite-member',
  removeMember: 'remove-member',

  // Practice/lineup specific
  publishPractice: 'publish-practice',
} as const;

export type Action = typeof ACTIONS[keyof typeof ACTIONS];
