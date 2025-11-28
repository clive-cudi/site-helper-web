// Role-based access control types and utilities

export type Role = 'owner' | 'admin' | 'editor';

export type Permission =
  | 'view_websites'
  | 'manage_websites'
  | 'view_knowledge_bases'
  | 'edit_knowledge_bases'
  | 'delete_knowledge_bases'
  | 'view_conversations'
  | 'delete_conversations'
  | 'view_team'
  | 'manage_team'
  | 'manage_billing'
  | 'delete_account'
  | 'view_audit_logs';

/**
 * Mapping of roles to their allowed permissions
 */
export const rolePermissions: Record<Role, Permission[]> = {
  owner: [
    'view_websites',
    'manage_websites',
    'view_knowledge_bases',
    'edit_knowledge_bases',
    'delete_knowledge_bases',
    'view_conversations',
    'delete_conversations',
    'view_team',
    'manage_team',
    'manage_billing',
    'delete_account',
    'view_audit_logs',
  ],
  admin: [
    'view_websites',
    'manage_websites',
    'view_knowledge_bases',
    'edit_knowledge_bases',
    'delete_knowledge_bases',
    'view_conversations',
    'delete_conversations',
    'view_team',
    'manage_team',
  ],
  editor: [
    'view_knowledge_bases',
    'edit_knowledge_bases',
    'view_conversations',
  ],
};

/**
 * Check if a role has a specific permission
 * @param role - The user's role
 * @param permission - The permission to check
 * @returns true if the role has the permission, false otherwise
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

/**
 * Check if a user with a given role can manage another role
 * Role hierarchy: owner > admin > editor
 * - Owners can manage all roles
 * - Admins can manage editors but not owners
 * - Editors cannot manage any roles
 * 
 * @param userRole - The role of the user attempting to manage
 * @param targetRole - The role being managed
 * @returns true if the user can manage the target role, false otherwise
 */
export function canManageRole(userRole: Role, targetRole: Role): boolean {
  // Owners can manage all roles
  if (userRole === 'owner') {
    return true;
  }
  
  // Admins can manage editors but not owners
  if (userRole === 'admin' && targetRole !== 'owner') {
    return true;
  }
  
  // Editors cannot manage any roles
  return false;
}
