import { BaseRepository } from './BaseRepository';

type PermissionType = any;

export interface PermissionRepository extends BaseRepository<PermissionType> {
  findByRole(roleId: string, organizationId: string): Promise<PermissionType[]>;
}
