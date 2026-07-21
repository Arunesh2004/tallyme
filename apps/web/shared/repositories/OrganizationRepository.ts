import { BaseRepository } from './BaseRepository';

// Assuming Prisma-generated types will be imported here eventually
type OrganizationType = any;

export interface OrganizationRepository extends BaseRepository<OrganizationType> {
  findByGstin(gstin: string): Promise<OrganizationType | null>;
}
