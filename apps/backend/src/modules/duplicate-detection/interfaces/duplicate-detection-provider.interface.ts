import { InvoiceFingerprint, DuplicateDetectionPolicy } from '@prisma/client';
import { DuplicateDecision } from '../dto/duplicate-decision.dto';

export enum ProviderCapability {
  EXACT = 'EXACT',
  FUZZY = 'FUZZY',
  AI = 'AI'
}

export interface DuplicateDetectionProvider {
  /**
   * Executes duplicate detection. Must complete within the timeout enforced by the service.
   * Input candidate pool is guaranteed to be sorted by createdAt DESC and limited to max 1000.
   */
  evaluate(
    fingerprint: Readonly<InvoiceFingerprint>,
    candidates: ReadonlyArray<Readonly<InvoiceFingerprint>>,
    policy: Readonly<DuplicateDetectionPolicy>,
    signal: AbortSignal
  ): Promise<DuplicateDecision>;

  /**
   * Fast health check (must resolve < 50ms).
   */
  health?(signal?: AbortSignal): Promise<boolean>;

  /**
   * Returns semantic version of the underlying algorithm/engine.
   */
  version(): string;

  /**
   * Returns supported capabilities.
   */
  capabilities(): ProviderCapability[];
}
