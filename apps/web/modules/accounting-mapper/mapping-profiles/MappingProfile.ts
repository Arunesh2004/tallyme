import { RawAccountingTransaction } from '../types/AccountingDTOs';

export interface MappingProfile {
  /**
   * Applies business rules to convert a specific domain event payload
   * into a Canonical Accounting Transaction (with unresolved mapping keys).
   */
  map(eventPayload: any, sourceEventId: string): RawAccountingTransaction;
}
