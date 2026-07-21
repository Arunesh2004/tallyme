/**
 * File: apps/web/lib/auth/permissions.ts
 * Purpose: Centralized Role-Based Access Control (RBAC) definitions and helpers.
 * Dependencies: None
 */

export enum Role {
  ACCOUNTANT = 'ACCOUNTANT',
  ADMINISTRATOR = 'ADMINISTRATOR',
  PRINCIPAL = 'PRINCIPAL',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export const checkPermission = (userRole: Role | undefined, allowedRoles: Role[]): boolean => {
  if (!userRole) return false;
  if (userRole === Role.SUPER_ADMIN) return true; // Super admin bypass
  return allowedRoles.includes(userRole);
};
