export interface NormalizedMessage {
  provider: string; // 'GMAIL', 'OUTLOOK', etc.
  messageId: string;
  threadId?: string;
  historyId?: string;
  labelIds?: string[];
  subject: string;
  fromEmail: string;
  receivedAt: Date;
  rawPayload: any; // Original API payload for debugging
  bodyText: string; // Used for hash calculation
}
