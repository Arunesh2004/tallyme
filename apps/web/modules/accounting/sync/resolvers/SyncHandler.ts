import { SyncContext } from '../types/SyncContext';

export interface SyncHandler {
  aggregateType: string;

  /**
   * Loads the domain aggregate from the database.
   * Should return null if the aggregate is already marked as SYNCED (idempotency check).
   */
  loadAggregate(context: SyncContext): Promise<any | null>;

  /**
   * Builds the Tally XML payload for the aggregate.
   */
  buildXml(aggregate: any, companyName: string): string;

  /**
   * Updates the database to mark the aggregate as successfully synced.
   */
  updateSuccess(context: SyncContext, xmlRequest: string, xmlResponse: string): Promise<void>;

  /**
   * Updates the database to mark the aggregate with a sync failure.
   */
  updateFailure(context: SyncContext, errorReason: string, isBusinessFailure: boolean): Promise<void>;
}
