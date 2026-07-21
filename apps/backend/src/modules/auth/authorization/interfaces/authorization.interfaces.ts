export interface IPermissionEvaluator {
  hasPermission(userId: string, permission: string): Promise<boolean>;
}

export interface IRoleEvaluator {
  hasRole(userId: string, role: string): Promise<boolean>;
}
