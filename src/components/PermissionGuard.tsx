import { ReactNode } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { Permission } from '../services/permissions';

interface PermissionGuardProps {
  permission: Permission;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * PermissionGuard component conditionally renders children based on user permissions
 * 
 * @param permission - The required permission to render children
 * @param fallback - Optional content to render when permission is denied (defaults to null)
 * @param children - Content to render when permission is granted
 * 
 * @example
 * <PermissionGuard permission="manage_websites">
 *   <button onClick={deleteWebsite}>Delete Website</button>
 * </PermissionGuard>
 * 
 * @example
 * <PermissionGuard 
 *   permission="manage_team"
 *   fallback={<p>You don't have permission to manage team members.</p>}
 * >
 *   <TeamManagementForm />
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission } = useTeam();

  // Check if user has the required permission
  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
