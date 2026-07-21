import { DomainEvent } from '../../../../modules/accounting/shared/events/DomainEvent';
import { MatchingResult } from '../types/MatchingResult';

export class StudentMatched implements DomainEvent {
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
  public eventType = 'PaymentValidated';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string,
    public aggregateType: string = 'Payment',
    public payload: MatchingResult,
    public correlationId?: string
  ) {}
}
