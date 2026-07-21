export enum RoleType {
  ADMIN = 'Admin',
  ACCOUNTANT = 'Accountant',
  REVIEWER = 'Reviewer',
}

export interface PermissionService {
  hasPermission(userId: string, organizationId: string, action: string, resource: string): Promise<boolean>;
}

export interface RoleService {
  assignRole(userId: string, roleId: string, organizationId: string): Promise<void>;
  getUserRoles(userId: string, organizationId: string): Promise<string[]>;
}
