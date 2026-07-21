export interface CurrentUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  tenantId?: string;
}
