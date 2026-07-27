import { v4 as uuidv4 } from 'uuid';
import { DomainEvent } from '@/modules/accounting/shared/events/AccountingEvents';
import { MatchingResult } from '../types/MatchingResult';

export class StudentMatched implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'StudentMatched';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string,
    public aggregateType: string = 'Payment',
    public payload: MatchingResult,
    public correlationId?: string
  ) {}
}

export class StudentMatchFailed implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'StudentMatchFailed';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string,
    public aggregateType: string = 'Payment',
    public payload: any,
    public correlationId?: string
  ) {}
}

export class DuplicatePaymentDetected implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'DuplicatePaymentDetected';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string,
    public aggregateType: string = 'Payment',
    public payload: any,
    public correlationId?: string
  ) {}
}

export class ManualReviewCreated implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'ManualReviewCreated';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string, // ManualReview ID
    public aggregateType: string = 'ManualReview',
    public payload: any,
    public correlationId?: string
  ) {}
}

export class PaymentValidated implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'PaymentValidated';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string,
    public aggregateType: string = 'Payment',
    public payload: MatchingResult,
    public correlationId?: string
  ) {}
}
