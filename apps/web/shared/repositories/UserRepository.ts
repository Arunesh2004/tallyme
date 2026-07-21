import { BaseRepository } from './BaseRepository';

type UserType = any;

export interface UserRepository extends BaseRepository<UserType> {
  findByEmail(email: string, organizationId: string): Promise<UserType | null>;
}
