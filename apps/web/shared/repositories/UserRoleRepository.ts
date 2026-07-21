import { BaseRepository } from './BaseRepository';

type UserRoleType = any;

export interface UserRoleRepository extends BaseRepository<UserRoleType> {
  findByUser(userId: string, organizationId: string): Promise<UserRoleType[]>;
}
