import { v4 as uuidv4 } from 'uuid';
import { DomainEvent } from '@/modules/accounting/shared/events/AccountingEvents';

export class AccountingTransactionCreated implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'AccountingTransactionCreated';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string, // AccountingTransaction ID
    public aggregateType: string = 'AccountingTransaction',
    public payload: any,
    public correlationId?: string
  ) {}
}
