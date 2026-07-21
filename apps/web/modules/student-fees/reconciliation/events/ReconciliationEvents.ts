import { DomainEvent } from '../../../../modules/accounting/shared/events/DomainEvent';

export class FeeAllocated implements DomainEvent {
  public eventType = 'FeeAllocated';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string, // FeeTransaction ID
    public aggregateType: string = 'FeeTransaction',
    public payload: any,
    public correlationId?: string
  ) {}
}

export class PartialPaymentRecorded implements DomainEvent {
  public eventType = 'PartialPaymentRecorded';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string,
    public aggregateType: string = 'FeeTransaction',
    public payload: any,
    public correlationId?: string
  ) {}
}

export class OverpaymentRecorded implements DomainEvent {
  public eventType = 'OverpaymentRecorded';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string,
    public aggregateType: string = 'FeeTransaction',
    public payload: any,
    public correlationId?: string
  ) {}
}

export class AdvancePaymentRecorded implements DomainEvent {
  public eventType = 'AdvancePaymentRecorded';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string,
    public aggregateType: string = 'FeeTransaction',
    public payload: any,
    public correlationId?: string
  ) {}
}

export class FeeTransactionCreated implements DomainEvent {
  public eventType = 'FeeTransactionCreated';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string,
    public aggregateType: string = 'FeeTransaction',
    public payload: any,
    public correlationId?: string
  ) {}
}
