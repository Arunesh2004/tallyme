import { DomainEvent } from '../../../accounting/shared/events/DomainEvent';

export class StudentFeeMessageReceived implements DomainEvent {
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
