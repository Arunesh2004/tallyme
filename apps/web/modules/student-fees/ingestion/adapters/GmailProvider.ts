import { google, gmail_v1 } from 'googleapis';
import { MessageProvider } from './MessageProvider';
import { NormalizedMessage } from '../types/IngestionTypes';
import { logger } from '../../../../shared/logging/logger';
import { env } from '../../../../shared/config/env';

export class GmailProvider implements MessageProvider {
  public readonly providerName = 'GMAIL';
  private gmail: gmail_v1.Gmail | null = null;

  public async authenticate(): Promise<void> {
    try {
      // In a real application, these would be securely fetched from a Vault or OAuth service
      const clientId = process.env.GMAIL_CLIENT_ID || 'mock-client-id';
      const clientSecret = process.env.GMAIL_CLIENT_SECRET || 'mock-client-secret';
      const refreshToken = process.env.GMAIL_REFRESH_TOKEN || 'mock-refresh-token';

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      logger.info('GmailProvider authenticated successfully');
    } catch (error: any) {
      logger.error('Gmail authentication failed', { error: error.message });
      throw error;
    }
  }

  public async fetchNewMessages(query: string = 'is:unread'): Promise<NormalizedMessage[]> {
    if (!this.gmail) throw new Error('GmailProvider not authenticated');

    try {
      // 1. List message IDs matching query
      const listResponse = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50 // process in batches
      });

      const messages = listResponse.data.messages || [];
      const normalizedMessages: NormalizedMessage[] = [];

      // 2. Fetch full payload for each message
      for (const msg of messages) {
        if (!msg.id) continue;
        
        const fullMessage = await this.gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });

        const normalized = this.mapToNormalized(fullMessage.data);
        if (normalized) {
          normalizedMessages.push(normalized);
        }
      }

      return normalizedMessages;
    } catch (error: any) {
      logger.error('Failed to fetch Gmail messages', { error: error.message });
      throw error;
    }
  }

  private mapToNormalized(gmailMsg: gmail_v1.Schema$Message): NormalizedMessage | null {
    if (!gmailMsg.id || !gmailMsg.payload || !gmailMsg.payload.headers) return null;

    const headers = gmailMsg.payload.headers;
    const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || 'No Subject';
    const fromEmail = headers.find(h => h.name?.toLowerCase() === 'from')?.value || 'Unknown';
    const dateStr = headers.find(h => h.name?.toLowerCase() === 'date')?.value;
    const receivedAt = dateStr ? new Date(dateStr) : new Date();

    // Naive body extraction for hashing
    let bodyText = '';
    if (gmailMsg.payload.body && gmailMsg.payload.body.data) {
      bodyText = Buffer.from(gmailMsg.payload.body.data, 'base64').toString('utf-8');
    } else if (gmailMsg.payload.parts && gmailMsg.payload.parts.length > 0) {
      // Find text/plain part
      const textPart = gmailMsg.payload.parts.find(p => p.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        bodyText = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    return {
      provider: this.providerName,
      messageId: gmailMsg.id,
      threadId: gmailMsg.threadId || undefined,
      historyId: gmailMsg.historyId || undefined,
      labelIds: gmailMsg.labelIds || undefined,
      subject,
      fromEmail,
      receivedAt,
      rawPayload: gmailMsg,
      bodyText
    };
  }
}
