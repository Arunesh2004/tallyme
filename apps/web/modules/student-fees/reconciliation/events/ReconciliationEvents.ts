import { v4 as uuidv4 } from 'uuid';
import { DomainEvent } from '@/modules/accounting/shared/events/AccountingEvents';

export class FeeAllocated implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

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
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

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
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

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
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

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
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'FeeTransactionCreated';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string,
    public aggregateType: string = 'FeeTransaction',
    public payload: any,
    public correlationId?: string
  ) {}
}
