import { InvoiceFingerprint } from '@prisma/client';

export interface CandidateCriteria {
  vendorId?: string;
  normalizedVendorName?: string;
  // Can add more criteria as needed for optimizations (e.g. dateRange)
}

export interface FingerprintRepository {
  /**
   * Fetches potential duplicate candidates for a given tenant.
   * Hard limits to 1000 records.
   * Orders by createdAt DESC.
   * Returns detached, readonly domain models.
   */
  findCandidates(
    tenantId: string,
    criteria: CandidateCriteria
  ): Promise<ReadonlyArray<Readonly<InvoiceFingerprint>>>;

  /**
   * Persists an InvoiceFingerprint.
   * Accepts an optional transaction client for atomic commits.
   */
  create(
    fingerprint: Omit<InvoiceFingerprint, 'id' | 'createdAt' | 'updatedAt'>,
    tx?: any
  ): Promise<InvoiceFingerprint>;
}
