// events/index.ts
import {
  DomainEvent,
  IntegrationEvent,
  EventMetadata,
} from '../../../shared/events';

export class PaymentParsed implements DomainEvent {
  readonly _isDomainEvent = true;
  constructor(
    public readonly metadata: EventMetadata,
    public readonly payload: any,
  ) {}
}

export class StudentMatched implements DomainEvent {
  readonly _isDomainEvent = true;
  constructor(
    public readonly metadata: EventMetadata,
    public readonly payload: any,
  ) {}
}

export class FeeAllocated implements DomainEvent {
  readonly _isDomainEvent = true;
  constructor(
    public readonly metadata: EventMetadata,
    public readonly payload: any,
  ) {}
}

export class VoucherGenerated implements IntegrationEvent {
  readonly _isIntegrationEvent = true;
  readonly _isDomainEvent = false; // Stub
  constructor(
    public readonly metadata: EventMetadata,
    public readonly payload: any,
  ) {}
}
