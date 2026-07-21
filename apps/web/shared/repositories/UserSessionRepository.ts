import { BaseRepository } from './BaseRepository';

type UserSessionType = any;

export interface UserSessionRepository extends BaseRepository<UserSessionType> {
  invalidateAllUserSessions(userId: string, organizationId: string): Promise<void>;
}
