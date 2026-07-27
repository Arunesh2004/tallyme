import { v4 as uuidv4 } from 'uuid';
import { DomainEvent } from '@/modules/accounting/shared/events/AccountingEvents';

export class StudentFeeMessageReceived implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'StudentFeeMessageReceived';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string, // IngestionMessage ID
    public aggregateType: string = 'IngestionMessage',
    public payload: {
      provider: string;
      messageId: string;
      subject: string;
      sender: string;
      threadId?: string;
      receivedAt: Date;
    },
    public correlationId?: string
  ) {}
}
