import { BaseRepository } from './BaseRepository';

type RoleType = any;

export interface RoleRepository extends BaseRepository<RoleType> {
  findByName(name: string, organizationId: string): Promise<RoleType | null>;
}
