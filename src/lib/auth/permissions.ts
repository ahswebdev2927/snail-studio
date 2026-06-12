import { UserRole } from "@/db/enums";

/**
 * Checks if the given user role satisfies the required role.
 * Since 'admin' is the highest role, admins have full permissions and satisfy all role requirements.
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  if (userRole === "admin") {
    return true;
  }
  return userRole === requiredRole;
}

/**
 * Checks if the role represents administrative access.
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === "admin";
}
