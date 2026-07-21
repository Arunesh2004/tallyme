import { DomainEvent } from '../../accounting/shared/events/DomainEvent';

export class AccountingTransactionCreated implements DomainEvent {
  public eventType = 'AccountingTransactionCreated';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string, // AccountingTransaction ID
    public aggregateType: string = 'AccountingTransaction',
    public payload: any,
    public correlationId?: string
  ) {}
}
