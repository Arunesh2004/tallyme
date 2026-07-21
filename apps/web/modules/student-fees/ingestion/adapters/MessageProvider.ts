import { NormalizedMessage } from '../types/IngestionTypes';

export interface MessageProvider {
  /**
   * Identifies the provider (e.g., 'GMAIL', 'OUTLOOK')
   */
  readonly providerName: string;

  /**
   * Authenticates the provider client.
   */
  authenticate(): Promise<void>;

  /**
   * Fetches new messages that haven't been processed yet.
   * Can use a query string or a watermark/historyId depending on the provider.
   */
  fetchNewMessages(query?: string): Promise<NormalizedMessage[]>;
}
